/**
 * TC-PLAY-06 — Content lint (docs/10 §4). Runs over every chapter that has content.
 * `npm run content:lint` runs only this file.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { ChapterContent, Condition, LineContent, SceneContent } from '../../src/content/types';
import { CHAPTERS } from '../../src/content/th/chapters';
import { SIGNALS } from '../../src/content/th/signals';
import { MIRRORS } from '../../src/content/th/questions';
import { BACKGROUNDS } from '../../src/scene/backgrounds';
import {
  advance,
  expandScene,
  visibleOptions,
  optionText,
  resolveTokens,
  rewriteTokens,
  findChoice,
  sceneById,
  startOfChapter,
  type StoryState,
  type TokenContext,
} from '../../src/engine/dialogue';

// docs/04 §4.2. "ถูก/ผิด" are left out: they are ordinary Thai words ("ถูกแทนที่", "ไม่มีความรู้สึกไหนที่ผิด")
// and only forbidden when judging an answer — that is checked by review, not by grep.
const FORBIDDEN = [
  'toxic',
  'ปกติ',
  'ดีกว่า',
  'แย่กว่า',
  'ขี้หึง',
  'เย็นชา',
  'เอาแต่ใจ',
  'เก็บกด',
  'วุฒิภาวะ',
  'เข้ากันได้',
  'คะแนน',
  '%',
];
// '%' is allowed only in in-world phone UI ("แบตเตอรี่ 18%") — never as a score.
const PERCENT_OK = /แบตเตอรี่ \d+%/g;

const CTX: TokenContext = {
  names: { A: 'นก', B: 'ฟ้า', in: 'นก', out: 'ฟ้า', me: 'นก', other: 'ฟ้า' },
  endings: { in: 'ครับ', out: 'ค่ะ' },
  address: { in: 'เธอ', out: 'ตัวเอง' },
};

let chapters: ChapterContent[] = [];
beforeAll(async () => {
  chapters = await Promise.all(CHAPTERS.filter((c) => c.load).map((c) => c.load!()));
});

function walk(lines: LineContent[], cb: (l: LineContent) => void) {
  for (const l of lines) {
    cb(l);
    if (l.type === 'CHOICE') for (const o of l.options) if (o.responseLines) walk(o.responseLines, cb);
  }
}
function allLines(ch: ChapterContent, cb: (l: LineContent, scene?: SceneContent) => void) {
  for (const s of ch.scenes) walk(s.lines, (l) => cb(l, s));
  walk(ch.transition.lines, (l) => cb(l));
}
function conditions(c: Condition | undefined, out: Condition[] = []): Condition[] {
  if (!c) return out;
  out.push(c);
  if ('all' in c) c.all.forEach((x) => conditions(x, out));
  if ('any' in c) c.any.forEach((x) => conditions(x, out));
  return out;
}
/** Every piece of player-visible text with the speaker it is spoken by. */
function texts(ch: ChapterContent): { text: string; speaker?: string }[] {
  const out: { text: string; speaker?: string }[] = [{ text: ch.titleTh }, { text: ch.titleEn }];
  allLines(ch, (l, scene) => {
    if (scene) out.push({ text: scene.ariaLabel });
    if (l.type === 'DLG' || l.type === 'MONO') out.push({ text: l.text, speaker: l.speaker });
    else if (l.type === 'SYS') out.push({ text: l.text }, { text: l.title ?? '' });
    else if (l.type === 'NARR' || l.type === 'SAFETY_NOTE') out.push({ text: l.text });
    else if (l.type === 'CHOICE') {
      // Choices are spoken by the role that owns them.
      const speaker = l.owner === 'insider' ? 'in' : 'out';
      for (const o of l.options) {
        out.push({ text: o.text, speaker });
        for (const v of o.textByCondition ?? []) out.push({ text: v.text, speaker });
      }
    }
  });
  allLines(ch, (l) => {
    if (l.type === 'TIMELINE')
      for (const r of l.rows) out.push({ text: r.label }, { text: r.in }, { text: r.out });
  });
  for (const q of [...ch.reflection, ...(ch.mirrorQuestions ?? [])]) {
    out.push({ text: q.self }, { text: q.perceived ?? '' }, { text: q.reflectionPrompt ?? '' });
    q.options.forEach((o) => out.push({ text: o.text }));
  }
  for (const set of ch.interpretations ?? []) {
    const speaker = set.role === 'insider' ? 'in' : 'out';
    out.push(
      { text: set.quote, speaker },
      ...(set.quoteByCondition ?? []).map((v) => ({ text: v.text, speaker })),
    );
    set.feelings.forEach((f) => out.push({ text: f.text }));
  }
  // Statements are written by the player about the partner: {you} resolves with the player's role.
  for (const st of ch.statements ?? []) {
    out.push({ text: st.stem, speaker: 'in' });
    st.starters.forEach((x) => out.push({ text: x.text, speaker: 'in' }));
  }
  for (const f of Object.values(ch.fragments ?? {}))
    out.push({ text: f.fallback }, ...Object.values(f.values).map((text) => ({ text })));
  for (const e of ch.ending ?? []) out.push({ text: e.en }, { text: e.th ?? '' });
  for (const o of (ch.emotionCards?.groups ?? []).flatMap((g) => g.cards)) out.push({ text: o.text });
  return out;
}

describe('TC-PLAY-06 content lint (docs/10 §4)', () => {
  it('has at least one playable chapter', () => {
    expect(chapters.length).toBeGreaterThan(0);
  });

  it('every `next` points to an existing scene and every scene is reachable', () => {
    for (const ch of chapters) {
      const ids = new Set(ch.scenes.map((s) => s.id));
      expect(ids.size, `${ch.id}: duplicate scene id`).toBe(ch.scenes.length);
      expect(ids.has(ch.firstScene), `${ch.id}: firstScene`).toBe(true);
      const targets = (s: SceneContent) =>
        s.next === null ? [] : typeof s.next === 'string' ? [s.next] : s.next.map((r) => r.to);
      for (const s of ch.scenes) for (const t of targets(s)) expect(ids.has(t), `${s.id} → ${t}`).toBe(true);
      const seen = new Set<string>([ch.firstScene]);
      const queue = [ch.firstScene];
      while (queue.length) {
        for (const t of targets(sceneById(ch, queue.shift()!)!)) {
          if (seen.has(t)) continue;
          seen.add(t);
          queue.push(t);
        }
      }
      expect(
        [...ids].filter((id) => !seen.has(id)),
        `${ch.id}: unreachable scenes`,
      ).toEqual([]);
      expect(
        ch.scenes.some((s) => s.next === null),
        `${ch.id}: needs a last scene`,
      ).toBe(true);
    }
  });

  it('every flag used in a condition has a setter', () => {
    const setters = new Set<string>();
    for (const ch of chapters)
      allLines(ch, (l) => {
        if (l.type !== 'CHOICE') return;
        l.options.forEach((o) => Object.keys(o.setFlags ?? {}).forEach((f) => setters.add(f)));
        Object.keys(l.custom?.setFlags ?? {}).forEach((f) => setters.add(f));
      });
    const used: string[] = [];
    for (const ch of chapters) {
      const collect = (c?: Condition) => conditions(c).forEach((x) => 'flag' in x && used.push(x.flag));
      allLines(ch, (l) => {
        if ('when' in l) collect(l.when);
        if (l.type === 'CHOICE')
          l.options.forEach((o) => {
            collect(o.when);
            o.textByCondition?.forEach((v) => collect(v.when));
          });
      });
      for (const s of ch.scenes) if (Array.isArray(s.next)) s.next.forEach((r) => collect(r.when));
      for (const set of ch.interpretations ?? []) {
        collect(set.when);
        set.feelings.forEach((f) => collect(f.when));
        set.quoteByCondition?.forEach((v) => collect(v.when));
      }
      for (const f of Object.values(ch.fragments ?? {})) used.push(f.flag);
      for (const r of ch.rewrites ?? []) used.push(r.flag);
    }
    expect(used.filter((f) => !setters.has(f))).toEqual([]);
  });

  it('every tag is in the signal registry (docs/04 §5.4)', () => {
    for (const ch of chapters)
      allLines(
        ch,
        (l) =>
          l.type === 'CHOICE' &&
          l.options.forEach((o) => o.tag && expect(SIGNALS[o.tag], `${l.id}.${o.id} ${o.tag}`).toBeDefined()),
      );
  });

  it('choice ids are unique per chapter, option ids unique per choice/question, 2–6 options per choice', () => {
    for (const ch of chapters) {
      const choiceIds: string[] = [];
      allLines(ch, (l) => {
        if (l.type !== 'CHOICE') return;
        choiceIds.push(l.id);
        const ids = l.options.map((o) => o.id);
        expect(new Set(ids).size, l.id).toBe(ids.length);
        // 2–6 shown at once (docs/06 ChoiceList); options with `when` are checked per state in the playthrough.
        expect(l.options.filter((o) => !o.when).length + (l.custom ? 1 : 0), l.id).toBeLessThanOrEqual(6);
      });
      expect(new Set(choiceIds).size, `${ch.id} choice ids`).toBe(choiceIds.length);
      const qIds = ch.reflection.map((q) => q.id);
      expect(new Set(qIds).size).toBe(qIds.length);
      for (const q of ch.reflection)
        expect(new Set(q.options.map((o) => o.id)).size, q.id).toBe(q.options.length);
      const cards = (ch.emotionCards?.groups ?? []).flatMap((g) => g.cards).map((o) => o.id);
      expect(new Set(cards).size).toBe(cards.length);
    }
  });

  it('TC-SAFE-01: no forbidden judging words (docs/04 §4.2)', () => {
    for (const ch of chapters)
      for (const { text } of texts(ch)) {
        const t = text.replace(PERCENT_OK, '').toLowerCase();
        for (const w of FORBIDDEN) expect(t.includes(w), `"${w}" in: ${text}`).toBe(false);
      }
  });

  it('every background key is in the asset registry', () => {
    for (const ch of chapters) {
      const keys: string[] = ch.scenes.map((s) => s.background);
      allLines(ch, (l) => {
        if (l.type !== 'ENV') return;
        if (l.set.bg) keys.push(l.set.bg);
        if (l.set.split) keys.push(...l.set.split);
      });
      expect(keys.filter((k) => !BACKGROUNDS[k])).toEqual([]);
    }
  });

  it('every token resolves (no "{" left, {you} only in lines spoken by a role)', () => {
    for (const ch of chapters)
      for (const { text, speaker } of texts(ch)) {
        const extra = Object.fromEntries(
          [...Object.keys(ch.fragments ?? {}), ...(ch.rewrites ?? []).map((r) => r.token)].map((k) => [
            k,
            'ข้อความ',
          ]),
        );
        const out = resolveTokens(text, { ...CTX, extra }, speaker);
        expect(out, text).not.toMatch(/[{}]/);
      }
  });

  it('every value pasted by a rewrite token resolves too (Ch3 "ฉันรู้ว่า{you}ห่วง")', () => {
    for (const ch of chapters)
      for (const r of ch.rewrites ?? [])
        for (const choiceId of [r.choiceId, r.originalChoiceId]) {
          const c = findChoice(ch, choiceId)!;
          for (const o of c.options) {
            const state: StoryState = {
              flags: choiceId === r.choiceId ? { [r.flag]: o.id } : {},
              priorWarning: true,
              chosen: { [choiceId]: o.id },
            };
            const vals = rewriteTokens(
              ch,
              state,
              () => undefined,
              (t, owner) => resolveTokens(t, CTX, owner === 'insider' ? 'in' : 'out'),
            );
            expect(vals[r.token], `${choiceId}.${o.id}`).not.toMatch(/[{}]/);
          }
        }
  });

  it('every MIRROR line names a known question; STATEMENTS/INTERPRETATION have their content', () => {
    for (const ch of chapters) {
      const ids = new Set([...MIRRORS, ...(ch.mirrorQuestions ?? [])].map((q) => q.id));
      allLines(ch, (l) => {
        if (l.type === 'MIRROR') expect(ids.has(l.questionId), l.questionId).toBe(true);
        if (l.type === 'STATEMENTS') expect(ch.statements?.length, ch.id).toBeGreaterThan(0);
        if (l.type === 'INTERPRETATION') expect(ch.interpretations?.length, ch.id).toBeGreaterThan(0);
        if (l.type === 'EMOTION_CARDS') expect(ch.emotionCards?.groups.length, ch.id).toBeGreaterThan(0);
      });
    }
  });

  it('every scene describes itself for screen readers (AX-4)', () => {
    for (const ch of chapters)
      for (const s of ch.scenes) expect(s.ariaLabel.trim().length, s.id).toBeGreaterThan(5);
  });

  it('every combination of choices and scenario plays from start to end', () => {
    for (const ch of chapters) {
      for (const priorWarning of [true, false]) {
        let endings = 0;
        const play = (state: StoryState, guard: number) => {
          expect(guard).toBeLessThan(500);
          let move = startOfChapter(ch, state);
          let steps = 0;
          while (move.kind === 'at') {
            const scene = sceneById(ch, move.pos.sceneId)!;
            const step = expandScene(scene, state)[move.pos.lineIndex]!;
            if (step.kind === 'choice' && !state.chosen[step.line.id]) {
              const shown = visibleOptions(step.line, state);
              expect(shown.length + (step.line.custom ? 1 : 0), step.line.id).toBeGreaterThanOrEqual(2);
              expect(shown.length + (step.line.custom ? 1 : 0), step.line.id).toBeLessThanOrEqual(7);
              for (const o of shown) {
                expect(optionText(o, state)).toBeTruthy();
                play(
                  {
                    ...state,
                    flags: { ...state.flags, ...o.setFlags },
                    chosen: { ...state.chosen, [step.line.id]: o.id },
                  },
                  guard + 1,
                );
              }
              if (step.line.custom)
                play(
                  {
                    ...state,
                    flags: { ...state.flags, ...step.line.custom.setFlags },
                    chosen: { ...state.chosen, [step.line.id]: 'custom' },
                  },
                  guard + 1,
                );
              return;
            }
            move = advance(ch, move.pos, state);
            expect(++steps).toBeLessThan(1000);
          }
          endings++;
        };
        play({ flags: {}, priorWarning, chosen: {} }, 0);
        expect(endings).toBeGreaterThan(0);
      }
    }
  });
});
