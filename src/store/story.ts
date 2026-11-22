/**
 * Story progress mutations (docs/07 §6, docs/05 §2 G1–G6, §6). Pure `(save) => save` builders are
 * exported for tests; the `*Now` wrappers apply them through the store (autosave, docs/05 G1).
 */
import type { ChapterId, RoleId } from '../content/types';
import type { GameSession, SaveRoot } from '../persistence/schema';
import type { StoryState, TokenContext } from '../engine/dialogue';
import type { AnswerInput } from './actions';
import { nowIso } from '../lib/ids';
import { useGame } from './game';

type Progress = GameSession['chapterProgress'][string];
type StoryAnswerT = GameSession['storyAnswers'][string];

const CHAPTER_ORDER: ChapterId[] = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'];
const SCENARIO_CHAPTERS: ChapterId[] = ['ch1', 'ch2', 'ch3'];

export function emptyProgress(chapterId: ChapterId): Progress {
  return { chapterId, status: 'not_started', flags: {}, choiceLog: [], skippedScenes: [], playCount: 0 };
}

function withJourney(save: SaveRoot, jid: string, fn: (j: GameSession, t: string) => GameSession): SaveRoot {
  const j = save.journeys[jid];
  if (!j) return save;
  const t = nowIso();
  return { ...save, journeys: { ...save.journeys, [jid]: { ...fn(j, t), updatedAt: t } } };
}

function withProgress(
  save: SaveRoot,
  jid: string,
  ch: ChapterId,
  fn: (p: Progress, t: string) => Progress,
): SaveRoot {
  return withJourney(save, jid, (j, t) => ({
    ...j,
    lastPlayedAt: t,
    chapterProgress: { ...j.chapterProgress, [ch]: fn(j.chapterProgress[ch] ?? emptyProgress(ch), t) },
  }));
}

function dropPosition(p: Progress): Progress {
  const { currentSceneId: _s, lineIndex: _l, ...rest } = p;
  void _s;
  void _l;
  return rest;
}

// ---------- Scenario (S5a) ----------

export interface ScenarioInput {
  insiderPlayerId: string;
  priorWarning: boolean;
  randomized: boolean;
}

/** Ch1–Ch3 progress that a scenario change would reset (docs/05 §6). */
export function scenarioResetsProgress(j: GameSession): boolean {
  return SCENARIO_CHAPTERS.some((c) => {
    const p = j.chapterProgress[c];
    return !!p && (p.status !== 'not_started' || Object.keys(p.flags).length > 0);
  });
}

/** Changing the scenario resets Ch1–Ch3 progress and flags; reflection/mirror answers stay (docs/05 §6). */
export function setScenario(save: SaveRoot, jid: string, input: ScenarioInput): SaveRoot {
  return withJourney(save, jid, (j, t) => {
    const prev = j.scenario;
    const changed =
      !!prev && (prev.insiderPlayerId !== input.insiderPlayerId || prev.priorWarning !== input.priorWarning);
    const chapterProgress = { ...j.chapterProgress };
    if (changed) {
      for (const c of SCENARIO_CHAPTERS) {
        const p = chapterProgress[c];
        if (p) chapterProgress[c] = { ...emptyProgress(c), playCount: p.playCount };
      }
    }
    return { ...j, chapterProgress, scenario: { ...input, setAt: t } };
  });
}

// ---------- Chapter lifecycle ----------

/** Starts (or restarts) a chapter: previous choices of this chapter are replaced (docs/05 §6). */
export function startChapter(
  save: SaveRoot,
  jid: string,
  ch: ChapterId,
  sceneId: string,
  lineIndex: number,
): SaveRoot {
  return withProgress(save, jid, ch, (p, t) => {
    const { completedAt: _c, ...base } = dropPosition(p);
    void _c;
    return {
      ...base,
      status: 'in_progress',
      flags: {},
      choiceLog: [],
      skippedScenes: [],
      playCount: p.playCount + 1,
      startedAt: t,
      currentSceneId: sceneId,
      lineIndex,
    };
  });
}

export function setPosition(
  save: SaveRoot,
  jid: string,
  ch: ChapterId,
  sceneId: string,
  lineIndex: number,
): SaveRoot {
  return withProgress(save, jid, ch, (p) => ({
    ...p,
    status: p.status === 'not_started' ? 'in_progress' : p.status,
    currentSceneId: sceneId,
    lineIndex,
  }));
}

export interface ChoiceInput {
  choiceId: string;
  optionId: string;
  setFlags?: Record<string, string>;
  byPlayerId: string;
  asRole: RoleId | 'self';
}

export function recordChoice(save: SaveRoot, jid: string, ch: ChapterId, c: ChoiceInput): SaveRoot {
  return withProgress(save, jid, ch, (p, at) => ({
    ...p,
    flags: { ...p.flags, ...(c.setFlags ?? {}) },
    choiceLog: [
      ...p.choiceLog,
      { choiceId: c.choiceId, optionId: c.optionId, byPlayerId: c.byPlayerId, asRole: c.asRole, at },
    ],
  }));
}

export function markSceneSkipped(save: SaveRoot, jid: string, ch: ChapterId, sceneId: string): SaveRoot {
  return withProgress(save, jid, ch, (p) => ({
    ...p,
    skippedScenes: p.skippedScenes.includes(sceneId) ? p.skippedScenes : [...p.skippedScenes, sceneId],
  }));
}

export function completeChapter(save: SaveRoot, jid: string, ch: ChapterId): SaveRoot {
  return withProgress(save, jid, ch, (p, t) => ({ ...dropPosition(p), status: 'completed', completedAt: t }));
}

/** docs/05 G6: the chapter becomes `skipped`; later chapters stay open. */
export function skipChapter(save: SaveRoot, jid: string, ch: ChapterId): SaveRoot {
  return withProgress(save, jid, ch, (p) => ({ ...dropPosition(p), status: 'skipped' }));
}

// ---------- Story answers (reflection, emotion cards) ----------

export const storyAnswerKey = (playerId: string, itemId: string) => `${playerId}:${itemId}`;

export function saveStoryAnswer(
  save: SaveRoot,
  jid: string,
  playerId: string,
  itemId: string,
  kind: StoryAnswerT['kind'],
  input: AnswerInput,
): SaveRoot {
  const key = storyAnswerKey(playerId, itemId);
  const freeText = input.freeText.trim();
  const answer: StoryAnswerT = {
    key,
    playerId,
    itemId,
    kind,
    layer: 'self',
    selected: input.meta ? [] : input.selected,
    meta: input.meta,
    ...(freeText && input.meta !== 'skipped' ? { freeText } : {}),
    updatedAt: nowIso(),
  };
  const next = withJourney(save, jid, (j) => ({ ...j, storyAnswers: { ...j.storyAnswers, [key]: answer } }));
  const drafts = { ...next.drafts };
  delete drafts[key];
  return { ...next, drafts };
}

export function removeStoryAnswer(save: SaveRoot, jid: string, playerId: string, itemId: string): SaveRoot {
  const key = storyAnswerKey(playerId, itemId);
  if (!save.journeys[jid]?.storyAnswers[key]) return save;
  return withJourney(save, jid, (j) => {
    const storyAnswers = { ...j.storyAnswers };
    delete storyAnswers[key];
    return { ...j, storyAnswers };
  });
}

// ---------- Derived state ----------

/** Flags of every chapter (in order) with the current chapter last, plus this play's choices. */
export function buildStoryState(j: GameSession, ch: ChapterId): StoryState {
  const flags: Record<string, string> = {};
  for (const c of CHAPTER_ORDER) if (c !== ch) Object.assign(flags, j.chapterProgress[c]?.flags ?? {});
  const cur = j.chapterProgress[ch];
  Object.assign(flags, cur?.flags ?? {});
  const chosen: Record<string, string> = {};
  for (const e of cur?.choiceLog ?? []) chosen[e.choiceId] = e.optionId;
  return { flags, priorWarning: j.scenario?.priorWarning ?? true, chosen };
}

/** Solo (docs/05 §3): A = the player, B = the imagined partner; roles come from the scenario. */
export function buildTokenContext(save: SaveRoot, j: GameSession): TokenContext {
  const [aId, bId] = j.playerIds;
  const A = save.players[aId];
  const B = save.players[bId];
  const nameA = A?.nickname ?? 'ผู้เล่น A';
  const nameB = B?.nickname ?? 'ผู้เล่น B';
  const insiderIsA = (j.scenario?.insiderPlayerId ?? aId) === aId;
  const inP = insiderIsA ? A : B;
  const outP = insiderIsA ? B : A;
  const address = (p: typeof A, partner: typeof A) =>
    p?.addressStyle === 'name' ? (partner?.nickname ?? '') : (p?.addressStyle ?? 'เธอ');
  return {
    names: {
      A: nameA,
      B: nameB,
      in: inP?.nickname ?? nameA,
      out: outP?.nickname ?? nameB,
      me: nameA,
      other: nameB,
    },
    endings: { in: inP?.sentenceEnding ?? '', out: outP?.sentenceEnding ?? '' },
    address: { in: address(inP, outP), out: address(outP, inP) },
  };
}

/** Which role the solo player is in their own life story. */
export function selfRole(j: GameSession): RoleId {
  return (j.scenario?.insiderPlayerId ?? j.playerIds[0]) === j.playerIds[0] ? 'insider' : 'waiter';
}

export function playerForRole(j: GameSession, role: RoleId): string {
  const insider = j.scenario?.insiderPlayerId ?? j.playerIds[0];
  const other = j.playerIds.find((p) => p !== insider) ?? j.playerIds[1];
  return role === 'insider' ? insider : other;
}

/** Where "เล่นต่อ" should go (docs/05 §6): the chapter in progress, else chapter selection. */
export function resumeTarget(j: GameSession): string {
  const inProgress = CHAPTER_ORDER.find((c) => j.chapterProgress[c]?.status === 'in_progress');
  return inProgress ? `/j/${j.id}/play/${inProgress}` : `/j/${j.id}/chapters`;
}

export const apply = (fn: (s: SaveRoot) => SaveRoot) => useGame.getState().update(fn);
