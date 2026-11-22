import { useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Info, Play, Settings as SettingsIcon, Sparkles, UserPlus } from 'lucide-react';
import { ui } from '../content/th/ui';
import { PixelButton } from '../components/PixelButton';
import { SoundToggle } from '../components/Misc';
import { PixelCanvas } from '../scene/PixelCanvas';
import { drawStars, drawTitleBase, drawTitleForeground, makeStars } from '../scene/draw/title';
import { useGame } from '../store/game';
import { FEATURES } from '../lib/features';
import { APP_VERSION } from '../persistence/exportImport';

/** S1 — docs/06 §3 S1. Buttons whose screens are not built yet are disabled with the reason shown. */
export function TitleScreen() {
  const navigate = useNavigate();
  const hasActive = useGame((s) => Object.values(s.save.journeys).some((j) => j.status === 'active'));
  const hasPlayers = useGame((s) => Object.values(s.save.players).some((p) => p.kind === 'real'));
  const stars = useMemo(makeStars, []);
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      drawTitleBase(ctx);
      drawStars(ctx, stars, t);
      drawTitleForeground(ctx, t);
    },
    [stars],
  );

  const continueReason = !hasActive ? ui.title.continueNoSave : !FEATURES.chapters ? ui.title.continueNotReady : null;
  const createReason = FEATURES.characterCreation ? null : ui.title.createSelfNotReady;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <PixelCanvas draw={draw} label={ui.title.sceneLabel} fit="cover" className="absolute inset-0 h-full w-full" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-navy/30 via-transparent to-navy/80" />

      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <SoundToggle />
        <Link to="/settings" aria-label={ui.title.settings} className="btn btn-ghost min-w-[44px] bg-navy/60 px-2 no-underline">
          <SettingsIcon aria-hidden className="h-5 w-5" />
        </Link>
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-between gap-8 px-4 py-12 text-center">
        <header className="mt-[6vh]">
          <h1 lang="en" className="m-0 font-pixel text-[28px] leading-tight text-cream drop-shadow lg:text-[48px]">
            <span className="block">{ui.title1}</span>
            <span className="block">{ui.title2}</span>
          </h1>
          <p lang="en" className="mt-3 text-lavender">{ui.tagline}</p>
        </header>

        <nav aria-label="เมนูหลัก" className="flex w-full max-w-[360px] flex-col gap-3 lg:max-w-[320px]">
          <PixelButton block icon={<Sparkles aria-hidden className="h-5 w-5" />} onClick={() => navigate('/intro')}>
            {ui.title.start}
          </PixelButton>
          <DisabledAware reason={continueReason} id="continue-reason">
            <PixelButton variant="ghost" block className="bg-navy/60" icon={<Play aria-hidden className="h-5 w-5" />} disabled={!!continueReason} aria-describedby={continueReason ? 'continue-reason' : undefined}>
              {ui.title.continue}
            </PixelButton>
          </DisabledAware>
          <DisabledAware reason={createReason} id="create-reason">
            <PixelButton
              variant="ghost"
              block
              className="bg-navy/60"
              icon={<UserPlus aria-hidden className="h-5 w-5" />}
              disabled={!!createReason}
              aria-describedby={createReason ? 'create-reason' : undefined}
              onClick={() => navigate(hasPlayers ? '/profile' : '/players/new')}
            >
              {hasPlayers ? ui.title.profile : ui.title.createSelf}
            </PixelButton>
          </DisabledAware>
          <PixelButton variant="ghost" block className="bg-navy/60" icon={<Info aria-hidden className="h-5 w-5" />} onClick={() => navigate('/about')}>
            {ui.title.about}
          </PixelButton>
        </nav>

        <div aria-hidden className="h-[22vh] lg:h-[12vh]" />
      </main>
      <p className="absolute left-3 top-4 z-10 m-0 text-[13px] text-lavender">{ui.version(APP_VERSION)}</p>
    </div>
  );
}

function DisabledAware({ reason, id, children }: { reason: string | null; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {children}
      {reason && (
        <p id={id} className="m-0 text-[13px] text-lavender">
          {reason}
        </p>
      )}
    </div>
  );
}
