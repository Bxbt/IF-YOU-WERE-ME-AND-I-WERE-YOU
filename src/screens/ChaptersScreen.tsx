import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BarChart3,
  Check,
  Clock,
  FileText,
  Play,
  RotateCcw,
  Settings as SettingsIcon,
  SkipForward,
  UserRound,
} from 'lucide-react';
import { ui } from '../content/th/ui';
import { ScreenHeader, EmptyState } from '../components/Misc';
import { PixelButton } from '../components/PixelButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useGame } from '../store/game';
import { apply, emptyProgress, skipChapter } from '../store/story';
import { CHAPTERS, type ChapterMeta } from '../content/th/chapters';
import { FEATURES } from '../lib/features';
import type { GameSession } from '../persistence/schema';

/** Route into a chapter, passing through S5a when the chapter needs a scenario (docs/05 G8). */
export function chapterHref(j: GameSession, c: ChapterMeta, query = ''): string {
  const play = `/j/${j.id}/play/${c.id}${query}`;
  if (c.needsScenario && !j.scenario) return `/j/${j.id}/scenario?next=${encodeURIComponent(play)}`;
  return play;
}

/** S5 — Chapter Selection (docs/06 S5). */
export function ChaptersScreen() {
  const { journeyId = '' } = useParams();
  const navigate = useNavigate();
  const journey = useGame((s) => s.save.journeys[journeyId]);
  const players = useGame((s) => s.save.players);
  const [replay, setReplay] = useState<ChapterMeta | null>(null);
  const [skip, setSkip] = useState<ChapterMeta | null>(null);

  if (!journey) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <ScreenHeader title="" />
        <EmptyState
          title={ui.chapters.noJourney}
          body={ui.chapters.noJourneyBody}
          action={
            <Link to="/" className="btn btn-primary no-underline">
              {ui.home}
            </Link>
          }
        />
      </main>
    );
  }

  const insider = journey.scenario ? (players[journey.scenario.insiderPlayerId]?.nickname ?? '') : '';
  const journeyName = journey.playerIds.map((id) => players[id]?.nickname).join(' · ');

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <ScreenHeader title={ui.chapters.heading} />
      <nav aria-label={journeyName} className="flex flex-wrap items-center gap-2">
        <span className="mr-auto text-sm text-lavender">{journeyName}</span>
        <Link to="/profile" className="btn btn-ghost px-3 text-sm no-underline">
          <UserRound aria-hidden className="h-4 w-4" />
          {ui.chapters.profile}
        </Link>
        <PixelButton
          variant="ghost"
          className="px-3 text-sm"
          disabled={!FEATURES.insight}
          aria-describedby="insight-reason"
          icon={<BarChart3 aria-hidden className="h-4 w-4" />}
        >
          {ui.chapters.compare}
        </PixelButton>
        <PixelButton
          variant="ghost"
          className="px-3 text-sm"
          disabled={!FEATURES.insight}
          aria-describedby="insight-reason"
          icon={<FileText aria-hidden className="h-4 w-4" />}
        >
          {ui.chapters.report}
        </PixelButton>
        <Link
          to="/settings"
          state={{ from: `/j/${journey.id}/chapters` }}
          aria-label={ui.chapters.settings}
          className="btn btn-ghost min-w-[44px] px-2 no-underline"
        >
          <SettingsIcon aria-hidden className="h-5 w-5" />
        </Link>
      </nav>
      {!FEATURES.insight && (
        <p id="insight-reason" className="-mt-4 m-0 text-[13px] text-lavender">
          {ui.chapters.insightNotReady}
        </p>
      )}

      <section className="panel flex flex-wrap items-center gap-3" aria-labelledby="scenario-h">
        <div className="flex flex-1 flex-col">
          <h2 id="scenario-h" className="m-0 text-base font-semibold">
            {ui.chapters.scenario}
          </h2>
          <p className="m-0 text-sm text-lavender">
            {journey.scenario
              ? ui.chapters.scenarioText(insider, journey.scenario.priorWarning)
              : ui.chapters.scenarioNone}
          </p>
        </div>
        {journey.scenario && (
          <Link to={`/j/${journey.id}/scenario`} className="btn btn-ghost px-3 text-sm no-underline">
            {ui.chapters.scenarioChange}
          </Link>
        )}
      </section>

      <p className="m-0 text-sm text-lavender">{ui.chapters.hint}</p>

      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        {CHAPTERS.map((c, i) => {
          const p = journey.chapterProgress[c.id] ?? emptyProgress(c.id);
          const available = !!c.load;
          const titleId = `ch-${c.id}`;
          return (
            <li key={c.id} className="relative pl-6">
              {/* glowing path between the chapter points (docs/06 S5) */}
              <span
                aria-hidden
                className="absolute left-[7px] top-3 h-3 w-3 rotate-45 bg-orange shadow-[0_0_8px_rgba(233,183,123,.8)]"
              />
              {i < CHAPTERS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute bottom-[-1rem] left-[12px] top-7 w-[2px] bg-orange/40"
                />
              )}
              <article
                aria-labelledby={titleId}
                className={`panel flex flex-col gap-2 ${available ? '' : 'border-dashed'}`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-sm text-lavender">{ui.chapters.chapterNo(c.number)}</span>
                  <h2 id={titleId} className="m-0 text-lg font-semibold">
                    <span lang="en" className="font-pixel text-base">
                      {c.titleEn}
                    </span>{' '}
                    · {c.titleTh}
                  </h2>
                </div>
                <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-lavender">
                  <span className="inline-flex items-center gap-1">
                    <Clock aria-hidden className="h-4 w-4" />
                    {ui.chapters.minutes(...c.estimatedMinutes)}
                  </span>
                  {available ? <StatusLabel status={p.status} /> : <span>{ui.comingSoon}</span>}
                </p>
                {available ? (
                  <div className="flex flex-wrap gap-2">
                    {p.status === 'in_progress' && (
                      <PixelButton
                        icon={<Play aria-hidden className="h-5 w-5" />}
                        onClick={() => navigate(chapterHref(journey, c))}
                      >
                        {ui.chapters.resume}
                      </PixelButton>
                    )}
                    {(p.status === 'not_started' || p.status === 'skipped') && (
                      <PixelButton
                        icon={<Play aria-hidden className="h-5 w-5" />}
                        onClick={() => navigate(chapterHref(journey, c, '?start=1'))}
                      >
                        {ui.chapters.start}
                      </PixelButton>
                    )}
                    {p.status === 'completed' && (
                      <PixelButton
                        icon={<RotateCcw aria-hidden className="h-5 w-5" />}
                        onClick={() => setReplay(c)}
                      >
                        {ui.chapters.replay}
                      </PixelButton>
                    )}
                    {p.status !== 'skipped' && p.status !== 'completed' && (
                      <PixelButton
                        variant="ghost"
                        icon={<SkipForward aria-hidden className="h-5 w-5" />}
                        onClick={() => setSkip(c)}
                      >
                        {ui.chapters.skip}
                      </PixelButton>
                    )}
                  </div>
                ) : (
                  <p className="m-0 text-[13px] text-lavender">{ui.chapters.comingSoon}</p>
                )}
              </article>
            </li>
          );
        })}
      </ol>

      <ConfirmDialog
        open={!!replay}
        title={ui.chapters.replayTitle}
        body={
          <div className="flex flex-col gap-3">
            <p className="m-0">{ui.chapters.replayBody}</p>
            <PixelButton
              variant="ghost"
              onClick={() => replay && navigate(chapterHref(journey, replay, '?view=1'))}
            >
              {ui.chapters.replayView}
            </PixelButton>
          </div>
        }
        confirmLabel={ui.chapters.replayNew}
        onConfirm={() => replay && navigate(chapterHref(journey, replay, '?start=1'))}
        onCancel={() => setReplay(null)}
      />
      <ConfirmDialog
        open={!!skip}
        title={ui.chapters.skipTitle}
        body={ui.chapters.skipBody}
        confirmLabel={ui.chapters.skip}
        onConfirm={() => {
          if (skip) apply((s) => skipChapter(s, journey.id, skip.id));
          setSkip(null);
        }}
        onCancel={() => setSkip(null)}
      />
    </main>
  );
}

function StatusLabel({ status }: { status: keyof typeof ui.chapters.status }) {
  const Icon =
    status === 'completed'
      ? Check
      : status === 'skipped'
        ? SkipForward
        : status === 'in_progress'
          ? Play
          : null;
  return (
    <span className="inline-flex items-center gap-1">
      {Icon && <Icon aria-hidden className="h-4 w-4" />}
      {ui.chapters.status[status]}
    </span>
  );
}
