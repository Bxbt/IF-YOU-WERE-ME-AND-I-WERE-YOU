import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { PixelButton } from './PixelButton';
import { ui } from '../content/th/ui';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  /** When set, the confirm button stays disabled until this exact word is typed. */
  typedWord?: string;
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Modal with focus trap, Esc to close and focus restore (AX-6). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive,
  typedWord,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) return;
    setTyped('');
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Tab' && ref.current) {
        const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const firstEl = items[0]!;
        const lastEl = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;
  const blocked = typedWord !== undefined && typed.trim() !== typedWord;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="panel flex w-full max-w-md flex-col gap-4"
      >
        <h2 id={titleId} className="m-0 text-lg font-semibold">
          {title}
        </h2>
        {body && <div className="text-sm text-lavender">{body}</div>}
        {typedWord !== undefined && (
          <input
            aria-label={`พิมพ์ "${typedWord}" เพื่อยืนยัน`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="min-h-[44px] rounded-btn border-2 border-lavender/40 bg-navy px-3 text-cream"
          />
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <PixelButton variant="ghost" onClick={onCancel}>
            {ui.cancel}
          </PixelButton>
          <PixelButton variant={destructive ? 'danger' : 'primary'} disabled={blocked} onClick={onConfirm}>
            {confirmLabel}
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
