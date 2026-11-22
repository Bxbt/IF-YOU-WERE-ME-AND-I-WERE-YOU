import { useEffect, useId, useRef } from 'react';
import { HeartHandshake, Phone, X } from 'lucide-react';
import { SUPPORT_CARD, SUPPORT_RESOURCES } from '../content/th/safety';
import { useSupportCard } from '../lib/supportCard';

/** Gentle, closable support card (docs/08 §9.3–9.4). Non-blocking: the answer is already saved. */
export function SupportCard() {
  const open = useSupportCard((s) => s.open);
  const close = useSupportCard((s) => s.close);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, close]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="panel flex w-full max-w-md flex-col gap-3 border-pink/60"
      >
        <div className="flex items-start gap-2">
          <HeartHandshake aria-hidden className="mt-1 h-5 w-5 shrink-0 text-pink" />
          <h2 id={titleId} className="m-0 flex-1 text-base font-semibold">
            {SUPPORT_CARD.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={SUPPORT_CARD.close}
            onClick={close}
            className="btn btn-ghost -mr-2 -mt-2 min-w-[44px] px-2"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <p className="m-0 text-sm text-lavender">{SUPPORT_CARD.body}</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {SUPPORT_RESOURCES.map((r) => (
            <li key={r.tel}>
              <a href={`tel:${r.tel}`} className="btn btn-ghost w-full justify-start text-left no-underline">
                <Phone aria-hidden className="h-4 w-4 shrink-0" />
                <span className="flex flex-col">
                  <span>
                    {r.name} · <span className="font-semibold">{r.tel}</span>
                  </span>
                  <span className="text-[13px] text-lavender">{r.when}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="m-0 text-[13px] text-lavender">{SUPPORT_CARD.verify}</p>
      </div>
    </div>
  );
}
