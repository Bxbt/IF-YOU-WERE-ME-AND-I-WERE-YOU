import { useEffect, useId, useRef } from 'react';
import { ui } from '../content/th/ui';
import { PixelButton } from './PixelButton';
import { useGame } from '../store/game';

export interface PauseMenuProps {
  open: boolean;
  onResume: () => void;
  onSkipScene?: () => void;
  onSkipChapter?: () => void;
  onChapters?: () => void;
  onSettings: () => void;
  onExit: () => void;
}

/** S14 — overlay; actions the current screen cannot perform are omitted rather than disabled. */
export function PauseMenu({ open, onResume, onSkipScene, onSkipChapter, onChapters, onSettings, onExit }: PauseMenuProps) {
  const titleId = useId();
  const resumeRef = useRef<HTMLButtonElement>(null);
  const lastSavedAt = useGame((s) => s.lastSavedAt);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    resumeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onResume();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onResume]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="panel flex w-full max-w-sm flex-col gap-3">
        <h2 id={titleId} className="m-0 text-center text-lg font-semibold">
          {ui.pause.heading}
        </h2>
        <PixelButton ref={resumeRef} block onClick={onResume}>
          {ui.pause.resume}
        </PixelButton>
        {onSkipScene && <PixelButton variant="ghost" block onClick={onSkipScene}>{ui.pause.skipScene}</PixelButton>}
        {onSkipChapter && <PixelButton variant="ghost" block onClick={onSkipChapter}>{ui.pause.skipChapter}</PixelButton>}
        {onChapters && <PixelButton variant="ghost" block onClick={onChapters}>{ui.pause.chapters}</PixelButton>}
        <PixelButton variant="ghost" block onClick={onSettings}>{ui.pause.settings}</PixelButton>
        <PixelButton variant="ghost" block onClick={onExit}>{ui.pause.exit}</PixelButton>
        {(onSkipScene || onSkipChapter) && <p className="m-0 text-center text-[13px] text-lavender">{ui.pause.skipNote}</p>}
        {lastSavedAt && (
          <p className="m-0 text-center text-[13px] text-lavender">
            {ui.pause.saved(new Date(lastSavedAt).toLocaleTimeString('th-TH'))}
          </p>
        )}
      </div>
    </div>
  );
}
