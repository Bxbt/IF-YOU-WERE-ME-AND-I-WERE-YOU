import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Eye, ScrollText } from 'lucide-react';
import { ui } from '../content/th/ui';
import type { ChapterContent, ChapterId } from '../content/types';
import { CHAPTER_BY_ID } from '../content/th/chapters';
import { EmptyState, PauseButton } from '../components/Misc';
import { PerspectiveBanner, ProgressDots } from '../components/Labels';
import { DialogueBox, type LineVariant } from '../components/TextBoxes';
import {
  EmotionCards,
  HistoryDialog,
  Reflection,
  StoryChoices,
  TransitionCard,
  type HistoryEntry,
} from '../components/Story';
import { PauseMenu } from '../components/PauseMenu';
import { SceneCanvas } from '../scene/SceneCanvas';
import { PortraitView } from '../scene/CharacterCanvas';
import { useGame } from '../store/game';
import { saveDraft } from '../store/actions';
import {
  apply,
  buildStoryState,
  buildTokenContext,
  completeChapter,
  emptyProgress,
  markSceneSkipped,
  playerForRole,
  recordChoice,
  removeStoryAnswer,
  saveStoryAnswer,
  selfRole,
  setPosition,
  skipChapter,
  startChapter,
  storyAnswerKey,
} from '../store/story';
import {
  advance,
  controllingRole,
  envAt,
  expandScene,
  lineBefore,
  optionText,
  resolveTokens,
  resumePosition,
  sceneById,
  shakeBetween,
  skipScene,
  speakerName,
  startOfChapter,
  type Move,
  type Position,
  type Step,
  type StoryState,
} from '../engine/dialogue';
import type { AnswerDraft } from '../engine/answers';
import { chapterHref } from './ChaptersScreen';
import type { GameSession, SaveRoot } from '../persistence/schema';

/** S6 — Narrative Gameplay (docs/06 S6). Loads the chapter chunk, then hands over to <Player>. */
export function PlayScreen() {
  const { journeyId = '', chapterId = '' } = useParams();
  const location = useLocation();
  const journey = useGame((s) => s.save.journeys[journeyId]);
  const meta = CHAPTER_BY_ID[chapterId as ChapterId];
  const [content, setContent] = useState<ChapterContent | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!meta?.load) return;
    let alive = true;
    meta
      .load()
      .then((c) => alive && setContent(c))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [meta]);

  if (!journey || !meta || failed) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <EmptyState
          title={!journey ? ui.chapters.noJourney : ui.play.sceneMissing}
          action={
            <Link to={journey ? `/j/${journey.id}/chapters` : '/'} className="btn btn-primary no-underline">
              {ui.back}
            </Link>
          }
        />
      </main>
    );
  }
  if (!meta.load) return <Navigate to={`/j/${journey.id}/chapters`} replace />;
  if (meta.needsScenario && !journey.scenario) {
    return (
      <Navigate
        to={`/j/${journey.id}/scenario?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }
  if (!content) return <Loading />;
  return <Player key={`${journey.id}:${content.id}`} journey={journey} content={content} />;
}

function Loading() {
  return (
    <main className="flex min-h-[100dvh] flex-col">
      <div className="aspect-video w-full animate-pulse bg-indigo" />
      <p role="status" className="p-4 text-center text-lavender">
        {ui.play.loading}
      </p>
    </main>
  );
}

interface ViewRun {
  pos: Position | null;
  state: StoryState;
}

const VARIANT: Record<string, LineVariant> = {
  DLG: 'dlg',
  NARR: 'narr',
  MONO: 'mono',
  SYS: 'sys',
  SAFETY_NOTE: 'sys',
};

function Player({ journey, content }: { journey: GameSession; content: ChapterContent }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === '1';
  const save = useGame((s) => s.save);
  const ch = content.id;
  const progress = journey.chapterProgress[ch] ?? emptyProgress(ch);
  const selfId = journey.playerIds[0];
  const ctx = useMemo(() => buildTokenContext(save, journey), [save, journey]);
  const mySelfRole = selfRole(journey);

  const freshState = useCallback(
    (): StoryState => ({
      flags: buildStoryState(
        { ...journey, chapterProgress: { ...journey.chapterProgress, [ch]: emptyProgress(ch) } },
        ch,
      ).flags,
      priorWarning: journey.scenario?.priorWarning ?? true,
      chosen: {},
    }),
    [journey, ch],
  );

  const [viewRun, setViewRun] = useState<ViewRun | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lineRef = useRef<HTMLButtonElement>(null);
  const started = useRef(false);

  // ----- start / resume (runs once; StrictMode-safe through the ref) -----
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (view) {
      const st = freshState();
      const m = startOfChapter(content, st);
      setViewRun({ pos: m.kind === 'at' ? m.pos : null, state: st });
      return;
    }
    const p = useGame.getState().save.journeys[journey.id]?.chapterProgress[ch] ?? emptyProgress(ch);
    const explicitStart = params.get('start') === '1';
    if (explicitStart || (p.status !== 'in_progress' && p.status !== 'completed')) {
      const m = startOfChapter(content, freshState());
      apply((s) =>
        m.kind === 'at'
          ? startChapter(s, journey.id, ch, m.pos.sceneId, m.pos.lineIndex)
          : completeChapter(s, journey.id, ch),
      );
      useGame.getState().flush();
      if (explicitStart) setParams({}, { replace: true });
    } else if (p.status === 'in_progress') {
      const saved =
        p.currentSceneId !== undefined
          ? { sceneId: p.currentSceneId, lineIndex: p.lineIndex ?? 0 }
          : undefined;
      const m = resumePosition(content, saved, buildStoryState(journey, ch));
      if (m.kind === 'end') apply((s) => completeChapter(s, journey.id, ch));
      else if (!saved || m.pos.sceneId !== saved.sceneId || m.pos.lineIndex !== saved.lineIndex)
        apply((s) => setPosition(s, journey.id, ch, m.pos.sceneId, m.pos.lineIndex));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- derived position -----
  const state: StoryState = useMemo(
    () => (view ? (viewRun?.state ?? freshState()) : buildStoryState(journey, ch)),
    [view, viewRun, freshState, journey, ch],
  );
  const pSceneId = progress.status === 'in_progress' ? progress.currentSceneId : undefined;
  const pLine = progress.lineIndex ?? 0;
  const pos: Position | null = useMemo(
    () =>
      view ? (viewRun?.pos ?? null) : pSceneId !== undefined ? { sceneId: pSceneId, lineIndex: pLine } : null,
    [view, viewRun, pSceneId, pLine],
  );
  const ended = view ? viewRun !== null && viewRun.pos === null : progress.status === 'completed';
  const scene = pos ? sceneById(content, pos.sceneId) : undefined;
  const steps = useMemo(() => (scene ? expandScene(scene, state) : []), [scene, state]);
  const step: Step | undefined = pos ? steps[pos.lineIndex] : undefined;

  const lastScene = content.scenes.find((s) => s.next === null) ?? content.scenes[content.scenes.length - 1]!;
  const env = useMemo(() => {
    if (scene && pos) return envAt(scene, steps, pos.lineIndex);
    const endSteps = expandScene(lastScene, state);
    return envAt(lastScene, endSteps, endSteps.length);
  }, [scene, pos, steps, lastScene, state]);

  // ----- movement -----
  const moveTo = useCallback(
    (move: Move, from: Position | null, st: StoryState, before?: (s: SaveRoot) => SaveRoot) => {
      if (move.kind === 'at' && from) {
        const sameScene = move.pos.sceneId === from.sceneId;
        const toSteps = expandScene(sceneById(content, move.pos.sceneId)!, st);
        if (shakeBetween(toSteps, sameScene ? from.lineIndex : 0, move.pos.lineIndex))
          setShakeKey((k) => k + 1);
      }
      if (view) {
        setViewRun({ pos: move.kind === 'at' ? move.pos : null, state: st });
        return;
      }
      apply((s0) => {
        const s = before ? before(s0) : s0;
        return move.kind === 'at'
          ? setPosition(s, journey.id, ch, move.pos.sceneId, move.pos.lineIndex)
          : completeChapter(s, journey.id, ch);
      });
      if (move.kind === 'end') useGame.getState().flush();
    },
    [content, view, journey.id, ch],
  );

  const next = useCallback(() => {
    if (pos) moveTo(advance(content, pos, state), pos, state);
  }, [pos, content, state, moveTo]);

  const choose = useCallback(
    (optionId: string) => {
      if (!pos || step?.kind !== 'choice') return;
      const opt = step.line.options.find((o) => o.id === optionId);
      if (!opt) return;
      const st: StoryState = {
        ...state,
        flags: { ...state.flags, ...(opt.setFlags ?? {}) },
        chosen: { ...state.chosen, [step.line.id]: opt.id },
      };
      const choice = {
        choiceId: step.line.id,
        optionId: opt.id,
        setFlags: opt.setFlags,
        byPlayerId: selfId,
        asRole: step.line.owner,
      };
      moveTo(advance(content, pos, st), pos, st, (s) => recordChoice(s, journey.id, ch, choice));
    },
    [pos, step, state, content, moveTo, selfId, journey.id, ch],
  );

  const onSkipScene = useCallback(() => {
    setPaused(false);
    if (!pos) return;
    moveTo(skipScene(content, pos, state), pos, state, (s) =>
      markSceneSkipped(s, journey.id, ch, pos.sceneId),
    );
  }, [pos, content, state, moveTo, journey.id, ch]);

  const chaptersHref = `/j/${journey.id}/chapters`;

  // Esc opens the pause menu (docs/05 G4).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !paused && !historyOpen && !document.querySelector('[role="dialog"]'))
        setPaused(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [paused, historyOpen]);

  // Keyboard play (TC-A11Y-03): each new line takes focus, so Enter/Space advances.
  useEffect(() => {
    if (step?.kind === 'line' && !paused && !historyOpen) lineRef.current?.focus({ preventScroll: true });
  }, [pos?.sceneId, pos?.lineIndex, step?.kind, paused, historyOpen]);

  // ----- rendering helpers -----
  const playerOf = (speaker: string) =>
    speaker === 'in'
      ? save.players[playerForRole(journey, 'insider')]
      : speaker === 'out'
        ? save.players[playerForRole(journey, 'waiter')]
        : undefined;

  function renderLine(s: Step | undefined, waitingChoice: boolean) {
    if (s?.kind !== 'line') return null;
    const l = s.line;
    const speakerKey = l.type === 'DLG' || l.type === 'MONO' ? l.speaker : undefined;
    const text = resolveTokens(l.text, ctx, speakerKey);
    const name = speakerKey ? speakerName(speakerKey, ctx) : undefined;
    const who = speakerKey ? playerOf(speakerKey) : undefined;
    const portrait =
      l.type === 'DLG' && who ? (
        <PortraitView appearance={who.appearance} expression={l.expression ?? 'neutral'} scale={1} label="" />
      ) : undefined;
    return (
      <DialogueBox
        key={`${pos?.sceneId}:${pos?.lineIndex}`}
        ref={lineRef}
        variant={VARIANT[l.type] ?? 'narr'}
        speaker={name}
        title={l.type === 'SYS' && l.title ? resolveTokens(l.title, ctx) : undefined}
        portrait={portrait}
        text={text}
        onAdvance={next}
        waitingChoice={waitingChoice}
      />
    );
  }

  const history = useMemo<HistoryEntry[]>(() => {
    if (!historyOpen) return [];
    const out: HistoryEntry[] = [];
    let m = startOfChapter(content, state);
    for (let guard = 0; m.kind === 'at' && guard < 2000; guard++) {
      const here = m.pos;
      if (pos && here.sceneId === pos.sceneId && here.lineIndex >= pos.lineIndex) break;
      const sc = sceneById(content, here.sceneId)!;
      const st = expandScene(sc, state)[here.lineIndex];
      if (st?.kind === 'line') {
        const l = st.line;
        const sp = l.type === 'DLG' || l.type === 'MONO' ? l.speaker : undefined;
        out.push({
          variant: VARIANT[l.type] ?? 'narr',
          speaker: sp ? speakerName(sp, ctx) : undefined,
          text: resolveTokens(l.text, ctx, sp),
        });
      }
      const skipped =
        !view && progress.skippedScenes.includes(here.sceneId) && (!pos || here.sceneId !== pos.sceneId);
      if (st?.kind === 'choice' && !state.chosen[st.line.id]) m = skipScene(content, here, state);
      else m = skipped ? skipScene(content, here, state) : advance(content, here, state);
    }
    return out;
  }, [historyOpen, content, state, pos, ctx, view, progress.skippedScenes]);

  // ----- perspective -----
  const role =
    scene && (step?.kind === 'line' || step?.kind === 'choice') ? controllingRole(scene, step) : null;
  const rolePlayer = role ? save.players[playerForRole(journey, role)] : undefined;

  const sceneIndex = scene ? content.scenes.findIndex((s) => s.id === scene.id) + 1 : content.scenes.length;
  const sceneLabel = env.split
    ? (scene?.ariaLabel ?? lastScene.ariaLabel)
    : (scene?.ariaLabel ?? lastScene.ariaLabel);

  // Scene height budget: landscape phones give the scene the full height of its 60% column.
  const sceneHeightRatio = typeof window !== 'undefined' && window.matchMedia?.('(max-height: 479px) and (orientation: landscape)').matches ? 0.82 : 0.55;

  // ----- steps that are not dialogue -----
  let body: React.ReactNode = null;
  if (ended) {
    const [first, ...rest] = content.transition.lines;
    const lines = [first, ...rest].flatMap((l) =>
      l && (l.type === 'SYS' || l.type === 'NARR')
        ? [{ text: resolveTokens(l.text, ctx), heading: l === first && l.type === 'SYS' }]
        : [],
    );
    const nextMeta = content.transition.nextChapter
      ? CHAPTER_BY_ID[content.transition.nextChapter]
      : undefined;
    const nextP = nextMeta ? journey.chapterProgress[nextMeta.id] : undefined;
    body = (
      <TransitionCard
        lines={lines}
        next={
          nextMeta
            ? nextMeta.load
              ? {
                  label: ui.play.nextChapter(nextMeta.number),
                  onClick: () =>
                    navigate(
                      chapterHref(journey, nextMeta, nextP?.status === 'in_progress' ? '' : '?start=1'),
                    ),
                }
              : {
                  label: ui.play.nextChapter(nextMeta.number),
                  disabledReason: ui.play.nextChapterNotReady(nextMeta.number),
                }
            : null
        }
        onRest={() => navigate(chaptersHref)}
      />
    );
  } else if (step?.kind === 'cards' && content.emotionCards) {
    const key = storyAnswerKey(selfId, `ec_${ch}`);
    body = view ? (
      <ViewOnlySkip onNext={next} />
    ) : (
      <EmotionCards
        key={key}
        groups={[
          { label: ui.play.cardsInsider(ctx.names.in), cards: content.emotionCards.insider },
          { label: ui.play.cardsWaiter(ctx.names.out), cards: content.emotionCards.waiter },
        ]}
        initial={journey.storyAnswers[key]?.selected ?? []}
        onDone={(selected) => {
          apply((s) =>
            selected.length
              ? saveStoryAnswer(s, journey.id, selfId, `ec_${ch}`, 'emotion_card', {
                  selected,
                  meta: null,
                  freeText: '',
                })
              : removeStoryAnswer(s, journey.id, selfId, `ec_${ch}`),
          );
          next();
        }}
      />
    );
  } else if (step?.kind === 'reflection') {
    const initial: Record<string, AnswerDraft> = {};
    for (const q of content.reflection) {
      const a = journey.storyAnswers[storyAnswerKey(selfId, q.id)];
      const d = save.drafts[storyAnswerKey(selfId, q.id)]?.text;
      if (a) initial[q.id] = { selected: [...a.selected], meta: a.meta, freeText: a.freeText ?? '' };
      else if (d) initial[q.id] = { selected: [], meta: null, freeText: d };
    }
    const firstOpen = content.reflection.findIndex(
      (q) => !journey.storyAnswers[storyAnswerKey(selfId, q.id)],
    );
    body = view ? (
      <ViewOnlySkip onNext={next} />
    ) : (
      <Reflection
        key={`${pos?.sceneId}`}
        questions={content.reflection}
        initial={initial}
        startAt={firstOpen < 0 ? 0 : firstOpen}
        onAnswer={(qid, d) => apply((s) => saveStoryAnswer(s, journey.id, selfId, qid, 'reflection', d))}
        onDraft={(qid, text) => saveDraft(selfId, storyAnswerKey(selfId, qid), text)}
        onFinish={next}
      />
    );
  } else if (step?.kind === 'choice') {
    body = (
      <div className="flex flex-col gap-3">
        {renderLine(lineBefore(steps, pos!.lineIndex), true)}
        <StoryChoices
          key={step.line.id}
          label={ui.play.choicesLabel}
          options={step.line.options.map((o) => ({
            id: o.id,
            text: resolveTokens(optionText(o, state), ctx, step.line.owner === 'insider' ? 'in' : 'out'),
          }))}
          onChoose={choose}
        />
      </div>
    );
  } else if (step?.kind === 'line') {
    body = renderLine(step, false);
  } else {
    body = (
      <p role="status" className="m-0 text-center text-lavender">
        {ui.play.loading}
      </p>
    );
  }

  return (
    <main
      className="flex min-h-[100dvh] flex-col short:h-[100dvh] short:flex-row"
      data-testid="play"
      data-scene={pos?.sceneId ?? (ended ? 'end' : '')}
    >
      <div className="flex flex-col short:w-[60%] short:min-w-0">
        <header className="flex items-center gap-2 bg-navy px-3 py-2">
          <h1 className="m-0 min-w-0 flex-1 truncate text-sm font-semibold">
            <span lang="en" className="font-pixel text-[13px] text-lavender">
              {content.titleEn}
            </span>{' '}
            · {content.titleTh}
          </h1>
          <ProgressDots current={sceneIndex} total={content.scenes.length} />
          <button
            type="button"
            aria-label={ui.play.history}
            onClick={() => setHistoryOpen(true)}
            className="btn btn-ghost min-w-[44px] px-2"
          >
            <ScrollText aria-hidden className="h-5 w-5" />
          </button>
          <PauseButton onClick={() => setPaused(true)} />
        </header>
        <SceneCanvas env={env} label={sceneLabel} shakeKey={shakeKey} className="w-full" maxHeightRatio={sceneHeightRatio} />
      </div>

      <section
        aria-label={content.titleTh}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 p-4 short:w-[40%] short:overflow-y-auto"
      >
        {view && (
          <p className="m-0 inline-flex items-center gap-2 self-start rounded-full border border-lavender/50 px-3 py-1 text-[13px] text-lavender">
            <Eye aria-hidden className="h-4 w-4" />
            {ui.play.viewOnly}
          </p>
        )}
        {!ended && role && rolePlayer && (
          <PerspectiveBanner
            name={rolePlayer.nickname}
            variant={role === mySelfRole ? 'own' : 'partner-imagined'}
          />
        )}
        {body}
      </section>

      <PauseMenu
        open={paused}
        onResume={() => setPaused(false)}
        onSkipScene={pos && !ended ? onSkipScene : undefined}
        onSkipChapter={
          !view && !ended
            ? () => {
                apply((s) => skipChapter(s, journey.id, ch));
                useGame.getState().flush();
                navigate(chaptersHref);
              }
            : undefined
        }
        onChapters={() => navigate(chaptersHref)}
        onSettings={() => navigate('/settings', { state: { from: location.pathname + location.search } })}
        onExit={() => navigate('/')}
      />
      <HistoryDialog open={historyOpen} entries={history} onClose={() => setHistoryOpen(false)} />
    </main>
  );
}

function ViewOnlySkip({ onNext }: { onNext: () => void }) {
  return (
    <div className="panel flex flex-col items-start gap-3">
      <p className="m-0 text-lavender">{ui.play.viewOnlyAnswers}</p>
      <button type="button" className="btn btn-primary" onClick={onNext}>
        {ui.play.continue}
      </button>
    </div>
  );
}
