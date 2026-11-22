/**
 * Master palette (docs/09 §1.1): the 7 brand colours plus extensions in the same mood.
 * Scenes draw with palette indices so palette swaps stay possible.
 */
export const PALETTE = [
  '#0e1120', // 0 deep night
  '#171c2f', // 1 midnight navy (brand)
  '#202440', // 2
  '#292b45', // 3 deep indigo (brand)
  '#3a3a5e', // 4
  '#5a5684', // 5
  '#a49bcb', // 6 muted lavender (brand)
  '#f3ebdd', // 7 warm cream (brand)
  '#d9a3a7', // 8 dusty pink (brand)
  '#e9b77b', // 9 soft orange (brand)
  '#8eacc8', // 10 muted blue (brand)
  '#fff4d6', // 11 lantern core
  '#141829', // 12 ground dark
  '#1d2238', // 13 ground mid
] as const;

export const W = 320;
export const H = 180;

/** Deterministic PRNG so the same scene always renders the same pixels. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function px(ctx: CanvasRenderingContext2D, x: number, y: number, c: number, w = 1, h = 1) {
  ctx.fillStyle = PALETTE[c]!;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Vertical band gradient with a 2×2 ordered dither at each boundary. */
export function ditherBands(
  ctx: CanvasRenderingContext2D,
  stops: { y: number; c: number }[],
  x0 = 0,
  x1 = W,
) {
  for (let i = 0; i < stops.length; i++) {
    const cur = stops[i]!;
    const next = stops[i + 1];
    const yEnd = next ? next.y : H;
    px(ctx, x0, cur.y, cur.c, x1 - x0, yEnd - cur.y);
    if (next) {
      for (let y = next.y - 4; y < next.y; y++) {
        for (let x = x0 + (y & 1 ? 0 : 1); x < x1; x += 2) {
          if (y + 4 - next.y >= 2 || x & 2) px(ctx, x, y, next.c);
        }
      }
    }
  }
}
