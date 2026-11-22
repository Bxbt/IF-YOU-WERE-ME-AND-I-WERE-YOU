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
