/**
 * Personality engine — docs/04 §4. Deterministic, no ML/LLM, no scores, no labels.
 */
import type { PersonalityAnswer } from '../persistence/schema';
import type { QuestionContent } from '../content/types';
import { DIMENSIONS, QUESTIONS } from '../content/th/questions';

export const QUESTION_BY_ID: Record<string, QuestionContent> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
export const QUICK_SET = QUESTIONS.filter((q) => q.quick).map((q) => q.id);
export const FULL_SET = QUESTIONS.map((q) => q.id);
export type QuestionSet = 'quick' | 'full';
export const setIds = (set: QuestionSet) => (set === 'quick' ? QUICK_SET : FULL_SET);

export function dimensionName(id: string | undefined): string {
  return DIMENSIONS.find((d) => d.id === id)?.name ?? '';
}

/** Replaces {other} with the partner's nickname (docs/03 §0.3). */
export function questionText(q: QuestionContent, layer: 'self' | 'perceived', otherName = ''): string {
  const raw = layer === 'self' ? q.self : (q.perceived ?? q.self);
  return raw.replaceAll('{other}', otherName);
}

export interface Progress {
  answered: number;
  skipped: number;
  total: number;
  /** Index (within ids) of the first question with no answer at all, or -1. */
  firstOpen: number;
}

export function progress(answers: Record<string, PersonalityAnswer>, ids: string[]): Progress {
  let answered = 0;
  let skipped = 0;
  let firstOpen = -1;
  ids.forEach((id, i) => {
    const a = answers[id];
    if (!a) {
      if (firstOpen === -1) firstOpen = i;
    } else if (a.status === 'skipped') skipped++;
    else answered++;
  });
  return { answered, skipped, total: ids.length, firstOpen };
}

export interface Statement {
  questionId: string;
  question: string;
  options: string[];
  freeText?: string;
}

export interface DimensionSummary {
  dimension: string;
  name: string;
  state: 'has_data' | 'uncertain' | 'empty';
  statements: Statement[];
  hasUncertain: boolean;
}

/** docs/04 §4.1 — prefer_not answers are never summarised; skipped ones count as empty. */
export function summarize(answers: Record<string, PersonalityAnswer>, layer: 'self' | 'perceived', otherName = ''): DimensionSummary[] {
  return DIMENSIONS.map((d) => {
    const qs = QUESTIONS.filter((q) => q.dimension === d.id);
    const statements: Statement[] = [];
    let uncertain = 0;
    for (const q of qs) {
      const a = answers[q.id];
      if (!a || a.status !== 'answered') continue;
      if (a.meta === 'depends' || a.meta === 'not_sure') {
        uncertain++;
        continue;
      }
      if (a.meta !== null) continue;
      const labels = a.selected.map((id) => q.options.find((o) => o.id === id)?.text).filter((t): t is string => !!t);
      if (labels.length === 0 && !a.freeText) continue;
      statements.push({ questionId: q.id, question: questionText(q, layer, otherName), options: labels, freeText: a.freeText });
    }
    return {
      dimension: d.id,
      name: d.name,
      state: statements.length > 0 ? 'has_data' : uncertain > 0 ? 'uncertain' : 'empty',
      statements,
      hasUncertain: uncertain > 0,
    };
  });
}
