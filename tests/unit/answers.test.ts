import { describe, expect, it } from 'vitest';
import { canProceed, emptyDraft, isOptionDisabled, selectMeta, toggleOption } from '../../src/engine/answers';
import type { OptionContent } from '../../src/content/types';

const Q15: OptionContent[] = [
  { id: 'q15_minimize', text: 'a' },
  { id: 'q15_advice_fast', text: 'b' },
  { id: 'q15_compare', text: 'c' },
  { id: 'q15_none', text: 'none', exclusive: true },
];
const opt = (id: string) => Q15.find((o) => o.id === id)!;

describe('answer rules (docs/04 §3.2)', () => {
  it('TC-SKIP-01/02: cannot proceed empty; free text alone is enough', () => {
    expect(canProceed(emptyDraft())).toBe(false);
    expect(canProceed({ ...emptyDraft(), freeText: '  ' })).toBe(false);
    expect(canProceed({ ...emptyDraft(), freeText: 'คำตอบ' })).toBe(true);
  });

  it('TC-SKIP-03: choosing a meta answer clears selected options', () => {
    let d = toggleOption(emptyDraft(), opt('q15_minimize'), Q15, 2);
    d = selectMeta(d, 'not_sure');
    expect(d).toMatchObject({ selected: [], meta: 'not_sure' });
    expect(canProceed(d)).toBe(true);
  });

  it('choosing an option clears the meta answer; skip clears free text', () => {
    let d = selectMeta({ ...emptyDraft(), freeText: 'x' }, 'depends');
    expect(d.freeText).toBe('x');
    d = toggleOption(d, opt('q15_compare'), Q15, 2);
    expect(d).toMatchObject({ meta: null, selected: ['q15_compare'] });
    expect(selectMeta({ ...emptyDraft(), freeText: 'x' }, 'skipped').freeText).toBe('');
  });

  it('TC-SKIP-04: maxSelect blocks a third option', () => {
    let d = toggleOption(emptyDraft(), opt('q15_minimize'), Q15, 2);
    d = toggleOption(d, opt('q15_advice_fast'), Q15, 2);
    expect(isOptionDisabled(d, opt('q15_compare'), 2)).toBe(true);
    expect(toggleOption(d, opt('q15_compare'), Q15, 2).selected).toEqual(['q15_minimize', 'q15_advice_fast']);
  });

  it('TC-SKIP-12: exclusive option clears others and is cleared by them', () => {
    let d = toggleOption(emptyDraft(), opt('q15_minimize'), Q15, 2);
    d = toggleOption(d, opt('q15_advice_fast'), Q15, 2);
    expect(isOptionDisabled(d, opt('q15_none'), 2)).toBe(false);
    d = toggleOption(d, opt('q15_none'), Q15, 2);
    expect(d.selected).toEqual(['q15_none']);
    d = toggleOption(d, opt('q15_compare'), Q15, 2);
    expect(d.selected).toEqual(['q15_compare']);
  });

  it('single-select replaces the previous choice', () => {
    let d = toggleOption(emptyDraft(), opt('q15_minimize'), Q15, 1);
    d = toggleOption(d, opt('q15_compare'), Q15, 1);
    expect(d.selected).toEqual(['q15_compare']);
  });

  it('tapping a selected option or meta again unselects it', () => {
    const d = toggleOption(emptyDraft(), opt('q15_minimize'), Q15, 2);
    expect(toggleOption(d, opt('q15_minimize'), Q15, 2).selected).toEqual([]);
    expect(selectMeta(selectMeta(emptyDraft(), 'depends'), 'depends').meta).toBeNull();
  });
});
