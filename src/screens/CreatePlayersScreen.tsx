import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ui } from '../content/th/ui';
import { PlayerForm, emptyPlayerInput, randomPreset } from '../components/PlayerForm';
import { createPlayer, createSoloJourney, type PlayerInput } from '../store/actions';
import { useGame } from '../store/game';

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
      {!self ? (
        <PlayerForm key="self" heading={ui.player.createSelfHeading} initial={selfInitial} submitLabel={solo ? ui.player.next : ui.player.save} onSubmit={onSelf} />
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
