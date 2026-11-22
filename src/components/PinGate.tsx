import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, Delete, Lock } from 'lucide-react';
import { PixelButton } from './PixelButton';
import { pinText } from '../content/th/pinText';
import {
  checkPin,
  isPinFormat,
  lockRemainingMs,
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
  type PinRecord,
} from '../lib/pin';

export interface PinGateProps {
  player: { id: string; nickname: string; pin: PinRecord };
  onUnlock(): void;
  /** Persist the updated attempt counter / lock (e.g. via recordPinAttempt). */
  onAttempt(r: PinRecord): void;
  /** Called after the 2-step forget confirmation; the caller applies forgetPin(). */
  onForget(): void;
  onCancel?: () => void;
}

type Step = 'pin' | 'forget-warn' | 'forget-type';

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const t = pinText.gate;

function lockMessage(ms: number): string {
  const total = Math.ceil(ms / 1000);
  if (total < 60) return t.locked(total);
  return t.lockedMin(Math.floor(total / 60), total % 60);
}

/** S13 — PIN Gate overlay (docs/06 S13, docs/08 §4). */
export function PinGate({ player, onUnlock, onAttempt, onForget, onCancel }: PinGateProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const [step, setStep] = useState<Step>('pin');
  const [entry, setEntry] = useState('');
  const [record, setRecord] = useState<PinRecord>(player.pin);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [typed, setTyped] = useState('');

  useEffect(() => setRecord(player.pin), [player.pin]);

  const lockedMs = lockRemainingMs(record, new Date(now));
  const locked = lockedMs > 0;

  // Countdown tick while locked.
  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [locked]);

  const press = useCallback(
    (d: string) => {
      if (busy || locked) return;
      setMessage(null);
      setEntry((e) => (e.length >= PIN_MAX_LENGTH ? e : e + d));
    },
    [busy, locked],
  );
  const backspace = useCallback(() => {
    if (busy) return;
    setEntry((e) => e.slice(0, -1));
  }, [busy]);

  const submit = useCallback(async () => {
    if (busy || locked) return;
    if (!isPinFormat(entry)) {
      setMessage(t.tooShort);
      return;
    }
    setBusy(true);
    const res = await checkPin(record, entry);
    setBusy(false);
    setEntry('');
    setRecord(res.record);
    setNow(Date.now());
    if (res.record !== record) onAttempt(res.record);
    if (res.ok) {
      onUnlock();
      return;
    }
    setMessage(res.lockedForMs > 0 ? null : t.wrong);
  }, [busy, locked, entry, record, onAttempt, onUnlock]);

  // Restore focus on unmount (declared first so it captures the element focused before the gate).
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus?.();
  }, []);
  // Focus the first control of each step (AX-6).
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (step !== 'pin') {
          e.preventDefault();
          setTyped('');
          setStep('pin');
        } else if (onCancel) {
          e.preventDefault();
          onCancel();
        }
        return;
      }
      if (e.key === 'Tab' && ref.current) {
        const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (step !== 'pin' || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Enter' && target?.tagName !== 'BUTTON') {
        // Enter on a focused button activates that button instead.
        e.preventDefault();
        void submit();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [step, onCancel, press, backspace, submit]);

  const slots = Math.max(
    PIN_MIN_LENGTH,
    Math.min(PIN_MAX_LENGTH, entry.length + (entry.length < PIN_MAX_LENGTH ? 1 : 0)),
  );
  const keyClass =
    'btn btn-ghost min-h-[64px] min-w-[64px] h-16 w-full px-0 text-2xl font-semibold disabled:opacity-45';
  const nameMatches = typed.trim() === player.nickname.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy/95 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="panel flex w-full max-w-sm flex-col gap-4"
      >
        {step === 'pin' && (
          <>
            <div className="flex flex-col items-center gap-1 text-center">
              <Lock aria-hidden className="h-6 w-6 text-orange" />
              <p className="m-0 text-sm text-lavender">{t.ownerLabel}</p>
              <h2 id={titleId} className="m-0 text-2xl font-semibold break-words">
                <span className="sr-only">{t.title(player.nickname)}</span>
                <span aria-hidden>{player.nickname}</span>
              </h2>
              <p id={descId} className="m-0 text-sm text-lavender">
                {t.hint}
              </p>
            </div>

            <div className="flex justify-center gap-3" aria-hidden>
              {Array.from({ length: slots }, (_, i) => (
                <span
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 border-cream ${i < entry.length ? 'bg-cream' : 'bg-transparent'}`}
                />
              ))}
            </div>
            <p className="sr-only" aria-live="polite">
              {t.entered(entry.length)}
            </p>

            <div role="status" aria-live="polite" className="min-h-[1.5rem] text-center text-sm">
              {locked ? (
                <div className="flex flex-col gap-1">
                  <p className="m-0 flex items-start justify-center gap-2 text-cream">
                    <Lock aria-hidden className="mt-1 h-4 w-4 shrink-0 text-orange" />
                    {lockMessage(lockedMs)}
                  </p>
                  <p className="m-0 text-lavender">{t.lockNote}</p>
                </div>
              ) : message ? (
                <p className="m-0 flex items-start justify-center gap-2 text-cream">
                  <AlertTriangle aria-hidden className="mt-1 h-4 w-4 shrink-0 text-danger" />
                  {message}
                </p>
              ) : busy ? (
                <p className="m-0 text-lavender">{t.checking}</p>
              ) : null}
            </div>

            <div role="group" aria-label={t.keypadLabel} className="grid grid-cols-3 gap-3">
              {DIGITS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={keyClass}
                  aria-label={t.digit(d)}
                  disabled={busy || locked}
                  onClick={() => press(d)}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                className={`${keyClass} text-base`}
                aria-label={t.deleteLabel}
                disabled={busy || entry.length === 0}
                onClick={backspace}
              >
                <Delete aria-hidden className="h-6 w-6" />
                <span className="sr-only sm:not-sr-only sm:text-sm">{t.delete}</span>
              </button>
              <button
                type="button"
                className={keyClass}
                aria-label={t.digit('0')}
                disabled={busy || locked}
                onClick={() => press('0')}
              >
                0
              </button>
              <button
                type="button"
                className="btn btn-primary h-16 min-h-[64px] min-w-[64px] w-full px-0 text-base font-semibold"
                aria-label={t.okLabel}
                disabled={busy || locked || entry.length < PIN_MIN_LENGTH}
                onClick={() => void submit()}
              >
                {t.ok}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="min-h-[44px] px-2 text-sm text-lavender underline underline-offset-4"
                onClick={() => setStep('forget-warn')}
              >
                {t.forget}
              </button>
              {onCancel && (
                <PixelButton variant="ghost" onClick={onCancel}>
                  {t.cancel}
                </PixelButton>
              )}
            </div>
          </>
        )}

        {step === 'forget-warn' && (
          <>
            <h2 id={titleId} className="m-0 flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle aria-hidden className="h-5 w-5 text-danger" />
              {pinText.forget.title}
            </h2>
            <div id={descId} className="flex flex-col gap-3 text-sm">
              <p className="m-0 text-lavender">{pinText.forget.whose}</p>
              <p className="m-0 break-words text-3xl font-bold text-cream">{player.nickname}</p>
              <p className="m-0">{pinText.forget.intro}</p>
              <p className="m-0 text-lavender">{pinText.forget.why}</p>
              <h3 className="m-0 text-base font-semibold">{pinText.forget.listHeading}</h3>
              <ul className="m-0 list-disc pl-5">
                {pinText.forget.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
              <p className="m-0 text-lavender">{pinText.forget.keeps}</p>
              <p className="m-0 font-semibold">{pinText.forget.noUndo}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <PixelButton variant="ghost" onClick={() => setStep('pin')}>
                {pinText.forget.back}
              </PixelButton>
              <PixelButton variant="danger" onClick={() => setStep('forget-type')}>
                {pinText.forget.next}
              </PixelButton>
            </div>
          </>
        )}

        {step === 'forget-type' && (
          <>
            <h2 id={titleId} className="m-0 flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle aria-hidden className="h-5 w-5 text-danger" />
              {pinText.forget.confirmTitle}
            </h2>
            <p className="m-0 break-words text-3xl font-bold text-cream">{player.nickname}</p>
            <label id={descId} className="flex flex-col gap-2 text-sm">
              {pinText.forget.typePrompt(player.nickname)}
              <input
                aria-label={pinText.forget.typeLabel(player.nickname)}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                className="min-h-[44px] rounded-btn border-2 border-lavender/40 bg-navy px-3 text-cream"
              />
            </label>
            {typed.length > 0 && !nameMatches && (
              <p className="m-0 text-sm text-lavender" aria-live="polite">
                {pinText.forget.typeMismatch}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <PixelButton
                variant="ghost"
                onClick={() => {
                  setTyped('');
                  setStep('pin');
                }}
              >
                {pinText.forget.back}
              </PixelButton>
              <PixelButton variant="danger" disabled={!nameMatches} onClick={onForget}>
                {pinText.forget.confirm}
              </PixelButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
