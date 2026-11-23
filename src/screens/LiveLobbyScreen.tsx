/**
 * S19 Live Lobby — Phase 3C (docs/05 §5.3, docs/08 §6.3, docs/10 §10.3).
 * Create a room (inviter) → share `#/live?join=room.key` or the room code → partner joins → both play like Play
 * Together, each on their own device. Without a reachable relay the feature is disabled with the
 * reason shown (no fake online).
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Wifi, WifiOff } from 'lucide-react';
import { ui } from '../content/th/ui';
import { BrandArt, ScreenHeader } from '../components/Misc';
import { PixelButton } from '../components/PixelButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PlayerForm, emptyPlayerInput } from '../components/PlayerForm';
import { useGame } from '../store/game';
import { createPlayer } from '../store/actions';
import { newJourneyId, nowIso } from '../lib/ids';
import type { GameSession, SaveRoot } from '../persistence/schema';
import { decryptJson, newRoomCode, normalizeRoomCode, parseJoin, roomFromCode } from '../live/crypto';
import { claimSlot, getRoom, leaveSlot, liveAvailable } from '../live/api';
import { linkOf, remoteFor, SlotPayload, type LiveLink } from '../live/merge';
import {
  clearPendingLink,
  readPendingLink,
  startLive,
  stopLive,
  useLive,
  writePendingLink,
} from '../live/sync';

const t = ui.live;

function Limits() {
  return (
    <section className="flex flex-col gap-1" aria-labelledby="live-limits-h">
      <h2 id="live-limits-h" className="m-0 text-base font-semibold">
        {t.limitsHeading}
      </h2>
      <ul className="m-0 flex flex-col gap-1 pl-5 text-sm">
        {t.limits.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  );
}

export function LiveStatusLine({ partnerName }: { partnerName: string }) {
  const { status, partnerOnline, partnerLeft } = useLive();
  const online = status === 'synced' || status === 'pending';
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-lavender" role="status" data-testid="live-status">
      <span className="inline-flex items-center gap-1">
        {online ? <Wifi aria-hidden className="h-4 w-4" /> : <WifiOff aria-hidden className="h-4 w-4" />}
        {t.status[status]}
      </span>
      <span>
        {partnerLeft ? t.partnerLeft(partnerName) : partnerOnline ? t.partnerOnline(partnerName) : t.partnerOffline(partnerName)}
      </span>
    </p>
  );
}

function realPlayers(save: SaveRoot) {
  return Object.values(save.players).filter((p) => p.kind === 'real');
}

/** Pick an existing real player, or make a new one. */
function ChooseSelf({ submitLabel, busy, onChosen }: { submitLabel: string; busy: boolean; onChosen: (id: string) => void }) {
  const [players] = useState(() => realPlayers(useGame.getState().save));
  const [creating, setCreating] = useState(players.length === 0);
  const [initial] = useState(() => emptyPlayerInput());
  if (creating)
    return (
      <PlayerForm
        heading={t.selfHeading}
        initial={initial}
        submitLabel={submitLabel}
        onSubmit={(v) => {
          if (busy) return;
          const id = createPlayer(v, 'real');
          useGame.getState().flush();
          onChosen(id);
        }}
      />
    );
  return (
    <section className="panel flex flex-col gap-3" aria-labelledby="live-who-h">
      <h2 id="live-who-h" className="m-0 text-lg font-semibold">
        {t.whoAreYou}
      </h2>
      <div className="flex flex-wrap gap-2">
        {players.map((p) => (
          <PixelButton key={p.id} disabled={busy} onClick={() => onChosen(p.id)}>
            {p.nickname}
          </PixelButton>
        ))}
        <PixelButton variant="ghost" disabled={busy} onClick={() => setCreating(true)}>
          {t.newSelf}
        </PixelButton>
      </div>
    </section>
  );
}

const inviteUrl = (l: LiveLink) => {
  const base = window.location.href.split('#')[0];
  return `${base}#/live?join=${l.room}.${l.key}`;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <PixelButton
      className="self-start"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(
          () => setCopied(true),
          () => setCopied(false),
        );
      }}
    >
      <Copy aria-hidden className="h-5 w-5" />
      {copied ? t.copied : label}
    </PixelButton>
  );
}

function Waiting({ link, onCancel }: { link: LiveLink; onCancel: () => void }) {
  const url = inviteUrl(link);
  return (
    <section className="panel flex flex-col gap-3" aria-labelledby="live-invite-h" data-testid="live-waiting">
      <h2 id="live-invite-h" className="m-0 text-lg font-semibold">
        {t.inviteHeading}
      </h2>
      <p className="m-0 text-sm text-lavender">{t.inviteHint}</p>
      <input
        readOnly
        value={url}
        aria-label={t.inviteHeading}
        data-testid="live-invite-url"
        className="w-full rounded border border-lavender/40 bg-navy px-2 py-2 text-[13px]"
        onFocus={(e) => e.currentTarget.select()}
      />
      <CopyButton text={url} label={t.copy} />
      {link.code && (
        <>
          <h3 className="m-0 mt-2 text-base font-semibold">{t.codeHeading}</h3>
          <p className="m-0 text-sm text-lavender">{t.codeHint}</p>
          <p
            className="m-0 select-all font-mono text-2xl font-bold tracking-[0.2em]"
            data-testid="live-invite-code"
            aria-label={t.codeLabel}
          >
            {link.code}
          </p>
          <CopyButton text={link.code} label={t.copyCode} />
        </>
      )}
      <p className="m-0 text-sm" role="status">
        {t.waitingJoin}
      </p>
      <LiveStatusLine partnerName="" />
      <PixelButton variant="ghost" className="self-start" onClick={onCancel}>
        {t.cancelRoom}
      </PixelButton>
    </section>
  );
}

function Current({ journey }: { journey: GameSession }) {
  const navigate = useNavigate();
  const players = useGame((s) => s.save.players);
  const link = linkOf(journey)!;
  const partnerId = journey.playerIds.find((x) => x !== link.localPlayerId)!;
  const partner = players[partnerId];
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="panel flex flex-col gap-3" aria-labelledby="live-current-h" data-testid="live-current">
      <h2 id="live-current-h" className="m-0 text-lg font-semibold">
        {t.current(partner?.nickname ?? '')}
      </h2>
      <LiveStatusLine partnerName={partner?.nickname ?? ''} />
      <div className="flex flex-wrap gap-2">
        <PixelButton onClick={() => navigate(`/j/${journey.id}/chapters`)}>{t.play}</PixelButton>
        <PixelButton variant="ghost" onClick={() => setConfirm(true)}>
          {t.leave}
        </PixelButton>
      </div>
      <ConfirmDialog
        open={confirm}
        title={t.leaveTitle}
        body={t.leaveBody}
        confirmLabel={t.leave}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          void leaveSlot(link.room, link.slot, link.token);
          stopLive();
          // Keep the journey, but without the room it plays no further (docs/05 §5.3).
          useGame.getState().update((s) => {
            const j = s.journeys[journey.id];
            if (!j) return s;
            return { ...s, journeys: { ...s.journeys, [j.id]: { ...j, status: 'archived', remote: { kind: 'online', localPlayerId: link.localPlayerId } } } };
          });
          useGame.getState().flush();
          navigate('/');
        }}
      />
    </section>
  );
}

type JoinState =
  | { kind: 'loading' }
  | { kind: 'ready'; room: string; key: string; host: SlotPayload }
  | { kind: 'error'; message: string };

function Join({ room, keyText }: { room: string; keyText: string }) {
  const navigate = useNavigate();
  const [state, setState] = useState<JoinState>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setState({ kind: 'loading' });
    const r = await getRoom(room);
    if (!r.ok) return setState({ kind: 'error', message: r.error === 'no_room' ? t.noRoom : t.offline });
    if (r.body.slots.some((s) => s.slot === 1)) return setState({ kind: 'error', message: t.taken });
    const box = r.body.slots.find((s) => s.slot === 0);
    if (!box?.iv || !box.data) return setState({ kind: 'error', message: t.noRoom });
    try {
      const p = SlotPayload.safeParse(await decryptJson({ iv: box.iv, data: box.data }, keyText));
      if (!p.success) return setState({ kind: 'error', message: t.badLink });
      setState({ kind: 'ready', room, key: keyText, host: p.data });
    } catch {
      setState({ kind: 'error', message: t.badLink });
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, keyText]);

  async function join(selfId: string) {
    if (state.kind !== 'ready' || busy) return;
    setBusy(true);
    setError(null);
    const c = await claimSlot(room, 1);
    if (!c.ok) {
      setBusy(false);
      return setError(c.error === 'taken' ? t.taken : c.error === 'offline' ? t.offline : t.noRoom);
    }
    const host = state.host;
    const link: LiveLink = { room, key: keyText, token: c.body.token, slot: 1, localPlayerId: selfId, journeyId: host.journeyId };
    const now = nowIso();
    useGame.getState().update((s) => {
      const journeys = Object.fromEntries(
        Object.entries(s.journeys).map(([k, j]) => [k, j.status === 'active' ? { ...j, status: 'archived' as const, updatedAt: now } : j]),
      );
      journeys[host.journeyId] = {
        id: host.journeyId,
        mode: 'remote_online',
        playerIds: [host.playerId, selfId],
        status: 'active',
        chapterProgress: {},
        storyAnswers: {},
        mirrorItems: {},
        observed: [],
        nextConversation: [],
        introSeen: true,
        remote: remoteFor(link),
        createdAt: now,
        updatedAt: now,
        lastPlayedAt: now,
      };
      return {
        ...s,
        players: { ...s.players, [host.playerId]: { ...host.player, id: host.playerId } },
        journeys,
        settings: { ...s.settings, lastJourneyId: host.journeyId },
      };
    });
    useGame.getState().flush();
    navigate(`/j/${host.journeyId}/chapters`, { replace: true });
  }

  if (state.kind === 'loading')
    return (
      <p role="status" className="m-0 text-lavender">
        {t.checking}
      </p>
    );
  if (state.kind === 'error')
    return (
      <div className="panel flex flex-col gap-3">
        <p role="alert" className="m-0 text-orange">
          {state.message}
        </p>
        <PixelButton variant="ghost" className="self-start" onClick={() => void load()}>
          {t.retry}
        </PixelButton>
      </div>
    );
  return (
    <div className="flex flex-col gap-4" data-testid="live-join">
      <section className="panel flex flex-col gap-2">
        <h2 className="m-0 text-lg font-semibold">{t.joinFrom(state.host.player.nickname)}</h2>
        <p className="m-0 text-sm">{t.intro}</p>
        <Limits />
      </section>
      {error && (
        <p role="alert" className="m-0 text-orange">
          {error}
        </p>
      )}
      <ChooseSelf submitLabel={busy ? t.joining : t.join} busy={busy} onChosen={(id) => void join(id)} />
    </div>
  );
}

/** The partner types the room code instead of opening the link (docs/08 §6.3). */
function CodeEntry({ onCode }: { onCode: (j: { room: string; key: string }) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel flex flex-col gap-2"
      aria-labelledby="live-code-h"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        if (!normalizeRoomCode(text)) return setError(t.badCode);
        setError(null);
        setBusy(true);
        void roomFromCode(text).then((j) => {
          setBusy(false);
          if (j) onCode(j);
        });
      }}
    >
      <h2 id="live-code-h" className="m-0 text-lg font-semibold">
        {t.haveCode}
      </h2>
      <label className="flex flex-col gap-1 text-sm">
        {t.codeLabel}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.codePlaceholder}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={16}
          data-testid="live-code-input"
          className="w-full rounded border border-lavender/40 bg-navy px-2 py-2 font-mono text-lg tracking-[0.15em]"
        />
      </label>
      {error && (
        <p role="alert" className="m-0 text-orange">
          {error}
        </p>
      )}
      <PixelButton type="submit" className="self-start" disabled={busy}>
        {busy ? t.joining : t.joinByCode}
      </PixelButton>
    </form>
  );
}

function Create({ onCreated, onCode }: { onCreated: (l: LiveLink) => void; onCode: (j: { room: string; key: string }) => void }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void liveAvailable().then((ok) => alive && setAvailable(ok));
    return () => {
      alive = false;
    };
  }, []);

  async function create(selfId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const code = newRoomCode();
    const { room, key } = (await roomFromCode(code))!;
    const c = await claimSlot(room, 0);
    setBusy(false);
    if (!c.ok) return setError(c.error === 'taken' ? t.taken : t.offline);
    const link: LiveLink = { room, key, token: c.body.token, slot: 0, localPlayerId: selfId, journeyId: newJourneyId(), code };
    writePendingLink(link);
    onCreated(link);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="panel flex flex-col gap-2">
        <p className="m-0 text-sm">{t.intro}</p>
        <Limits />
      </section>
      {available === null && (
        <p role="status" className="m-0 text-lavender">
          {t.checking}
        </p>
      )}
      {available === false && (
        <p className="m-0 text-orange" data-testid="live-unavailable">
          {t.unavailable}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-orange">
          {error}
        </p>
      )}
      {available && <CodeEntry onCode={onCode} />}
      {available && <ChooseSelf submitLabel={busy ? t.creating : t.createRoom} busy={busy} onChosen={(id) => void create(id)} />}
      <Link to="/remote" className="btn btn-ghost self-start no-underline">
        {t.sealedLink}
      </Link>
    </div>
  );
}

export function LiveLobbyScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // The key lives only in the fragment; read it once and drop it from the address bar (docs/08 §6.3).
  const [joinCode, setJoinCode] = useState(() => parseJoin(params.get('join') ?? ''));
  const [badJoin] = useState(() => params.has('join') && !parseJoin(params.get('join') ?? ''));
  useEffect(() => {
    if (params.has('join')) setParams({}, { replace: true });
  }, [params, setParams]);

  const journeys = useGame((s) => s.save.journeys);
  const live = Object.values(journeys).find((j) => j.status === 'active' && linkOf(j));
  const [pending, setPending] = useState<LiveLink | null>(() => {
    const p = readPendingLink();
    return p && !useGame.getState().save.journeys[p.journeyId] ? p : null;
  });

  // The inviter waits here: once the partner's journey arrives, go play (docs/05 §5.3).
  useEffect(() => {
    if (pending) startLive(pending);
  }, [pending]);
  useEffect(() => {
    if (pending && journeys[pending.journeyId]) navigate(`/j/${pending.journeyId}/chapters`, { replace: true });
  }, [pending, journeys, navigate]);

  const crypto = !!globalThis.crypto?.subtle;
  let body: React.ReactNode;
  if (!crypto) body = <p role="alert" className="m-0 text-orange">{ui.remote.noCrypto}</p>;
  else if (badJoin) body = <p role="alert" className="m-0 text-orange">{t.badLink}</p>;
  else if (joinCode) body = <Join room={joinCode.room} keyText={joinCode.key} />;
  else if (pending)
    body = (
      <Waiting
        link={pending}
        onCancel={() => {
          void leaveSlot(pending.room, pending.slot, pending.token);
          stopLive();
          clearPendingLink();
          setPending(null);
        }}
      />
    );
  else if (live) body = <Current journey={live} />;
  else body = <Create onCreated={setPending} onCode={setJoinCode} />;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8" data-testid="live-lobby">
      <ScreenHeader title={t.heading} backTo="/mode" preferHistory />
      <BrandArt src="./brand/mode-remote.png" size="h-24 w-24 self-center" />
      {body}
    </main>
  );
}
