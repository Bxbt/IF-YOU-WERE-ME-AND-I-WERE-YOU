import { forwardRef, useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, Cloud } from 'lucide-react';
import { useGame } from '../store/game';
import { useReducedMotion } from '../lib/motion';

const CHARS_PER_SECOND = { slow: 20, normal: 30, fast: 60, instant: Infinity } as const;

/** Reveals text progressively. Returns [visibleText, done, completeNow]. */
export function useTypewriter(text: string): [string, boolean, () => void] {
  const speed = useGame((s) => s.save.settings.textSpeed);
  const reduced = useReducedMotion();
  const cps = reduced ? Infinity : CHARS_PER_SECOND[speed];
  const [count, setCount] = useState(cps === Infinity ? text.length : 0);

  useEffect(() => {
    if (cps === Infinity) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const chars = Array.from(text).length;
    const started = performance.now();
    const id = setInterval(() => {
      const n = Math.min(chars, Math.floor(((performance.now() - started) / 1000) * cps));
      setCount(n);
      if (n >= chars) clearInterval(id);
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [text, cps]);

  const chars = Array.from(text);
  const done = count >= chars.length;
  return [chars.slice(0, count).join(''), done, () => setCount(chars.length)];
}

export type LineVariant = 'dlg' | 'narr' | 'mono' | 'sys';

interface DialogueBoxProps {
  speaker?: string;
  portrait?: ReactNode;
  text: string;
  onAdvance?: () => void;
  waitingChoice?: boolean;
  /** dlg = speech · narr = narrator · mono = inner thought (italic, Cloud) · sys = in-world screen/sign */
  variant?: LineVariant;
  /** SYS only: what the screen/sign is, e.g. "โทรศัพท์ของ …" */
  title?: string;
}

const VARIANT_CLASS: Record<LineVariant, string> = {
  dlg: 'panel',
  narr: 'panel text-center',
  mono: 'panel border-dashed bg-indigo/80 italic text-lavender',
  sys: 'mx-auto w-full max-w-md rounded-panel border-2 border-lavender/60 bg-navy p-4 text-sm',
};

/**
 * DialogueBox — typing / complete / waiting-choice. Tap completes the line, then advances.
 * One box for every line type so advancing works the same everywhere (docs/06 S6).
 */
export const DialogueBox = forwardRef<HTMLButtonElement, DialogueBoxProps>(function DialogueBox(
  { speaker, portrait, text, onAdvance, waitingChoice = false, variant = 'dlg', title },
  ref,
) {
  const [visible, done, complete] = useTypewriter(text);
  const spoken = variant === 'mono' && speaker ? `${speaker} คิด: ${text}` : speaker ? `${speaker}: ${text}` : title ? `${title}: ${text}` : text;

  return (
    <div
      className={`relative ${VARIANT_CLASS[variant]} has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-orange`}
      data-line-variant={variant}
    >
      {/* Screen readers get the whole line once, not character by character (AX-3). */}
      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
      <button
        ref={ref}
        type="button"
        className={`flex w-full items-start gap-3 focus-visible:outline-none ${variant === 'narr' ? 'justify-center text-center' : 'text-left'}`}
        onClick={() => (!done ? complete() : waitingChoice ? undefined : onAdvance?.())}
        aria-label={done ? 'ถัดไป' : 'แสดงข้อความทั้งหมด'}
        aria-disabled={done && (waitingChoice || !onAdvance) ? true : undefined}
      >
        {portrait && <div className="h-16 w-16 shrink-0">{portrait}</div>}
        {variant === 'mono' && <Cloud aria-hidden className="mt-1.5 h-4 w-4 shrink-0" />}
        <div aria-hidden className="min-h-[3.4em] flex-1">
          {title && <div className="mb-1 text-[13px] not-italic text-lavender">{title}</div>}
          {speaker && variant !== 'narr' && (
            <div className={`mb-1 font-semibold not-italic ${variant === 'mono' ? 'text-lavender' : 'text-orange'}`}>{speaker}</div>
          )}
          <div>{visible}</div>
        </div>
      </button>
      {done && !waitingChoice && onAdvance && (
        <ChevronDown aria-hidden className="absolute bottom-2 right-3 h-5 w-5 animate-bounce text-lavender" />
      )}
    </div>
  );
});

export function MonologueBox({ speaker, text }: { speaker?: string; text: string }) {
  return (
    <div className="flex items-start gap-2 px-2 italic text-lavender">
      <Cloud aria-hidden className="mt-1 h-4 w-4 shrink-0" />
      <p className="m-0">
        {speaker && <span className="sr-only">{speaker} คิด: </span>}
        {text}
      </p>
    </div>
  );
}

export function NarrationBox({ text }: { text: string }) {
  return <p className="panel m-0 text-center">{text}</p>;
}

/** SystemCard — in-world UI such as a phone screen or a sign (docs/02 SYS lines). */
export function SystemCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xs rounded-panel border-2 border-lavender/60 bg-navy p-3 text-sm">
      {title && <div className="mb-1 text-[13px] text-lavender">{title}</div>}
      <div>{children}</div>
    </div>
  );
}
