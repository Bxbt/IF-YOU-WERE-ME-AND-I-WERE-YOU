/**
 * bg_corridor (docs/09 §2, docs/02 ch1_s02) — 8th-floor corridor in one-point perspective:
 * neon ceiling tubes (middle one flickers when light = 'flicker', via flickerOn ≤ 2 Hz),
 * apartment doors on the left, two elevators on the right (the left/far one closed for repair:
 * blank sign plate + cone, no text), a window with rain at the end.
 */
import { H, W } from '../palette';
import { blitLayer, cachedLayer, type SceneEnv } from '../env';
import { drawDim, drawRain, flickerOn, type Rect } from '../effects';

type Ctx = CanvasRenderingContext2D;
const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

// Perspective: vanishing point (160, 76); back wall at depth z = 1 / 0.35.
const VX = 160;
const VY = 76;
const Z_BACK = 1 / 0.35;
const sideX = (z: number, side: -1 | 1) => VX + (side * 160) / z;
const ceilY = (z: number) => VY - VY / z;
const floorY = (z: number) => VY + (H - VY) / z;
const BACK = {
  x0: Math.round(sideX(Z_BACK, -1)),
  x1: Math.round(sideX(Z_BACK, 1)),
  y0: Math.round(ceilY(Z_BACK)),
  y1: Math.round(floorY(Z_BACK)),
};
const WINDOW: Rect = { x: 145, y: 60, w: 30, h: 30 };

const WALL = '#3a3c5c';
const WALL_D = '#2c2e48';
const WALL_DD = '#222339';
const CEIL = '#202238';
const STEEL = '#5a5c7a';
const STEEL_L = '#7c7ea0';
const STEEL_D = '#44465f';

/** Depth of a side-wall column. */
const colZ = (x: number) => 160 / Math.abs(x - VX);

/** Fills a vertical feature on a side wall between columns xa..xb, between two fractions of the wall height (measured up from the floor). */
function wallFeature(
  xa: number,
  xb: number,
  topFrac: number,
  botFrac: number,
  paint: (x: number, top: number, bot: number, u: number) => void,
) {
  const lo = Math.min(xa, xb);
  const hi = Math.max(xa, xb);
  for (let x = lo; x < hi; x++) {
    const z = colZ(x + 0.5);
    const t = ceilY(z);
    const b = floorY(z);
    const h = b - t;
    paint(x, Math.round(b - topFrac * h), Math.round(b - botFrac * h), (x - lo) / Math.max(1, hi - lo - 1));
  }
}

function paintCorridor(c: Ctx) {
  rect(c, 0, 0, W, H, WALL_D);
  // ceiling + floor (row by row)
  for (let y = 0; y < H; y++) {
    if (y < BACK.y0) {
      const z = VY / (VY - y);
      const hw = 160 / z;
      rect(c, Math.round(VX - hw), y, Math.round(hw * 2), 1, y & 1 && y > 30 ? '#1c1e33' : CEIL);
    } else if (y >= BACK.y1) {
      const z = (H - VY) / (y - VY);
      const hw = 160 / z;
      const x0 = Math.round(VX - hw);
      const x1 = Math.round(VX + hw);
      for (let x = x0; x < x1; x++) {
        const wx = ((x - VX) * z) / 160;
        const ti = Math.floor(wx * 3 + 10) + Math.floor(z * 3);
        const far = z > 2 ? 1 : 0;
        const grout =
          Math.abs(wx * 3 - Math.round(wx * 3)) < 0.012 * z ||
          Math.abs(z * 3 - Math.round(z * 3)) < 0.03 * z * z;
        const col = grout ? '#26283c' : ti & 1 ? (far ? '#2f2e46' : '#3a3852') : far ? '#29283e' : '#322f48';
        rect(c, x, y, 1, 1, col);
      }
    }
  }
  // side walls (column by column) with wainscot + rail
  for (let x = 0; x < W; x++) {
    if (x >= BACK.x0 && x < BACK.x1) continue;
    const z = colZ(x + 0.5);
    const top = Math.round(ceilY(z));
    const bot = Math.round(floorY(z));
    const h = bot - top;
    const near = z < 1.6;
    rect(c, x, top, 1, h, near ? WALL : '#34365a');
    const rail = Math.round(bot - h * 0.36);
    rect(c, x, rail, 1, bot - rail, WALL_D);
    rect(c, x, rail, 1, 1, '#4a4c6e');
    rect(c, x, bot - Math.max(1, Math.round(h * 0.04)), 1, Math.max(1, Math.round(h * 0.04)), WALL_DD);
    rect(c, x, top, 1, 1, '#181a2a');
  }
  // back wall + window
  rect(c, BACK.x0, BACK.y0, BACK.x1 - BACK.x0, BACK.y1 - BACK.y0, '#30324f');
  rect(c, BACK.x0, BACK.y1 - 3, BACK.x1 - BACK.x0, 3, WALL_DD);
  rect(c, BACK.x0, BACK.y0, BACK.x1 - BACK.x0, 1, '#181a2a');
  rect(c, WINDOW.x - 3, WINDOW.y - 3, WINDOW.w + 6, WINDOW.h + 6, STEEL_D);
  rect(c, WINDOW.x - 2, WINDOW.y - 2, WINDOW.w + 4, WINDOW.h + 4, STEEL);
  rect(c, WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h, '#1a2140');
  for (let y = WINDOW.y + 14; y < WINDOW.y + WINDOW.h; y++)
    for (let x = WINDOW.x + (y & 1); x < WINDOW.x + WINDOW.w; x += 2) rect(c, x, y, 1, 1, '#26305a');
  // distant towers through the window
  rect(c, WINDOW.x + 2, WINDOW.y + 16, 7, 14, '#141a30');
  rect(c, WINDOW.x + 12, WINDOW.y + 11, 6, 19, '#181f38');
  rect(c, WINDOW.x + 21, WINDOW.y + 19, 8, 11, '#141a30');
  for (const [wx, wy] of [
    [4, 19],
    [14, 14],
    [16, 20],
    [23, 22],
    [6, 25],
  ] as const)
    rect(c, WINDOW.x + wx, WINDOW.y + wy, 1, 1, '#e9b77b');
  rect(c, VX - 1, WINDOW.y, 2, WINDOW.h, STEEL_D); // mullion
  rect(c, WINDOW.x - 4, WINDOW.y + WINDOW.h + 3, WINDOW.w + 8, 2, STEEL);
  // potted plant in the far corner
  rect(c, 110, 100, 8, 9, '#6a4a4a');
  rect(c, 108, 90, 4, 10, '#5f7f6a');
  rect(c, 112, 86, 4, 14, '#6d9178');
  rect(c, 116, 92, 3, 8, '#5f7f6a');

  // apartment doors on the left wall (warm wood, blank number plates)
  for (const [za, zb] of [
    [2.5, 2.05],
    [1.55, 1.2],
  ] as const) {
    const xa = Math.round(sideX(za, -1));
    const xb = Math.round(sideX(zb, -1));
    wallFeature(xb, xa, 0.68, 0.04, (x, top, bot, u) => {
      const edge = u < 0.08 || u > 0.92;
      rect(c, x, top, 1, bot - top, edge ? '#2a2236' : '#5a4458');
      rect(c, x, top, 1, 1, '#2a2236');
      if (!edge && Math.abs(u - 0.5) < 0.18)
        rect(
          c,
          x,
          Math.round(top + (bot - top) * 0.18),
          1,
          Math.max(1, Math.round((bot - top) * 0.06)),
          '#cfc0ad',
        );
      if (u > 0.78 && u < 0.86)
        rect(
          c,
          x,
          Math.round(top + (bot - top) * 0.55),
          1,
          Math.max(1, Math.round((bot - top) * 0.04)),
          '#e9b77b',
        );
    });
    // doormat
    const mz = (za + zb) / 2;
    const my = Math.round(floorY(mz));
    const mx = Math.round(sideX(mz, -1));
    const mw = Math.round(28 / mz);
    rect(c, mx + 2, my - 1, mw, Math.max(2, Math.round(5 / mz)), '#7a5a6e');
  }

  // elevators on the right wall: far (left as you face them) = closed for repair, near = in service
  const elevators = [
    [2.35, 1.9],
    [1.62, 1.3],
  ] as const;
  for (const [za, zb] of elevators) {
    const xa = Math.round(sideX(za, 1));
    const xb = Math.round(sideX(zb, 1));
    wallFeature(xa, xb, 0.74, 0.04, (x, top, bot, u) => {
      const frame = u < 0.1 || u > 0.9;
      rect(c, x, top, 1, bot - top, frame ? STEEL_D : u < 0.5 ? STEEL : '#525472');
      if (!frame) rect(c, x, top + 1, 1, 1, STEEL_L);
      if (Math.abs(u - 0.5) < 0.04) rect(c, x, top, 1, bot - top, '#2a2c44'); // seam
      rect(
        c,
        x,
        top - Math.max(2, Math.round((bot - top) * 0.1)),
        1,
        Math.max(2, Math.round((bot - top) * 0.07)),
        u > 0.3 && u < 0.7 ? '#101220' : WALL_D,
      ); // indicator
    });
  }
  // call buttons between the elevators
  {
    const z = 1.76;
    const x = Math.round(sideX(z, 1));
    const fy = floorY(z);
    const h = fy - ceilY(z);
    rect(c, x, Math.round(fy - h * 0.46), 3, 7, STEEL_D);
    rect(c, x + 1, Math.round(fy - h * 0.46) + 1, 1, 2, '#e9b77b');
    rect(c, x + 1, Math.round(fy - h * 0.46) + 4, 1, 2, STEEL_L);
  }
  // blank maintenance sign plate on the far elevator + safety cone
  {
    const z = 2.12;
    const x = Math.round(sideX(z, 1));
    const fy = floorY(z);
    const h = fy - ceilY(z);
    const sy = Math.round(fy - h * 0.5);
    rect(c, x - 3, sy, 8, 9, '#3a3220');
    rect(c, x - 2, sy + 1, 6, 7, '#f3ebdd');
    rect(c, x - 2, sy + 1, 6, 1, '#e9b77b');
    rect(c, x - 2, sy + 7, 6, 1, '#e9b77b');
    // cone on the floor in front of it
    const cx = x - 14;
    const cy = Math.round(fy) + 6;
    for (let i = 0; i < 9; i++) {
      const w = 1 + Math.floor(i / 2) * 2;
      rect(c, cx - Math.floor(w / 2), cy - 9 + i, w, 1, i === 4 || i === 5 ? '#f3ebdd' : '#d9824a');
    }
    rect(c, cx - 5, cy, 11, 2, '#a85c38');
  }
  // fire hose cabinet near the front right (muted, no text)
  wallFeature(Math.round(sideX(1.18, 1)), Math.round(sideX(1.08, 1)), 0.56, 0.36, (x, top, bot, u) => {
    rect(c, x, top, 1, bot - top, u < 0.1 || u > 0.9 ? '#5a2e34' : '#8a4a4e');
    if (Math.abs(u - 0.5) < 0.1) rect(c, x, top + 2, 1, bot - top - 4, '#6a383e');
  });

  // dark ceiling fixtures for the neon tubes
  for (const z of TUBES) {
    const y = Math.round(ceilY(z));
    const hw = Math.round(46 / z);
    rect(c, VX - hw - 1, y, hw * 2 + 2, Math.max(2, Math.round(4 / z)), '#14162a');
  }
}

const TUBES = [1.12, 1.6, 2.3] as const;

/** Light pool cast by one tube: dithered halo on the ceiling and an ellipse on the floor (cached). */
function tubePool(i: number) {
  const z = TUBES[i]!;
  return cachedLayer(`bg_corridor_pool_${i}`, W, H, (g) => {
    const fy = floorY(z + 0.15);
    const cy = ceilY(z);
    const rings = [
      { rx: 40 / z, ry: 10 / z, a: 0.12 },
      { rx: 80 / z, ry: 18 / z, a: 0.08 },
      { rx: 120 / z, ry: 28 / z, a: 0.05 },
    ];
    for (const r of rings) {
      g.fillStyle = `rgba(214,226,240,${r.a})`;
      for (let y = Math.floor(fy - r.ry); y < fy + r.ry; y++) {
        for (let x = Math.floor(VX - r.rx) + (y & 1); x < VX + r.rx; x += 2) {
          const dx = (x - VX) / r.rx;
          const dy = (y - fy) / r.ry;
          if (dx * dx + dy * dy < 1) g.fillRect(x, y, 1, 1);
        }
      }
      g.fillStyle = `rgba(214,226,240,${r.a * 1.4})`;
      for (let y = Math.max(0, Math.floor(cy - r.ry * 0.6)); y < cy + r.ry * 0.6; y++) {
        for (let x = Math.floor(VX - r.rx) + (y & 1); x < VX + r.rx; x += 2) {
          const dx = (x - VX) / r.rx;
          const dy = (y - cy) / (r.ry * 0.6);
          if (dx * dx + dy * dy < 1) g.fillRect(x, y, 1, 1);
        }
      }
    }
  });
}

export function drawCorridor(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'bg_corridor_base', W, H, paintCorridor);
  drawRain(c, WINDOW, env.rain, t, 41, 'rgba(142,172,200,0.6)');
  rect(c, VX - 1, WINDOW.y, 2, WINDOW.h, STEEL_D);

  const lit = env.light === 'normal' || env.light === 'flicker';
  let litCount = 0;
  for (let i = 0; i < TUBES.length; i++) {
    const z = TUBES[i]!;
    const on = lit && (env.light === 'flicker' && i === 1 ? flickerOn(t, 8) : true);
    const y = Math.round(ceilY(z)) + 1;
    const hw = Math.round(44 / z);
    rect(c, VX - hw, y, hw * 2, Math.max(1, Math.round(2 / z)), on ? '#e8f0f6' : '#3a3c58');
    if (on) {
      litCount++;
      rect(c, VX - hw, y + Math.max(1, Math.round(2 / z)), hw * 2, 1, '#a8c0d8');
      const pool = tubePool(i);
      if (pool) c.drawImage(pool, 0, 0);
    }
  }
  if (!lit) drawDim(c, 0.5);
  else if (litCount < TUBES.length) drawDim(c, 0.12);
  else {
    c.fillStyle = 'rgba(200,215,235,0.04)';
    c.fillRect(0, 0, W, H);
  }
  if (env.light === 'emergency') {
    c.fillStyle = 'rgba(233,140,90,0.08)';
    c.fillRect(0, 0, W, H);
  }
}
