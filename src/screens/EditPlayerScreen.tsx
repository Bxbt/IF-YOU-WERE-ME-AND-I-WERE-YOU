import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ui } from '../content/th/ui';
import { PlayerForm } from '../components/PlayerForm';
import { ScreenHeader } from '../components/Misc';
import { updatePlayer } from '../store/actions';
import { useGame } from '../store/game';
import { toast } from '../components/toast';

export function EditPlayerScreen() {
  const { playerId = '' } = useParams();
  const player = useGame((s) => s.save.players[playerId]);
  const navigate = useNavigate();
  if (!player) return <Navigate to="/profile" replace />;
  const { nickname, sentenceEnding, addressStyle, addressCustom, appearance, pronouns, bio } = player;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
      <ScreenHeader title="" backTo="/profile" />
      <PlayerForm
        heading={ui.player.editHeading}
        initial={{
          nickname,
          sentenceEnding,
          addressStyle,
          addressCustom,
          appearance: { ...appearance },
          pronouns,
          bio,
        }}
        imagined={player.kind === 'imagined'}
        submitLabel={ui.player.save}
        onSubmit={(v) => {
          updatePlayer(playerId, v);
          useGame.getState().flush();
          toast(ui.player.saved, 'success');
          navigate('/profile');
        }}
      />
    </main>
  );
}
