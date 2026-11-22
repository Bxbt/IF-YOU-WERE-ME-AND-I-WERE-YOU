/** bg_title (docs/09 §2): two figures apart under stars, a glowing path between them. */
import { H, W, ditherBands, mulberry32, px } from '../palette';

export interface Star {
  x: number;
  y: number;
  c: number;
  phase: number;
  big: boolean;
}

export function makeStars(): Star[] {
  const rnd = mulberry32(20261122);
  const stars: Star[] = [];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: Math.floor(rnd() * W),
      y: Math.floor(rnd() * 110),
      c: rnd() < 0.15 ? 9 : rnd() < 0.5 ? 6 : 7,
      phase: rnd() * Math.PI * 2,
      big: rnd() < 0.08,
    });
  }
  return stars;
}

export function drawTitleBase(ctx: CanvasRenderingContext2D) {
  ditherBands(ctx, [
    { y: 0, c: 0 },
    { y: 40, c: 1 },
    { y: 85, c: 2 },
    { y: 115, c: 3 },
  ]);
  // Distant hills
  const rnd = mulberry32(7);
  let h = 128;
  for (let x = 0; x < W; x++) {
    h += Math.round((rnd() - 0.5) * 2);
    h = Math.max(120, Math.min(134, h));
    px(ctx, x, h, 13, 1, H - h);
  }
  // Near ground
  px(ctx, 0, 146, 12, W, H - 146);
  for (let x = 0; x < W; x += 2) px(ctx, x, 145, 12);
}

/** Path + figures + lanterns; `t` in seconds drives a gentle pulse (pass 0 for a static frame). */
export function drawTitleForeground(ctx: CanvasRenderingContext2D, t: number) {
  const left = 96;
  const right = 222;
  const glow = 0.5 + 0.5 * Math.sin(t * 1.6);
  // Glowing path: a shallow arc between the two figures
  for (let x = left + 6; x <= right - 2; x++) {
    const u = (x - left) / (right - left);
    const y = Math.round(150 + Math.sin(u * Math.PI) * 4);
    px(ctx, x, y, glow > 0.5 ? 9 : 8);
    if ((x + Math.floor(t * 8)) % 6 === 0) px(ctx, x, y - 1, 11);
    if (x % 2 === 0) px(ctx, x, y + 1, 5);
  }
  // Lanterns
  for (const lx of [124, 159, 194]) {
    px(ctx, lx, 138, 4, 1, 10);
    px(ctx, lx - 1, 135, glow > 0.3 ? 11 : 9, 3, 3);
  }
  figure(ctx, left, 132, 8);
  figure(ctx, right, 132, 10);
}

/** 7×16 silhouette with a coloured scarf so the two figures read apart (no gender cues). */
function figure(ctx: CanvasRenderingContext2D, x: number, y: number, accent: number) {
  px(ctx, x + 2, y, 3, 3, 3); // head
  px(ctx, x + 1, y + 3, 5, 1, 1);
  px(ctx, x + 1, y + 4, 3, 5, 6); // body
  px(ctx, x + 1, y + 4, accent, 5, 1); // scarf
  px(ctx, x + 2, y + 10, 3, 1, 4); // legs
  px(ctx, x + 4, y + 10, 3, 1, 4);
  px(ctx, x + 2, y, 6, 1, 1); // rim light
}

export function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], t: number) {
  for (const s of stars) {
    const on = Math.sin(t * 1.3 + s.phase) > -0.6;
    if (!on) continue;
    px(ctx, s.x, s.y, s.c);
    if (s.big && Math.sin(t * 0.9 + s.phase) > 0.3) {
      px(ctx, s.x - 1, s.y, 5);
      px(ctx, s.x + 1, s.y, 5);
      px(ctx, s.x, s.y - 1, 5);
      px(ctx, s.x, s.y + 1, 5);
    }
  }
}
