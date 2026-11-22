/**
 * Reflection Report (docs/04 §8, docs/07 §8). Built live from the data every time (never cached),
 * so edits to the profile show at once. Templates only; every item carries its source label.
 */
import type { GameSession, PersonalityAnswer, SaveRoot } from '../persistence/schema';
import type { QuestionContent } from '../content/types';
import { MIRRORS, QUESTIONS } from '../content/th/questions';
import { templates } from '../content/th/templates';
import { ui } from '../content/th/ui';
import { optionTexts, soloPairs, type Comparison } from './compare';

export type ReportSource = 'self' | 'perceived' | 'statement' | 'conversation';

export interface ReportItem {
  id: string;
  text: string;
  source: ReportSource;
  questionId?: string;
  dimension?: string;
  /** Selected by default for sharing (Ch5 statements the player chose to put on the card). */
  preselect?: boolean;
}

export interface ReportGroup {
  id: string;
  title: string;
  items: ReportItem[];
  /** Shown when there are no items. */
  emptyText?: string;
  emptyCta?: { label: string; to: string };
}

export interface ReportSection {
  id: 'me' | 'understanding' | 'differences' | 'next';
  title: string;
  groups: ReportGroup[];
  note?: string;
}

/** "อ้อมกอด · คนที่ฟัง · “ข้อความ”" or the meta label. */
export function describeAnswer(q: QuestionContent, a: PersonalityAnswer): string {
  if (a.meta) return ui.answer.meta[a.meta];
  const opts = optionTexts(q, a.selected);
  const free = a.freeText?.trim() ? `“${a.freeText.trim()}”` : '';
  return [opts, free].filter(Boolean).join(' · ');
}

const byDims = (dims: string[]) => QUESTIONS.filter((q) => dims.includes(q.dimension ?? ''));
const mirror = (id: string) => MIRRORS.find((m) => m.id === id)!;
const q34 = QUESTIONS.find((q) => q.id === 'Q34');

export function buildReport(
  save: SaveRoot,
  j: GameSession,
  ownerId: string,
  comparison: Comparison,
): ReportSection[] {
  const [, partnerId] = j.playerIds;
  const other = save.players[partnerId]?.nickname ?? '';
  const pairs = new Map(soloPairs(save, j).map((p) => [p.q.id, p]));
  const t = templates.report;
  const selfQuick = `/profile/${ownerId}/self?set=quick`;
  const perceivedQuick = `/profile/${ownerId}/perceived/${partnerId}?set=quick`;

  const selfItem = (q: QuestionContent): ReportItem[] => {
    const a = pairs.get(q.id)?.x;
    if (!a || a.status === 'skipped') return [];
    const text = describeAnswer(q, a);
    return text
      ? [
          {
            id: `self:${q.id}`,
            text: `${q.self} — ${text}`,
            source: 'self',
            questionId: q.id,
            dimension: q.dimension,
          },
        ]
      : [];
  };
  const perceivedItem = (q: QuestionContent): ReportItem[] => {
    const a = pairs.get(q.id)?.y;
    if (!a || a.status === 'skipped') return [];
    const text = describeAnswer(q, a);
    const question = (q.perceived ?? q.self).replaceAll('{other}', other);
    return text
      ? [
          {
            id: `perceived:${q.id}`,
            text: `${question} — ${text}`,
            source: 'perceived',
            questionId: q.id,
            dimension: q.dimension,
          },
        ]
      : [];
  };
  const statement = (id: string): ReportItem[] => {
    const e = j.mirrorItems[id]?.entries[ownerId];
    const text = e?.statement?.text?.trim();
    return e && text && e.statement?.meta !== 'skipped'
      ? [{ id: `statement:${id}`, text, source: 'statement', questionId: id, preselect: !!e.shareIntent }]
      : [];
  };

  const needsCta = { label: t.answerNow, to: selfQuick };
  const me: ReportSection = {
    id: 'me',
    title: t.me,
    groups: [
      {
        id: 'me-needs',
        title: t.meNeeds,
        items: byDims(['D04', 'D05', 'D07']).flatMap(selfItem),
        emptyText: t.emptyGroup,
        emptyCta: needsCta,
      },
      {
        id: 'me-love',
        title: t.meLove,
        items: byDims(['D08']).flatMap(selfItem),
        emptyText: t.emptyGroup,
        emptyCta: needsCta,
      },
      {
        id: 'me-conflict',
        title: t.meConflict,
        items: byDims(['D03', 'D10']).flatMap(selfItem),
        emptyText: t.emptyGroup,
        emptyCta: needsCta,
      },
      {
        id: 'me-loved',
        title: t.meLoved,
        items: [...selfItem(mirror('M02')), ...(q34 ? selfItem(q34) : []), ...statement('cs4')],
        emptyText: t.emptyGroup,
        emptyCta: needsCta,
      },
      {
        id: 'me-statements',
        title: t.meStatements,
        items: ['cs1', 'cs2', 'cs3', 'cs5'].flatMap(statement),
      },
    ].filter((g) => g.id !== 'me-statements' || g.items.length > 0),
  };

  const allPerceived = [...QUESTIONS, ...MIRRORS]
    .map((q) => ({ q, a: pairs.get(q.id)?.y }))
    .filter((p) => p.a);
  const unsure = allPerceived
    .filter(({ a }) => a!.status === 'skipped' || a!.meta === 'not_sure' || a!.meta === 'depends')
    .map(({ q, a }) => ({
      id: `unsure:${q.id}`,
      text: `${(q.perceived ?? q.self).replaceAll('{other}', other)} — ${a!.status === 'skipped' ? ui.answer.meta.skipped : ui.answer.meta[a!.meta!]}`,
      source: 'perceived' as const,
      questionId: q.id,
      dimension: q.dimension,
    }));
  const perceivedCta = { label: t.answerPerceived(other), to: perceivedQuick };
  const understanding: ReportSection = {
    id: 'understanding',
    title: t.understanding(other),
    groups: [
      {
        id: 'u-needs',
        title: t.uNeeds(other),
        items: [
          ...byDims(['D05']).flatMap(perceivedItem),
          ...perceivedItem(mirror('M01')),
          ...perceivedItem(mirror('M07')),
        ],
        emptyText: t.emptyGroup,
        emptyCta: perceivedCta,
      },
      {
        id: 'u-loved',
        title: t.uLoved(other),
        items: [...byDims(['D08']).flatMap(perceivedItem), ...perceivedItem(mirror('M02'))],
        emptyText: t.emptyGroup,
        emptyCta: perceivedCta,
      },
      {
        id: 'u-unsure',
        title: t.uUnsure,
        items: unsure,
        emptyText: allPerceived.length > 0 ? t.uUnsureEmpty : t.emptyGroup,
        emptyCta: allPerceived.length > 0 ? undefined : perceivedCta,
      },
    ],
  };

  const differences: ReportSection = {
    id: 'differences',
    title: t.differences,
    groups: [],
    note: t.differencesSolo(other),
  };

  // Questions to talk about: comparison "ask" prompts + what the player saved in Our Next Conversation.
  const seen = new Set<string>();
  const questions: ReportItem[] = [];
  for (const n of j.nextConversation.filter((x) => x.ownerId === ownerId)) {
    if (seen.has(n.text)) continue;
    seen.add(n.text);
    questions.push({ id: `next:${n.id}`, text: n.text, source: 'conversation' });
  }
  for (const item of comparison.ask) {
    const prompt = item.question.reflectionPrompt?.trim();
    if (!prompt || seen.has(prompt)) continue;
    seen.add(prompt);
    questions.push({
      id: `ask:${item.question.id}`,
      text: prompt,
      source: 'conversation',
      questionId: item.question.id,
      dimension: item.dimension,
    });
  }
  // Item ids are unique across the report (Q13 can also appear under "needs").
  const care = ['Q26', 'Q13']
    .flatMap((id) => perceivedItem(QUESTIONS.find((q) => q.id === id)!))
    .map((i) => ({ ...i, id: `care:${i.questionId}` }));
  const next: ReportSection = {
    id: 'next',
    title: t.next,
    groups: [
      { id: 'n-questions', title: t.nextQuestions, items: questions, emptyText: t.emptyGroup },
      { id: 'n-care', title: t.nextCare, items: care, emptyText: t.emptyGroup, emptyCta: perceivedCta },
      { id: 'n-thanks', title: t.nextThanks, items: [], emptyText: t.nextThanksSolo(other) },
    ],
  };

  return [me, understanding, differences, next];
}

export const allItems = (sections: ReportSection[]) =>
  sections.flatMap((s) => s.groups.flatMap((g) => g.items));

/** docs/07 §11.3: UTF-8, section headings, a source label on every line, footer with date. */
export function reportToTxt(
  sections: ReportSection[],
  selected: Set<string>,
  meta: { title: string; date: string },
): string {
  const t = templates.report;
  const lines: string[] = [meta.title, t.date(meta.date), ''];
  for (const s of sections) {
    lines.push(`== ${s.title} ==`);
    for (const g of s.groups) {
      const items = g.items.filter((i) => selected.has(i.id));
      if (items.length === 0) continue;
      lines.push(`-- ${g.title} --`);
      for (const i of items) lines.push(`[${t.source[i.source]}] ${i.text}`);
    }
    lines.push('');
  }
  lines.push(t.fileFooter(meta.date));
  return lines.join('\n');
}

/** JSON export (docs/07 §8 ReflectionReport) with only the selected items. */
export function reportToJson(
  sections: ReportSection[],
  selected: Set<string>,
  meta: { id: string; journeyId: string; ownerId: string; generatedAt: string },
): string {
  const pick = (id: ReportSection['id']) =>
    allItems(sections.filter((s) => s.id === id))
      .filter((i) => selected.has(i.id))
      .map(({ id: itemId, text, source, questionId, dimension }) => ({
        id: itemId,
        text,
        source,
        ...(questionId ? { questionId } : {}),
        ...(dimension ? { dimension } : {}),
      }));
  return JSON.stringify(
    {
      ...meta,
      selectedItemIds: [...selected],
      format: 'json',
      sections: {
        myPersonality: pick('me'),
        myUnderstanding: pick('understanding'),
        ourDifferences: pick('differences'),
        nextConversation: pick('next'),
        confirmedPatterns: [],
      },
    },
    null,
    2,
  );
}
