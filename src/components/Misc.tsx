import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pause, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { ui } from '../content/th/ui';
import { FEATURES } from '../lib/features';
import { useGame } from '../store/game';

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center gap-3 text-center">
      <Sparkles aria-hidden className="h-8 w-8 text-lavender" />
      <p className="m-0 font-semibold">{title}</p>
      {body && <p className="m-0 text-sm text-lavender">{body}</p>}
      {action}
    </div>
  );
}

export function PauseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label={ui.labels.pause} onClick={onClick} className="btn btn-ghost min-w-[44px] px-2">
      <Pause aria-hidden className="h-5 w-5" />
    </button>
  );
}

/** Hidden until sound ships (audit M-9) — never render a control that does nothing. */
export function SoundToggle() {
  const enabled = useGame((s) => s.save.settings.sound.enabled);
  if (!FEATURES.sound) return null;
  return (
    <button
      type="button"
      aria-label={enabled ? 'ปิดเสียง' : 'เปิดเสียง'}
      aria-pressed={enabled}
      className="btn btn-ghost min-w-[44px] px-2"
      onClick={() =>
        useGame.getState().update((s) => ({ ...s, settings: { ...s.settings, sound: { ...s.settings.sound, enabled: !enabled } } }))
      }
    >
      {enabled ? <Volume2 aria-hidden className="h-5 w-5" /> : <VolumeX aria-hidden className="h-5 w-5" />}
    </button>
  );
}

export function ScreenHeader({ title, backTo = '/' }: { title: string; backTo?: string }) {
  return (
    <header className="flex flex-col gap-4">
      <div>
        <Link to={backTo} className="btn btn-ghost no-underline">
          <ArrowLeft aria-hidden className="h-5 w-5" />
          {ui.back}
        </Link>
      </div>
      <h1 className="m-0 text-2xl font-semibold">{title}</h1>
    </header>
  );
}
