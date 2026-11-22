/**
 * Personality comparison (docs/04 §7). Pure functions. Per journey: Profile Q01–Q36 (global per
 * player) + Mirror M01–M07 of that journey. W3 (context 'role') is never used (docs/04 §2.1).
 * No counts and no scores anywhere (docs/04 §7.4).
 */
import type { PersonalityAnswer, SaveRoot, GameSession } from '../persistence/schema';
import type { QuestionContent } from '../content/types';
import { MIRRORS, QUESTIONS } from '../content/th/questions';
import { revealPairs } from './reveal';

export type Category = 'similar' | 'different' | 'ask' | 'excluded';
export type AskReason = 'unsure' | 'missing' | 'own_words' | 'solo_unknown';

/** docs/04 §7.2 — the order of the checks matters. */
export function categorize(x?: PersonalityAnswer, y?: PersonalityAnswer): Category {
  if (!x || !y || x.status === 'skipped' || y.status === 'skipped') return 'ask';
  if (x.meta === 'prefer_not' || y.meta === 'prefer_not') return 'excluded';
  if (x.meta === 'depends' || x.meta === 'not_sure' || y.meta === 'depends' || y.meta === 'not_sure')
    return 'ask';
  if (x.selected.length === 0 || y.selected.length === 0) return 'ask';
  return x.selected.some((id) => y.selected.includes(id)) ? 'similar' : 'different';
}

export function askReason(x?: PersonalityAnswer, y?: PersonalityAnswer): Exclude<AskReason, 'solo_unknown'> {
  if (!x || !y || x.status === 'skipped' || y.status === 'skipped') return 'missing';
  if (x.meta || y.meta) return 'unsure';
  return 'own_words';
}

export interface CompareItem {
  question: QuestionContent;
  dimension: string;
  category: Exclude<Category, 'excluded'>;
  reason?: AskReason;
  /** Solo: x = what the player said, y = what the player thinks the partner would say. */
  x?: PersonalityAnswer;
  y?: PersonalityAnswer;
}

export interface Comparison {
  /** At least one question where both sides have an answer (docs/04 §7.1). */
  comparable: boolean;
  similar: CompareItem[];
  different: CompareItem[];
  ask: CompareItem[];
}

const ORDER = [...QUESTIONS, ...MIRRORS];
const dimOf = (q: QuestionContent) => q.dimension ?? 'D99';

/**
 * The owner's own pairs: owner.self ↔ owner.perceived(partner), for Q01–Q36 and M01–M07.
 * Only the owner's data is read, so this is safe for either player in Play Together (R1).
 * `selfId` defaults to the solo player (playerIds[0]).
 */
export function soloPairs(
  save: SaveRoot,
  j: GameSession,
  selfId: string = j.playerIds[0],
): { q: QuestionContent; x?: PersonalityAnswer; y?: PersonalityAnswer }[] {
  const self = selfId;
  const partner = j.playerIds.find((p) => p !== selfId) ?? j.playerIds[1];
  const selfAnswers = save.profiles[`${self}:self`]?.answers ?? {};
  const perceived = save.profiles[`${self}:perceived:${partner}`]?.answers ?? {};
  return ORDER.map((q) => {
    if (q.id.startsWith('M')) {
      const e = j.mirrorItems[q.id];
      const entry = e && e.context === 'self' && e.kind === 'mirror' ? e.entries[self] : undefined;
      return { q, x: entry?.self, y: entry?.perceived };
    }
    return { q, x: selfAnswers[q.id], y: perceived[q.id] };
  });
}

export function compareSolo(save: SaveRoot, j: GameSession, selfId: string = j.playerIds[0]): Comparison {
  const pairs = soloPairs(save, j, selfId).filter((p) => p.x || p.y);
  const out: Comparison = { comparable: pairs.some((p) => p.x && p.y), similar: [], different: [], ask: [] };
  for (const { q, x, y } of pairs) {
    const category = categorize(x, y);
    if (category === 'excluded') continue;
    const item: CompareItem = { question: q, dimension: dimOf(q), category, x, y };
    if (category === 'ask') out.ask.push({ ...item, reason: askReason(x, y) });
    else {
      out[category].push(item);
      // Solo: the partner's real answer is unknown, so every pair is also worth asking (docs/04 §7.1).
      out.ask.push({ ...item, category: 'ask', reason: 'solo_unknown' });
    }
  }
  const byDim = (a: CompareItem, b: CompareItem) =>
    a.dimension.localeCompare(b.dimension) || a.question.id.localeCompare(b.question.id);
  out.similar.sort(byDim);
  out.different.sort(byDim);
  out.ask.sort(byDim);
  return out;
}

/** "อ้อมกอด · คนที่ฟัง" — option texts of an answer, in content order. */
export function optionTexts(q: QuestionContent, ids: string[]): string {
  return q.options
    .filter((o) => ids.includes(o.id))
    .map((o) => o.text)
    .join(' · ');
}

export function sharedTexts(q: QuestionContent, x: PersonalityAnswer, y: PersonalityAnswer): string {
  return optionTexts(
    q,
    x.selected.filter((id) => y.selected.includes(id)),
  );
}

// ---------- Play Together (docs/04 §7.1, M10) ----------

/**
 * One number for the owner's current version of a profile question: self and perceived-about-the-
 * partner revisions together. Any edit to either changes it, so a revealed item hides again (R7).
 */
export function profileRevision(save: SaveRoot, ownerId: string, aboutId: string, qid: string): number {
  const self = save.profiles[`${ownerId}:self`]?.answers[qid]?.revision ?? 0;
  const perceived = save.profiles[`${ownerId}:perceived:${aboutId}`]?.answers[qid]?.revision ?? 0;
  return self + 100_000 * perceived;
}

export type TogetherView = 'a_view' | 'b_view' | 'direct';

export interface TogetherItem {
  question: QuestionContent;
  dimension: string;
  category: Exclude<Category, 'excluded'>;
  view: TogetherView;
  /** x belongs to xOwner (their self answer); y is the other player's guess (views) or self (direct). */
  xOwner: string;
  yOwner: string;
  x?: PersonalityAnswer;
  y?: PersonalityAnswer;
}

export interface TogetherComparison {
  comparable: boolean;
  similar: TogetherItem[];
  different: TogetherItem[];
  ask: TogetherItem[];
  /** Mirror questions both answered but not opened yet — question ids only, never answers. */
  pending: string[];
}

/**
 * Together: only revealed mirror items (M01–M07, context 'self') — `revealPairs` returns nothing
 * unrevealed, so this can never leak a private answer (R1). W3 (context 'role') is never used.
 * Profile Q01–Q36 reveal is not part of M10 (documented follow-up).
 */
export function compareTogether(j: GameSession, save?: SaveRoot): TogetherComparison {
  const [a, b] = j.playerIds;
  const out: TogetherComparison = { comparable: false, similar: [], different: [], ask: [], pending: [] };
  if (save) {
    // Profile Q01–Q36 opened in this journey (M10b): read from the profiles, shown only while the
    // owner's current version is the one both agreed to (R7 — profileRevision).
    for (const q of QUESTIONS) {
      const item = j.mirrorItems[q.id];
      if (!item || item.kind !== 'profile' || item.state !== 'revealed') continue;
      if (
        item.revealedRevision?.[a] !== profileRevision(save, a, b, q.id) ||
        item.revealedRevision?.[b] !== profileRevision(save, b, a, q.id)
      )
        continue;
      const self = (p: string) => save.profiles[`${p}:self`]?.answers[q.id];
      const guess = (p: string, about: string) => save.profiles[`${p}:perceived:${about}`]?.answers[q.id];
      const defs: [TogetherView, string, string, PersonalityAnswer | undefined, PersonalityAnswer | undefined][] = [
        ['a_view', a, b, self(a), guess(b, a)],
        ['b_view', b, a, self(b), guess(a, b)],
        ['direct', a, b, self(a), self(b)],
      ];
      for (const [view, xOwner, yOwner, x, y] of defs) {
        if (!x && !y) continue;
        const category = categorize(x, y);
        if (category === 'excluded') continue;
        if (x && y) out.comparable = true;
        out[category].push({ question: q, dimension: dimOf(q), category, view, xOwner, yOwner, x, y });
      }
    }
  }
  for (const q of MIRRORS) {
    const item = j.mirrorItems[q.id];
    if (!item || item.kind !== 'mirror' || item.context !== 'self') continue;
    if (item.state === 'awaiting_consent') out.pending.push(q.id);
    for (const p of revealPairs(item, a, b)) {
      const ti: TogetherItem = {
        question: q,
        dimension: dimOf(q),
        category: p.category,
        view: p.kind,
        xOwner: p.xOwner,
        yOwner: p.yOwner,
        x: p.x,
        y: p.y,
      };
      if (p.x && p.y) out.comparable = true;
      out[p.category].push(ti);
    }
  }
  return out;
}
