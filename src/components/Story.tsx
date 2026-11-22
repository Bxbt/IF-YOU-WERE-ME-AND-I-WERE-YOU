/**
 * S6 building blocks (docs/06 S6): story choices, emotion cards, end-of-chapter reflection,
 * dialogue history and the chapter transition card.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { ui } from '../content/th/ui';
import type { OptionContent, QuestionContent } from '../content/types';
import { canProceed, emptyDraft, type AnswerDraft } from '../engine/answers';
import { useReducedMotion } from '../lib/motion';
import { PixelButton } from './PixelButton';
import { PrivacyBadge } from './Labels';
import { ChoiceList, FreeTextField, MetaOptions } from './Answering';

// ---------- Story choices ----------

/**
 * Story choice: one tap commits (no timer, nothing marked as recommended — docs/06 S6).
 * Number keys 1–n pick an option (AX-1). Focus moves to the first option when they appear.
 */
export function StoryChoices({
  label,
  options,
  onChoose,
}: {
  label: string;
  options: { id: string; text: string }[];
  onChoose: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    first.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || document.querySelector('[role="dialog"]'))
        return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) onChoose(options[n - 1]!.id);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [options, onChoose]);

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      {options.map((o, i) => (
        <motion.button
          key={o.id}
          ref={i === 0 ? first : undefined}
          type="button"
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : i * 0.06, duration: 0.2 }}
          onClick={() => onChoose(o.id)}
          className="btn w-full justify-start bg-navy text-left"
        >
          <span aria-hidden className="font-pixel text-[13px] text-lavender">
            {i + 1}
          </span>
          {o.text}
        </motion.button>
      ))}
    </div>
  );
}

// ---------- Emotion cards ----------

export function EmotionCards({
  groups,
  initial,
  onDone,
}: {
  groups: { label: string; cards: OptionContent[] }[];
  initial: string[];
  onDone: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const headingId = useId();
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <section aria-labelledby={headingId} className="panel flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="m-0 text-lg font-semibold">
          {ui.play.cardsHeading}
        </h2>
        <PrivacyBadge state="private" />
      </div>
      <p className="m-0 text-sm text-lavender">{ui.play.cardsBody}</p>
      {groups.map((g) => (
        <div key={g.label} role="group" aria-label={g.label} className="flex flex-col gap-2">
          <p aria-hidden className="m-0 text-sm font-medium">
            {g.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {g.cards.map((c) => {
              const on = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c.id)}
                  className={`min-h-[44px] rounded-btn border-2 px-3 text-sm ${on ? 'border-orange bg-orange/15 text-cream' : 'border-lavender/40 bg-navy text-cream'}`}
                >
                  {on && <Check aria-hidden className="mr-1 inline h-4 w-4 text-orange" />}
                  {c.text}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="m-0 text-[13px] italic text-lavender">{ui.play.cardsNote}</p>
      <PixelButton className="self-end" onClick={() => onDone(selected)}>
        {ui.play.continue}
      </PixelButton>
    </section>
  );
}

// ---------- Reflection ----------

export interface ReflectionProps {
  questions: QuestionContent[];
  /** Saved answers + drafts, by question id. */
  initial: Record<string, AnswerDraft>;
  startAt: number;
  onAnswer: (questionId: string, draft: AnswerDraft) => void;
  onDraft: (questionId: string, text: string) => void;
  onFinish: () => void;
}

/** End-of-chapter reflection (docs/06 S6): S4-style cards, always private, skippable as a whole. */
export function Reflection({ questions, initial, startAt, onAnswer, onDraft, onFinish }: ReflectionProps) {
  const [index, setIndex] = useState(Math.min(startAt, questions.length - 1));
  const q = questions[index]!;
  // Answers given in this sitting, so going forward shows what was just saved.
  const known = useRef<Record<string, AnswerDraft>>({ ...initial });
  const [draft, setDraft] = useState<AnswerDraft>(() => known.current[q.id] ?? emptyDraft());
  const headingId = useId();

  // Free-text drafts survive a closed tab, saved every 2 s while typing (docs/05 §6, TC-RES-03).
  const lastSaved = useRef(initial[q.id]?.freeText ?? '');
  useEffect(() => {
    if (draft.freeText === lastSaved.current) return;
    const t = setTimeout(() => {
      lastSaved.current = draft.freeText;
      onDraft(q.id, draft.freeText);
    }, 2000);
    return () => clearTimeout(t);
  }, [draft.freeText, q.id, onDraft]);

  function go(next: number) {
    if (next >= questions.length) return onFinish();
    const nq = questions[next]!;
    setIndex(next);
    setDraft(known.current[nq.id] ?? emptyDraft());
    lastSaved.current = known.current[nq.id]?.freeText ?? '';
  }

  function submit() {
    if (!canProceed(draft)) return;
    onAnswer(q.id, draft);
    known.current[q.id] = draft;
    go(index + 1);
  }

  return (
    <section aria-labelledby={headingId} className="panel flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-lavender">
          {ui.play.reflectionHeading} · {ui.play.reflectionPosition(index + 1, questions.length)}
        </span>
        <PrivacyBadge state="private" />
      </div>
      <h2 id={headingId} className="m-0 text-lg font-semibold">
        {q.self}
      </h2>
      {q.options.length > 0 && (
        <ChoiceList
          key={q.id}
          label={q.self}
          options={q.options}
          maxSelect={q.maxSelect}
          draft={draft}
          onChange={setDraft}
        />
      )}
      {q.freeText && (
        <FreeTextField
          key={`ft-${q.id}`}
          draft={draft}
          onChange={setDraft}
          startOpen={q.options.length === 0}
        />
      )}
      <MetaOptions draft={draft} onChange={setDraft} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="min-h-[44px] text-sm text-lavender underline" onClick={onFinish}>
          {ui.play.skipReflection}
        </button>
        <PixelButton onClick={submit} disabled={!canProceed(draft)}>
          {ui.labels.next}
        </PixelButton>
      </div>
    </section>
  );
}

// ---------- History ----------

export interface HistoryEntry {
  speaker?: string;
  text: string;
  variant: 'dlg' | 'narr' | 'mono' | 'sys';
}

export function HistoryDialog({
  open,
  entries,
  onClose,
}: {
  open: boolean;
  entries: HistoryEntry[];
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    endRef.current?.scrollIntoView?.({ block: 'end' });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="panel flex max-h-[85vh] w-full max-w-lg flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="m-0 text-lg font-semibold">
            {ui.play.history}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={ui.close}
            onClick={onClose}
            className="btn btn-ghost min-w-[44px] px-2"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <ol className="m-0 flex list-none flex-col gap-2 overflow-y-auto p-0">
          {entries.length === 0 && <li className="text-lavender">{ui.play.historyEmpty}</li>}
          {entries.map((e, i) => (
            <li
              key={i}
              ref={i === entries.length - 1 ? endRef : undefined}
              className={
                e.variant === 'mono'
                  ? 'italic text-lavender'
                  : e.variant === 'sys'
                    ? 'text-sm text-lavender'
                    : ''
              }
            >
              {e.speaker && <span className="font-semibold text-orange">{e.speaker}: </span>}
              {e.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ---------- Chapter transition ----------

export function TransitionCard({
  lines,
  next,
  onRest,
}: {
  lines: { text: string; heading?: boolean }[];
  next: { label: string; onClick?: () => void; disabledReason?: string } | null;
  onRest: () => void;
}) {
  const headingId = useId();
  const reasonId = useId();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const heading = lines.find((l) => l.heading);
  return (
    <motion.section
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      aria-labelledby={headingId}
      className="panel flex flex-col items-center gap-3 text-center"
    >
      <h2 id={headingId} ref={ref} tabIndex={-1} className="m-0 font-semibold text-orange">
        {heading?.text ?? ui.play.chapterDone}
      </h2>
      {lines
        .filter((l) => !l.heading)
        .map((l, i) => (
          <p key={i} className="m-0">
            {l.text}
          </p>
        ))}
      <div className="mt-2 flex w-full max-w-sm flex-col gap-2">
        {next && (
          <>
            <PixelButton
              block
              onClick={next.onClick}
              disabled={!!next.disabledReason}
              aria-describedby={next.disabledReason ? reasonId : undefined}
            >
              {next.label}
            </PixelButton>
            {next.disabledReason && (
              <p id={reasonId} className="m-0 text-[13px] text-lavender">
                {next.disabledReason}
              </p>
            )}
          </>
        )}
        <PixelButton variant="ghost" block onClick={onRest}>
          {ui.play.rest}
        </PixelButton>
      </div>
    </motion.section>
  );
}
