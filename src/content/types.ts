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
}

export type MetaValue = 'depends' | 'not_sure' | 'prefer_not' | 'skipped';

// ---------- Story content (docs/07 §5.2) ----------

export type ChapterId = 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5';
export type RoleId = 'insider' | 'waiter';
export type Expression = 'neutral' | 'happy' | 'sad' | 'worried' | 'angry' | 'scared' | 'relieved' | 'thinking';

export type Condition =
  | { flag: string; eq: string }
  | { flag: string; unset: true }
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
  /** No effect in the MVP (sound is Phase 2 — audit M-9). */
  sfx?: string;
  music?: string;
}

export interface ChoiceOption {
  id: string;
  text: string;
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
  | { type: 'CHOICE'; id: string; owner: RoleId; options: ChoiceOption[] }
  | { type: 'EMOTION_CARDS' }
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
}

export interface ChapterContent {
  id: ChapterId;
  titleEn: string;
  titleTh: string;
  estimatedMinutes: [number, number];
  firstScene: string;
  scenes: SceneContent[];
  reflection: QuestionContent[];
  emotionCards?: { insider: OptionContent[]; waiter: OptionContent[] };
  transition: { lines: LineContent[]; nextChapter?: ChapterId };
}
