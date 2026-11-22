/**
 * Personality comparison (docs/04 §7). Pure functions. Per journey: Profile Q01–Q36 (global per
 * player) + Mirror M01–M07 of that journey. W3 (context 'role') is never used (docs/04 §2.1).
 * No counts and no scores anywhere (docs/04 §7.4).
 */
import type { PersonalityAnswer, SaveRoot, GameSession } from '../persistence/schema';
import type { QuestionContent } from '../content/types';
import { MIRRORS, QUESTIONS } from '../content/th/questions';

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

/** Answer pairs for Play Alone: A.self ↔ A.perceived(imagined), for Q01–Q36 and M01–M07. */
export function soloPairs(
  save: SaveRoot,
  j: GameSession,
): { q: QuestionContent; x?: PersonalityAnswer; y?: PersonalityAnswer }[] {
  const [self, partner] = j.playerIds;
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

export function compareSolo(save: SaveRoot, j: GameSession): Comparison {
  const pairs = soloPairs(save, j).filter((p) => p.x || p.y);
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
