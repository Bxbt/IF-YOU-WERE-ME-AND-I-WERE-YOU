import { describe, expect, it, beforeEach } from 'vitest';
import {
  checkSupportKeywords,
  containsSupportKeyword,
  resetSupportCardSession,
  useSupportCard,
} from '../../src/lib/supportCard';
import { ui } from '../../src/content/th/ui';
import { templates } from '../../src/content/th/templates';

describe('TC-SAFE-03 (logic): local support keyword card', () => {
  beforeEach(resetSupportCardSession);

  it('detects keywords even with spaces in between', () => {
    expect(containsSupportKeyword('บางทีก็ อยาก ตาย')).toBe(true);
    expect(containsSupportKeyword('อยากกินข้าวผัด')).toBe(false);
  });

  it('opens at most once per app open and keeps nothing', () => {
    checkSupportKeywords('อยากตาย');
    expect(useSupportCard.getState().open).toBe(true);
    useSupportCard.getState().close();
    checkSupportKeywords('อยากตาย');
    expect(useSupportCard.getState().open).toBe(false);
    expect(JSON.stringify(localStorage)).not.toContain('อยากตาย');
  });
});

describe('TC-SAFE-02: UI text has no %, "คะแนน" or "score" in a result context', () => {
  const strings: string[] = [];
  const collect = (v: unknown) => {
    if (typeof v === 'string') strings.push(v);
    else if (typeof v === 'function') {
      try {
        const out = (v as (...a: unknown[]) => unknown)('X', 'Y', 'Z', 'W');
        if (typeof out === 'string') strings.push(out);
      } catch {
        /* templates with numeric args */
      }
    } else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  };
  collect(ui);
  collect(templates);

  it('collects the strings', () => expect(strings.length).toBeGreaterThan(200));

  it.each(['%', 'score'])('no "%s"', (w) => {
    expect(strings.filter((s) => s.toLowerCase().includes(w))).toEqual([]);
  });

  it('"คะแนน" only ever appears as "ไม่มีคะแนน"', () => {
    expect(strings.filter((s) => s.replaceAll('ไม่มีคะแนน', '').includes('คะแนน'))).toEqual([]);
  });
});
