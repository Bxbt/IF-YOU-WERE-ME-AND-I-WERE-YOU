import { useEffect, useRef, useState } from 'react';
import { H, W } from './palette';
import { useReducedMotion } from '../lib/motion';

interface PixelCanvasProps {
  /** Draws one frame. `t` is seconds since mount (always 0 when motion is reduced). */
  draw: (ctx: CanvasRenderingContext2D, t: number) => void;
  label: string;
  fps?: number;
  className?: string;
  /** cover = fill the container (cropping), contain = integer-scaled letterbox (docs/06 §1.5) */
  fit?: 'cover' | 'contain';
}

/** 320×180 logical canvas scaled with crisp pixels. Text never goes inside the canvas. */
export function PixelCanvas({ draw, label, fps = 10, className = '', fit = 'contain' }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (fit === 'cover') {
        // Portrait: keep the important middle ~165 logical px visible (both figures on bg_title),
        // anchor to the bottom and let the container's sky colour fill above.
        setScale(height > width ? width / 165 : Math.ceil(Math.max(width / W, height / H)));
      } else {
        const s = Math.min(width / W, height / H || Infinity);
        setScale(s >= 1 ? Math.floor(s) : s);
      }
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, [fit]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    if (reduced) {
      draw(ctx, 0);
      return;
    }
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 1000 / fps) return;
      last = now;
      draw(ctx, (now - start) / 1000);
    };
    draw(ctx, 0);
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw, reduced, fps]);

  return (
    <div
      ref={boxRef}
      className={`flex justify-center overflow-hidden ${fit === 'cover' ? 'items-end bg-[#0e1120]' : 'items-center'} ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        role="img"
        aria-label={label}
        style={{ width: W * scale, height: H * scale, imageRendering: 'pixelated' }}
      />
    </div>
  );
}
