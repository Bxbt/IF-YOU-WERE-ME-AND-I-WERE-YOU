export interface OptionContent {
  id: string;
  text: string;
  exclusive?: boolean;
}

export interface QuestionContent {
  id: string;
  dimension?: string;
  self: string;
  perceived?: string;
  options: OptionContent[];
  maxSelect: number;
  freeText: boolean;
  context?: 'self' | 'role';
  reflectionPrompt?: string;
  quick?: boolean;
  safetyNote?: string;
  /** Reflection only: chosen option texts / free text are added to "Our Next Conversation" (docs/02 r4_3, r5_2). */
  toNextConversation?: boolean;
}

export type MetaValue = 'depends' | 'not_sure' | 'prefer_not' | 'skipped';

// ---------- Story content (docs/07 §5.2) ----------

export type MainChapterId = 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5';
/** M16 — storyline 2 "อีกด้านของเรื่อง" (docs/02). */
export type OtherSideChapterId = 'os1' | 'os2' | 'os3' | 'os4' | 'os5' | 'os6';
export type ChapterId = MainChapterId | OtherSideChapterId;
export type StorylineId = 'main' | 'other';
export type RoleId = 'insider' | 'waiter';
export type Expression =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'worried'
  | 'angry'
  | 'scared'
  | 'relieved'
  | 'thinking';

export type Condition =
  | { flag: string; eq: string }
  | { flag: string; unset: true }
  | { flag: string; set: true }
  | { scenario: 'priorWarning'; eq: boolean }
  | { all: Condition[] }
  | { any: Condition[] };

export interface EnvSet {
  bg?: string;
  split?: [string, string] | null;
  rain?: 'none' | 'light' | 'medium' | 'heavy';
  light?: 'normal' | 'flicker' | 'emergency' | 'off';
  haze?: 0 | 1 | 2;
  lamp?: 'warm' | 'off';
  steam?: boolean;
  door?: 'closed' | 'ajar' | 'open';
  shake?: 'small';
  /** Synthesised sound (src/audio/engine.ts) — played only when the player turned sound on. */
  sfx?: string;
  music?: string;
  /** Who stands in this scene, overriding the background's default (docs/09 §3.2a). */
  cast?: ('in' | 'out' | 'A' | 'B')[];
}

export interface ChoiceOption {
  id: string;
  text: string;
  /** Show this option only when the condition holds (docs/02 Ch3 c02 e*). */
  when?: Condition;
  textByCondition?: { when: Condition; text: string }[];
  setFlags?: Record<string, string>;
  tag?: string;
  responseLines?: LineContent[];
}

export type LineContent =
  | { type: 'NARR'; text: string; when?: Condition }
  | { type: 'SYS'; title?: string; text: string; when?: Condition }
  | { type: 'DLG' | 'MONO'; speaker: string; expression?: Expression; text: string; when?: Condition }
  | { type: 'ENV'; set: EnvSet; when?: Condition }
  | {
      type: 'CHOICE';
      id: string;
      owner: RoleId;
      options: ChoiceOption[];
      /** "พิมพ์เอง": the text is kept as plain text in StoryAnswer `storyItem` (docs/02 Ch3 s06). */
      custom?: { setFlags: Record<string, string>; storyItem: string; maxLength: number };
    }
  | { type: 'EMOTION_CARDS' }
  | { type: 'TIMELINE'; rows: { label: string; in: string; out: string }[] }
  | { type: 'INTERPRETATION' }
  | { type: 'MIRROR'; questionId: string }
  | { type: 'STATEMENTS' }
  | { type: 'REFLECTION' }
  | { type: 'SAFETY_NOTE'; text: string; when?: Condition };

export interface NextRule {
  when?: Condition;
  to: string;
}

export interface SceneContent {
  id: string;
  background: string;
  ariaLabel: string;
  controller: RoleId | 'narrator';
  lines: LineContent[];
  next: string | NextRule[] | null;
  /** Together: show the (non-private) handoff screen to this scene's controller first (docs/02 Ch2 parts). */
  handoffBefore?: boolean;
}

export interface ChapterContent {
  id: ChapterId;
  titleEn: string;
  titleTh: string;
  estimatedMinutes: [number, number];
  firstScene: string;
  scenes: SceneContent[];
  reflection: QuestionContent[];
  emotionCards?: {
    groups: {
      role: RoleId;
      period?: string;
      /** Heading of the group, with tokens ("{in} อาจรู้สึก…"); default = the elevator story's wording. */
      label?: string;
      cards: OptionContent[];
    }[];
  };
  /** Token {name} → text chosen by a flag value (docs/02 appendix A). */
  fragments?: Record<string, { flag: string; values: Record<string, string>; fallback: string }>;
  interpretations?: InterpretationSet[];
  /** Chapter-specific mirror questions (w3_1, w3_2 — context 'role'); M01–M07 come from questions.ts. */
  mirrorQuestions?: QuestionContent[];
  statements?: { id: string; stem: string; starters: { id: string; text: string }[] }[];
  /**
   * {token} = what was said in a rewrite choice (docs/02 Ch3 s06): the chosen option text, the
   * player's own words (custom), or — for "unchanged" — the original option of `originalChoiceId`.
   */
  rewrites?: { token: string; flag: string; choiceId: string; originalChoiceId: string; storyItem: string }[];
  /** S15 lines (Ch5): English as written with a small Thai translation (docs/02 ch5_end, A-13). */
  ending?: { en: string; th?: string; title?: boolean }[];
  transition: { lines: LineContent[]; nextChapter?: ChapterId; ending?: boolean };
}

export interface InterpretationSet {
  /** StoryAnswer itemId, e.g. "ic_out_blame". */
  id: string;
  role: RoleId;
  when: Condition;
  quote: string;
  quoteByCondition?: { when: Condition; text: string }[];
  feelings: { id: string; text: string; when?: Condition }[];
}
