import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, UserPlus } from 'lucide-react';
import { ui } from '../content/th/ui';
import { PlayerForm, emptyPlayerInput, randomPreset } from '../components/PlayerForm';
import { createPlayer, createSoloJourney, type PlayerInput } from '../store/actions';
import { useGame } from '../store/game';
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
  return Object.values(save.players)
    .filter((p) => p.kind === 'real')
    .sort((a, b) => (key(a) < key(b) ? 1 : -1));
}

/**
 * S3 create flow. mode=solo: self → imagined partner → journey (docs/05 §3).
 * Without mode: create a standalone player ("สร้างตัวตนของฉัน").
 */
export function CreatePlayersScreen() {
  const [params] = useSearchParams();
  const solo = params.get('mode') === 'solo';
  const navigate = useNavigate();
  const [self, setSelf] = useState<{ id: string; input: PlayerInput } | null>(null);
  // Random start per form (docs/06 S3); kept in state so re-renders do not reshuffle it.
  const [selfInitial] = useState(() => emptyPlayerInput());
  const [partnerInitial, setPartnerInitial] = useState<PlayerInput | null>(null);
  // Reuse an existing self instead of silently creating a duplicate (docs/06 S3).
  const [selves] = useState(() => (solo ? knownSelves(useGame.getState().save) : []));
  const [picking, setPicking] = useState(selves.length > 0);
  const [picked, setPicked] = useState<string | undefined>(selves[0]?.id);

  function choosePicked() {
    const p = selves.find((x) => x.id === picked);
    if (!p) return;
    const input: PlayerInput = {
      nickname: p.nickname,
      sentenceEnding: p.sentenceEnding,
      addressStyle: p.addressStyle,
      appearance: p.appearance,
    };
    setPartnerInitial(emptyPlayerInput(randomPreset(p.appearance.preset)));
    setSelf({ id: p.id, input });
    setPicking(false);
    window.scrollTo({ top: 0 });
  }

  function onSelf(v: PlayerInput) {
    const id = createPlayer(v, 'real');
    if (!solo) {
      useGame.getState().flush();
      navigate('/profile?created=1', { replace: true });
      return;
    }
    setPartnerInitial(emptyPlayerInput(randomPreset(v.appearance.preset)));
    setSelf({ id, input: v });
    window.scrollTo({ top: 0 });
  }

  function onPartner(v: PlayerInput) {
    if (!self) return;
    const partnerId = createPlayer(v, 'imagined', self.id);
    createSoloJourney(self.id, partnerId);
    useGame.getState().flush();
    navigate('/profile?created=1', { replace: true });
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
      <div>
        <Link to={solo ? '/mode' : '/'} className="btn btn-ghost no-underline">
          <ArrowLeft aria-hidden className="h-5 w-5" />
          {ui.back}
        </Link>
      </div>
      {picking ? (
        <section aria-labelledby="pick-h" className="flex flex-col gap-4">
          <h1 id="pick-h" className="m-0 text-2xl font-semibold">
            {ui.player.pickSelfHeading}
          </h1>
          <p className="m-0 text-lavender">{ui.player.pickSelfBody}</p>
          <div
            role="group"
            aria-label={ui.player.pickSelfHeading}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {selves.map((p) => (
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
            <PixelButton onClick={choosePicked} disabled={!picked}>
              {ui.player.useSelf}
            </PixelButton>
            <PixelButton
              variant="ghost"
              icon={<UserPlus aria-hidden className="h-5 w-5" />}
              onClick={() => setPicking(false)}
            >
              {ui.player.newSelf}
            </PixelButton>
          </div>
        </section>
      ) : !self ? (
        <PlayerForm
          key="self"
          heading={ui.player.createSelfHeading}
          initial={selfInitial}
          submitLabel={solo ? ui.player.next : ui.player.save}
          onSubmit={onSelf}
        />
      ) : (
        <PlayerForm
          key="partner"
          heading={ui.player.createPartnerHeading(self.input.nickname.trim())}
          initial={partnerInitial ?? emptyPlayerInput(randomPreset(self.input.appearance.preset))}
          imagined
          otherNickname={self.input.nickname}
          submitLabel={ui.player.save}
          onSubmit={onPartner}
        />
      )}
    </main>
  );
}
