import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PinGate } from './PinGate';
import { useGame } from '../store/game';
import { useSession } from '../store/session';
import { forgetPin, recordPinAttempt } from '../store/pinActions';
import { purgeBackup } from '../persistence/persist';
import { livePartnerIds } from '../live/merge';
import { ui } from '../content/th/ui';

/**
 * Shows S13 before a player's private pages when that player has a PIN and is not the one who
 * unlocked most recently (docs/05 §4.2 step 2, docs/08 §4). No PIN → children straight away.
 */
export function PlayerGate({
  playerId,
  children,
  onCancel,
}: {
  playerId: string;
  children: ReactNode;
  onCancel?: () => void;
}) {
  const player = useGame((s) => s.save.players[playerId]);
  const unlocked = useSession((s) => s.unlocked);
  const away = useGame((s) => livePartnerIds(s.save).has(playerId));
  if (away)
    return (
      <p role="alert" className="panel m-4 text-center" data-testid="live-away">
        {ui.live.onPartnerDevice(player?.nickname ?? '')}
      </p>
    );
  if (!player?.pin || unlocked === playerId) return <>{children}</>;
  return (
    <PinGate
      player={{ id: player.id, nickname: player.nickname, pin: player.pin }}
      onUnlock={() => useSession.getState().unlock(player.id)}
      onAttempt={(r) => useGame.getState().update((s) => recordPinAttempt(s, player.id, r))}
      onForget={() => {
        useGame.getState().update((s) => forgetPin(s, player.id));
        useGame.getState().flush();
        purgeBackup(); // the deleted answers must not survive in the backup (audit H-4)
        useSession.getState().unlock(player.id);
      }}
      onCancel={onCancel}
    />
  );
}

/** Route wrapper: gates the page by the `:playerId` URL parameter. */
export function RouteGate({ children }: { children: ReactNode }) {
  const { playerId = '' } = useParams();
  const navigate = useNavigate();
  return (
    <PlayerGate playerId={playerId} onCancel={() => navigate(-1)}>
      {children}
    </PlayerGate>
  );
}
