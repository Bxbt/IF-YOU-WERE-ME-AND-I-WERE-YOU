import { useEffect, useId, useRef, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { ui } from '../content/th/ui';
import { PixelButton } from './PixelButton';

/**
 * Full screen (docs/06 "เต็มจอ"). Where the browser has the Fullscreen API, toggle it. iPhone Safari
 * has none for pages, so the same button explains "เพิ่มไปยังหน้าจอโฮม" — opening the game from the
 * home-screen icon has no Safari bars (manifest + apple-mobile-web-app-capable). Already opened
 * from the home screen: nothing to show.
 */
type FsDoc = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

const fsDoc = () => document as FsDoc;
const fsSupported = () => !!(fsDoc().fullscreenEnabled || fsDoc().webkitFullscreenEnabled);
const fsActive = () => !!(fsDoc().fullscreenElement || fsDoc().webkitFullscreenElement);
const standalone = () =>
  (typeof window.matchMedia === 'function' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches)) ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIPhone = () => /iPhone|iPod/.test(navigator.userAgent);

async function toggle() {
  try {
    if (fsActive()) await (document.exitFullscreen?.() ?? fsDoc().webkitExitFullscreen?.());
    else {
      const el = document.documentElement as FsEl;
      await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
    }
  } catch {
    /* the browser said no (e.g. not from a tap) — nothing to undo */
  }
}

export function FullscreenToggle({ variant = 'icon' }: { variant?: 'icon' | 'block' }) {
  const [active, setActive] = useState(() => (typeof document !== 'undefined' ? fsActive() : false));
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const on = () => setActive(fsActive());
    document.addEventListener('fullscreenchange', on);
    document.addEventListener('webkitfullscreenchange', on);
    return () => {
      document.removeEventListener('fullscreenchange', on);
      document.removeEventListener('webkitfullscreenchange', on);
    };
  }, []);

  if (typeof document === 'undefined' || standalone()) return null;
  const supported = fsSupported();
  if (!supported && !isIPhone()) return null;

  const t = ui.fullscreen;
  const label = active ? t.exit : t.enter;
  const Icon = active ? Minimize : Maximize;
  const onClick = () => (supported ? void toggle() : setHelp(true));
  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          aria-label={label}
          title={label}
          onClick={onClick}
          className="btn btn-ghost min-w-[44px] bg-navy/60 px-2"
          data-testid="fullscreen"
        >
          <Icon aria-hidden className="h-5 w-5" />
        </button>
      ) : (
        <PixelButton variant="ghost" block icon={<Icon aria-hidden className="h-5 w-5" />} onClick={onClick}>
          {label}
        </PixelButton>
      )}
      {help && <HomeScreenHelp onClose={() => setHelp(false)} />}
    </>
  );
}

function HomeScreenHelp({ onClose }: { onClose: () => void }) {
  const t = ui.fullscreen;
  const titleId = useId();
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="panel flex w-full max-w-sm flex-col gap-3 text-left"
        data-testid="fullscreen-help"
      >
        <h2 id={titleId} className="m-0 text-lg font-semibold">
          {t.iosTitle}
        </h2>
        <p className="m-0">{t.iosBody}</p>
        <ol className="m-0 flex flex-col gap-1 pl-5">
          {t.iosSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="m-0 text-sm text-lavender">{t.iosNote}</p>
        <PixelButton ref={okRef} className="self-end" onClick={onClose}>
          {t.ok}
        </PixelButton>
      </div>
    </div>
  );
}
