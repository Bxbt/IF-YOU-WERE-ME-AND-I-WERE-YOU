/** S1b Journey List (docs/06 S1b, Phase 2). Shows no answers — only names, mode, progress, dates. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Trash2 } from 'lucide-react';
import { ui } from '../content/th/ui';
import { ScreenHeader, EmptyState } from '../components/Misc';
import { PixelButton } from '../components/PixelButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useGame } from '../store/game';
import { activateJourney, deleteJourney } from '../store/journeys';
import { resumeTarget } from '../store/story';

const t = ui.journeys;

export function JourneysScreen() {
  const save = useGame((s) => s.save);
  const navigate = useNavigate();
  const [toDelete, setToDelete] = useState<string | null>(null);
  const list = Object.values(save.journeys).sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={t.heading} preferHistory />
      <p className="m-0 text-sm text-lavender">{t.intro}</p>
      {list.length === 0 && <EmptyState title={t.empty} />}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {list.map((j) => {
          const names = j.playerIds.map((id) => save.players[id]?.nickname ?? '?').join(' · ');
          const done = Object.values(j.chapterProgress).filter((p) => p.status === 'completed').length;
          return (
            <li key={j.id} className="panel flex flex-col gap-2" data-testid={`journey-${j.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 text-lg font-semibold">{names}</h2>
                <span className="rounded-full border border-lavender/50 px-2 text-[13px] text-lavender">{t.mode[j.mode]}</span>
                <span className="rounded-full border border-orange/60 px-2 text-[13px]">{t.status[j.status]}</span>
              </div>
              <p className="m-0 text-[13px] text-lavender">
                {t.progress(done)} · {t.lastPlayed(new Date(j.lastPlayedAt).toLocaleDateString('th-TH'))}
              </p>
              <div className="flex flex-wrap gap-2">
                <PixelButton
                  icon={<Play aria-hidden className="h-4 w-4" />}
                  onClick={() => {
                    if (j.status !== 'active') useGame.getState().update((s) => activateJourney(s, j.id));
                    useGame.getState().flush();
                    navigate(resumeTarget(j));
                  }}
                >
                  {j.status === 'active' ? t.continue : t.makeActive}
                </PixelButton>
                <PixelButton variant="ghost" icon={<Trash2 aria-hidden className="h-4 w-4" />} onClick={() => setToDelete(j.id)}>
                  {t.delete}
                </PixelButton>
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={!!toDelete}
        title={t.deleteTitle}
        body={t.deleteBody}
        confirmLabel={t.delete}
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteJourney(toDelete);
          setToDelete(null);
        }}
      />
    </main>
  );
}
