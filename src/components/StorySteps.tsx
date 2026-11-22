/**
 * M5 story steps (docs/06 S6, S7): safety notes, Part C timeline, Interpretation Check,
 * Solo Perspective Mirror and Ch5 statements. All text from the player is rendered as plain text.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Cloud, HeartHandshake, MessageCirclePlus, X } from 'lucide-react';
import { ui } from '../content/th/ui';
import type { QuestionContent } from '../content/types';
import { canProceed, emptyDraft, type AnswerDraft } from '../engine/answers';
import { PixelButton } from './PixelButton';
import { AssumptionTag, PrivacyBadge } from './Labels';
import { ChoiceList, FreeTextField, MetaOptions } from './Answering';

// ---------- Safety notes ----------

/** Small, dismissible, never blocks play (docs/06 S6 "Safety note"). */
export function SafetyNotes({ notes, onClose }: { notes: string[]; onClose: (text: string) => void }) {
  if (notes.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {notes.map((n) => (
        <div
          key={n}
          role="note"
          aria-label={ui.play.safetyLabel}
          className="flex items-start gap-2 rounded-btn border-2 border-pink/60 bg-navy px-3 py-2 text-sm"
        >
          <HeartHandshake aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
          <p className="m-0 flex-1">{n}</p>
          <button
            type="button"
            aria-label={ui.play.safetyClose}
            onClick={() => onClose(n)}
            className="-m-2 flex min-h-[44px] min-w-[44px] items-center justify-center text-lavender"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------- Custom choice ("พิมพ์เอง") ----------

export function CustomChoice({
  maxLength,
  onSubmit,
}: {
  maxLength: number;
  onSubmit: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  // Opening the field is a deliberate action, so moving focus into it is expected.
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  if (!open) {
    return (
      <button
        type="button"
        className="btn w-full justify-start border-dashed bg-navy text-left"
        onClick={() => setOpen(true)}
      >
        {ui.play.customOption}
      </button>
    );
  }
  const n = Array.from(text).length;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm">
        {ui.play.customLabel}
      </label>
      <textarea
        id={id}
        ref={field}
        rows={2}
        value={text}
        maxLength={maxLength}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-btn border-2 border-lavender/40 bg-navy p-3 text-cream"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-lavender" aria-live="polite">
          {ui.answer.counter(n, maxLength)}
        </span>
        <PixelButton disabled={!text.trim()} onClick={() => onSubmit(text.trim().slice(0, maxLength))}>
          {ui.play.customConfirm}
        </PixelButton>
      </div>
    </div>
  );
}

// ---------- Part C timeline ----------

export function Timeline({
  inName,
  outName,
  rows,
  onNext,
}: {
  inName: string;
  outName: string;
  rows: { label: string; in: string; out: string }[];
  onNext: () => void;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="panel flex flex-col gap-3">
      <h2 id={headingId} className="m-0 text-lg font-semibold">
        {ui.play.timelineHeading}
      </h2>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((r) => (
          <li
            key={r.label}
            className="grid grid-cols-1 gap-2 border-t border-lavender/20 pt-3 sm:grid-cols-[4rem_1fr_1fr]"
          >
            <span className="font-pixel text-[13px] text-orange">{r.label}</span>
            <p className="m-0">
              <span className="block text-[13px] text-lavender">{ui.play.timelineIn(inName)}</span>
              {r.in}
            </p>
            <p className="m-0">
              <span className="block text-[13px] text-lavender">{ui.play.timelineOut(outName)}</span>
              {r.out}
            </p>
          </li>
        ))}
      </ol>
      <PixelButton className="self-end" onClick={onNext}>
        {ui.play.continue}
      </PixelButton>
    </section>
  );
}

// ---------- Interpretation Check (Ch3 s04) ----------

export interface InterpretationView {
  id: string;
  own: boolean;
  speakerName: string;
  quote: string;
  feelings: { id: string; text: string }[];
  initial?: { answers: Record<string, 'yes' | 'no' | 'unsure'>; noneMatch: boolean; freeText: string };
}

type Verdict = 'yes' | 'no' | 'unsure';

export function InterpretationCheck({
  sets,
  partnerName,
  imagined = true,
  onDone,
}: {
  sets: InterpretationView[];
  partnerName: string;
  /** Solo: guesses about the partner are imagined; Together: they are what you think. */
  imagined?: boolean;
  onDone: (
    answers: Record<string, { answers: Record<string, Verdict>; noneMatch: boolean; freeText: string }>,
  ) => void;
}) {
  const [state, setState] = useState(() =>
    Object.fromEntries(
      sets.map((s) => [
        s.id,
        s.initial ?? { answers: {} as Record<string, Verdict>, noneMatch: false, freeText: '' },
      ]),
    ),
  );
  const headingId = useId();
  const set = (id: string, fn: (v: (typeof state)[string]) => (typeof state)[string]) =>
    setState((st) => ({ ...st, [id]: fn(st[id]!) }));

  return (
    <section aria-labelledby={headingId} className="panel flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="m-0 text-lg font-semibold">
          {ui.play.interpretHeading}
        </h2>
        <PrivacyBadge state="private" />
      </div>
      <p className="m-0 text-sm text-lavender">{ui.play.interpretBody}</p>
      {sets.map((s) => {
        const v = state[s.id]!;
        return (
          <fieldset
            key={s.id}
            className="m-0 flex flex-col gap-3 rounded-btn border-2 border-lavender/30 p-3"
          >
            <legend className="px-1 text-sm">
              {ui.play.interpretSaid(s.speakerName)} <span className="font-semibold">{s.quote}</span>
            </legend>
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-lavender">
              {s.own ? ui.play.interpretOwn : ui.play.interpretOther(partnerName)}
              {!s.own && <AssumptionTag kind={imagined ? 'imagined' : 'assumption'} />}
            </div>
            {s.feelings.map((f) => (
              <div
                key={f.id}
                role="group"
                aria-label={f.text}
                className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
              >
                <span aria-hidden>{f.text}</span>
                <div className="flex gap-1">
                  {(['yes', 'no', 'unsure'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={v.answers[f.id] === k}
                      disabled={v.noneMatch}
                      onClick={() =>
                        set(s.id, (x) => {
                          const answers = { ...x.answers };
                          if (answers[f.id] === k) delete answers[f.id];
                          else answers[f.id] = k;
                          return { ...x, answers };
                        })
                      }
                      className={`min-h-[44px] min-w-[4.5rem] rounded-btn border-2 px-2 text-sm disabled:opacity-45 ${v.answers[f.id] === k ? 'border-orange bg-orange/15' : 'border-lavender/40 bg-navy'}`}
                    >
                      {ui.play[k]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              aria-pressed={v.noneMatch}
              onClick={() =>
                set(s.id, (x) => ({ ...x, noneMatch: !x.noneMatch, answers: !x.noneMatch ? {} : x.answers }))
              }
              className={`min-h-[44px] self-start rounded-btn border-2 px-3 text-sm ${v.noneMatch ? 'border-orange bg-orange/15' : 'border-lavender/40 bg-navy'}`}
            >
              {ui.play.noneMatch}
            </button>
            <FreeTextField
              draft={{ selected: [], meta: null, freeText: v.freeText }}
              onChange={(d) => set(s.id, (x) => ({ ...x, freeText: d.freeText }))}
            />
          </fieldset>
        );
      })}
      <PixelButton className="self-end" onClick={() => onDone(state)}>
        {ui.play.continue}
      </PixelButton>
    </section>
  );
}

// ---------- Solo Perspective Mirror (S7) ----------

export interface MirrorProps {
  question: QuestionContent;
  otherName: string;
  /** Text shown for an answer (option texts / meta / free text) — computed by the caller. */
  describe: (d: AnswerDraft | undefined) => string;
  initial: { self?: AnswerDraft; perceived?: AnswerDraft };
  onSave: (layer: 'self' | 'perceived', d: AnswerDraft) => void;
  onAddConversation?: () => void;
  conversationAdded: boolean;
  onNext: () => void;
  /** Together: no result card here — the answers are revealed later, with consent (docs/04 §6.2). */
  skipResult?: boolean;
}

/** docs/06 S7 Solo: self → perceived → result (no waiting, no consent — TC-REV-09). */
export function MirrorStep({
  question,
  otherName,
  describe,
  initial,
  onSave,
  onAddConversation,
  conversationAdded,
  onNext,
  skipResult = false,
}: MirrorProps) {
  const known = useRef({ ...initial });
  const startPhase =
    initial.self && initial.perceived && !skipResult
      ? 'result'
      : initial.self && !initial.perceived
        ? 'perceived'
        : 'self';
  const [phase, setPhase] = useState<'self' | 'perceived' | 'result'>(startPhase);
  const [draft, setDraft] = useState<AnswerDraft>(() =>
    startPhase === 'perceived' ? (initial.perceived ?? emptyDraft()) : (initial.self ?? emptyDraft()),
  );
  const headingId = useId();
  const top = useRef<HTMLHeadingElement>(null);
  useEffect(() => top.current?.focus(), [phase]);

  function submit() {
    if (phase === 'result' || !canProceed(draft)) return;
    onSave(phase, draft);
    known.current[phase] = draft;
    if (phase === 'self') {
      setPhase('perceived');
      setDraft(known.current.perceived ?? emptyDraft());
    } else if (skipResult) onNext();
    else setPhase('result');
  }

  if (phase === 'result') {
    return (
      <section aria-labelledby={headingId} className="panel flex flex-col gap-4" data-testid="mirror-result">
        <h2 id={headingId} ref={top} tabIndex={-1} className="m-0 text-lg font-semibold">
          {question.self.replace('{other}', otherName)}
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <MirrorCard title={ui.play.mirrorYouSaid} body={describe(known.current.self)} />
          <MirrorCard
            title={ui.play.mirrorYouThink(otherName)}
            body={describe(known.current.perceived)}
            tag
          />
          <div className="flex flex-col gap-1 rounded-btn border-2 border-dashed border-lavender/50 bg-[radial-gradient(rgba(164,155,203,.18)_1px,transparent_1px)] p-3 [background-size:8px_8px]">
            <span className="text-[13px] text-lavender">{ui.play.mirrorTheySaid(otherName)}</span>
            <span className="font-semibold">{ui.play.mirrorUnknown}</span>
            <span className="text-sm text-lavender">{ui.play.mirrorAsk(otherName)}</span>
          </div>
        </div>
        <p className="m-0 flex items-start gap-2 text-sm italic text-lavender">
          <Cloud aria-hidden className="mt-1 h-4 w-4 shrink-0" />
          {ui.play.mirrorSoloNote(otherName)}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {onAddConversation ? (
            <PixelButton
              variant="ghost"
              icon={<MessageCirclePlus aria-hidden className="h-5 w-5" />}
              disabled={conversationAdded}
              onClick={onAddConversation}
            >
              {conversationAdded ? ui.play.mirrorAdded : ui.play.mirrorAdd}
            </PixelButton>
          ) : (
            <span />
          )}
          <PixelButton onClick={onNext}>{ui.labels.next}</PixelButton>
        </div>
      </section>
    );
  }

  const text = (phase === 'self' ? question.self : (question.perceived ?? question.self)).replaceAll(
    '{other}',
    otherName,
  );
  return (
    <section aria-labelledby={headingId} className="panel flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm text-lavender">
          {phase === 'self' ? ui.play.mirrorSelf : ui.play.mirrorGuess(otherName)}
          {phase === 'perceived' && <AssumptionTag />}
        </span>
        <PrivacyBadge state="private" />
      </div>
      <h2 id={headingId} ref={top} tabIndex={-1} className="m-0 text-lg font-semibold">
        {text}
      </h2>
      <ChoiceList
        key={`${question.id}-${phase}`}
        label={text}
        options={question.options}
        maxSelect={question.maxSelect}
        draft={draft}
        onChange={setDraft}
      />
      {question.freeText && (
        <FreeTextField key={`ft-${question.id}-${phase}`} draft={draft} onChange={setDraft} />
      )}
      <MetaOptions draft={draft} onChange={setDraft} />
      <PixelButton className="self-end" onClick={submit} disabled={!canProceed(draft)}>
        {ui.labels.next}
      </PixelButton>
    </section>
  );
}

function MirrorCard({ title, body, tag }: { title: string; body: string; tag?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-btn border-2 border-lavender/40 bg-navy p-3">
      <span className="flex flex-wrap items-center gap-2 text-[13px] text-lavender">
        {title}
        {tag && <AssumptionTag />}
      </span>
      <span>{body}</span>
    </div>
  );
}

// ---------- Ch5 statements ----------

export interface StatementView {
  id: string;
  stem: string;
  starters: { id: string; text: string }[];
  initial?: { text: string; starterId?: string; skipped: boolean; shareIntent: boolean };
}

export function Statements({
  items,
  startAt,
  onSave,
  onDone,
  shareLabels,
}: {
  shareLabels?: { keep: string; share: string };
  items: StatementView[];
  startAt: number;
  onSave: (
    id: string,
    v: { text: string; starterId?: string; skipped: boolean; shareIntent: boolean },
  ) => void;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(Math.min(startAt, items.length - 1));
  const item = items[index]!;
  const [text, setText] = useState(item.initial?.skipped ? '' : (item.initial?.text ?? ''));
  const [starterId, setStarterId] = useState(item.initial?.starterId);
  const [share, setShare] = useState(item.initial?.shareIntent ?? false);
  const headingId = useId();
  const fieldId = useId();

  function go(next: number) {
    if (next >= items.length) return onDone();
    const it = items[next]!;
    setIndex(next);
    setText(it.initial?.skipped ? '' : (it.initial?.text ?? ''));
    setStarterId(it.initial?.starterId);
    setShare(it.initial?.shareIntent ?? false);
  }
  function save(skipped: boolean) {
    onSave(item.id, { text, starterId, skipped, shareIntent: share });
    go(index + 1);
  }
  const n = Array.from(text).length;

  return (
    <section aria-labelledby={headingId} className="panel flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-lavender">
          {ui.play.statementsHeading} · {ui.play.statementsPosition(index + 1, items.length)}
        </span>
        <PrivacyBadge state="private" />
      </div>
      <h2 id={headingId} className="m-0 text-lg font-semibold">
        {item.stem}
      </h2>
      <div role="group" aria-label={ui.play.statementsStarters} className="flex flex-wrap gap-2">
        {item.starters.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={starterId === s.id}
            onClick={() => {
              setStarterId(s.id);
              setText(s.text.replace(/^…/, ''));
            }}
            className={`min-h-[44px] rounded-btn border-2 px-3 text-left text-sm ${starterId === s.id ? 'border-orange bg-orange/15' : 'border-lavender/40 bg-navy'}`}
          >
            {s.text}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={fieldId} className="text-sm text-lavender">
          {ui.play.statementsNote}
        </label>
        <textarea
          id={fieldId}
          rows={3}
          maxLength={280}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-btn border-2 border-lavender/40 bg-navy p-3 text-cream"
        />
        <span
          className={`self-end text-[13px] ${n >= 260 ? 'text-orange' : 'text-lavender'}`}
          aria-live="polite"
        >
          {ui.answer.counter(n, 280)}
        </span>
      </div>
      <div role="group" aria-label={ui.play.statementCard} className="flex flex-wrap gap-2">
        {[false, true].map((v) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={share === v}
            onClick={() => setShare(v)}
            className={`min-h-[44px] rounded-btn border-2 px-3 text-sm ${share === v ? 'border-orange bg-orange/15' : 'border-lavender/40 bg-navy'}`}
          >
            {v ? (shareLabels?.share ?? ui.play.statementCard) : (shareLabels?.keep ?? ui.play.statementKeep)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="min-h-[44px] text-sm text-lavender underline"
          onClick={() => save(true)}
        >
          {ui.play.statementSkip}
        </button>
        <PixelButton onClick={() => save(false)} disabled={!text.trim()}>
          {ui.labels.next}
        </PixelButton>
      </div>
    </section>
  );
}
