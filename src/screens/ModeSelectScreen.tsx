import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe2, User, Users } from 'lucide-react';
import { ui } from '../content/th/ui';
import { ScreenHeader } from '../components/Misc';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FEATURES } from '../lib/features';
import { useGame } from '../store/game';

type ModeKey = 'solo' | 'together' | 'remote';

/** S2 — docs/06 S2. Unbuilt modes stay disabled with the reason visible. */
export function ModeSelectScreen() {
  const navigate = useNavigate();
  const hasActive = useGame((s) => Object.values(s.save.journeys).some((j) => j.status === 'active'));
  const [confirm, setConfirm] = useState(false);

  const cards: { key: ModeKey; Icon: typeof User; enabled: boolean; reason: string }[] = [
    { key: 'solo', Icon: User, enabled: FEATURES.characterCreation, reason: ui.mode.soloNotReady },
    { key: 'together', Icon: Users, enabled: FEATURES.together, reason: ui.comingSoon },
    { key: 'remote', Icon: Globe2, enabled: FEATURES.remote, reason: ui.comingSoon },
  ];

  function choose(key: ModeKey) {
    if (key !== 'solo') return;
    // TC-RES-09: an unfinished journey is archived only after the player agrees.
    if (hasActive) setConfirm(true);
    else navigate('/players/new?mode=solo');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={ui.mode.heading} backTo="/intro" />
      <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-3">
        {cards.map(({ key, Icon, enabled, reason }) => {
          const text = ui.mode[key];
          const reasonId = `mode-${key}-reason`;
          return (
            <li key={key}>
              <button
                type="button"
                disabled={!enabled}
                aria-describedby={enabled ? undefined : reasonId}
                onClick={() => choose(key)}
                className="panel flex h-full w-full flex-col items-start gap-2 text-left disabled:opacity-60"
              >
                <Icon aria-hidden className="h-7 w-7 text-orange" />
                <span className="text-lg font-semibold">{text.title}</span>
                <span className="text-sm">{text.body}</span>
                <span className="text-[13px] text-lavender">{text.needs}</span>
                {!enabled && (
                  <span id={reasonId} className="mt-1 rounded-full border border-lavender/50 px-2 text-[13px] text-lavender">
                    {reason}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={confirm}
        title={ui.player.activeExists}
        body={ui.player.activeExistsBody}
        confirmLabel={ui.player.activeExistsConfirm}
        onCancel={() => setConfirm(false)}
        onConfirm={() => navigate('/players/new?mode=solo')}
      />
    </main>
  );
}
