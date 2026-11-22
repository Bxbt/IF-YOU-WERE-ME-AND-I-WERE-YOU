import { useCallback, useEffect, useState } from 'react';
import { PixelCanvas } from './PixelCanvas';
import { BACKGROUNDS } from './backgrounds';
import type { SceneEnv } from './env';
import { useReducedMotion } from '../lib/motion';

/** Draws one background; a missing or failing background falls back to its palette colour (docs/06 S6). */
export function drawBackground(c: CanvasRenderingContext2D, key: string, t: number, env: SceneEnv) {
  const def = BACKGROUNDS[key];
  try {
    if (!def) throw new Error(`unknown background ${key}`);
    def.draw(c, t, env);
  } catch (e) {
    c.fillStyle = def?.fallback ?? '#171c2f';
    c.fillRect(0, 0, 320, 180);
    if (import.meta.env.DEV) console.error(e);
  }
}

function OneScene({
  bgKey,
  env,
  label,
  className = '',
  maxHeightRatio,
}: {
  bgKey: string;
  env: SceneEnv;
  label: string;
  className?: string;
  maxHeightRatio?: number;
}) {
  const draw = useCallback(
    (c: CanvasRenderingContext2D, t: number) => drawBackground(c, bgKey, t, env),
    [bgKey, env],
  );
  return <PixelCanvas draw={draw} label={label} className={className} maxHeightRatio={maxHeightRatio} />;
}

interface SceneCanvasProps {
  env: SceneEnv;
  /** Scene description for screen readers (AX-4). */
  label: string;
  /** Increment to play a one-off small shake (ENV shake); ignored with reduced motion. */
  shakeKey?: number;
  className?: string;
  /** Fraction of the viewport height the scene may use (split scenes share it when stacked). */
  maxHeightRatio?: number;
}

/**
 * S6 scene layer (docs/06 §1.5, S6): 320×180 logical canvas, integer-scaled.
 * Split screen: side by side on lg, stacked on sm.
 */
export function SceneCanvas({ env, label, shakeKey = 0, className = '', maxHeightRatio }: SceneCanvasProps) {
  const reduced = useReducedMotion();
  // Split scenes stack on small screens (docs/06 S6), so each half gets half the height budget.
  const stacked = typeof window !== 'undefined' && window.innerWidth < 1024;
  const splitRatio = maxHeightRatio && (stacked ? maxHeightRatio / 2 : maxHeightRatio);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (!shakeKey || reduced) return;
    setShaking(true);
    const id = setTimeout(() => setShaking(false), 450);
    return () => clearTimeout(id);
  }, [shakeKey, reduced]);

  return (
    <div
      className={`bg-[#0e1120] ${shaking ? 'animate-scene-shake' : ''} ${className}`}
      data-testid="scene"
      data-bg={env.split ? env.split.join('|') : env.bg}
    >
      {env.split ? (
        <div role="img" aria-label={label} className="grid grid-cols-1 gap-1 lg:grid-cols-2">
          <div aria-hidden>
            <OneScene bgKey={env.split[0]} env={env} label="" maxHeightRatio={splitRatio} />
          </div>
          <div aria-hidden>
            <OneScene bgKey={env.split[1]} env={env} label="" maxHeightRatio={splitRatio} />
          </div>
        </div>
      ) : (
        <OneScene bgKey={env.bg} env={env} label={label} maxHeightRatio={maxHeightRatio} />
      )}
    </div>
  );
}
