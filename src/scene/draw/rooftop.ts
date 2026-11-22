/**
 * bg_rooftop_night (docs/09 §2) — Chapter 5 "Our Safe Place": a small rooftop garden at night.
 * Sky full of stars, the far city still wet from the rain, planters, a bench and warm string lights.
 * Navy + small warm lights (docs/09 §1.1 mood for Ch5). Stars and bulbs twinkle gently.
 */
import { H, W, ditherBands, mulberry32, px } from '../palette';
import { blitLayer, type SceneEnv } from '../env';
import { drawRain } from '../effects';
import { drawStars, makeStars } from './title';

type Ctx = CanvasRenderingContext2D;

const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

function dither(c: Ctx, x: number, y: number, w: number, h: number, col: string, phase = 0) {
  c.fillStyle = col;
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x + ((yy + phase) & 1); xx < x + w; xx += 2) c.fillRect(xx, yy, 1, 1);
  }
}

const PARAPET_Y = 116;
const DECK_Y = 126;

/** Reuse the title star field (approved look), keeping only stars above the skyline. */
const STARS = makeStars().filter((s) => s.y < 84);

function paintSky(c: Ctx) {
  ditherBands(c, [
    { y: 0, c: 0 },
    { y: 36, c: 1 },
    { y: 70, c: 2 },
    { y: 92, c: 3 },
  ]);
  // Faint milky band
  const rnd = mulberry32(55);
  for (let i = 0; i < 160; i++) {
    const u = rnd();
    const x = Math.floor(u * W);
    const y = Math.floor(10 + u * 40 + (rnd() - 0.5) * 18);
    px(c, x, y, rnd() < 0.5 ? 3 : 4);
  }
  // Dim far stars (static)
  for (let i = 0; i < 60; i++) px(c, Math.floor(rnd() * W), Math.floor(rnd() * 80), rnd() < 0.5 ? 4 : 5);
  // Crescent moon with a soft round halo
  for (let y = -14; y <= 14; y++) {
    for (let x = -14; x <= 14; x++) {
      const d = x * x + y * y;
      const inMoon = d <= 36 && (x - 3) * (x - 3) + (y + 2) * (y + 2) > 25;
      if (inMoon) rect(c, 267 + x, 21 + y, 1, 1, d > 25 ? '#d9cfe0' : '#f3ebdd');
      else if (d < 196 && d > 36 && ((x + y) & 1) === 0) rect(c, 267 + x, 21 + y, 1, 1, d < 100 ? 'rgba(243,235,221,0.10)' : 'rgba(243,235,221,0.05)');
    }
  }
}

function paintCity(c: Ctx) {
  // City glow rising behind the skyline (still wet, lights scattered in the haze)
  dither(c, 0, 82, W, 10, 'rgba(164,155,203,0.12)');
  dither(c, 0, 90, W, 8, 'rgba(233,183,123,0.08)', 1);
  const rnd = mulberry32(5005);
  // Far layer
  let x = 0;
  while (x < W) {
    const bw = 8 + Math.floor(rnd() * 14);
    const top = 88 + Math.floor(rnd() * 14);
    rect(c, x, top, bw, PARAPET_Y - top, '#1e2340');
    if (rnd() < 0.2) rect(c, x + Math.floor(bw / 2), top - 6, 1, 6, '#1e2340'); // antenna
    for (let wy = top + 2; wy < PARAPET_Y; wy += 3) {
      for (let wx = x + 1; wx < x + bw - 1; wx += 2) if (rnd() < 0.08) rect(c, wx, wy, 1, 1, '#5a5684');
    }
    x += bw;
  }
  // Near layer
  x = -4;
  while (x < W) {
    const bw = 12 + Math.floor(rnd() * 20);
    const top = 96 + Math.floor(rnd() * 12);
    rect(c, x, top, bw, PARAPET_Y - top, '#171b31');
    rect(c, x, top, bw, 1, '#262a48');
    for (let wy = top + 3; wy < PARAPET_Y - 1; wy += 4) {
      for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
        const r = rnd();
        if (r < 0.16) rect(c, wx, wy, 1, 1, '#e9b77b');
        else if (r < 0.22) rect(c, wx, wy, 1, 1, '#8eacc8');
      }
    }
    x += bw + 2;
  }
  // Water tower silhouette
  rect(c, 70, 84, 14, 10, '#141829');
  rect(c, 69, 83, 16, 2, '#1d2238');
  rect(c, 71, 94, 1, 8, '#141829');
  rect(c, 82, 94, 1, 8, '#141829');
}

function paintPlanter(c: Ctx, x: number, w: number, seed: number) {
  const y = PARAPET_Y + 4;
  const rnd = mulberry32(seed);
  // foliage above the box
  for (let i = 0; i < w * 1.6; i++) {
    const lx = x + 1 + Math.floor(rnd() * (w - 2));
    const lh = 3 + Math.floor(rnd() * 12);
    rect(c, lx, y - lh, 2, lh, rnd() < 0.5 ? '#2e4a46' : '#3c5a54');
    if (rnd() < 0.4) rect(c, lx, y - lh, 1, 1, '#5e8070');
  }
  // small flowers
  for (let i = 0; i < w / 6; i++) {
    const fx = x + 2 + Math.floor(rnd() * (w - 4));
    const fy = y - 4 - Math.floor(rnd() * 8);
    rect(c, fx, fy, 2, 2, rnd() < 0.5 ? '#d9a3a7' : '#a49bcb');
  }
  // wooden box
  rect(c, x, y, w, 12, '#4a3a42');
  rect(c, x, y, w, 1, '#6a5258');
  rect(c, x, y + 5, w, 1, '#3a2c36');
  for (let k = x + 6; k < x + w; k += 10) rect(c, k, y + 1, 1, 11, '#3a2c36');
  dither(c, x, y + 12, w, 2, 'rgba(14,17,32,0.5)');
}

function paintTree(c: Ctx, x: number) {
  // Small potted tree
  rect(c, x, 128, 14, 12, '#5a4a52');
  rect(c, x, 128, 14, 2, '#6e5a60');
  rect(c, x + 6, 96, 2, 32, '#3a2c36');
  const blobs = [[x - 6, 78, 26, 12], [x - 2, 72, 18, 8], [x - 8, 88, 30, 8], [x, 68, 12, 6]] as const;
  for (const [bx, by, bw, bh] of blobs) rect(c, bx, by, bw, bh, '#2e4a46');
  for (const [bx, by, bw] of blobs) dither(c, bx + 2, by, bw - 4, 2, '#3c5a54');
  dither(c, x - 8, 92, 30, 4, '#223836');
}

function paintBench(c: Ctx) {
  const x = 28;
  const y = 134;
  // backrest
  rect(c, x + 2, y - 14, 3, 26, '#2a2c44');
  rect(c, x + 61, y - 14, 3, 26, '#2a2c44');
  rect(c, x, y - 14, 66, 3, '#6a5258');
  rect(c, x, y - 9, 66, 3, '#5a4650');
  rect(c, x, y - 14, 66, 1, '#8a6a6a');
  // seat
  rect(c, x - 2, y, 70, 4, '#6a5258');
  rect(c, x - 2, y, 70, 1, '#8a6a6a');
  rect(c, x - 2, y + 4, 70, 2, '#3a2c36');
  // legs
  rect(c, x + 2, y + 6, 3, 10, '#2a2c44');
  rect(c, x + 61, y + 6, 3, 10, '#2a2c44');
  dither(c, x - 4, y + 16, 74, 3, 'rgba(14,17,32,0.5)');
  // a folded blanket and a small lantern on the bench
  rect(c, x + 44, y - 4, 16, 4, '#d9a3a7');
  rect(c, x + 44, y - 4, 16, 1, '#e9c0bf');
  rect(c, x + 8, y - 6, 6, 6, '#2a2c44');
  rect(c, x + 9, y - 5, 4, 4, '#e9b77b');
  rect(c, x + 10, y - 8, 2, 2, '#2a2c44');
}

function paintDeck(c: Ctx) {
  // Parapet wall
  rect(c, 0, PARAPET_Y, W, DECK_Y - PARAPET_Y, '#2a2c46');
  rect(c, 0, PARAPET_Y, W, 2, '#3a3c5c');
  for (let x = 0; x < W; x += 20) rect(c, x, PARAPET_Y + 2, 1, DECK_Y - PARAPET_Y - 2, '#22243c');
  // Deck: wooden boards in perspective
  rect(c, 0, DECK_Y, W, H - DECK_Y, '#232338');
  const rows = [DECK_Y, 130, 135, 141, 148, 156, 165, H];
  for (let r = 0; r < rows.length - 1; r++) {
    rect(c, 0, rows[r]!, W, 1, '#1a1a2c');
    if (r % 2) dither(c, 0, rows[r]! + 1, W, 1, '#2a2a40');
  }
  for (let col = -10; col <= 10; col++) {
    for (let y = DECK_Y; y < H; y++) {
      const k = (y - 70) / (H - 70);
      if ((col & 1) === 0) rect(c, Math.round(160 + col * 34 * k), y, 1, 1, '#1a1a2c');
    }
  }
  // Rain puddles reflecting the sky
  for (const [px0, py, pw] of [[118, 160, 34], [196, 146, 22], [240, 168, 26]] as const) {
    for (let y = 0; y < 5; y++) {
      const inset = Math.abs(2 - y) * 3;
      rect(c, px0 + inset, py + y, pw - inset * 2, 1, '#2c3252');
    }
    rect(c, px0 + 6, py + 1, 4, 1, '#5a5684');
    rect(c, px0 + pw - 10, py + 3, 2, 1, '#8eacc8');
  }
}

function paintRooftop(c: Ctx) {
  paintSky(c);
  paintCity(c);
  paintDeck(c);
  paintPlanter(c, 4, 56, 81);
  paintPlanter(c, 226, 90, 82);
  paintTree(c, 288);
  paintBench(c);
  // Poles for the string lights
  rect(c, 14, 40, 2, 86, '#2a2c44');
  rect(c, 13, 38, 4, 2, '#3a3c5c');
  rect(c, 304, 34, 2, 92, '#2a2c44');
  rect(c, 303, 32, 4, 2, '#3a3c5c');
  // Vignette
  dither(c, 0, H - 8, W, 8, 'rgba(14,17,32,0.4)');
}

interface Bulb { x: number; y: number; ph: number; warm: boolean }

/** Two sagging strings between the poles; bulbs every 9 px. */
function strings(): { wire: [number, number][]; bulbs: Bulb[] } {
  const wire: [number, number][] = [];
  const bulbs: Bulb[] = [];
  const rnd = mulberry32(4242);
  const lines = [
    { x0: 15, y0: 40, x1: 305, y1: 34, sag: 22 },
    { x0: 15, y0: 52, x1: 305, y1: 46, sag: 12 },
  ];
  for (const l of lines) {
    for (let x = l.x0; x <= l.x1; x++) {
      const u = (x - l.x0) / (l.x1 - l.x0);
      const y = Math.round(l.y0 + (l.y1 - l.y0) * u + Math.sin(u * Math.PI) * l.sag);
      wire.push([x, y]);
      if ((x - l.x0) % 9 === 5) bulbs.push({ x, y: y + 1, ph: rnd() * Math.PI * 2, warm: rnd() < 0.75 });
    }
  }
  return { wire, bulbs };
}
const STRING = strings();

export function drawRooftopNight(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'rooftop_night_base', W, H, paintRooftop);
  drawStars(c, STARS, t);

  // Wires (cached) + bulbs with a soft, slow shimmer (brightness only, never on/off)
  blitLayer(c, 'rooftop_night_wires', W, H, (g) => {
    g.fillStyle = '#141829';
    for (const [x, y] of STRING.wire) g.fillRect(x, y, 1, 1);
    for (const b of STRING.bulbs) {
      g.fillStyle = b.warm ? 'rgba(233,183,123,0.22)' : 'rgba(217,163,167,0.22)';
      g.fillRect(b.x - 1, b.y - 1, 3, 4);
      g.fillRect(b.x - 2, b.y, 1, 2);
      g.fillRect(b.x + 2, b.y, 1, 2);
    }
  });
  for (const b of STRING.bulbs) {
    const s = Math.sin(t * 1.1 + b.ph);
    const core = b.warm ? (s > 0.2 ? '#fff4d6' : '#e9b77b') : s > 0.2 ? '#f3ebdd' : '#d9a3a7';
    rect(c, b.x, b.y, 1, 2, core);
    if (s > 0.5) rect(c, b.x, b.y + 2, 1, 1, b.warm ? '#e9b77b' : '#d9a3a7');
  }

  // Bench lantern breathes very slowly
  const lp = 0.5 + 0.5 * Math.sin(t * 0.9);
  rect(c, 38, 129, 2, 2, lp > 0.5 ? '#fff4d6' : '#ffcf8a');

  // The city below is still wet; if the scene asks for rain, keep it faint and far.
  drawRain(c, { x: 0, y: 0, w: W, h: H }, env.rain, t, 5, 'rgba(142,172,200,0.4)');
}
