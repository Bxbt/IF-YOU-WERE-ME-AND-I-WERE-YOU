/** M5 engine/store pieces with small inline content (chapter files are covered by contentLint). */
import { describe, expect, it } from 'vitest';
import type { ChapterContent } from '../../src/content/types';
import {
  advance,
  expandScene,
  fragmentTokens,
  normalizeIndex,
  rewriteTokens,
  safetyNotesUpTo,
  sceneById,
  startOfChapter,
  visibleOptions,
  type StoryState,
} from '../../src/engine/dialogue';
import {
  addNextConversation,
  completeJourney,
  saveInterpretation,
  saveMirrorAnswer,
  saveStatement,
} from '../../src/store/story';
import { currentJourney } from '../../src/store/actions';
import { SaveRoot } from '../../src/persistence/schema';
import { sampleSave } from '../fixtures/factory';

const S = (over: Partial<StoryState> = {}): StoryState => ({
  flags: {},
  priorWarning: true,
  chosen: {},
  ...over,
});

const CH: ChapterContent = {
  id: 'ch3',
  titleEn: 'T',
  titleTh: 'ท',
  estimatedMinutes: [1, 2],
  firstScene: 'a',
  fragments: {
    cope_text: { flag: 'in_cope', values: { breathe: 'นับลมหายใจ' }, fallback: '…ช่วงเวลานี้ คุณข้ามไป' },
  },
  rewrites: [
    {
      token: 'rewrite_out',
      flag: 'rewrite_out',
      choiceId: 'rw',
      originalChoiceId: 'first',
      storyItem: 'rewrite_out',
    },
  ],
  scenes: [
    {
      id: 'a',
      background: 'bg_black',
      ariaLabel: 'ฉากทดสอบ',
      controller: 'waiter',
      lines: [
        { type: 'NARR', text: 'หนึ่ง' },
        {
          type: 'CHOICE',
          id: 'first',
          owner: 'waiter',
          options: [
            { id: 'x', text: '"ไปไหนมา"', setFlags: { w: 'x' } },
            { id: 'y', text: '"ขอกอดได้ไหม"', setFlags: { w: 'hug' } },
          ],
        },
        { type: 'SAFETY_NOTE', text: 'ข้อความถึงคุณ', when: { flag: 'w', eq: 'x' } },
        { type: 'NARR', text: 'สอง' },
        {
          type: 'CHOICE',
          id: 'rw',
          owner: 'waiter',
          options: [
            { id: 'glad', text: '"ดีใจที่ยังอยู่"', setFlags: { rewrite_out: 'glad' } },
            {
              id: 'hug_only',
              text: 'เฉพาะตอนขอกอด',
              when: { flag: 'w', eq: 'hug' },
              setFlags: { rewrite_out: 'hug_only' },
            },
            { id: 'same', text: 'ไม่เปลี่ยน', setFlags: { rewrite_out: 'unchanged' } },
          ],
          custom: { setFlags: { rewrite_out: 'custom' }, storyItem: 'rewrite_out', maxLength: 140 },
        },
      ],
      next: null,
    },
  ],
  reflection: [],
  transition: { lines: [] },
};

describe('M5 engine', () => {
  it('TC-PLAY-05 style: fragments use the flag value or the neutral fallback (never a random value)', () => {
    expect(fragmentTokens(CH, S({ flags: { in_cope: 'breathe' } })).cope_text).toBe('นับลมหายใจ');
    expect(fragmentTokens(CH, S()).cope_text).toBe('…ช่วงเวลานี้ คุณข้ามไป');
  });

  it('rewrite tokens: option text, custom words as plain text, original words when unchanged', () => {
    const base = { chosen: { first: 'x' }, flags: { w: 'x' } };
    expect(
      rewriteTokens(CH, S({ ...base, flags: { ...base.flags, rewrite_out: 'glad' } }), () => undefined)
        .rewrite_out,
    ).toBe('"ดีใจที่ยังอยู่"');
    expect(
      rewriteTokens(CH, S({ ...base, flags: { ...base.flags, rewrite_out: 'unchanged' } }), () => undefined)
        .rewrite_out,
    ).toBe('"ไปไหนมา"');
    const custom = rewriteTokens(
      CH,
      S({ ...base, flags: { ...base.flags, rewrite_out: 'custom' } }),
      () => '<b>hi</b>',
    );
    expect(custom.rewrite_out).toBe('<b>hi</b>'); // rendered by React as text (TC-PLAY-09)
    expect(rewriteTokens(CH, S(), () => undefined).rewrite_out).toBe('…');
  });

  it('options with `when` only show when the condition holds', () => {
    const steps = expandScene(sceneById(CH, 'a')!, S({ flags: { w: 'hug' }, chosen: { first: 'y' } }));
    const rw = steps.find((x) => x.kind === 'choice' && x.line.id === 'rw');
    if (rw?.kind !== 'choice') throw new Error('no choice');
    expect(visibleOptions(rw.line, S({ flags: { w: 'hug' } })).map((o) => o.id)).toEqual([
      'glad',
      'hug_only',
      'same',
    ]);
    expect(visibleOptions(rw.line, S({ flags: { w: 'x' } })).map((o) => o.id)).toEqual(['glad', 'same']);
  });

  it('safety notes never stop the player and stay visible for the rest of the scene', () => {
    const st = S({ flags: { w: 'x' }, chosen: { first: 'x' } });
    const steps = expandScene(sceneById(CH, 'a')!, st);
    const safetyAt = steps.findIndex((x) => x.kind === 'safety');
    expect(normalizeIndex(steps, safetyAt)).toBe(safetyAt + 1);
    const m = advance(CH, { sceneId: 'a', lineIndex: 1 }, st);
    expect(m.kind === 'at' && steps[m.pos.lineIndex]?.kind).toBe('line');
    expect(safetyNotesUpTo(steps, safetyAt + 1).map((n) => n.text)).toEqual(['ข้อความถึงคุณ']);
    expect(startOfChapter(CH, st).kind).toBe('at');
  });
});

describe('M5 store', () => {
  const jid = 'jr_journey001';
  const pid = 'pl_playerA01';
  const valid = (s: SaveRoot) => expect(SaveRoot.safeParse(s).success).toBe(true);

  it('solo mirror answers: open state, only the real player, role context kept (docs/04 §6.3)', () => {
    let s = saveMirrorAnswer(sampleSave(), jid, 'M01', 'self', pid, 'self', {
      selected: ['m01_hug'],
      meta: null,
      freeText: '',
    });
    s = saveMirrorAnswer(s, jid, 'M01', 'self', pid, 'perceived', {
      selected: [],
      meta: 'not_sure',
      freeText: '',
    });
    s = saveMirrorAnswer(s, jid, 'w3_1', 'role', pid, 'self', {
      selected: ['w3e_fear'],
      meta: null,
      freeText: 'ตัวสั่น',
    });
    const j = s.journeys[jid]!;
    expect(j.mirrorItems.M01!.state).toBe('open');
    expect(Object.keys(j.mirrorItems.M01!.entries)).toEqual([pid]);
    expect(j.mirrorItems.M01!.entries[pid]!.perceived!.meta).toBe('not_sure');
    expect(j.mirrorItems.w3_1!.context).toBe('role');
    s = saveMirrorAnswer(s, jid, 'M01', 'self', pid, 'self', {
      selected: ['m01_listen'],
      meta: null,
      freeText: '',
    });
    expect(s.journeys[jid]!.mirrorItems.M01!.entries[pid]!.self!.revision).toBe(2);
    valid(s);
  });

  it('statements keep shareIntent; skipped ones never share', () => {
    let s = saveStatement(sampleSave(), jid, pid, 'cs1', {
      text: 'ฉันอยู่ตรงนี้',
      starterId: 'cs3_a',
      skipped: false,
      shareIntent: true,
    });
    s = saveStatement(s, jid, pid, 'cs2', { text: 'x', skipped: true, shareIntent: true });
    const m = s.journeys[jid]!.mirrorItems;
    expect(m.cs1!.kind).toBe('statement');
    expect(m.cs1!.entries[pid]!.shareIntent).toBe(true);
    expect(m.cs2!.entries[pid]!.shareIntent).toBe(false);
    expect(m.cs2!.entries[pid]!.statement).toEqual({ text: '', meta: 'skipped' });
    valid(s);
  });

  it('interpretation answers and next-conversation items (no duplicates)', () => {
    let s = saveInterpretation(sampleSave(), jid, pid, 'ic_out_blame', 'perceived', {
      answers: { fear_loss: 'yes' },
      noneMatch: false,
      freeText: '',
    });
    s = addNextConversation(s, jid, pid, 'คุยเรื่องนี้', 'mirror', 'M01');
    s = addNextConversation(s, jid, pid, 'คุยเรื่องนี้', 'mirror', 'M01');
    const j = s.journeys[jid]!;
    expect(j.storyAnswers[`${pid}:ic_out_blame`]!.layer).toBe('perceived');
    expect(j.nextConversation).toHaveLength(1);
    valid(s);
  });

  it('a completed journey stays the current one for "เล่นต่อ" (docs/05 §3.2)', () => {
    const s = completeJourney(sampleSave(), jid);
    s.settings.lastJourneyId = jid;
    expect(currentJourney(s)?.id).toBe(jid);
    expect(
      currentJourney({ ...s, journeys: { [jid]: { ...s.journeys[jid]!, status: 'archived' } } }),
    ).toBeUndefined();
  });
});

describe('chapter content (M5)', () => {
  it('TC-PLAY-04 (Ch3): priorWarning=false uses "ทำไมไม่ระวังเลย" for c01 option c', async () => {
    const { ch3 } = await import('../../src/content/th/chapters/ch3');
    const { findChoice, optionText } = await import('../../src/engine/dialogue');
    const c = findChoice(ch3, 'ch3_c01')!.options.find((o) => o.id === 'c')!;
    expect(optionText(c, S({ priorWarning: false }))).toBe('"ทำไมไม่ระวังเลย"');
    expect(optionText(c, S())).toBe('"ทำไมไม่ฟังกันเลย"');
  });

  it('TC-PLAY-05: every Ch2 Part C flag combination renders without a leftover token', async () => {
    const { ch2 } = await import('../../src/content/th/chapters/ch2');
    const { resolveTokens } = await import('../../src/engine/dialogue');
    const ctx = {
      names: { A: 'นก', B: 'ฟ้า', in: 'นก', out: 'ฟ้า', me: 'นก', other: 'ฟ้า' },
      endings: { in: '', out: '' },
      address: { in: 'เธอ', out: 'เธอ' },
    };
    const frags = ch2.fragments!;
    const flags = [...new Set(Object.values(frags).map((f) => f.flag))];
    const valuesOf = (flag: string) => [
      undefined,
      ...Object.keys(Object.values(frags).find((f) => f.flag === flag)!.values),
    ];
    const timeline = ch2.scenes.flatMap((sc) => sc.lines).find((l) => l.type === 'TIMELINE');
    if (timeline?.type !== 'TIMELINE') throw new Error('no timeline');
    const closing = ch2.scenes.find((sc) => sc.id === 'ch2_timeline')!;
    let combos = 0;
    const walk = (i: number, acc: Record<string, string>) => {
      if (i === flags.length) {
        combos++;
        const st = S({ flags: acc });
        const extra = Object.fromEntries(
          Object.entries(fragmentTokens(ch2, st)).map(([k, v]) => [k, resolveTokens(v, ctx)]),
        );
        const texts = [
          ...timeline.rows.flatMap((r) => [r.in, r.out]),
          ...expandScene(closing, st).flatMap((x) => (x.kind === 'line' ? [x.line.text] : [])),
        ];
        for (const t of texts) expect(resolveTokens(t, { ...ctx, extra })).not.toMatch(/[{}]/);
        return;
      }
      for (const v of valuesOf(flags[i]!)) walk(i + 1, v === undefined ? acc : { ...acc, [flags[i]!]: v });
    };
    walk(0, {});
    expect(combos).toBeGreaterThan(1000);
  });
});
