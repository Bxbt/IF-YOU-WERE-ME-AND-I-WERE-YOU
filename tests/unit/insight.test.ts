import { describe, expect, it } from 'vitest';
import type { PersonalityAnswer, SaveRoot } from '../../src/persistence/schema';
import { categorize, compareSolo } from '../../src/engine/compare';
import { allItems, buildReport, reportForPrint } from '../../src/engine/report';
import { cut } from '../../src/engine/reportCard';
import { saveMirrorAnswer } from '../../src/store/story';
import { exportFileName, stripUnknownOptions } from '../../src/persistence/exportImport';
import { sampleSave } from '../fixtures/factory';

const T = '2026-11-22T10:00:00.000Z';
const ans = (
  questionId: string,
  selected: string[],
  meta: PersonalityAnswer['meta'] = null,
  extra: Partial<PersonalityAnswer> = {},
): PersonalityAnswer => ({
  questionId,
  layer: 'self',
  selected,
  meta,
  status: meta === 'skipped' ? 'skipped' : 'answered',
  revision: 1,
  answeredAt: T,
  updatedAt: T,
  ...extra,
});
const J = 'jr_journey001';
const A = 'pl_playerA01';
const B = 'pl_imaginedB1';

function withPerceived(s: SaveRoot, answers: Record<string, PersonalityAnswer>): SaveRoot {
  s.profiles[`${A}:perceived:${B}`] = {
    key: `${A}:perceived:${B}`,
    ownerId: A,
    aboutId: B,
    answers,
    updatedAt: T,
  };
  return s;
}

describe('TC-SKIP-11: categorize() (docs/04 §7.2)', () => {
  const x = ans('Q13', ['q13_listen', 'q13_hug']);
  it.each([
    ['missing', undefined, x, 'ask'],
    ['skipped', ans('Q13', [], 'skipped'), x, 'ask'],
    ['prefer_not', ans('Q13', [], 'prefer_not'), x, 'excluded'],
    ['depends', ans('Q13', [], 'depends'), x, 'ask'],
    ['not_sure', x, ans('Q13', [], 'not_sure'), 'ask'],
    ['free text only', ans('Q13', [], null, { freeText: 'แล้วแต่' }), x, 'ask'],
    ['overlap', ans('Q13', ['q13_hug']), x, 'similar'],
    ['no overlap', ans('Q13', ['q13_space']), x, 'different'],
  ] as const)('%s', (_n, a, b, expected) => {
    expect(categorize(a, b)).toBe(expected);
  });

  it('prefer_not wins over a missing-looking free text answer', () => {
    expect(categorize(ans('Q13', [], 'prefer_not'), ans('Q13', [], null, { freeText: 'x' }))).toBe(
      'excluded',
    );
  });
});

describe('comparison (Solo)', () => {
  it('empty journey is not comparable (TC-SKIP-09 data side)', () => {
    const s = sampleSave();
    delete s.profiles[`${A}:self`];
    expect(compareSolo(s, s.journeys[J]!).comparable).toBe(false);
  });

  it('self ↔ perceived per question; every pair is also an "ask" item; no W3 (TC-SKIP-13)', () => {
    let s = withPerceived(sampleSave(), { Q13: ans('Q13', ['q13_listen'], null, { layer: 'perceived' }) });
    s = saveMirrorAnswer(s, J, 'w3_1', 'role', A, 'self', {
      selected: ['w3e_fear'],
      meta: null,
      freeText: '',
    });
    s = saveMirrorAnswer(s, J, 'w3_1', 'role', A, 'perceived', {
      selected: ['w3e_fear'],
      meta: null,
      freeText: '',
    });
    const c = compareSolo(s, s.journeys[J]!);
    expect(c.comparable).toBe(true);
    expect(c.similar.map((i) => i.question.id)).toEqual(['Q13']);
    expect(c.ask.find((i) => i.question.id === 'Q13')?.reason).toBe('solo_unknown');
    const all = [...c.similar, ...c.different, ...c.ask].map((i) => i.question.id);
    expect(all.some((id) => id.startsWith('w3'))).toBe(false);
    const report = allItems(buildReport(s, s.journeys[J]!, A, c));
    expect(report.some((i) => i.questionId?.startsWith('w3') || i.text.includes('w3'))).toBe(false);
  });

  it('TC-SKIP-14: each journey uses its own M01; the profile is shared', () => {
    let s = sampleSave();
    s.journeys.jr_journey002 = {
      ...s.journeys[J]!,
      id: 'jr_journey002',
      status: 'archived',
      mirrorItems: {},
    };
    s = saveMirrorAnswer(s, J, 'M01', 'self', A, 'self', { selected: ['m01_hug'], meta: null, freeText: '' });
    s = saveMirrorAnswer(s, J, 'M01', 'self', A, 'perceived', {
      selected: ['m01_hug'],
      meta: null,
      freeText: '',
    });
    s = saveMirrorAnswer(s, 'jr_journey002', 'M01', 'self', A, 'self', {
      selected: ['m01_space'],
      meta: null,
      freeText: '',
    });
    s = saveMirrorAnswer(s, 'jr_journey002', 'M01', 'self', A, 'perceived', {
      selected: ['m01_hug'],
      meta: null,
      freeText: '',
    });
    const one = compareSolo(s, s.journeys[J]!);
    const two = compareSolo(s, s.journeys.jr_journey002!);
    expect(one.similar.map((i) => i.question.id)).toContain('M01');
    expect(two.different.map((i) => i.question.id)).toContain('M01');
    expect(one.ask.find((i) => i.question.id === 'Q16')).toEqual(
      two.ask.find((i) => i.question.id === 'Q16'),
    );
  });
});

describe('report', () => {
  const build = (s: SaveRoot) => buildReport(s, s.journeys[J]!, A, compareSolo(s, s.journeys[J]!));

  it('TC-SKIP-10: an empty journey still has all four sections; nothing selected → empty PDF summary', () => {
    const s = sampleSave();
    s.profiles = {};
    const sections = build(s);
    expect(sections.map((x) => x.id)).toEqual(['me', 'understanding', 'differences', 'next']);
    expect(reportForPrint(sections, new Set())).toEqual([]);
  });

  it('TC-EXP-07: the PDF summary has only the selected items, each with its source label', () => {
    const s = withPerceived(sampleSave(), {
      Q13: ans('Q13', ['q13_listen'], null, { layer: 'perceived' }),
      Q22: ans('Q22', [], 'not_sure', { layer: 'perceived' }),
    });
    const sections = build(s);
    const items = allItems(sections);
    const pick = [
      items.find((i) => i.source === 'self')!,
      items.find((i) => i.source === 'perceived')!,
      items.find((i) => i.source === 'conversation')!,
    ];
    const doc = reportForPrint(sections, new Set(pick.map((i) => i.id)));
    const shown = doc.flatMap((x) => x.groups.flatMap((g) => g.items));
    expect(shown).toHaveLength(3);
    expect(shown.map((i) => i.label)).toContain('คุณบอก');
    expect(shown.map((i) => i.label)).toContain('คุณคิด');
    expect(doc.every((x) => x.groups.every((g) => g.items.length > 0))).toBe(true);
  });

  it('perceived "ไม่แน่ใจ" lands in "สิ่งที่ฉันยังไม่เข้าใจ"', () => {
    const s = withPerceived(sampleSave(), { Q22: ans('Q22', [], 'not_sure', { layer: 'perceived' }) });
    const u = build(s).find((x) => x.id === 'understanding')!;
    expect(u.groups.find((g) => g.id === 'u-unsure')!.items).toHaveLength(1);
  });

  it('PNG card text is cut at 140 characters with "…"', () => {
    const long = 'ก'.repeat(200);
    expect(Array.from(cut(long))).toHaveLength(140);
    expect(cut(long).endsWith('…')).toBe(true);
    expect(cut('สั้น')).toBe('สั้น');
  });

  it('TC-EXP-09: export file names never contain player names', () => {
    const now = new Date('2026-11-22T10:05:00');
    for (const ext of ['png', 'pdf']) {
      const name = exportFileName('report', now, ext);
      expect(name).toBe(`iywm-report-20261122-1005.${ext}`);
      expect(name).not.toContain('ผู้เล่น');
    }
  });
});

describe('TC-EXP-06: import drops option ids this version does not know', () => {
  it('counts and removes them, keeps known ones', () => {
    const s = sampleSave();
    s.profiles[`${A}:self`]!.answers.Q13 = ans('Q13', ['q13_listen', 'q13_from_the_future']);
    const { data, removed } = stripUnknownOptions(s);
    expect(removed).toBe(1);
    expect(data.profiles[`${A}:self`]!.answers.Q13!.selected).toEqual(['q13_listen']);
  });
});

describe('report item ids', () => {
  it('are unique so selection and export never duplicate a line', () => {
    const s = withPerceived(sampleSave(), {
      Q13: ans('Q13', ['q13_listen'], null, { layer: 'perceived' }),
      Q26: ans('Q26', [], 'depends', { layer: 'perceived' }),
    });
    const ids = allItems(buildReport(s, s.journeys[J]!, A, compareSolo(s, s.journeys[J]!))).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
