import { useEffect, useState, type ReactNode } from 'react';
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

interface DialogueBoxProps {
  speaker?: string;
  portrait?: ReactNode;
  text: string;
  onAdvance?: () => void;
  waitingChoice?: boolean;
}

/** DialogueBox — typing / complete / waiting-choice. Tap completes the line, then advances. */
export function DialogueBox({ speaker, portrait, text, onAdvance, waitingChoice = false }: DialogueBoxProps) {
  const [visible, done, complete] = useTypewriter(text);

  return (
    <div className="panel relative">
      {/* Screen readers get the whole line once, not character by character (AX-3). */}
      <p className="sr-only" aria-live="polite">
        {speaker ? `${speaker}: ${text}` : text}
      </p>
      <button
        type="button"
        className="flex w-full items-start gap-3 text-left"
        onClick={() => (done ? onAdvance?.() : complete())}
        aria-label={done ? 'ถัดไป' : 'แสดงข้อความทั้งหมด'}
        disabled={done && (waitingChoice || !onAdvance)}
      >
        {portrait && <div className="h-16 w-16 shrink-0">{portrait}</div>}
        <div aria-hidden className="min-h-[3.4em] flex-1">
          {speaker && <div className="mb-1 font-semibold text-orange">{speaker}</div>}
          <div>{visible}</div>
        </div>
      </button>
      {done && !waitingChoice && onAdvance && (
        <ChevronDown aria-hidden className="absolute bottom-2 right-3 h-5 w-5 animate-bounce text-lavender" />
      )}
    </div>
  );
}

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
