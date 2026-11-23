import { describe, expect, it } from 'vitest';
import { ch1 } from '../../src/content/th/chapters/ch1';
import {
  advance,
  controllingRole,
  envAt,
  evalCondition,
  expandScene,
  lineBefore,
  normalizeIndex,
  optionText,
  resolveTokens,
  resumePosition,
  sceneById,
  setStrictTokens,
  shakeBetween,
  skipScene,
  startOfChapter,
  UnknownTokenError,
  type StoryState,
  type TokenContext,
} from '../../src/engine/dialogue';
import type { Step } from '../../src/engine/dialogue';
import { sampleSave } from '../fixtures/factory';
import {
  buildStoryState,
  buildTokenContext,
  completeChapter,
  recordChoice,
  saveStoryAnswer,
  setScenario,
  startChapter,
} from '../../src/store/story';
import { SaveRoot } from '../../src/persistence/schema';

const CTX: TokenContext = {
  names: { A: 'นก', B: 'ฟ้า', in: 'นก', out: 'ฟ้า', me: 'นก', other: 'ฟ้า' },
  endings: { in: 'ครับ', out: '' },
  address: { in: 'เธอ', out: 'นก' },
};
const S = (over: Partial<StoryState> = {}): StoryState => ({
  flags: {},
  priorWarning: true,
  chosen: {},
  ...over,
});
const texts = (sceneId: string, s: StoryState) =>
  expandScene(sceneById(ch1, sceneId)!, s).flatMap((st) => (st.kind === 'line' ? [st.line.text] : []));

describe('conditions', () => {
  it('flag eq / unset / scenario / all / any', () => {
    const s = S({ flags: { a: 'x' }, priorWarning: false });
    expect(evalCondition({ flag: 'a', eq: 'x' }, s)).toBe(true);
    expect(evalCondition({ flag: 'b', unset: true }, s)).toBe(true);
    expect(evalCondition({ flag: 'a', unset: true }, s)).toBe(false);
    expect(evalCondition({ scenario: 'priorWarning', eq: false }, s)).toBe(true);
    expect(
      evalCondition(
        {
          all: [
            { flag: 'a', eq: 'x' },
            { scenario: 'priorWarning', eq: true },
          ],
        },
        s,
      ),
    ).toBe(false);
    expect(
      evalCondition(
        {
          any: [
            { flag: 'a', eq: 'y' },
            { scenario: 'priorWarning', eq: false },
          ],
        },
        s,
      ),
    ).toBe(true);
  });
});

describe('tokens', () => {
  it('replaces names, endings and {you} by speaker', () => {
    expect(resolveTokens('{in}: ไปนะ{in.end} {out.end}|', CTX)).toBe('นก: ไปนะครับ |');
    expect(resolveTokens('{you} อยู่ไหน', CTX, 'in')).toBe('เธอ อยู่ไหน');
    expect(resolveTokens('{you} อยู่ไหน', CTX, 'out')).toBe('นก อยู่ไหน');
    expect(resolveTokens('{me}/{other}/{A}/{B}', CTX)).toBe('นก/ฟ้า/นก/ฟ้า');
  });

  it('unknown token throws in dev, renders empty in production', () => {
    expect(() => resolveTokens('สวัสดี {nope}', CTX)).toThrow(UnknownTokenError);
    expect(() => resolveTokens('{you}', CTX)).toThrow(UnknownTokenError); // narrator has no "you"
    setStrictTokens(false);
    const err = console.error;
    console.error = () => {};
    try {
      expect(resolveTokens('สวัสดี {nope}!', CTX)).toBe('สวัสดี !');
    } finally {
      console.error = err;
      setStrictTokens(true);
    }
  });
});

describe('TC-PLAY-04: priorWarning=false', () => {
  it('hides lines that need priorWarning=true and uses the other option texts', () => {
    const off = texts('ch1_s01', S({ priorWarning: false }));
    expect(off.join()).not.toContain('แบตเหลือน้อยนะ');
    expect(off.join()).toContain('เอาร่มไปด้วยนะ');
    expect(texts('ch1_s02', S({ priorWarning: false })).join()).not.toContain('เหลือตัวเดียวสินะ');
    const c01 = expandScene(sceneById(ch1, 'ch1_s01')!, S({ priorWarning: false })).find(
      (s) => s.kind === 'choice',
    );
    if (c01?.kind !== 'choice') throw new Error('no choice');
    expect(optionText(c01.line.options[0]!, S({ priorWarning: false }))).toBe('"ไม่เป็นไร แป๊บเดียวเอง"');
    expect(optionText(c01.line.options[0]!, S())).toBe('"ไม่เป็นไรหรอก แป๊บเดียวเอง"');
  });

  it('priorWarning=true shows the warning', () => {
    expect(texts('ch1_s01', S()).join()).toContain('แบตเหลือน้อยนะ');
  });
});

describe('interpreter', () => {
  it('starts at the first line that waits (ENV is skipped)', () => {
    const m = startOfChapter(ch1, S());
    expect(m).toEqual({ kind: 'at', pos: { sceneId: 'ch1_s01', lineIndex: 1 } });
  });

  it('environment at a position is the fold of earlier ENV lines', () => {
    const scene = sceneById(ch1, 'ch1_s02')!;
    const steps = expandScene(scene, S());
    const last = steps.length - 1;
    expect(envAt(scene, steps, 1).bg).toBe('bg_convenience_store');
    expect(envAt(scene, steps, 1).rain).toBe('light');
    // Later the rain pours down with lightning (docs/02 ch1_s02).
    expect(envAt(scene, steps, last).rain).toBe('heavy');
    expect(envAt(scene, steps, last).light).toBe('flicker');
  });

  it('response lines follow the chosen option and nothing else', () => {
    const before = expandScene(sceneById(ch1, 'ch1_s01')!, S());
    const after = expandScene(
      sceneById(ch1, 'ch1_s01')!,
      S({ chosen: { ch1_c01: 'a' }, flags: { in_reply: 'quick' } }),
    );
    expect(after.length).toBe(before.length + 2);
    const t = after.flatMap((s) => (s.kind === 'line' ? [s.line.text] : []));
    expect(t).toContain('(ก็คงไม่เป็นไรมั้ง)');
    expect(t).not.toContain('อืม แค่บอกไว้เฉย ๆ');
  });

  it('advance moves through scenes and ends after ch1_end', () => {
    const s = S({ chosen: { ch1_c01: 'a', ch1_c02: 'a', ch1_c03: 'a' } });
    let m = startOfChapter(ch1, s);
    const visited = new Set<string>();
    while (m.kind === 'at') {
      visited.add(m.pos.sceneId);
      m = advance(ch1, m.pos, s);
    }
    expect([...visited]).toEqual([
      'ch1_s01',
      'ch1_s02',
      'ch1_s03',
      'ch1_s04',
      'ch1_cards',
      'ch1_reflect',
      'ch1_end',
    ]);
  });

  it('skipScene jumps to the next scene without setting flags (docs/05 G5)', () => {
    const m = skipScene(ch1, { sceneId: 'ch1_s01', lineIndex: 1 }, S());
    expect(m.kind === 'at' && m.pos.sceneId).toBe('ch1_s02');
  });

  it('resume validates the saved index and lands on a waiting step', () => {
    expect(resumePosition(ch1, { sceneId: 'ch1_s01', lineIndex: 0 }, S())).toEqual({
      kind: 'at',
      pos: { sceneId: 'ch1_s01', lineIndex: 1 },
    });
    expect(resumePosition(ch1, { sceneId: 'gone', lineIndex: 3 }, S())).toEqual(startOfChapter(ch1, S()));
    const m = resumePosition(ch1, { sceneId: 'ch1_s01', lineIndex: 999 }, S());
    expect(m.kind === 'at' && m.pos.sceneId).toBe('ch1_s02');
  });

  it('shake happens once between positions; perspective follows choice owner', () => {
    const scene = sceneById(ch1, 'ch1_s02')!;
    const steps = expandScene(scene, S());
    const shaky: Step[] = [
      { kind: 'env', set: { light: 'flicker' } },
      { kind: 'env', set: { shake: 'small' } },
    ] as Step[];
    expect(shakeBetween(shaky, 0, 2)).toBe(true);
    expect(shakeBetween(shaky, 0, 1)).toBe(false);
    expect(shakeBetween(steps, 0, steps.length)).toBe(false); // the rainy night has no shaking
    const choiceIdx = steps.findIndex((x) => x.kind === 'choice');
    expect(controllingRole(scene, steps[choiceIdx])).toBe('insider');
    expect(lineBefore(steps, choiceIdx)?.kind).toBe('line');
    expect(controllingRole(sceneById(ch1, 'ch1_s04')!, undefined)).toBeNull();
    expect(normalizeIndex(steps, 0)).toBe(1);
  });
});

describe('story state in the save', () => {
  const jid = 'jr_journey001';
  const base = (): SaveRoot => {
    const s = sampleSave();
    s.journeys[jid]!.chapterProgress = {};
    return s;
  };

  it('token context follows the scenario roles and address style', () => {
    const s = base();
    const ctx = buildTokenContext(s, s.journeys[jid]!);
    expect(ctx.names.in).toBe('ผู้เล่น A');
    expect(ctx.names.out).toBe('ผู้เล่น B');
    expect(ctx.endings.out).toBe('นะ');
    expect(ctx.address.out).toBe('ผู้เล่น A'); // B uses addressStyle "name"
    const swapped = setScenario(s, jid, {
      insiderPlayerId: 'pl_imaginedB1',
      priorWarning: false,
      randomized: false,
    });
    expect(buildTokenContext(swapped, swapped.journeys[jid]!).names.in).toBe('ผู้เล่น B');
  });

  it('choices set flags; restart replaces earlier choices (docs/05 §6)', () => {
    let s = startChapter(base(), jid, 'ch1', 'ch1_s01', 1);
    s = recordChoice(s, jid, 'ch1', {
      choiceId: 'ch1_c01',
      optionId: 'b',
      setFlags: { in_reply: 'consider' },
      byPlayerId: 'pl_playerA01',
      asRole: 'insider',
    });
    let st = buildStoryState(s.journeys[jid]!, 'ch1');
    expect(st.flags.in_reply).toBe('consider');
    expect(st.chosen.ch1_c01).toBe('b');
    s = completeChapter(s, jid, 'ch1');
    expect(s.journeys[jid]!.chapterProgress.ch1!.status).toBe('completed');
    expect(s.journeys[jid]!.chapterProgress.ch1!.currentSceneId).toBeUndefined();
    s = startChapter(s, jid, 'ch1', 'ch1_s01', 1);
    st = buildStoryState(s.journeys[jid]!, 'ch1');
    expect(st.flags).toEqual({});
    expect(s.journeys[jid]!.chapterProgress.ch1!.playCount).toBe(2);
    expect(SaveRoot.safeParse(s).success).toBe(true);
  });

  it('changing the scenario resets Ch1–Ch3 progress but keeps reflection answers', () => {
    let s = startChapter(base(), jid, 'ch1', 'ch1_s01', 1);
    s = recordChoice(s, jid, 'ch1', {
      choiceId: 'ch1_c01',
      optionId: 'a',
      setFlags: { in_reply: 'quick' },
      byPlayerId: 'pl_playerA01',
      asRole: 'insider',
    });
    s = saveStoryAnswer(s, jid, 'pl_playerA01', 'r1_3', 'reflection', {
      selected: [],
      meta: null,
      freeText: 'รอ',
    });
    s = setScenario(s, jid, { insiderPlayerId: 'pl_imaginedB1', priorWarning: true, randomized: false });
    const j = s.journeys[jid]!;
    expect(j.chapterProgress.ch1!.status).toBe('not_started');
    expect(j.chapterProgress.ch1!.flags).toEqual({});
    expect(j.storyAnswers['pl_playerA01:r1_3']!.freeText).toBe('รอ');
    expect(s.drafts['pl_playerA01:r1_3']).toBeUndefined(); // saving the answer drops its draft
    expect(SaveRoot.safeParse(s).success).toBe(true);
  });
});

describe('resolveQuestion', () => {
  it('replaces tokens in the question, perceived text and options', async () => {
    const { resolveQuestion } = await import('../../src/engine/dialogue');
    const ctx = {
      names: { A: 'ดาว', B: 'เมฆ', in: 'ดาว', out: 'เมฆ', me: 'ดาว', other: 'เมฆ' },
      endings: { in: '', out: '' },
      address: { in: 'เธอ', out: 'เธอ' },
    };
    const q = resolveQuestion(
      {
        id: 'x',
        self: 'อยากให้ {other} รู้',
        perceived: '{other} คิด',
        options: [{ id: 'a', text: 'ชวน {other}' }],
      },
      ctx,
    );
    expect(q.self).toBe('อยากให้ เมฆ รู้');
    expect(q.perceived).toBe('เมฆ คิด');
    expect(q.options[0]!.text).toBe('ชวน เมฆ');
  });
});
