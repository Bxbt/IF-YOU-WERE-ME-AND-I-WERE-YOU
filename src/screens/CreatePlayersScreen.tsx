import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, UserPlus } from 'lucide-react';
import { ui } from '../content/th/ui';
import { PlayerForm, emptyPlayerInput, randomPreset } from '../components/PlayerForm';
import {
  createPlayer,
  createRemoteJourney,
  createSoloJourney,
  createTogetherJourney,
  imaginedWithThoughts,
  linkImaginedToReal,
  type PlayerInput,
} from '../store/actions';
import { useGame } from '../store/game';
import { ownPlayers } from '../live/merge';
import { PixelButton } from '../components/PixelButton';
import { SpriteView } from '../scene/CharacterCanvas';
import type { Player, SaveRoot } from '../persistence/schema';

/** Real players, the one used most recently first (docs/06 S3 "Solo เมื่อมีตัวตนอยู่แล้ว"). */
function knownSelves(save: SaveRoot): Player[] {
  const lastUsed = new Map<string, string>();
  for (const j of Object.values(save.journeys)) {
    const id = j.playerIds[0];
    if (!lastUsed.has(id) || lastUsed.get(id)! < j.lastPlayedAt) lastUsed.set(id, j.lastPlayedAt);
  }
  const key = (p: Player) => lastUsed.get(p.id) ?? p.createdAt;
  return ownPlayers(save).sort((a, b) => (key(a) < key(b) ? 1 : -1));
}

/** Picks one of the existing real players, or asks for a new one (docs/06 S3). */
function PlayerPicker({
  heading,
  body,
  players,
  onUse,
  onNew,
}: {
  heading: string;
  body: string;
  players: Player[];
  onUse: (p: Player) => void;
  onNew: () => void;
}) {
  const [picked, setPicked] = useState<string | undefined>(players[0]?.id);
  return (
    <section aria-labelledby="pick-h" className="flex flex-col gap-4">
      <h1 id="pick-h" className="m-0 text-2xl font-semibold">
        {heading}
      </h1>
      <p className="m-0 text-lavender">{body}</p>
      <div role="group" aria-label={heading} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {players.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={picked === p.id}
            onClick={() => setPicked(p.id)}
            className={`panel flex items-end gap-4 text-left ${picked === p.id ? 'border-orange' : ''}`}
          >
            <SpriteView appearance={p.appearance} scale={2} label="" />
            <span className="flex-1 text-lg font-semibold">{p.nickname}</span>
            {picked === p.id && <Check aria-hidden className="h-5 w-5 text-orange" />}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <PixelButton
          onClick={() => picked && onUse(players.find((p) => p.id === picked)!)}
          disabled={!picked}
        >
          {ui.player.useSelf}
        </PixelButton>
        <PixelButton variant="ghost" icon={<UserPlus aria-hidden className="h-5 w-5" />} onClick={onNew}>
          {ui.player.newSelf}
        </PixelButton>
      </div>
    </section>
  );
}

const toInput = (p: Player): PlayerInput => ({
  nickname: p.nickname,
  sentenceEnding: p.sentenceEnding,
  addressStyle: p.addressStyle,
  addressCustom: p.addressCustom,
  appearance: p.appearance,
});

/**
 * S3 create flow (docs/05 §3, §4). mode=solo: self → imagined partner → journey.
 * mode=together: A → B (both real) → journey. Existing real players can be reused either way.
 * Without mode: create a standalone player ("สร้างตัวตนของฉัน").
 */
export function CreatePlayersScreen() {
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const remote = mode === 'remote';
  // Remote (3A) creates players like Solo: the partner is pictured here (docs/05 §5.0).
  const solo = mode === 'solo' || remote;
  const together = mode === 'together';
  const navigate = useNavigate();
  const [self, setSelf] = useState<{ id: string; input: PlayerInput } | null>(null);
  // Random start per form (docs/06 S3); kept in state so re-renders do not reshuffle it.
  const [selfInitial] = useState(() => emptyPlayerInput());
  const [partnerInitial, setPartnerInitial] = useState<PlayerInput | null>(null);
  // Reuse an existing self instead of silently creating a duplicate (docs/06 S3).
  const [selves] = useState(() => (solo || together ? knownSelves(useGame.getState().save) : []));
  const [pickingSelf, setPickingSelf] = useState(selves.length > 0);
  const otherReal = self ? selves.filter((p) => p.id !== self.id) : [];
  const [pickingPartner, setPickingPartner] = useState(true);

  function chooseSelf(id: string, input: PlayerInput) {
    setPartnerInitial(emptyPlayerInput(randomPreset(input.appearance.preset)));
    setSelf({ id, input });
    setPickingSelf(false);
    window.scrollTo({ top: 0 });
  }

  function onSelf(v: PlayerInput) {
    const id = createPlayer(v, 'real');
    if (!solo && !together) {
      useGame.getState().flush();
      navigate('/profile?created=1', { replace: true });
      return;
    }
    chooseSelf(id, v);
  }

  // Together: players who played alone before can carry over what they thought about their
  // imagined partner (docs/05 §4.3). One question per player who has such thoughts.
  const [linkQueue, setLinkQueue] = useState<{ owner: string; partner: string }[] | null>(null);

  function done(partnerId: string) {
    if (!self) return;
    if (together) createTogetherJourney(self.id, partnerId);
    else if (remote) createRemoteJourney(self.id, partnerId);
    else createSoloJourney(self.id, partnerId);
    useGame.getState().flush();
    navigate(remote ? '/remote' : '/profile?created=1', { replace: true });
  }

  function finish(partnerId: string) {
    if (!self) return;
    if (together) {
      const save = useGame.getState().save;
      const queue = [
        { owner: self.id, partner: partnerId },
        { owner: partnerId, partner: self.id },
      ].filter((x) => imaginedWithThoughts(save, x.owner).length > 0);
      if (queue.length > 0) {
        setLinkQueue(queue);
        setPartnerId(partnerId);
        return;
      }
    }
    done(partnerId);
  }
  const [partnerIdState, setPartnerId] = useState<string | null>(null);

  function nextLink(link?: { owner: string; imagined: string; real: string }) {
    if (link) useGame.getState().update((s) => linkImaginedToReal(s, link.owner, link.imagined, link.real));
    const rest = (linkQueue ?? []).slice(1);
    if (rest.length > 0) setLinkQueue(rest);
    else if (partnerIdState) done(partnerIdState);
  }

  const back = (
    <div>
      <Link to={remote ? '/remote' : solo || together ? '/mode' : '/'} className="btn btn-ghost no-underline">
        <ArrowLeft aria-hidden className="h-5 w-5" />
        {ui.back}
      </Link>
    </div>
  );

  let body: React.ReactNode;
  const link = linkQueue?.[0];
  if (link) {
    const save = useGame.getState().save;
    const ownerName = save.players[link.owner]?.nickname ?? '';
    const partnerName = save.players[link.partner]?.nickname ?? '';
    body = (
      <section className="panel flex flex-col gap-3" aria-labelledby="link-h" data-testid="link-imagined">
        <h1 id="link-h" className="m-0 text-xl font-semibold">
          {ui.player.linkHeading(ownerName, partnerName)}
        </h1>
        <p className="m-0 text-sm text-lavender">{ui.player.linkBody(ownerName, partnerName)}</p>
        <div className="flex flex-wrap gap-2">
          {imaginedWithThoughts(save, link.owner).map((p) => (
            <PixelButton
              key={p.id}
              onClick={() => nextLink({ owner: link.owner, imagined: p.id, real: link.partner })}
            >
              {ui.player.linkUse(p.nickname)}
            </PixelButton>
          ))}
          <PixelButton variant="ghost" onClick={() => nextLink()}>
            {ui.player.linkNo}
          </PixelButton>
        </div>
      </section>
    );
  } else if (pickingSelf) {
    body = (
      <PlayerPicker
        heading={together ? ui.player.pickAHeading : ui.player.pickSelfHeading}
        body={ui.player.pickSelfBody}
        players={selves}
        onUse={(p) => chooseSelf(p.id, toInput(p))}
        onNew={() => setPickingSelf(false)}
      />
    );
  } else if (!self) {
    body = (
      <PlayerForm
        key="self"
        heading={together ? ui.player.createAHeading : ui.player.createSelfHeading}
        initial={selfInitial}
        submitLabel={solo || together ? ui.player.next : ui.player.save}
        onSubmit={onSelf}
      />
    );
  } else if (together && pickingPartner && otherReal.length > 0) {
    body = (
      <PlayerPicker
        heading={ui.player.pickBHeading(self.input.nickname.trim())}
        body={ui.player.pickSelfBody}
        players={otherReal}
        onUse={(p) => finish(p.id)}
        onNew={() => setPickingPartner(false)}
      />
    );
  } else if (together) {
    body = (
      <PlayerForm
        key="partner-real"
        heading={ui.player.createBHeading(self.input.nickname.trim())}
        initial={partnerInitial ?? emptyPlayerInput(randomPreset(self.input.appearance.preset))}
        otherNickname={self.input.nickname}
        submitLabel={ui.player.save}
        onSubmit={(v) => finish(createPlayer(v, 'real'))}
      />
    );
  } else {
    body = (
      <PlayerForm
        key="partner"
        heading={ui.player.createPartnerHeading(self.input.nickname.trim())}
        initial={partnerInitial ?? emptyPlayerInput(randomPreset(self.input.appearance.preset))}
        imagined
        otherNickname={self.input.nickname}
        submitLabel={ui.player.save}
        onSubmit={(v) => finish(createPlayer(v, 'imagined', self.id))}
      />
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
      {back}
      {body}
    </main>
  );
}
