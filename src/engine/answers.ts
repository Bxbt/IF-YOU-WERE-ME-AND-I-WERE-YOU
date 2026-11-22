/**
 * Answer selection rules — docs/04 §3.2. Pure functions shared by ChoiceList/MetaOptions
 * and by the persistence layer, so the UI and the saved data obey the same rules.
 */
import type { MetaValue, OptionContent } from '../content/types';

export interface AnswerDraft {
  selected: string[];
  meta: MetaValue | null;
  freeText: string;
}

export const emptyDraft = (): AnswerDraft => ({ selected: [], meta: null, freeText: '' });

export function toggleOption(draft: AnswerDraft, option: OptionContent, options: OptionContent[], maxSelect: number): AnswerDraft {
  const isSelected = draft.selected.includes(option.id);
  if (isSelected) return { ...draft, selected: draft.selected.filter((id) => id !== option.id) };

  // Choosing a real option clears any meta answer.
  if (option.exclusive) return { ...draft, meta: null, selected: [option.id] };

  const exclusiveIds = new Set(options.filter((o) => o.exclusive).map((o) => o.id));
  const kept = draft.selected.filter((id) => !exclusiveIds.has(id));
  if (maxSelect === 1) return { ...draft, meta: null, selected: [option.id] };
  if (kept.length >= maxSelect) return { ...draft, meta: null, selected: kept };
  return { ...draft, meta: null, selected: [...kept, option.id] };
}

/** Meta answers are exclusive with normal options. 'skipped' also clears free text. */
export function selectMeta(draft: AnswerDraft, meta: MetaValue): AnswerDraft {
  if (draft.meta === meta) return { ...draft, meta: null };
  return { selected: [], meta, freeText: meta === 'skipped' ? '' : draft.freeText };
}

export function isOptionDisabled(draft: AnswerDraft, option: OptionContent, maxSelect: number): boolean {
  if (draft.selected.includes(option.id) || option.exclusive || maxSelect === 1) return false;
  return draft.selected.length >= maxSelect;
}

export function canProceed(draft: AnswerDraft): boolean {
  if (draft.meta !== null) return true;
  return draft.selected.length > 0 || draft.freeText.trim().length > 0;
}
