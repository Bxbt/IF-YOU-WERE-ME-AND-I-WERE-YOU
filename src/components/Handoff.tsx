import { useEffect, useId, useRef } from 'react';
import { HandHelping, Smartphone } from 'lucide-react';
import { ui } from '../content/th/ui';
import { PixelButton } from './PixelButton';

/**
 * S12 — Handoff (docs/06 S12, docs/05 §4.2): covers the whole screen and shows nothing of the
 * previous player's content. `kind: 'to'` hands the device to someone; `'return'` gives it back.
 */
export function Handoff({
  kind,
  name,
  privateNote,
  onReady,
  onCancel,
}: {
  kind: 'to' | 'return';
  name: string;
  /** Shown when the next part is private (answers only that person sees). */
  privateNote?: boolean;
  onReady: () => void;
  onCancel?: () => void;
}) {
  const titleId = useId();
  const ready = useRef<HTMLButtonElement>(null);
  useEffect(() => ready.current?.focus(), [name, kind]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-navy p-6 text-center"
      data-testid="handoff"
    >
      <div aria-hidden className="flex items-end gap-2 text-lavender">
        <HandHelping className="h-12 w-12" />
        <Smartphone className="h-10 w-10 text-orange" />
      </div>
      <h2 id={titleId} className="m-0 text-2xl font-semibold">
        {kind === 'to' ? ui.handoff.to(name) : ui.handoff.back(name)}
      </h2>
      {privateNote && <p className="m-0 max-w-sm text-lavender">{ui.handoff.privateNote(name)}</p>}
      <PixelButton ref={ready} onClick={onReady} className="min-w-[16rem]">
        {kind === 'to' ? ui.handoff.ready(name) : ui.handoff.readyBack}
      </PixelButton>
      {onCancel && (
        <button type="button" onClick={onCancel} className="min-h-[44px] text-sm text-lavender underline">
          {ui.handoff.cancel}
        </button>
      )}
    </div>
  );
}
