import { useId, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Lock, LockOpen } from 'lucide-react';
import { PixelButton } from './PixelButton';
import { pinText } from '../content/th/pinText';
import type { Player } from '../persistence/schema';
import { checkPin, createPinRecord, hasWebCrypto, isPinFormat, type PinRecord } from '../lib/pin';

export interface PinSetupProps {
  player: Player;
  /** New record to store, or null to remove the PIN. */
  onSave(record: PinRecord | null): void;
  /** Optional: persist the attempt counter after a wrong "current PIN" (keeps the lockout honest). */
  onAttempt?: (record: PinRecord) => void;
}

type Mode = 'idle' | 'set' | 'change' | 'remove';

const s = pinText.setup;
const inputClass =
  'min-h-[44px] w-full max-w-[12rem] rounded-btn border-2 border-lavender/40 bg-navy px-3 text-lg tracking-[0.3em] text-cream';

function LimitsNotice() {
  const p = pinText.limitsNoticeParts;
  return (
    <p className="m-0 rounded-btn border-2 border-orange/50 p-3 text-sm">
      {p.before}
      <strong>{p.strong}</strong>
      {p.after}
    </p>
  );
}

function PinField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className={inputClass}
      />
    </div>
  );
}

/** Set / change / remove the PIN of one player (docs/08 §4, docs/06 S10). */
export function PinSetup({ player, onSave, onAttempt }: PinSetupProps) {
  const headingId = useId();
  const [mode, setMode] = useState<Mode>('idle');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hasPin = !!player.pin;

  if (!hasWebCrypto()) {
    return (
      <section aria-labelledby={headingId} className="panel flex flex-col gap-2">
        <h3 id={headingId} className="m-0 flex items-center gap-2 text-base font-semibold">
          <AlertTriangle aria-hidden className="h-5 w-5 text-orange" />
          {s.unavailableTitle}
        </h3>
        <p className="m-0 text-sm text-lavender">{s.unavailableReason}</p>
        <PixelButton disabled aria-disabled="true" className="self-start">
          {s.set}
        </PixelButton>
      </section>
    );
  }

  const reset = (m: Mode) => {
    setMode(m);
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
    if (m !== 'idle') setDone(null);
  };

  /** Verifies the current PIN; reports the attempt; returns false (with message) on failure. */
  const verifyCurrent = async (): Promise<boolean> => {
    if (!player.pin) return true;
    const res = await checkPin(player.pin, current);
    if (res.record !== player.pin) onAttempt?.(res.record);
    if (res.ok) return true;
    const sec = Math.ceil(res.lockedForMs / 1000);
    setError(res.lockedForMs > 0 ? `${pinText.gate.locked(sec)} — ${pinText.gate.lockNote}` : s.wrongCurrent);
    return false;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (mode === 'set' || mode === 'change') {
      if (!isPinFormat(next)) return setError(s.formatError);
      if (next !== confirm) return setError(s.mismatch);
    }
    setBusy(true);
    try {
      if (mode !== 'set' && !(await verifyCurrent())) return;
      if (mode === 'remove') {
        onSave(null);
        reset('idle');
        setDone(s.removed);
      } else {
        const record = await createPinRecord(next);
        onSave(record);
        reset('idle');
        setDone(s.saved);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby={headingId} className="panel flex flex-col gap-3">
      <h3 id={headingId} className="m-0 text-base font-semibold">
        {s.title}
      </h3>
      <p className="m-0 flex items-center gap-2 text-sm">
        {hasPin ? (
          <Lock aria-hidden className="h-4 w-4 text-orange" />
        ) : (
          <LockOpen aria-hidden className="h-4 w-4 text-lavender" />
        )}
        {hasPin ? s.hasPin : s.noPin}
      </p>

      {done && mode === 'idle' && (
        <p role="status" className="m-0 flex items-center gap-2 text-sm">
          <CheckCircle2 aria-hidden className="h-4 w-4 text-blue" />
          {done}
        </p>
      )}

      {mode === 'idle' && (
        <>
          {!hasPin && <LimitsNotice />}
          <div className="flex flex-wrap gap-3">
            {hasPin ? (
              <>
                <PixelButton variant="ghost" onClick={() => reset('change')}>
                  {s.change}
                </PixelButton>
                <PixelButton variant="ghost" onClick={() => reset('remove')}>
                  {s.remove}
                </PixelButton>
              </>
            ) : (
              <PixelButton onClick={() => reset('set')}>{s.set}</PixelButton>
            )}
          </div>
        </>
      )}

      {mode !== 'idle' && (
        <form className="flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)} noValidate>
          {mode !== 'remove' && <LimitsNotice />}
          {mode !== 'set' && <PinField label={s.current} value={current} onChange={setCurrent} />}
          {mode !== 'remove' && (
            <>
              <PinField label={s.newPin} value={next} onChange={setNext} />
              <PinField label={s.confirmPin} value={confirm} onChange={setConfirm} />
            </>
          )}
          {mode === 'remove' && <p className="m-0 text-sm text-lavender">{s.removeNote}</p>}
          {error && (
            <p role="alert" className="m-0 flex items-start gap-2 text-sm">
              <AlertTriangle aria-hidden className="mt-1 h-4 w-4 shrink-0 text-danger" />
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <PixelButton variant="ghost" onClick={() => reset('idle')} disabled={busy}>
              {s.cancel}
            </PixelButton>
            <PixelButton type="submit" variant={mode === 'remove' ? 'danger' : 'primary'} loading={busy}>
              {busy ? s.saving : mode === 'remove' ? s.removeConfirm : s.save}
            </PixelButton>
          </div>
        </form>
      )}
    </section>
  );
}
