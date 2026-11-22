/**
 * Dialogue interpreter (docs/10 §4). Pure functions: content + state in, steps/positions out.
 *
 * A scene is expanded into a flat list of steps: lines whose `when` fails are dropped, and the
 * responseLines of an already-chosen option follow its CHOICE. `lineIndex` in the save is an index
 * into this list. ENV steps never stop the player; the scene environment at a position is the fold
 * of every ENV before it, so resuming always shows the right scene (docs/05 G2).
 */
import type {
  ChapterContent,
  ChoiceOption,
  Condition,
  EnvSet,
  LineContent,
  RoleId,
  SceneContent,
} from '../content/types';
import { DEFAULT_ENV, type SceneEnv } from '../scene/env';

export interface StoryState {
  /** Flags from every chapter (docs/02 appendix B); the current chapter's flags win. */
  flags: Record<string, string>;
  priorWarning: boolean;
  /** choiceId → optionId of the latest choice in the current play (from choiceLog). */
  chosen: Record<string, string>;
}

// ---------- Conditions ----------

export function evalCondition(cond: Condition | undefined, s: StoryState): boolean {
  if (!cond) return true;
  if ('all' in cond) return cond.all.every((c) => evalCondition(c, s));
  if ('any' in cond) return cond.any.some((c) => evalCondition(c, s));
  if ('scenario' in cond) return s.priorWarning === cond.eq;
  if ('unset' in cond) return s.flags[cond.flag] === undefined;
  if ('set' in cond) return s.flags[cond.flag] !== undefined;
  return s.flags[cond.flag] === cond.eq;
}

// ---------- Tokens ----------

export interface TokenContext {
  names: { A: string; B: string; in: string; out: string; me: string; other: string };
  endings: { in: string; out: string };
  /** The word each role uses for the partner, from their addressStyle (docs/07 §3). */
  address: { in: string; out: string };
  /** Chapter fragments ({in_cope_text}) and story text ({rewrite_out}) — see fragmentTokens(). */
  extra?: Record<string, string>;
}

export class UnknownTokenError extends Error {}

const TOKEN = /\{([A-Za-z_.]+)\}/g;

/** Strict mode throws on unknown tokens (dev/tests); production renders them empty and logs. */
let strict = import.meta.env?.DEV ?? true;
export function setStrictTokens(v: boolean) {
  strict = v;
}

export function resolveTokens(text: string, ctx: TokenContext, speaker?: string): string {
  return text.replace(TOKEN, (whole, name: string) => {
    const value = tokenValue(name, ctx, speaker);
    if (value !== undefined) return value;
    const msg = `Unknown token ${whole}${speaker ? ` (speaker ${speaker})` : ''} in "${text}"`;
    if (strict) throw new UnknownTokenError(msg);
    console.error(msg);
    return '';
  });
}

function tokenValue(name: string, ctx: TokenContext, speaker?: string): string | undefined {
  switch (name) {
    case 'A':
    case 'B':
    case 'in':
    case 'out':
    case 'me':
    case 'other':
      return ctx.names[name];
    case 'in.end':
      return ctx.endings.in;
    case 'out.end':
      return ctx.endings.out;
    case 'you':
      // {you} only makes sense in a line spoken by one of the two roles (A-22).
      return speaker === 'in' || speaker === 'out' ? ctx.address[speaker] : undefined;
    default:
      return ctx.extra?.[name];
  }
}

/** Fragment tokens of a chapter from the current flags; unset flags use the neutral fallback (docs/02 appendix B). */
export function fragmentTokens(ch: Pick<ChapterContent, 'fragments'>, s: StoryState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, f] of Object.entries(ch.fragments ?? {})) {
    const v = s.flags[f.flag];
    out[name] = (v !== undefined ? f.values[v] : undefined) ?? f.fallback;
  }
  return out;
}

/** Display name for a DLG/MONO speaker: roles resolve to nicknames, anything else is an NPC label. */
export function speakerName(speaker: string, ctx: TokenContext): string {
  if (speaker === 'in') return ctx.names.in;
  if (speaker === 'out') return ctx.names.out;
  if (speaker === 'A' || speaker === 'B') return ctx.names[speaker];
  return speaker;
}

// ---------- Steps ----------

type TextLine = Extract<LineContent, { type: 'NARR' | 'SYS' | 'DLG' | 'MONO' }>;
export type SafetyLine = Extract<LineContent, { type: 'SAFETY_NOTE' }>;
export type TimelineLine = Extract<LineContent, { type: 'TIMELINE' }>;
export type ChoiceLine = Extract<LineContent, { type: 'CHOICE' }>;

export type Step =
  | { kind: 'line'; line: TextLine }
  | { kind: 'env'; set: EnvSet }
  | { kind: 'choice'; line: ChoiceLine }
  | { kind: 'cards' }
  | { kind: 'reflection' }
  | { kind: 'safety'; line: SafetyLine }
  | { kind: 'timeline'; line: TimelineLine }
  | { kind: 'interpretation' }
  | { kind: 'mirror'; questionId: string }
  | { kind: 'statements' };

export function expandLines(lines: LineContent[], s: StoryState, out: Step[] = []): Step[] {
  for (const line of lines) {
    if ('when' in line && !evalCondition(line.when, s)) continue;
    switch (line.type) {
      case 'ENV':
        out.push({ kind: 'env', set: line.set });
        break;
      case 'CHOICE': {
        out.push({ kind: 'choice', line });
        const picked = s.chosen[line.id];
        const opt = picked ? line.options.find((o) => o.id === picked) : undefined;
        if (opt?.responseLines) expandLines(opt.responseLines, s, out);
        break;
      }
      case 'EMOTION_CARDS':
        out.push({ kind: 'cards' });
        break;
      case 'REFLECTION':
        out.push({ kind: 'reflection' });
        break;
      case 'SAFETY_NOTE':
        out.push({ kind: 'safety', line });
        break;
      case 'TIMELINE':
        out.push({ kind: 'timeline', line });
        break;
      case 'INTERPRETATION':
        out.push({ kind: 'interpretation' });
        break;
      case 'MIRROR':
        out.push({ kind: 'mirror', questionId: line.questionId });
        break;
      case 'STATEMENTS':
        out.push({ kind: 'statements' });
        break;
      default:
        out.push({ kind: 'line', line });
    }
  }
  return out;
}

export function expandScene(scene: SceneContent, s: StoryState): Step[] {
  return expandLines(scene.lines, s);
}

/** ENV and safety notes never stop the player; safety notes show beside the dialogue (docs/06 S6). */
const isStop = (st: Step) => st.kind !== 'env' && st.kind !== 'safety';

/** Safety notes reached in this scene up to `index` (shown until dismissed). */
export function safetyNotesUpTo(steps: Step[], index: number): SafetyLine[] {
  const out: SafetyLine[] = [];
  for (let k = 0; k < Math.min(index, steps.length); k++) {
    const st = steps[k]!;
    if (st.kind === 'safety') out.push(st.line);
  }
  return out;
}

/** Options shown for a choice under the current state (`when`, docs/02 Ch3 c02 e*). */
export function visibleOptions(choice: ChoiceLine, s: StoryState) {
  return choice.options.filter((o) => evalCondition(o.when, s));
}

/** First step at or after `i` that waits for the player; steps.length when the scene is over. */
export function normalizeIndex(steps: Step[], i: number): number {
  let k = Math.max(0, i);
  while (k < steps.length && !isStop(steps[k]!)) k++;
  return k;
}

export function applyEnv(env: SceneEnv, set: EnvSet): SceneEnv {
  const next = { ...env };
  if (set.bg !== undefined) next.bg = set.bg;
  if (set.split !== undefined) next.split = set.split;
  if (set.rain !== undefined) next.rain = set.rain;
  if (set.light !== undefined) next.light = set.light;
  if (set.haze !== undefined) next.haze = set.haze;
  if (set.lamp !== undefined) next.lamp = set.lamp;
  if (set.steam !== undefined) next.steam = set.steam;
  if (set.door !== undefined) next.door = set.door;
  return next;
}

/** Scene environment in effect at step `index` (every ENV before it, starting from the scene's background). */
export function envAt(scene: SceneContent, steps: Step[], index: number): SceneEnv {
  let env: SceneEnv = { ...DEFAULT_ENV, bg: scene.background };
  for (let k = 0; k < Math.min(index, steps.length); k++) {
    const st = steps[k]!;
    if (st.kind === 'env') env = applyEnv(env, st.set);
  }
  return env;
}

/** Was there a shake between two positions? Used to play the shake once, live only. */
export function shakeBetween(steps: Step[], from: number, to: number): boolean {
  for (let k = Math.max(0, from); k < Math.min(to, steps.length); k++) {
    const st = steps[k]!;
    if (st.kind === 'env' && st.set.shake) return true;
  }
  return false;
}

// ---------- Navigation ----------

export interface Position {
  sceneId: string;
  lineIndex: number;
}
export type Move = { kind: 'at'; pos: Position } | { kind: 'end' };

export function sceneById(ch: ChapterContent, id: string): SceneContent | undefined {
  return ch.scenes.find((s) => s.id === id);
}

export function nextSceneId(scene: SceneContent, s: StoryState): string | null {
  if (scene.next === null) return null;
  if (typeof scene.next === 'string') return scene.next;
  return scene.next.find((r) => evalCondition(r.when, s))?.to ?? null;
}

/** Position of the first stop in `sceneId`, following `next` past scenes with nothing to show. */
export function enterScene(ch: ChapterContent, sceneId: string | null, s: StoryState): Move {
  let id = sceneId;
  for (let guard = 0; id && guard < ch.scenes.length + 1; guard++) {
    const scene = sceneById(ch, id);
    if (!scene) throw new Error(`Unknown scene ${id}`);
    const steps = expandScene(scene, s);
    const k = normalizeIndex(steps, 0);
    if (k < steps.length) return { kind: 'at', pos: { sceneId: id, lineIndex: k } };
    id = nextSceneId(scene, s);
  }
  return { kind: 'end' };
}

export function startOfChapter(ch: ChapterContent, s: StoryState): Move {
  return enterScene(ch, ch.firstScene, s);
}

/** Next stop after `pos` (same scene or the next one). */
export function advance(ch: ChapterContent, pos: Position, s: StoryState): Move {
  const scene = sceneById(ch, pos.sceneId);
  if (!scene) return startOfChapter(ch, s);
  const steps = expandScene(scene, s);
  const k = normalizeIndex(steps, pos.lineIndex + 1);
  if (k < steps.length) return { kind: 'at', pos: { sceneId: scene.id, lineIndex: k } };
  return enterScene(ch, nextSceneId(scene, s), s);
}

/** Skip the rest of the scene (docs/05 G5): unset flags simply stay unset and fall back later. */
export function skipScene(ch: ChapterContent, pos: Position, s: StoryState): Move {
  const scene = sceneById(ch, pos.sceneId);
  if (!scene) return { kind: 'end' };
  return enterScene(ch, nextSceneId(scene, s), s);
}

/** Validates a saved position against the current content (content may change between versions). */
export function resumePosition(ch: ChapterContent, pos: Position | undefined, s: StoryState): Move {
  if (!pos) return startOfChapter(ch, s);
  const scene = sceneById(ch, pos.sceneId);
  if (!scene) return startOfChapter(ch, s);
  const steps = expandScene(scene, s);
  const k = normalizeIndex(steps, pos.lineIndex);
  if (k < steps.length) return { kind: 'at', pos: { sceneId: scene.id, lineIndex: k } };
  return enterScene(ch, nextSceneId(scene, s), s);
}

// ---------- Choices & perspective ----------

export function optionText(o: ChoiceOption, s: StoryState): string {
  return o.textByCondition?.find((v) => evalCondition(v.when, s))?.text ?? o.text;
}

/** Role in control at a step: the choice owner, else the scene controller (null = narrator). */
export function controllingRole(scene: SceneContent, step: Step | undefined): RoleId | null {
  if (step?.kind === 'choice') return step.line.owner;
  return scene.controller === 'narrator' ? null : scene.controller;
}

/** Nearest text line before `index` — shown above the choices while the player decides. */
export function lineBefore(steps: Step[], index: number): Step | undefined {
  for (let k = index - 1; k >= 0; k--) if (steps[k]!.kind === 'line') return steps[k];
  return undefined;
}

// ---------- Rewrite tokens (docs/02 Ch3 s06) ----------

export function findChoice(ch: ChapterContent, id: string): ChoiceLine | undefined {
  const walk = (lines: LineContent[]): ChoiceLine | undefined => {
    for (const l of lines) {
      if (l.type !== 'CHOICE') continue;
      if (l.id === id) return l;
      for (const o of l.options) {
        const hit = o.responseLines && walk(o.responseLines);
        if (hit) return hit;
      }
    }
    return undefined;
  };
  for (const sc of ch.scenes) {
    const hit = walk(sc.lines);
    if (hit) return hit;
  }
  return undefined;
}

const NOT_SAID = '…';

/**
 * {rewrite_out}/{rewrite_in}: the option text, the player's own words (plain text — React renders it
 * as text, never HTML, TC-PLAY-09), or the original words when "unchanged". Unknown → "…".
 */
export function rewriteTokens(
  ch: ChapterContent,
  s: StoryState,
  customText: (storyItem: string) => string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of ch.rewrites ?? []) {
    const v = s.flags[r.flag];
    const original = () => {
      const c = findChoice(ch, r.originalChoiceId);
      const o = c?.options.find((x) => x.id === s.chosen[r.originalChoiceId]);
      return o ? optionText(o, s) : NOT_SAID;
    };
    if (v === 'custom') out[r.token] = customText(r.storyItem)?.trim() || NOT_SAID;
    else if (v === undefined || v === 'unchanged') out[r.token] = original();
    else {
      const o = findChoice(ch, r.choiceId)?.options.find((x) => x.id === v);
      out[r.token] = o ? optionText(o, s) : NOT_SAID;
    }
  }
  return out;
}

// ---------- Sound cues (Phase 2 sound, docs/09 §5) ----------

/** The last `music` ENV in effect at step `index` of this scene (undefined = infer from background). */
export function musicAt(steps: Step[], index: number): string | undefined {
  let music: string | undefined;
  for (let k = 0; k < Math.min(index, steps.length); k++) {
    const st = steps[k]!;
    if (st.kind === 'env' && st.set.music !== undefined) music = st.set.music;
  }
  return music;
}

/** One-shot sound effects passed between two positions (played live only, like the shake). */
export function sfxBetween(steps: Step[], from: number, to: number): string[] {
  const out: string[] = [];
  for (let k = Math.max(0, from); k < Math.min(to, steps.length); k++) {
    const st = steps[k]!;
    if (st.kind === 'env' && st.set.sfx) out.push(st.set.sfx);
  }
  return out;
}

/**
 * A question with every player-visible text resolved ({other}, {me}, {you}…). Reflection, mirror
 * and statement texts must go through this before rendering — raw "{other}" must never reach the screen.
 */
export function resolveQuestion<Q extends { self: string; perceived?: string; options: { text: string }[] }>(
  q: Q,
  ctx: TokenContext,
  speaker?: string,
): Q {
  return {
    ...q,
    self: resolveTokens(q.self, ctx, speaker),
    ...(q.perceived !== undefined ? { perceived: resolveTokens(q.perceived, ctx, speaker) } : {}),
    options: q.options.map((o) => ({ ...o, text: resolveTokens(o.text, ctx, speaker) })),
  };
}
