import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, FileText, Home, SkipForward } from 'lucide-react';
import { ui } from '../content/th/ui';
import { useAmbient } from '../audio/useSound';
import type { ChapterContent } from '../content/types';
import { CHAPTER_BY_ID } from '../content/th/chapters';
import { EmptyState } from '../components/Misc';
import { PixelButton } from '../components/PixelButton';
import { SceneCanvas } from '../scene/SceneCanvas';
import { DEFAULT_ENV } from '../scene/env';
import { useGame } from '../store/game';
import { useReducedMotion } from '../lib/motion';

/**
 * S15 — Ending (docs/06 S15, docs/02 ch5_end): tap/Enter for the next line, "ข้าม" top right,
 * then the three post-game buttons. English stays as written with a small Thai translation (A-13).
 */
const ENDING_AMBIENT = { music: 'ending', rain: 'none', hum: false } as const;

export function EndingScreen() {
  useAmbient(ENDING_AMBIENT);
  const { journeyId = '' } = useParams();
  const navigate = useNavigate();
  const journey = useGame((s) => s.save.journeys[journeyId]);
  const [content, setContent] = useState<ChapterContent | null>(null);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const nextRef = useRef<HTMLButtonElement>(null);
  const env = useMemo(() => ({ ...DEFAULT_ENV, bg: 'bg_rooftop_night' }), []);

  useEffect(() => {
    let alive = true;
    CHAPTER_BY_ID.ch5.load?.().then((c) => alive && setContent(c));
    return () => {
      alive = false;
    };
  }, []);

  const lines = content?.ending ?? [];
  const done = content !== null && index >= lines.length;

  useEffect(() => {
    if (!done) nextRef.current?.focus({ preventScroll: true });
  }, [index, done]);

  if (!journey) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <EmptyState
          title={ui.chapters.noJourney}
          action={
            <Link to="/" className="btn btn-primary no-underline">
              {ui.home}
            </Link>
          }
        />
      </main>
    );
  }

  const line = lines[index];
  return (
    <main className="relative flex min-h-[100dvh] flex-col" data-testid="ending">
      <SceneCanvas env={env} label={ui.ending.sceneLabel} className="w-full" maxHeightRatio={0.5} />
      {!done && (
        <button
          type="button"
          onClick={() => setIndex(lines.length)}
          className="btn btn-ghost absolute right-3 top-3 z-10 bg-navy/70 px-3 text-sm"
        >
          <SkipForward aria-hidden className="h-4 w-4" />
          {ui.ending.skip}
        </button>
      )}
      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="sr-only" lang="en">
          IF YOU WERE ME, AND I WERE YOU
        </h1>
        {!done && line && (
          <button
            ref={nextRef}
            type="button"
            aria-label={ui.ending.next}
            onClick={() => setIndex((i) => i + 1)}
            className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 rounded-panel p-4"
          >
            <motion.span
              key={index}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-3"
              aria-live="polite"
            >
              <span
                lang="en"
                className={
                  line.title ? 'font-pixel text-xl text-orange lg:text-2xl' : 'text-xl text-cream lg:text-2xl'
                }
              >
                {line.en}
              </span>
              {line.th && <span className="text-sm text-lavender">{line.th}</span>}
            </motion.span>
          </button>
        )}
        {done && (
          <nav aria-label={ui.ending.home} className="flex w-full max-w-sm flex-col gap-2">
            <p lang="en" className="m-0 mb-2 font-pixel text-lg text-orange">
              IF YOU WERE ME, AND I WERE YOU
            </p>
            <PixelButton
              block
              icon={<BarChart3 aria-hidden className="h-5 w-5" />}
              onClick={() => navigate(`/j/${journey.id}/compare`)}
            >
              {ui.ending.compare}
            </PixelButton>
            <PixelButton
              block
              icon={<FileText aria-hidden className="h-5 w-5" />}
              onClick={() => navigate(`/j/${journey.id}/report/${journey.playerIds[0]}`)}
            >
              {ui.ending.report}
            </PixelButton>
            <PixelButton
              block
              variant="ghost"
              icon={<Home aria-hidden className="h-5 w-5" />}
              onClick={() => navigate('/')}
            >
              {ui.ending.home}
            </PixelButton>
          </nav>
        )}
      </section>
    </main>
  );
}
