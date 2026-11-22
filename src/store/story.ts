/**
 * Story progress mutations (docs/07 §6, docs/05 §2 G1–G6, §6). Pure `(save) => save` builders are
 * exported for tests; the `*Now` wrappers apply them through the store (autosave, docs/05 G1).
 */
import type { ChapterId, RoleId } from '../content/types';
import type { GameSession, SaveRoot } from '../persistence/schema';
import type { StoryState, TokenContext } from '../engine/dialogue';
import type { AnswerInput } from './actions';
import { nowIso } from '../lib/ids';
import { setConsent, setGroupConsent, submitEntry } from '../engine/reveal';
import { profileRevision } from '../engine/compare';
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
    // A fresh run asks every private step again: waiting lists from the last run are dropped.
    const { completedAt: _c, pendingPrivateSteps: _pp, ...base } = dropPosition(p);
    void _c;
    void _pp;
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

// ---------- Interpretation Check (Ch3 s04) ----------

export interface InterpretationInput {
  answers: Record<string, 'yes' | 'no' | 'unsure'>;
  noneMatch: boolean;
  freeText: string;
}

/** StoryAnswer kind 'interpretation' (docs/07 §6). Own role → layer self; partner's role → perceived (imagined). */
export function saveInterpretation(
  save: SaveRoot,
  jid: string,
  playerId: string,
  itemId: string,
  layer: 'self' | 'perceived',
  input: InterpretationInput,
): SaveRoot {
  const key = storyAnswerKey(playerId, itemId);
  const freeText = input.freeText.trim();
  const answer: StoryAnswerT = {
    key,
    playerId,
    itemId,
    kind: 'interpretation',
    layer,
    selected: input.noneMatch ? ['none'] : [],
    interpretation: input.answers,
    meta: null,
    ...(freeText ? { freeText } : {}),
    updatedAt: nowIso(),
  };
  const next = withJourney(save, jid, (j) => ({ ...j, storyAnswers: { ...j.storyAnswers, [key]: answer } }));
  const drafts = { ...next.drafts };
  delete drafts[key];
  return { ...next, drafts };
}

// ---------- Mirror (S7 Solo) ----------

type Shared = GameSession['mirrorItems'][string];
type PAnswer = NonNullable<Shared['entries'][string]['self']>;

/**
 * Solo mirror answer (docs/04 §6.3, docs/07 §7): SharedAnswer with state 'open' and only the real
 * player's entry. `context: 'role'` for w3_* (never counted as personality data — docs/04 §2.1).
 */
export function saveMirrorAnswer(
  save: SaveRoot,
  jid: string,
  questionId: string,
  context: 'self' | 'role',
  playerId: string,
  layer: 'self' | 'perceived',
  input: AnswerInput,
): SaveRoot {
  return withJourney(save, jid, (j, t) => {
    const prev = j.mirrorItems[questionId];
    const entry = prev?.entries[playerId] ?? { consent: false };
    const old = entry[layer];
    const freeText = input.freeText.trim();
    const answer: PAnswer = {
      questionId,
      layer,
      selected: input.meta ? [] : input.selected,
      meta: input.meta,
      ...(freeText && input.meta !== 'skipped' ? { freeText } : {}),
      status: input.meta === 'skipped' ? 'skipped' : 'answered',
      revision: (old?.revision ?? 0) + 1,
      answeredAt: old?.answeredAt ?? t,
      updatedAt: t,
    };
    const item: Shared = {
      key: questionId,
      questionId,
      kind: 'mirror',
      context,
      state: 'open',
      ...prev,
      entries: { ...(prev?.entries ?? {}), [playerId]: { ...entry, [layer]: answer, submittedAt: t } },
    };
    return { ...j, mirrorItems: { ...j.mirrorItems, [questionId]: item } };
  });
}

// ---------- Ch5 statements ----------

export interface StatementInput {
  text: string;
  starterId?: string;
  skipped: boolean;
  shareIntent: boolean;
}

/** cs1–cs5 as SharedAnswer kind 'statement' (docs/04 §6.3.1); Solo: shareIntent = "ใส่ในการ์ดที่จะส่งออก". */
export function saveStatement(
  save: SaveRoot,
  jid: string,
  playerId: string,
  id: string,
  input: StatementInput,
): SaveRoot {
  return withJourney(save, jid, (j, t) => {
    const prev = j.mirrorItems[id];
    const text = input.skipped ? '' : input.text.trim().slice(0, 280);
    const item: Shared = {
      key: id,
      questionId: id,
      kind: 'statement',
      context: 'self',
      state: 'open',
      ...prev,
      entries: {
        ...(prev?.entries ?? {}),
        [playerId]: {
          ...(prev?.entries[playerId] ?? {}),
          statement: {
            text,
            ...(input.starterId && !input.skipped ? { starterId: input.starterId } : {}),
            meta: input.skipped ? 'skipped' : null,
          },
          shareIntent: !input.skipped && input.shareIntent,
          submittedAt: t,
          consent: false,
        },
      },
    };
    const next = { ...j, mirrorItems: { ...j.mirrorItems, [id]: item } };
    return next;
  });
}

// ---------- Our Next Conversation ----------

type NextItem = GameSession['nextConversation'][number];

/** Adds a conversation starter (≤ 200 chars); the same text from the same owner is not added twice. */
export function addNextConversation(
  save: SaveRoot,
  jid: string,
  ownerId: string,
  text: string,
  source: NextItem['source'],
  sourceRef?: string,
): SaveRoot {
  const clean = text.trim().slice(0, 200);
  const j = save.journeys[jid];
  if (!clean || !j || j.nextConversation.some((n) => n.ownerId === ownerId && n.text === clean)) return save;
  return withJourney(save, jid, (jj, t) => ({
    ...jj,
    nextConversation: [
      ...jj.nextConversation,
      {
        id: `nc_${jj.nextConversation.length + 1}_${Date.parse(t).toString(36)}`,
        ownerId,
        text: clean,
        source,
        ...(sourceRef ? { sourceRef } : {}),
        done: false,
        createdAt: t,
      },
    ],
  }));
}

/** Ch5 finished → Journey `completed` (docs/05 §3.2); it stays viewable and replayable. */
export function completeJourney(save: SaveRoot, jid: string): SaveRoot {
  return withJourney(save, jid, (j) => ({ ...j, status: 'completed' }));
}

/** Our Next Conversation checklist edits (docs/06 S9): done, edit text, delete. */
export function updateNextConversation(
  save: SaveRoot,
  jid: string,
  id: string,
  change: { done?: boolean; text?: string } | 'delete',
): SaveRoot {
  return withJourney(save, jid, (j) => ({
    ...j,
    nextConversation:
      change === 'delete'
        ? j.nextConversation.filter((n) => n.id !== id)
        : j.nextConversation.map((n) =>
            n.id === id
              ? {
                  ...n,
                  ...(change.done !== undefined ? { done: change.done } : {}),
                  ...(change.text !== undefined ? { text: change.text.trim().slice(0, 200) || n.text } : {}),
                }
              : n,
          ),
  }));
}

/** Snapshot metadata only (docs/07 §8): what was exported and when — never the text itself. */
export function recordReportExport(
  save: SaveRoot,
  jid: string,
  ownerId: string,
  id: string,
  selectedItemIds: string[],
  format: 'txt' | 'json' | 'png',
): SaveRoot {
  return {
    ...save,
    reports: {
      ...save.reports,
      [id]: { id, journeyId: jid, ownerId, generatedAt: nowIso(), selectedItemIds, format },
    },
  };
}

// ---------- Play Together (Phase 2, docs/05 §4) ----------

/**
 * Who makes the choices of a role. Together: the role's owner, except Ch2 where the players swap
 * (Part A — the insider's scenes — is played by Ch1's waiter, and the other way round; docs/02 Ch2).
 * Solo: always the player.
 */
export function controllerFor(j: GameSession, ch: ChapterId, role: RoleId): string {
  if (j.mode !== 'together' && j.mode !== 'remote_online') return j.playerIds[0];
  const r: RoleId = ch === 'ch2' ? (role === 'insider' ? 'waiter' : 'insider') : role;
  return playerForRole(j, r);
}

export function roleOf(j: GameSession, playerId: string): RoleId {
  return playerForRole(j, 'insider') === playerId ? 'insider' : 'waiter';
}

/** Who still has to answer a private step (docs/07 §6 pendingPrivateSteps, audit M-2). Empty list removes the entry. */
export function setPendingPrivate(
  save: SaveRoot,
  jid: string,
  ch: ChapterId,
  itemId: string,
  playerIds: string[],
  /** Live (3C): keep an empty list so the other device can see that everyone has answered. */
  keepEmpty = false,
): SaveRoot {
  return withProgress(save, jid, ch, (p) => {
    const rest = (p.pendingPrivateSteps ?? []).filter((x) => x.itemId !== itemId);
    const pendingPrivateSteps = playerIds.length || keepEmpty ? [...rest, { itemId, playerIds }] : rest;
    return { ...p, pendingPrivateSteps };
  });
}

/** Handoff away from a player removes that player's drafts so the next player never sees them (docs/07 §9, TC-PRIV-11). */
export function dropDrafts(save: SaveRoot, playerId: string): SaveRoot {
  const drafts = Object.fromEntries(
    Object.entries(save.drafts).filter(([k]) => !k.startsWith(`${playerId}:`)),
  );
  return Object.keys(drafts).length === Object.keys(save.drafts).length ? save : { ...save, drafts };
}

// ---------- Consent-based reveal (Phase 2, docs/04 §6, M10) ----------

/**
 * Together: a mirror answer goes through the reveal engine (state machine R1–R7) instead of the
 * solo 'open' item. Revision per layer increases on every save, like the solo version.
 */
export function submitTogetherMirror(
  save: SaveRoot,
  jid: string,
  questionId: string,
  context: 'self' | 'role',
  playerId: string,
  layer: 'self' | 'perceived',
  input: AnswerInput,
): SaveRoot {
  return withJourney(save, jid, (j, t) => {
    const prev = j.mirrorItems[questionId];
    const old = prev?.entries[playerId]?.[layer];
    const freeText = input.freeText.trim();
    const answer: PAnswer = {
      questionId,
      layer,
      selected: input.meta ? [] : input.selected,
      meta: input.meta,
      ...(freeText && input.meta !== 'skipped' ? { freeText } : {}),
      status: input.meta === 'skipped' ? 'skipped' : 'answered',
      revision: (old?.revision ?? 0) + 1,
      answeredAt: old?.answeredAt ?? t,
      updatedAt: t,
    };
    const item = submitEntry(
      prev,
      questionId,
      { questionId, kind: 'mirror', context },
      j.playerIds,
      playerId,
      layer === 'self' ? { self: answer } : { perceived: answer },
      t,
    );
    return { ...j, mirrorItems: { ...j.mirrorItems, [questionId]: item } };
  });
}

/** Together: Ch5 statement through the reveal engine (docs/04 §6.3.1). */
export function submitTogetherStatement(
  save: SaveRoot,
  jid: string,
  playerId: string,
  id: string,
  input: StatementInput,
): SaveRoot {
  return withJourney(save, jid, (j, t) => {
    const text = input.skipped ? '' : input.text.trim().slice(0, 280);
    const item = submitEntry(
      j.mirrorItems[id],
      id,
      { questionId: id, kind: 'statement', context: 'self' },
      j.playerIds,
      playerId,
      {
        statement: {
          text,
          ...(input.starterId && !input.skipped ? { starterId: input.starterId } : {}),
          meta: input.skipped ? 'skipped' : null,
        },
        shareIntent: !input.skipped && input.shareIntent,
      },
      t,
    );
    return { ...j, mirrorItems: { ...j.mirrorItems, [id]: item } };
  });
}

/** One player consents (or withdraws) for a set of items, except `exclude` (R2, R3, TC-REV-07). */
export function consentItems(
  save: SaveRoot,
  jid: string,
  keys: readonly string[],
  playerId: string,
  consent: boolean,
  exclude: readonly string[] = [],
): SaveRoot {
  return withJourney(save, jid, (j, t) => {
    const subset = Object.fromEntries(keys.filter((k) => j.mirrorItems[k]).map((k) => [k, j.mirrorItems[k]!]));
    const updated = setGroupConsent(subset, playerId, consent, exclude, t);
    return { ...j, mirrorItems: { ...j.mirrorItems, ...updated } };
  });
}

/** Ch4 "เปิดทีละข้อ / เปิดทีเดียวตอนจบบท" (docs/02 Ch4, R2). */
export function setRevealMode(
  save: SaveRoot,
  jid: string,
  ch: ChapterId,
  mode: 'per_question' | 'end_of_chapter',
): SaveRoot {
  return withProgress(save, jid, ch, (p) => ({ ...p, revealMode: mode }));
}

// ---------- Profile Q01–Q36 reveal (M10b, docs/04 §6.3.0) ----------

/**
 * A player offers (or stops offering) profile questions to be opened in this journey. Offering =
 * submit + consent in one step; a question opens only when both players offered it. Answers are
 * never copied into the journey — they are read from the profiles when shown.
 */
export function offerProfileAnswers(
  save: SaveRoot,
  jid: string,
  playerId: string,
  offer: readonly string[],
  withdraw: readonly string[],
): SaveRoot {
  const j0 = save.journeys[jid];
  if (!j0) return save;
  const [a, b] = j0.playerIds;
  const other = playerId === a ? b : a;
  return withJourney(save, jid, (j, t) => {
    const items = { ...j.mirrorItems };
    const revs = (qid: string) => ({
      [a]: profileRevision(save, a, b, qid),
      [b]: profileRevision(save, b, a, qid),
    });
    for (const qid of offer) {
      const rev = profileRevision(save, playerId, other, qid);
      if (rev === 0) continue; // nothing answered → nothing to offer
      let item = submitEntry(
        items[qid],
        qid,
        { questionId: qid, kind: 'profile', context: 'self' },
        j.playerIds,
        playerId,
        { revision: rev },
        t,
      );
      // Offering is consent. The engine only records consent once both have submitted, so when the
      // item reaches awaiting_consent every player who offered consents now (→ revealed).
      // R7: after an earlier reveal, an edited answer needs both to agree again — so then only the
      // player offering now consents, and the partner re-offers from S8.
      if (item.state === 'awaiting_consent') {
        const consenters = item.revealedRevision ? [playerId] : Object.keys(item.entries);
        for (const p of consenters) item = setConsent(item, p, true, t, revs(qid));
      }
      items[qid] = item;
    }
    for (const qid of withdraw) {
      const item = items[qid];
      // R3: nothing can be withdrawn once revealed. Before that, withdrawing removes the offer.
      if (!item || item.state === 'revealed' || !item.entries[playerId]) continue;
      const entries = { ...item.entries };
      delete entries[playerId];
      if (Object.keys(entries).length === 0) delete items[qid];
      else items[qid] = { ...item, entries, state: 'partial' };
    }
    return { ...j, mirrorItems: items };
  });
}
