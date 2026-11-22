/**
 * Save mutations. Every function returns a new SaveRoot (no in-place mutation) and is used
 * through useGame.getState().update(...). Shapes follow docs/07.
 */
import type { GameSession, PersonalityAnswer, Player, SaveRoot } from '../persistence/schema';
import { checkSupportKeywords } from '../lib/supportCard';
import { purgeBackup } from '../persistence/persist';
import { newJourneyId, newPlayerId, nowIso } from '../lib/ids';
import { useGame } from './game';
import type { MetaValue } from '../content/types';

export type PlayerInput = Pick<Player, 'nickname' | 'sentenceEnding' | 'addressStyle' | 'appearance'> & {
  pronouns?: string;
  bio?: string;
};

function clean(input: PlayerInput): PlayerInput {
  const out: PlayerInput = { ...input, nickname: input.nickname.trim() };
  if (!out.pronouns?.trim()) delete out.pronouns;
  else out.pronouns = out.pronouns.trim();
  if (!out.bio?.trim()) delete out.bio;
  else out.bio = out.bio.trim();
  return out;
}

export function createPlayer(
  input: PlayerInput,
  kind: Player['kind'] = 'real',
  createdBy: string | null = null,
): string {
  const id = newPlayerId();
  const t = nowIso();
  useGame.getState().update((s) => ({
    ...s,
    players: { ...s.players, [id]: { id, kind, createdBy, ...clean(input), createdAt: t, updatedAt: t } },
  }));
  return id;
}

export function updatePlayer(id: string, input: PlayerInput) {
  useGame.getState().update((s) => {
    const p = s.players[id];
    if (!p) return s;
    const { pronouns: _p, bio: _b, ...base } = p;
    void _p;
    void _b;
    return { ...s, players: { ...s.players, [id]: { ...base, ...clean(input), updatedAt: nowIso() } } };
  });
}

export function activeJourney(save: SaveRoot): GameSession | undefined {
  return Object.values(save.journeys).find((j) => j.status === 'active');
}

/**
 * The journey the player is on: the active one, else the last one played if it is completed —
 * a completed journey stays viewable and replayable (docs/05 §3.2). Archived ones never.
 */
export function currentJourney(save: SaveRoot): GameSession | undefined {
  const active = activeJourney(save);
  if (active) return active;
  const last = save.settings.lastJourneyId ? save.journeys[save.settings.lastJourneyId] : undefined;
  return last?.status === 'completed' ? last : undefined;
}

/** MVP: one active journey (A-23). Any existing active journey is archived first. */
export function createSoloJourney(selfId: string, imaginedId: string): string {
  const id = newJourneyId();
  const t = nowIso();
  useGame.getState().update((s) => {
    const journeys = Object.fromEntries(
      Object.entries(s.journeys).map(([k, j]) => [
        k,
        j.status === 'active' ? { ...j, status: 'archived' as const, updatedAt: t } : j,
      ]),
    );
    journeys[id] = {
      id,
      mode: 'solo',
      playerIds: [selfId, imaginedId],
      status: 'active',
      chapterProgress: {},
      storyAnswers: {},
      mirrorItems: {},
      observed: [],
      nextConversation: [],
      introSeen: true,
      createdAt: t,
      updatedAt: t,
      lastPlayedAt: t,
    };
    return { ...s, journeys, settings: { ...s.settings, lastJourneyId: id } };
  });
  return id;
}

export function profileKey(ownerId: string, layer: 'self' | 'perceived', aboutId?: string): string {
  return layer === 'self' ? `${ownerId}:self` : `${ownerId}:perceived:${aboutId}`;
}

const EMPTY_ANSWERS: Record<string, PersonalityAnswer> = Object.freeze({}) as Record<
  string,
  PersonalityAnswer
>;

/** Returns a stable empty object so store selectors do not re-render forever. */
export function getAnswers(save: SaveRoot, key: string): Record<string, PersonalityAnswer> {
  return save.profiles[key]?.answers ?? EMPTY_ANSWERS;
}

export interface AnswerInput {
  selected: string[];
  meta: MetaValue | null;
  freeText: string;
}

function sameAnswer(a: PersonalityAnswer, b: AnswerInput): boolean {
  return (
    a.meta === b.meta &&
    (a.freeText ?? '') === b.freeText.trim() &&
    a.selected.join('|') === b.selected.join('|')
  );
}

/** Saves one answer; revision increases only when the content changes (TC-PROF-04). */
export function saveAnswer(
  ownerId: string,
  layer: 'self' | 'perceived',
  aboutId: string | undefined,
  questionId: string,
  input: AnswerInput,
) {
  const key = profileKey(ownerId, layer, aboutId);
  const t = nowIso();
  checkSupportKeywords(input.freeText);
  useGame.getState().update((s) => {
    const existing = s.profiles[key];
    const prev = existing?.answers[questionId];
    if (prev && sameAnswer(prev, input)) return s;
    const freeText = input.freeText.trim();
    const answer: PersonalityAnswer = {
      questionId,
      layer,
      selected: input.meta ? [] : input.selected,
      meta: input.meta,
      ...(freeText && input.meta !== 'skipped' ? { freeText } : {}),
      status: input.meta === 'skipped' ? 'skipped' : 'answered',
      revision: (prev?.revision ?? 0) + 1,
      answeredAt: prev?.answeredAt ?? t,
      updatedAt: t,
    };
    const base =
      existing ??
      (layer === 'self'
        ? { key, ownerId, answers: {}, hiddenObservedCards: [], confirmedObserved: {}, updatedAt: t }
        : { key, ownerId, aboutId: aboutId!, answers: {}, updatedAt: t });
    const drafts = { ...s.drafts };
    delete drafts[draftKey(ownerId, layer, aboutId, questionId)];
    return {
      ...s,
      drafts,
      profiles: {
        ...s.profiles,
        [key]: { ...base, answers: { ...base.answers, [questionId]: answer }, updatedAt: t },
      },
    };
  });
}

/** Removes an answer for real and purges the backup so no copy survives (audit H-4). */
export function deleteAnswer(
  ownerId: string,
  layer: 'self' | 'perceived',
  aboutId: string | undefined,
  questionId: string,
) {
  const key = profileKey(ownerId, layer, aboutId);
  useGame.getState().update((s) => {
    const p = s.profiles[key];
    if (!p?.answers[questionId]) return s;
    const answers = { ...p.answers };
    delete answers[questionId];
    return { ...s, profiles: { ...s.profiles, [key]: { ...p, answers, updatedAt: nowIso() } } };
  });
  useGame.getState().flush();
  purgeBackup();
}

export function draftKey(
  ownerId: string,
  layer: 'self' | 'perceived',
  aboutId: string | undefined,
  questionId: string,
) {
  return layer === 'self' ? `${ownerId}:self:${questionId}` : `${ownerId}:perceived:${aboutId}:${questionId}`;
}

export function saveDraft(ownerId: string, key: string, text: string) {
  useGame.getState().update((s) => {
    const drafts = { ...s.drafts };
    if (!text.trim()) delete drafts[key];
    else drafts[key] = { key, playerId: ownerId, text: text.slice(0, 500), updatedAt: nowIso() };
    return { ...s, drafts };
  });
}
