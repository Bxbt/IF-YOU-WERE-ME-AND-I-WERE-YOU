import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../lib/motion';

interface Props {
  width: number;
  height: number;
  scale: number;
  draw: (ctx: CanvasRenderingContext2D, t: number) => void;
  label: string;
  fps?: number;
  static?: boolean;
}

/** Small fixed-size pixel canvas (sprites, portraits). Draws once when motion is reduced or static. */
export function PixelCanvasCustom({ width, height, scale, draw, label, fps = 6, static: isStatic = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    draw(ctx, 0);
    if (reduced || isStatic) return;
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 1000 / fps) return;
      last = now;
      draw(ctx, (now - start) / 1000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw, reduced, isStatic, fps]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      style={{ width: width * scale, height: height * scale, imageRendering: 'pixelated' }}
    />
  );
}
