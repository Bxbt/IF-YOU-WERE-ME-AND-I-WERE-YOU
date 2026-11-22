/**
 * Shared scene effects (docs/09 §2, docs/12 M4): rain, haze, flicker. All drawn with primitives on
 * the 320×180 canvas. Pass t = 0 for a still frame (reduced motion) — effects stay visible but frozen.
 */
import type { RainLevel } from './env';
import { mulberry32 } from './palette';

type Ctx = CanvasRenderingContext2D;
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const RAIN_DENSITY: Record<RainLevel, number> = { none: 0, light: 0.004, medium: 0.009, heavy: 0.016 };

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
}
const dropCache = new Map<string, Drop[]>();

function drops(area: Rect, level: RainLevel, seed: number): Drop[] {
  const key = `${area.x},${area.y},${area.w},${area.h},${level},${seed}`;
  let list = dropCache.get(key);
  if (!list) {
    const rnd = mulberry32(seed);
    const n = Math.round(area.w * area.h * RAIN_DENSITY[level]);
    list = Array.from({ length: n }, () => ({
      x: rnd() * area.w,
      y: rnd() * area.h,
      len: level === 'heavy' ? 4 + Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 3),
      speed: 90 + rnd() * 60,
    }));
    dropCache.set(key, list);
  }
  return list;
}

/**
 * Rain clipped to `area` (a window, or the whole canvas outdoors). Streaks lean slightly left.
 * `color` defaults to muted blue; pass a darker tone for rain seen through glass at night.
 */
export function drawRain(
  c: Ctx,
  area: Rect,
  level: RainLevel,
  t: number,
  seed = 1,
  color = 'rgba(142,172,200,0.75)',
) {
  if (level === 'none') return;
  c.save();
  c.beginPath();
  c.rect(area.x, area.y, area.w, area.h);
  c.clip();
  c.fillStyle = color;
  for (const d of drops(area, level, seed)) {
    const y = ((d.y + t * d.speed) % (area.h + d.len)) - d.len;
    const x = (d.x - t * d.speed * 0.15) % area.w;
    const ax = area.x + (x < 0 ? x + area.w : x);
    for (let i = 0; i < d.len; i++) c.fillRect(Math.round(ax - i * 0.25), Math.round(area.y + y + i), 1, 1);
  }
  c.restore();
}

/** Warm air (haze 1–2) over the whole canvas. */
export function drawHaze(c: Ctx, level: 0 | 1 | 2, w = 320, h = 180) {
  if (!level) return;
  c.fillStyle = `rgba(120,70,40,${0.06 * level})`;
  c.fillRect(0, 0, w, h);
}

/**
 * Light flicker at ≤ 2 changes per second (AX-7: never more than 3 flashes/s). Deterministic in t.
 * Returns true when the light is on. With t = 0 (reduced motion) the light is always on.
 */
export function flickerOn(t: number, seed = 0): boolean {
  if (t === 0) return true;
  const slot = Math.floor(t * 2); // two slots per second → at most 2 changes/s
  const r = mulberry32(slot * 7919 + seed)();
  return r > 0.18;
}

/** Darkens the frame — used for light: 'off' and dim cutaways. */
export function drawDim(c: Ctx, alpha: number, w = 320, h = 180) {
  c.fillStyle = `rgba(14,17,32,${alpha})`;
  c.fillRect(0, 0, w, h);
}
