/**
 * Small builders for story lines (storyline 2 content files). Same shapes as the literal objects in
 * ch1–ch5 (src/content/types.ts) — only shorter to write. `in`/`out` are the role speakers; in
 * storyline 2 `in` is the teller (docs/02 เส้นเรื่องที่ 2).
 */
import type { Condition, EnvSet, Expression, LineContent } from '../../types';

type Who = 'in' | 'out';

export const N = (text: string, when?: Condition): LineContent => ({
  type: 'NARR',
  text,
  ...(when ? { when } : {}),
});
export const S = (title: string, text: string, when?: Condition): LineContent => ({
  type: 'SYS',
  title,
  text,
  ...(when ? { when } : {}),
});
export const SYS = (text: string): LineContent => ({ type: 'SYS', text });
export const D = (speaker: Who, text: string, expression?: Expression, when?: Condition): LineContent => ({
  type: 'DLG',
  speaker,
  text,
  ...(expression ? { expression } : {}),
  ...(when ? { when } : {}),
});
export const M = (speaker: Who, text: string, when?: Condition): LineContent => ({
  type: 'MONO',
  speaker,
  text,
  ...(when ? { when } : {}),
});
export const E = (set: EnvSet): LineContent => ({ type: 'ENV', set });
export const SAFE = (text: string): LineContent => ({ type: 'SAFETY_NOTE', text });

export const is = (flag: string, eq: string): Condition => ({ flag, eq });
/** True when the flag is unset or holds one of `values` (the "otherwise" branch of a script). */
export const unsetOr = (flag: string, ...values: string[]): Condition => ({
  any: [{ flag, unset: true }, ...values.map((eq) => ({ flag, eq }))],
});
