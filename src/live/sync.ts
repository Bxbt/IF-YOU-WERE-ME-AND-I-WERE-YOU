/**
 * Phase 3C Live sync engine (docs/10 §10.3). One room at a time:
 * - local change → stamp `syncSeq` (commit hook) → debounce → encrypt → PUT own slot
 * - SSE `rev` from the partner's slot → GET → decrypt → merge into the save
 * Status is only "synced" after the server answered 200 (no fake "online").
 */
import { create } from 'zustand';
import { setCommitHook, useGame } from '../store/game';
import type { SaveRoot } from '../persistence/schema';
import { KEYS, readKey, removeKey, writeKey } from '../persistence/storage';
import { decryptJson, encryptJson } from './crypto';
import { getRoom, putSlot, roomEvents } from './api';
import { buildPayload, linkOf, mergePartner, SlotPayload, stampSeq, type LiveLink } from './merge';

export type LiveStatus = 'idle' | 'connecting' | 'synced' | 'pending' | 'offline' | 'error';

interface LiveState {
  status: LiveStatus;
  partnerOnline: boolean;
  /** The partner left the room (deleted their slot). */
  partnerLeft: boolean;
  room: string | null;
}

export const useLive = create<LiveState>()(() => ({
  status: 'idle',
  partnerOnline: false,
  partnerLeft: false,
  room: null,
}));

// ---------- pending room (inviter, before anyone joined) ----------

export function readPendingLink(): LiveLink | null {
  const raw = readKey(KEYS.liveRoom);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as LiveLink;
    return v && typeof v.room === 'string' && typeof v.key === 'string' ? v : null;
  } catch {
    return null;
  }
}
export const writePendingLink = (link: LiveLink) => writeKey(KEYS.liveRoom, JSON.stringify(link));
export const clearPendingLink = () => removeKey(KEYS.liveRoom);

/** The live link this device should be syncing now, if any. */
export function currentLink(save: SaveRoot): LiveLink | null {
  const active = Object.values(save.journeys).find((j) => j.status === 'active' && j.mode === 'remote_online');
  const fromJourney = linkOf(active);
  if (fromJourney) return fromJourney;
  const pending = readPendingLink();
  if (pending && !save.journeys[pending.journeyId] && save.players[pending.localPlayerId]) return pending;
  return null;
}

// ---------- engine ----------

let link: LiveLink | null = null;
let events: EventSource | null = null;
let unsub: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let lastPushed = '';
let applyingRemote = false;
let pulling = false;
let pullAgain = false;
let backoff = 1000;

const partnerSlot = () => (link?.slot === 0 ? 1 : 0);

function schedulePush(delay = 400) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void push(), delay);
}

async function push() {
  pushTimer = null;
  const l = link;
  if (!l) return;
  const payload = buildPayload(useGame.getState().save, l);
  if (!payload) return;
  const text = JSON.stringify(payload);
  if (text === lastPushed) return;
  useLive.setState({ status: 'pending' });
  const box = await encryptJson(payload, l.key);
  const r = await putSlot(l.room, l.slot, l.token, box);
  if (link !== l) return;
  if (r.ok) {
    lastPushed = text;
    backoff = 1000;
    useLive.setState({ status: 'synced' });
  } else {
    useLive.setState({ status: r.error === 'offline' ? 'offline' : 'error' });
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => schedulePush(0), backoff);
    backoff = Math.min(backoff * 2, 60_000);
  }
}

/** Fetches the partner's slot and merges it. Exported for tests and the lobby's "check again". */
export async function pull(): Promise<void> {
  if (pulling) {
    pullAgain = true;
    return;
  }
  pulling = true;
  try {
    do {
      pullAgain = false;
      const l = link;
      if (!l) return;
      const r = await getRoom(l.room);
      if (link !== l) return;
      if (!r.ok) {
        useLive.setState({ status: r.error === 'offline' ? 'offline' : 'error' });
        continue;
      }
      const ps = partnerSlot();
      useLive.setState({ partnerOnline: r.body.presence.includes(ps) });
      const box = r.body.slots.find((s) => s.slot === ps);
      if (!box?.iv || !box.data) continue;
      let parsed;
      try {
        parsed = SlotPayload.safeParse(await decryptJson({ iv: box.iv, data: box.data }, l.key));
      } catch {
        useLive.setState({ status: 'error' });
        continue;
      }
      if (!parsed.success) {
        console.error('live: partner slot did not validate', parsed.error);
        continue;
      }
      const payload = parsed.data;
      const before = useGame.getState().save;
      const merged = mergePartner(before, l, payload);
      if (merged !== before) {
        applyingRemote = true;
        try {
          useGame.getState().update(() => merged);
        } finally {
          applyingRemote = false;
        }
        if (!before.journeys[l.journeyId] && merged.journeys[l.journeyId]) clearPendingLink();
      }
      useLive.setState({ partnerLeft: false });
    } while (pullAgain);
  } finally {
    pulling = false;
  }
}

export function stopLive() {
  events?.close();
  events = null;
  unsub?.();
  unsub = null;
  if (pushTimer) clearTimeout(pushTimer);
  if (retryTimer) clearTimeout(retryTimer);
  pushTimer = retryTimer = null;
  setCommitHook(null);
  link = null;
  lastPushed = '';
  useLive.setState({ status: 'idle', partnerOnline: false, partnerLeft: false, room: null });
}

export function startLive(next: LiveLink) {
  if (link && link.room === next.room && link.slot === next.slot && link.journeyId === next.journeyId) {
    link = next;
    return;
  }
  stopLive();
  link = next;
  useLive.setState({ status: 'connecting', room: next.room });

  setCommitHook((prev, save) => {
    if (applyingRemote || !link) return save;
    const j = save.journeys[link.journeyId];
    const pj = prev.journeys[link.journeyId];
    if (!j || j === pj || j.mode !== 'remote_online') return save;
    const stamped = stampSeq(pj, j);
    return stamped === j ? save : { ...save, journeys: { ...save.journeys, [j.id]: stamped } };
  });

  unsub = useGame.subscribe((s, prev) => {
    if (s.save !== prev.save) schedulePush();
  });

  events = roomEvents(next.room, next.slot);
  if (events) {
    events.addEventListener('open', () => {
      void pull();
      schedulePush(0);
    });
    events.addEventListener('rev', (e) => {
      try {
        const d = JSON.parse((e as MessageEvent<string>).data) as { slot: number };
        if (d.slot === partnerSlot()) void pull();
      } catch {
        /* ignore malformed events */
      }
    });
    events.addEventListener('presence', (e) => {
      try {
        const slots = JSON.parse((e as MessageEvent<string>).data) as number[];
        useLive.setState({ partnerOnline: slots.includes(partnerSlot()) });
      } catch {
        /* ignore */
      }
    });
    events.addEventListener('left', (e) => {
      try {
        const d = JSON.parse((e as MessageEvent<string>).data) as { slot: number };
        if (d.slot === partnerSlot()) useLive.setState({ partnerLeft: true, partnerOnline: false });
      } catch {
        /* ignore */
      }
    });
    events.addEventListener('error', () => useLive.setState({ status: 'offline' }));
  }
  void pull();
  schedulePush(0);
}

/** Starts / stops the engine to follow the save (mounted once in App). */
export function followSave(save: SaveRoot) {
  const l = currentLink(save);
  if (!l) {
    if (link) stopLive();
    return;
  }
  startLive(l);
}
