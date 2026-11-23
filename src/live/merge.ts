/**
 * Phase 3C Live merge (docs/10 §10.3 "Merge", TC-LIVE-01..04). Pure functions only.
 *
 * Each device writes one slot: its own player, its own profiles and its copy of the journey.
 * The receiving device merges the partner's slot into its save:
 * - Owner wins: anything that belongs to a player (player record, profiles, story answers, their
 *   entry in a mirror item, observed signals, next-conversation items) comes from that player's
 *   device. Nobody can write the other person's answers.
 * - Chapter progress: the higher `syncSeq` wins (a tie goes to slot 0, the same on both devices).
 *   At the same `syncSeq` the private-step waiting lists are intersected, so two players who
 *   submit at the same moment both end up with an empty list.
 * - Reveal: the state is recomputed; a consent only counts when it is not older than the latest
 *   change to any answer of the item (an edit after consent asks for consent again, R7).
 */
import { z } from 'zod';
import { GameSession, Player, Profile, type SaveRoot, type SharedAnswer } from '../persistence/schema';
import { deriveState, mirrorRevision, requiredConsenters } from '../engine/reveal';

type Journey = z.infer<typeof GameSession>;
type Progress = Journey['chapterProgress'][string];
type Entry = SharedAnswer['entries'][string];

export const SlotPayload = z.object({
  v: z.literal(1),
  playerId: z.string(),
  player: Player.omit({ pin: true }),
  journeyId: z.string(),
  journey: GameSession.omit({ remote: true }).optional(),
  profiles: z.record(Profile),
});
export type SlotPayload = z.infer<typeof SlotPayload>;

/** This device's link to a live room (stored in `journey.remote`, or before a journey exists, apart). */
export interface LiveLink {
  room: string;
  key: string;
  token: string;
  slot: 0 | 1;
  localPlayerId: string;
  journeyId: string;
  /** Room code shown to the inviter while waiting (never stored in the journey). */
  code?: string;
}

export function remoteFor(link: LiveLink): NonNullable<Journey['remote']> {
  return {
    kind: 'online',
    sessionId: link.room,
    role: link.slot === 0 ? 'owner' : 'member',
    liveSlot: link.slot,
    liveKey: link.key,
    liveToken: link.token,
    localPlayerId: link.localPlayerId,
  };
}

export function linkOf(j: Journey | undefined): LiveLink | null {
  const r = j?.remote;
  if (!j || j.mode !== 'remote_online' || r?.kind !== 'online') return null;
  if (!r.sessionId || !r.liveKey || !r.liveToken || r.liveSlot === undefined || !r.localPlayerId) return null;
  return {
    room: r.sessionId,
    key: r.liveKey,
    token: r.liveToken,
    slot: r.liveSlot,
    localPlayerId: r.localPlayerId,
    journeyId: j.id,
  };
}

/** What this device sends: never PINs, drafts, memories or other journeys (docs/08 §6.3). */
export function buildPayload(save: SaveRoot, link: LiveLink): SlotPayload | null {
  const me = save.players[link.localPlayerId];
  if (!me) return null;
  const { pin: _pin, ...player } = me;
  void _pin;
  const j = save.journeys[link.journeyId];
  let journey: SlotPayload['journey'];
  if (j) {
    const { remote: _r, ...rest } = j;
    void _r;
    journey = rest;
  }
  const profiles = Object.fromEntries(
    Object.entries(save.profiles).filter(([, p]) => p.ownerId === link.localPlayerId),
  );
  return {
    v: 1,
    playerId: me.id,
    player,
    journeyId: link.journeyId,
    ...(journey ? { journey } : {}),
    profiles,
  };
}

// ---------- progress ----------

function positionKey(p: Progress): string {
  return JSON.stringify([
    p.status,
    p.currentSceneId ?? null,
    p.lineIndex ?? null,
    p.flags,
    p.choiceLog.length,
    p.skippedScenes.length,
    p.playCount,
    p.revealMode ?? null,
  ]);
}

/** Bumps `syncSeq` on every chapter whose position changed locally. */
export function stampSeq(prev: Journey | undefined, next: Journey): Journey {
  let changed = false;
  const cp: Journey['chapterProgress'] = {};
  for (const [ch, n] of Object.entries(next.chapterProgress)) {
    const p = prev?.chapterProgress[ch];
    if (p && p === n) {
      cp[ch] = n;
      continue;
    }
    if (!p || positionKey(p) !== positionKey(n)) {
      cp[ch] = { ...n, syncSeq: Math.max(p?.syncSeq ?? 0, n.syncSeq ?? 0) + 1 };
      changed = true;
    } else if ((n.syncSeq ?? 0) < (p.syncSeq ?? 0)) {
      cp[ch] = { ...n, syncSeq: p.syncSeq };
      changed = true;
    } else cp[ch] = n;
  }
  return changed ? { ...next, chapterProgress: cp } : next;
}

type Pending = NonNullable<Progress['pendingPrivateSteps']>;

function intersectPending(a: Pending = [], b: Pending = []): Pending {
  const ids = [...new Set([...a.map((x) => x.itemId), ...b.map((x) => x.itemId)])];
  return ids.map((itemId) => {
    const x = a.find((e) => e.itemId === itemId);
    const y = b.find((e) => e.itemId === itemId);
    if (x && y) return { itemId, playerIds: x.playerIds.filter((p) => y.playerIds.includes(p)) };
    return (x ?? y)!;
  });
}

/**
 * Reading positions (3C ต่างคนต่างอ่าน): each player's entry comes from that player's device, and
 * only while both sides are on the same run of the chapter (`startedAt`) — a restart clears them.
 */
function mergeLivePos(win: Progress, l: Progress, q: Progress, localId: string, partnerId: string) {
  const out: NonNullable<Progress['livePos']> = {};
  const mine = l.startedAt === win.startedAt ? l.livePos?.[localId] : undefined;
  const theirs = q.startedAt === win.startedAt ? q.livePos?.[partnerId] : undefined;
  if (mine) out[localId] = mine;
  if (theirs) out[partnerId] = theirs;
  return Object.keys(out).length ? out : undefined;
}

function mergeProgress(
  l: Progress | undefined,
  q: Progress | undefined,
  partnerSlot: 0 | 1,
  localId: string,
  partnerId: string,
): Progress {
  if (!l) return q!;
  if (!q) return l;
  const ls = l.syncSeq ?? 0;
  const qs = q.syncSeq ?? 0;
  const win = ls > qs ? l : qs > ls ? q : partnerSlot === 0 ? q : l;
  const { livePos: _drop, ...base } = win;
  void _drop;
  const livePos = mergeLivePos(win, l, q, localId, partnerId);
  const merged: Progress = livePos ? { ...base, livePos } : base;
  if (ls !== qs) return merged;
  return { ...merged, pendingPrivateSteps: intersectPending(l.pendingPrivateSteps, q.pendingPrivateSteps) };
}

// ---------- reveal ----------

const maxStr = (xs: (string | undefined)[]) => xs.reduce<string>((m, x) => (x && x > m ? x : m), '');

function changeAt(kind: SharedAnswer['kind'], e: Entry): string {
  return kind === 'mirror' ? maxStr([e.self?.updatedAt, e.perceived?.updatedAt]) : (e.submittedAt ?? '');
}

/** Recomputes state / consent validity of an item whose entries came from two devices. */
export function normalizeItem(
  item: SharedAnswer,
  playerIds: readonly string[],
  sources: (SharedAnswer | undefined)[],
): SharedAnswer {
  const lastChange = maxStr(Object.values(item.entries).map((e) => changeAt(item.kind, e)));
  const entries: Record<string, Entry> = {};
  for (const [p, e] of Object.entries(item.entries)) {
    if (e.consent && (e.consentAt ?? '') < lastChange) {
      const { consentAt: _c, ...rest } = e;
      void _c;
      entries[p] = { ...rest, consent: false };
    } else entries[p] = e;
  }
  const base: SharedAnswer = { ...item, entries };
  const state = deriveState(base, playerIds);
  if (state !== 'awaiting_consent') return { ...base, state };
  const required = requiredConsenters(base, playerIds);
  if (!required.length || !required.every((p) => entries[p]?.consent)) return { ...base, state };
  const prev = sources
    .filter((s): s is SharedAnswer => s?.state === 'revealed')
    .sort((a, b) => (b.revealedAt ?? '').localeCompare(a.revealedAt ?? ''))[0];
  const revealedRevision: Record<string, number> =
    item.kind === 'mirror'
      ? Object.fromEntries(Object.entries(entries).map(([p, e]) => [p, mirrorRevision(e)]))
      : (prev?.revealedRevision ?? Object.fromEntries(Object.keys(entries).map((p) => [p, 1])));
  return {
    ...base,
    state: 'revealed',
    revealedAt: prev?.revealedAt ?? maxStr(required.map((p) => entries[p]!.consentAt)),
    revealedRevision,
  };
}

// ---------- journey ----------

export function mergeJourney(
  L: Journey,
  P: NonNullable<SlotPayload['journey']>,
  link: LiveLink,
  partnerId: string,
): Journey {
  const partnerSlot: 0 | 1 = link.slot === 0 ? 1 : 0;
  const local = link.localPlayerId;

  const chapterProgress: Journey['chapterProgress'] = {};
  for (const ch of new Set([...Object.keys(L.chapterProgress), ...Object.keys(P.chapterProgress)]))
    chapterProgress[ch] = mergeProgress(
      L.chapterProgress[ch],
      P.chapterProgress[ch],
      partnerSlot,
      local,
      partnerId,
    );

  const storyAnswers = Object.fromEntries([
    ...Object.entries(L.storyAnswers).filter(([, a]) => a.playerId !== partnerId),
    ...Object.entries(P.storyAnswers).filter(([, a]) => a.playerId === partnerId),
  ]);

  const mirrorItems: Journey['mirrorItems'] = {};
  for (const k of new Set([...Object.keys(L.mirrorItems), ...Object.keys(P.mirrorItems)])) {
    const li = L.mirrorItems[k];
    const pi = P.mirrorItems[k];
    const base = (li ?? pi)!;
    const entries: Record<string, Entry> = {};
    const mine = li?.entries[local];
    const theirs = pi?.entries[partnerId];
    if (mine) entries[local] = mine;
    if (theirs) entries[partnerId] = theirs;
    const { revealedAt: _a, revealedRevision: _r, ...rest } = base;
    void _a;
    void _r;
    mirrorItems[k] = normalizeItem({ ...rest, entries, state: 'open' }, L.playerIds, [li, pi]);
  }

  const scenario =
    L.scenario && P.scenario
      ? P.scenario.setAt > L.scenario.setAt
        ? P.scenario
        : L.scenario
      : (L.scenario ?? P.scenario);

  const otherSide =
    L.otherSide && P.otherSide
      ? P.otherSide.setAt > L.otherSide.setAt
        ? P.otherSide
        : L.otherSide
      : (L.otherSide ?? P.otherSide);

  return {
    ...L,
    ...(otherSide ? { otherSide } : {}),
    status:
      L.status === 'archived'
        ? 'archived'
        : L.status === 'completed' || P.status === 'completed'
          ? 'completed'
          : L.status,
    ...(scenario ? { scenario } : {}),
    chapterProgress,
    storyAnswers,
    mirrorItems,
    observed: [
      ...L.observed.filter((o) => o.playerId !== partnerId),
      ...P.observed.filter((o) => o.playerId === partnerId),
    ],
    nextConversation: [
      ...L.nextConversation.filter((n) => n.ownerId !== partnerId),
      ...P.nextConversation.filter((n) => n.ownerId === partnerId),
    ],
    introSeen: L.introSeen || P.introSeen,
    updatedAt: maxStr([L.updatedAt, P.updatedAt]),
    lastPlayedAt: maxStr([L.lastPlayedAt, P.lastPlayedAt]),
  };
}

/** Applies the partner's slot to this device's save. Returns the same object when nothing changed. */
export function mergePartner(save: SaveRoot, link: LiveLink, p: SlotPayload): SaveRoot {
  const partnerId = p.playerId;
  if (partnerId === link.localPlayerId || p.journeyId !== link.journeyId) return save;

  const players = { ...save.players, [partnerId]: { ...p.player, id: partnerId } };
  const profiles = Object.fromEntries([
    ...Object.entries(save.profiles).filter(([, x]) => x.ownerId !== partnerId),
    ...Object.entries(p.profiles).filter(([, x]) => x.ownerId === partnerId),
  ]);
  let journeys = save.journeys;
  let settings = save.settings;
  const L = save.journeys[link.journeyId];
  if (p.journey && p.journey.id === link.journeyId) {
    if (!L) {
      // The partner created the journey (the inviter's device adopts it, docs/05 §5.3).
      const t = p.journey.updatedAt;
      journeys = Object.fromEntries(
        Object.entries(save.journeys).map(([k, j]) => [
          k,
          j.status === 'active' ? { ...j, status: 'archived' as const, updatedAt: t } : j,
        ]),
      );
      journeys[link.journeyId] = { ...p.journey, mode: 'remote_online', remote: remoteFor(link) };
      settings = { ...settings, lastJourneyId: link.journeyId };
    } else {
      journeys = { ...save.journeys, [link.journeyId]: mergeJourney(L, p.journey, link, partnerId) };
    }
  }
  const next = { ...save, players, profiles, journeys, settings };
  return JSON.stringify(next) === JSON.stringify(save) ? save : next;
}

/** Players whose private pages live on another device (the partner in any live journey). */
export function livePartnerIds(save: SaveRoot): Set<string> {
  const out = new Set<string>();
  const locals = new Set<string>();
  for (const j of Object.values(save.journeys)) {
    const local = j.mode === 'remote_online' ? j.remote?.localPlayerId : undefined;
    if (!local) continue;
    locals.add(local);
    for (const id of j.playerIds) if (id !== local) out.add(id);
  }
  // Someone who was this device's own player in another room is still this device's player.
  for (const id of locals) out.delete(id);
  return out;
}

/**
 * The real players that belong to this device — never a partner received through online play,
 * even after playing in the same room (docs/06 "ตัวตนของเครื่องนี้"). Used wherever the game asks
 * "คุณคือใคร".
 */
export function ownPlayers(save: SaveRoot): SaveRoot['players'][string][] {
  const away = livePartnerIds(save);
  return Object.values(save.players).filter((p) => p.kind === 'real' && !away.has(p.id));
}

/** `decline:<startedAt>` — "ขอเวลาก่อน" for one chapter invitation (one run of the chapter). docs/07. */
export const declineItem = (startedAt: string | undefined) => `decline:${startedAt ?? ''}`;
