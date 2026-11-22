/**
 * bg_building_exterior_rain (docs/09 §2, docs/02 ch1_end) — the whole apartment tower at night in
 * the rain, seen from a distance: a few warm windows (one on the 8th floor), the elevator shaft
 * line faintly lit where the stuck car waits, city silhouettes, full-frame rain.
 */
import { H, W, mulberry32 } from '../palette';
import { blitLayer, cachedLayer, type SceneEnv } from '../env';
import { drawRain } from '../effects';

type Ctx = CanvasRenderingContext2D;
const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

const GROUND = 162;
const TX0 = 122; // tower left
const TX1 = 198; // tower right (exclusive)
const FLOOR_H = 11;
/** Top y of the window row on floor `f` (1 = lobby). */
const rowY = (f: number) => (f === 1 ? GROUND - 10 : GROUND - 12 - (f - 1) * FLOOR_H + 3);
const SHAFT_X = 158;
const CAR_Y = rowY(8) + 7; // the stuck car sits between floors 7 and 8
const HOME = { x: 140, y: rowY(8) }; // the lit 8th-floor window

/** Dithered vertical blend between two colours over rows y0..y1. */
function blend(c: Ctx, y0: number, y1: number, a: string, b: string) {
  rect(c, 0, y0, W, y1 - y0, a);
  const n = y1 - y0;
  for (let y = y0; y < y1; y++) {
    const p = (y - y0) / n;
    for (let x = y & 1; x < W; x += 2) {
      if (p > 0.66 || (p > 0.33 && (x & 2)) || (p > 0.15 && (x & 6) === 0)) rect(c, x, y, 1, 1, b);
    }
  }
}

function skyline(c: Ctx, seed: number, minH: number, maxH: number, col: string, lit: string, litP: number, skip?: [number, number]) {
  const rnd = mulberry32(seed);
  let x = -4;
  while (x < W) {
    const bw = 10 + Math.floor(rnd() * 18);
    const bh = minH + Math.floor(rnd() * (maxH - minH));
    if (!skip || x + bw < skip[0] || x > skip[1]) {
      const top = GROUND - bh;
      rect(c, x, top, bw, bh, col);
      if (rnd() < 0.3) rect(c, x + Math.floor(bw / 2), top - 4, 1, 4, col); // antenna
      for (let wy = top + 3; wy < GROUND - 2; wy += 4) {
        for (let wx = x + 2; wx < x + bw - 2; wx += 3) if (rnd() < litP) rect(c, wx, wy, 1, 2, lit);
      }
    }
    x += bw + Math.floor(rnd() * 3);
  }
}

function paintExterior(c: Ctx) {
  // sky: deep night with a faint city glow at the horizon
  rect(c, 0, 0, W, 50, '#0e1120');
  blend(c, 50, 90, '#0e1120', '#171c2f');
  blend(c, 90, 125, '#171c2f', '#232742');
  blend(c, 125, GROUND, '#232742', '#36345a');
  // heavy low clouds (dithered blobs)
  const rnd = mulberry32(91);
  for (let i = 0; i < 7; i++) {
    const cx = rnd() * W;
    const cy = 6 + rnd() * 40;
    const rx = 30 + rnd() * 50;
    const ry = 5 + rnd() * 8;
    for (let y = Math.floor(cy - ry); y < cy + ry; y++) {
      for (let x = Math.floor(cx - rx) + (y & 1); x < cx + rx; x += 2) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy < 1) rect(c, x, y, 1, 1, dy < -0.5 ? '#24263f' : '#191d33');
      }
    }
  }
  // distant + mid city silhouettes
  skyline(c, 12, 26, 60, '#1b1f38', '#4a4870', 0.08);
  skyline(c, 13, 16, 64, '#10142a', '#a0805a', 0.05, [TX0 - 6, TX1 + 6]);

  // ── the tower ──
  rect(c, TX0, 22, TX1 - TX0, GROUND - 22, '#2a2e50');
  rect(c, TX1 - 12, 22, 12, GROUND - 22, '#1d2140'); // shaded side
  rect(c, TX0, 22, 1, GROUND - 22, '#3e4270'); // rim
  // roof: parapet, water tank, antenna
  rect(c, TX0 - 2, 20, TX1 - TX0 + 4, 3, '#30345a');
  rect(c, TX0 - 2, 20, TX1 - TX0 + 4, 1, '#4a4e7c');
  rect(c, 132, 12, 14, 8, '#1d2140');
  rect(c, 134, 10, 10, 2, '#262a48');
  rect(c, 176, 4, 1, 16, '#30345a');
  rect(c, 154, 14, 10, 6, '#1d2140'); // elevator machine room
  // floor slabs
  for (let f = 2; f <= 12; f++) rect(c, TX0, GROUND - 12 - (f - 1) * FLOOR_H, TX1 - TX0, 1, '#1f2340');
  // elevator shaft line (centre)
  rect(c, SHAFT_X - 2, 22, 5, GROUND - 34, '#2c3052');
  rect(c, SHAFT_X, 22, 1, GROUND - 34, '#363a60');
  // windows
  const wr = mulberry32(2026);
  const cols = [126, 134, 142, 150, 165, 173, 181, 189];
  for (let f = 2; f <= 12; f++) {
    const y = rowY(f);
    for (const x of cols) {
      const p = wr();
      const shade = x >= TX1 - 12;
      let col = shade ? '#151931' : '#181c34';
      if (p < 0.16) col = shade ? '#a8784e' : '#d9a066';
      else if (p < 0.24) col = '#4a5a80';
      else if (p < 0.32) col = '#2e3456';
      rect(c, x, y, 5, 5, col);
      rect(c, x, y + 5, 5, 1, '#1a1e38'); // sill shadow
      if (col === '#d9a066') rect(c, x, y, 5, 1, '#e9b77b');
    }
  }
  // home window, 8th floor
  rect(c, HOME.x, HOME.y, 5, 5, '#ffcf8a');
  rect(c, HOME.x, HOME.y, 5, 1, '#fff4d6');
  rect(c, HOME.x + 2, HOME.y, 1, 5, '#e9b77b');
  // lobby: warm entrance + canopy
  rect(c, TX0, GROUND - 12, TX1 - TX0, 12, '#20243f');
  rect(c, 148, GROUND - 10, 24, 10, '#e9b77b');
  rect(c, 150, GROUND - 9, 9, 9, '#ffcf8a');
  rect(c, 161, GROUND - 9, 9, 9, '#ffcf8a');
  rect(c, 159, GROUND - 10, 2, 10, '#a0805a');
  rect(c, 142, GROUND - 13, 36, 3, '#3a3658');
  for (const x of [128, 136, 182, 190]) rect(c, x, GROUND - 9, 5, 5, '#3a4466');

  // ── wet street ──
  rect(c, 0, GROUND, W, H - GROUND, '#141829');
  for (let y = GROUND; y < H; y += 3) for (let x = (y * 7) % 11; x < W; x += 11) rect(c, x, y, 3, 1, '#1b2036');
  rect(c, 0, GROUND, W, 1, '#2a2c48');
  // reflections of lit things (broken vertical streaks)
  const reflect = (x: number, w: number, col: string, len: number) => {
    for (let y = GROUND + 2; y < Math.min(H, GROUND + 2 + len); y += 2) rect(c, x + ((y >> 1) & 1), y, w, 1, col);
  };
  reflect(149, 22, '#8a6a4a', 16);
  reflect(HOME.x, 4, '#6a5444', 10);
  reflect(SHAFT_X - 1, 3, '#3a3e64', 14);
  // street lamps
  for (const lx of [70, 252]) {
    rect(c, lx, GROUND - 34, 2, 34, '#2e3050');
    rect(c, lx - 4, GROUND - 35, 8, 2, '#2e3050');
    rect(c, lx - 4, GROUND - 33, 4, 1, '#ffcf8a');
    reflect(lx - 4, 4, '#7a6048', 14);
  }
}

/** Warm halos for lamps, lobby and the home window (cached). */
function glowLayer() {
  return cachedLayer('bg_building_exterior_glow', W, H, (g) => {
    const halo = (cx: number, cy: number, rings: { r: number; a: number }[], rgb: string, sy = 1) => {
      for (const ring of rings) {
        g.fillStyle = `rgba(${rgb},${ring.a})`;
        for (let y = Math.floor(cy - ring.r / sy); y < cy + ring.r / sy; y++) {
          for (let x = Math.floor(cx - ring.r) + (y & 1); x < cx + ring.r; x += 2) {
            const dx = x - cx;
            const dy = (y - cy) * sy;
            if (dx * dx + dy * dy < ring.r * ring.r) g.fillRect(x, y, 1, 1);
          }
        }
      }
    };
    halo(HOME.x + 2, HOME.y + 2, [{ r: 5, a: 0.35 }, { r: 10, a: 0.18 }], '255,207,138');
    halo(160, GROUND - 6, [{ r: 14, a: 0.3 }, { r: 30, a: 0.14 }, { r: 50, a: 0.06 }], '233,183,123', 1.4);
    for (const lx of [68, 250]) halo(lx, GROUND - 30, [{ r: 8, a: 0.3 }, { r: 18, a: 0.14 }, { r: 32, a: 0.06 }], '233,183,123', 0.8);
  });
}

export function drawBuildingExteriorRain(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'bg_building_exterior_base', W, H, paintExterior);
  const glow = glowLayer();
  if (glow) c.drawImage(glow, 0, 0);
  // the stuck elevator car: a faint orange glow breathing slowly in the shaft (no flashing)
  const b = 0.55 + 0.25 * Math.sin(t * 2.1);
  c.fillStyle = `rgba(233,183,123,${(0.12 * b).toFixed(3)})`;
  c.fillRect(SHAFT_X - 3, CAR_Y - 14, 7, 34);
  c.fillStyle = `rgba(255,207,138,${(0.5 + 0.4 * b).toFixed(3)})`;
  c.fillRect(SHAFT_X - 1, CAR_Y, 3, 4);
  // roof warning light: slow soft pulse
  const r = 0.5 + 0.5 * Math.sin(t * 1.3);
  rect(c, 176, 3, 1, 1, r > 0.3 ? '#d9a3a7' : '#7a5a6e');

  if (env.rain !== 'none') {
    // far rain layer (darker, behind) + near rain
    drawRain(c, { x: 0, y: 0, w: W, h: H }, 'light', t * 0.8, 51, 'rgba(90,104,150,0.4)');
    drawRain(c, { x: 0, y: 0, w: W, h: H }, env.rain, t, 52, 'rgba(142,172,200,0.45)');
    // splashes on the street
    const n = env.rain === 'heavy' ? 26 : env.rain === 'medium' ? 14 : 6;
    const sr = mulberry32(Math.floor(t * 6) + 7);
    c.fillStyle = 'rgba(164,190,214,0.7)';
    for (let i = 0; i < n; i++) {
      const x = Math.floor(sr() * W);
      const y = GROUND + 2 + Math.floor(sr() * (H - GROUND - 3));
      c.fillRect(x - 1, y, 1, 1);
      c.fillRect(x + 1, y, 1, 1);
      c.fillRect(x, y - 1, 1, 1);
    }
    // mist over the street in heavier rain
    if (env.rain !== 'light') {
      c.fillStyle = `rgba(120,130,170,${env.rain === 'heavy' ? 0.08 : 0.05})`;
      c.fillRect(0, 120, W, H - 120);
    }
  }
}
