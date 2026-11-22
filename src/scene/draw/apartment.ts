/**
 * bg_apartment_evening, bg_apartment_kitchen (docs/09 §2, docs/02 ch1_s01 / ch1_s03).
 * The same small 8th-floor home: warm lamp light inside, rain on the window outside.
 * Static parts are painted once into cached layers; only rain, lamp breathing, TV glow and steam
 * are drawn per frame. Text never goes into the canvas.
 */
import { H, W, mulberry32 } from '../palette';
import { blitLayer, cachedLayer, type SceneEnv } from '../env';
import { drawDim, drawRain, type Rect } from '../effects';

type Ctx = CanvasRenderingContext2D;
const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

// Shared home palette (moody indigo walls, warm wood, dusty pink + muted blue accents)
const WALL = '#38344f';
const WALL_D = '#2e2b44';
const WALL_L = '#433e5c';
const TRIM = '#26233a';
const WOOD = '#47384a';
const WOOD_D = '#3c2f40';
const WOOD_L = '#544254';
const CREAM = '#cfc0ad';
const CREAM_D = '#a89a8c';
const CAB = '#4a4566';
const CAB_D = '#3a3654';
const CAB_L = '#5a5578';
const PINK = '#9a6f86';
const PINK_D = '#7d5870';
const BLUE = '#4f5f86';
const BLUE_D = '#3f4c70';
const BLUE_L = '#6274a0';
const STEEL = '#7c7ea0';
const NIGHT = '#1a2140';
const RAIN_GLASS = 'rgba(142,172,200,0.6)';

/** Dithered warm glow (like the elevator emergency light), rendered once per key. */
function glowLayer(key: string, cx: number, cy: number, rings: { r: number; a: number }[], rgb: string, sy = 1.2) {
  return cachedLayer(key, W, H, (g) => {
    for (const ring of rings) {
      g.fillStyle = `rgba(${rgb},${ring.a})`;
      for (let y = 0; y < H; y++) {
        const dy = (y - cy) * sy;
        if (Math.abs(dy) > ring.r) continue;
        for (let x = y & 1; x < W; x += 2) {
          const dx = x - cx;
          if (dx * dx + dy * dy < ring.r * ring.r) g.fillRect(x, y, 1, 1);
        }
      }
    }
  });
}

/** Wall with faint wallpaper stripes, dark top band, baseboard at `floorY`. */
function paintWall(c: Ctx, floorY: number) {
  rect(c, 0, 0, W, floorY, WALL);
  for (let x = 0; x < W; x += 8) rect(c, x, 10, 1, floorY - 10, WALL_D);
  // dark ceiling band with a dithered edge
  rect(c, 0, 0, W, 8, TRIM);
  for (let y = 8; y < 12; y++) for (let x = y & 1; x < W; x += 2) if (y < 10 || (x & 2)) rect(c, x, y, 1, 1, TRIM);
  rect(c, 0, 12, W, 1, WALL_L);
  rect(c, 0, floorY - 4, W, 4, TRIM);
  rect(c, 0, floorY - 4, W, 1, WALL_L);
}

/** Wooden plank floor from `y0` to the bottom. */
function paintWoodFloor(c: Ctx, y0: number) {
  rect(c, 0, y0, W, H - y0, WOOD);
  const rnd = mulberry32(41);
  let row = 0;
  for (let y = y0; y < H; y += 7 + Math.floor(row / 2), row++) {
    rect(c, 0, y, W, 1, WOOD_D);
    rect(c, 0, y + 1, W, 1, WOOD_L);
    for (let x = Math.floor(rnd() * 40); x < W; x += 48 + Math.floor(rnd() * 30)) rect(c, x, y + 1, 1, 6 + Math.floor(row / 2), WOOD_D);
  }
}

/** Night city through glass; rain is drawn on top per frame. */
function paintNightGlass(c: Ctx, r: Rect, seed: number) {
  rect(c, r.x, r.y, r.w, r.h, NIGHT);
  for (let y = r.y + Math.floor(r.h * 0.45); y < r.y + r.h; y++) {
    for (let x = r.x + (y & 1); x < r.x + r.w; x += 2) rect(c, x, y, 1, 1, '#26305a');
  }
  const rnd = mulberry32(seed);
  let x = r.x;
  while (x < r.x + r.w) {
    const bw = 6 + Math.floor(rnd() * 10);
    const bh = Math.floor(r.h * (0.25 + rnd() * 0.4));
    const top = r.y + r.h - bh;
    const w = Math.min(bw, r.x + r.w - x);
    rect(c, x, top, w, bh, rnd() < 0.5 ? '#141a30' : '#181f38');
    for (let wy = top + 2; wy < r.y + r.h - 1; wy += 3) {
      for (let wx = x + 1; wx < x + w - 1; wx += 2) {
        const p = rnd();
        if (p < 0.12) rect(c, wx, wy, 1, 1, '#e9b77b');
        else if (p < 0.2) rect(c, wx, wy, 1, 1, '#5a5684');
      }
    }
    x += bw;
  }
  // a few static droplets on the glass
  for (let i = 0; i < r.w * r.h * 0.006; i++) {
    rect(c, r.x + Math.floor(rnd() * r.w), r.y + Math.floor(rnd() * r.h), 1, 1, '#8eacc8');
  }
}

/** Curtain panel with vertical folds. */
function paintCurtain(c: Ctx, x: number, y: number, w: number, h: number) {
  rect(c, x, y, w, h, PINK);
  for (let fx = x + 2; fx < x + w; fx += 4) rect(c, fx, y, 1, h, PINK_D);
  rect(c, x, y + h - 2, w, 2, PINK_D);
  rect(c, x, y, w, 1, '#b48aa0');
}

// ───────────────────────────── bg_apartment_evening ─────────────────────────────

const EVE_GLASS_L: Rect = { x: 120, y: 26, w: 35, h: 54 };
const EVE_GLASS_R: Rect = { x: 157, y: 26, w: 35, h: 54 };

function paintEvening(c: Ctx) {
  const floorY = 120;
  paintWall(c, floorY);
  paintWoodFloor(c, floorY);

  // rug in the open middle (characters stand here)
  rect(c, 92, 146, 136, 24, '#6b4d62');
  rect(c, 94, 148, 132, 20, '#7a5a6e');
  for (let x = 98; x < 224; x += 6) rect(c, x, 157, 3, 1, '#8e6a7c');
  rect(c, 94, 148, 132, 1, '#8e6a7c');
  rect(c, 92, 170, 136, 1, WOOD_D);

  // ── kitchenette (left) ──
  rect(c, 0, 34, 20, 86, '#5c5a7a'); // fridge
  rect(c, 1, 35, 18, 84, '#6a6889');
  rect(c, 1, 64, 18, 1, '#4a4866');
  rect(c, 16, 44, 1, 14, STEEL);
  rect(c, 16, 70, 1, 18, STEEL);
  rect(c, 22, 28, 54, 26, CAB); // upper cabinets
  rect(c, 22, 54, 54, 2, CAB_D);
  for (const dx of [22, 49]) {
    rect(c, dx + 1, 29, 25, 24, CAB_L);
    rect(c, dx + 2, 30, 23, 22, CAB);
  }
  rect(c, 46, 40, 1, 4, STEEL);
  rect(c, 52, 40, 1, 4, STEEL);
  for (let y = 58; y < 88; y += 5) for (let x = 22; x < 76; x += 6) rect(c, x, y, 5, 4, ((x + y) & 4) ? '#4d4865' : '#48435f'); // tiles
  rect(c, 20, 88, 58, 4, CREAM_D); // counter top
  rect(c, 20, 88, 58, 1, CREAM);
  rect(c, 22, 92, 54, 24, CAB);
  rect(c, 48, 94, 1, 20, CAB_D);
  rect(c, 44, 100, 1, 4, STEEL);
  rect(c, 52, 100, 1, 4, STEEL);
  rect(c, 30, 80, 8, 8, '#8a6a5a'); // kettle
  rect(c, 31, 79, 6, 1, '#a07a66');
  rect(c, 38, 82, 2, 3, '#8a6a5a');
  rect(c, 58, 82, 4, 6, '#8eacc8'); // jar
  rect(c, 64, 84, 5, 4, CREAM_D); // bowl

  // ── TV on a low cabinet ──
  rect(c, 80, 104, 30, 14, WOOD_L);
  rect(c, 81, 106, 28, 1, WOOD_D);
  rect(c, 95, 107, 1, 10, WOOD_D);
  rect(c, 84, 84, 22, 16, '#151827'); // TV
  rect(c, 85, 85, 20, 14, '#1d2238');
  rect(c, 94, 100, 2, 4, '#151827');

  // ── window with curtains (center, above characters' heads) ──
  rect(c, 116, 22, 80, 62, CREAM_D);
  rect(c, 117, 23, 78, 60, CREAM);
  paintNightGlass(c, EVE_GLASS_L, 5);
  paintNightGlass(c, EVE_GLASS_R, 6);
  rect(c, 155, 26, 2, 54, CREAM_D);
  rect(c, 112, 84, 88, 4, CREAM); // sill
  rect(c, 112, 87, 88, 1, CREAM_D);
  rect(c, 170, 77, 8, 7, '#a0684e'); // plant pot
  rect(c, 168, 70, 3, 6, '#5f7f6a');
  rect(c, 172, 66, 3, 10, '#6d9178');
  rect(c, 176, 71, 3, 5, '#5f7f6a');
  rect(c, 102, 16, 108, 2, '#6a5f6e'); // rod
  paintCurtain(c, 104, 18, 13, 82);
  paintCurtain(c, 195, 18, 13, 82);

  // ── picture frames (blank, no text) ──
  rect(c, 236, 34, 18, 14, CREAM_D);
  rect(c, 238, 36, 14, 10, '#6274a0');
  rect(c, 238, 42, 14, 4, '#5f7f6a');
  rect(c, 260, 30, 12, 16, CREAM_D);
  rect(c, 262, 32, 8, 12, '#d9a3a7');

  // ── sofa (right) ──
  rect(c, 222, 84, 80, 26, BLUE_D); // back
  rect(c, 224, 86, 76, 20, BLUE);
  rect(c, 262, 86, 1, 20, BLUE_D);
  rect(c, 224, 86, 76, 1, BLUE_L);
  rect(c, 216, 96, 10, 30, BLUE_D); // arms
  rect(c, 298, 96, 10, 30, BLUE_D);
  rect(c, 216, 96, 10, 2, BLUE_L);
  rect(c, 298, 96, 10, 2, BLUE_L);
  rect(c, 226, 106, 72, 8, BLUE_L); // seat
  rect(c, 226, 113, 72, 1, BLUE_D);
  rect(c, 226, 114, 72, 12, BLUE);
  rect(c, 226, 125, 72, 1, BLUE_D);
  rect(c, 228, 94, 14, 12, '#d9a3a7'); // cushions
  rect(c, 229, 95, 12, 1, '#e7bcc0');
  rect(c, 282, 96, 13, 10, '#e9b77b');
  rect(c, 283, 97, 11, 1, '#f3cf9a');
  rect(c, 244, 104, 20, 4, '#a49bcb'); // folded blanket
  for (const lx of [220, 302]) rect(c, lx, 126, 3, 3, TRIM);

  // ── floor lamp pole (shade drawn per frame) ──
  rect(c, 309, 62, 2, 62, '#2a2638');
  rect(c, 304, 122, 12, 3, '#2a2638');

  // ── a mug on a small stool by the sofa ──
  rect(c, 202, 112, 12, 2, WOOD_L);
  rect(c, 204, 114, 2, 12, WOOD_D);
  rect(c, 210, 114, 2, 12, WOOD_D);
  rect(c, 205, 107, 5, 5, CREAM);
  rect(c, 210, 108, 2, 2, CREAM_D);
}

function drawLamp(c: Ctx, t: number, on: boolean, cx: number, shadeY: number, key: string) {
  if (on) {
    const breathe = 0.9 + 0.06 * Math.sin(t * 0.8) + 0.04 * Math.sin(t * 2.3);
    const glow = glowLayer(key, cx, shadeY + 6, [
      { r: 14, a: 0.45 },
      { r: 34, a: 0.26 },
      { r: 70, a: 0.14 },
      { r: 130, a: 0.07 },
    ], '233,183,123');
    if (glow) {
      c.save();
      c.globalAlpha = breathe;
      c.drawImage(glow, 0, 0);
      c.restore();
    }
  }
  // shade (trapezoid)
  const top = on ? '#f3d9a8' : '#5a4a54';
  const side = on ? '#e9b77b' : '#4a3c48';
  for (let i = 0; i < 12; i++) rect(c, cx - 5 - Math.floor(i / 3), shadeY + i, 10 + 2 * Math.floor(i / 3), 1, i < 2 ? top : side);
  if (on) rect(c, cx - 7, shadeY + 12, 14, 1, '#fff4d6');
}

export function drawApartmentEvening(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'bg_apartment_evening_base', W, H, paintEvening);
  drawRain(c, EVE_GLASS_L, env.rain, t, 21, RAIN_GLASS);
  drawRain(c, EVE_GLASS_R, env.rain, t, 22, RAIN_GLASS);
  // TV: slow, soft colour drift (no flashing)
  const tv = 0.5 + 0.5 * Math.sin(t * 0.6);
  rect(c, 85, 85, 20, 14, tv > 0.5 ? '#3a4a78' : '#36456f');
  rect(c, 86, 86, 18, 4, '#4f6290');
  rect(c, 86, 95, 8, 3, '#5a5684');
  rect(c, 84, 83, 22, 1, tv > 0.5 ? '#3a4a78' : '#2e3a60'); // faint spill on the wall above
  const on = env.lamp !== 'off';
  if (!on) drawDim(c, 0.4);
  drawLamp(c, t, on, 310, 50, 'bg_apartment_evening_glow');
  if (on) {
    c.fillStyle = 'rgba(233,183,123,0.05)';
    c.fillRect(0, 0, W, H);
  }
}

// ───────────────────────────── bg_apartment_kitchen ─────────────────────────────

const KIT_GLASS_L: Rect = { x: 224, y: 26, w: 31, h: 48 };
const KIT_GLASS_R: Rect = { x: 257, y: 26, w: 31, h: 48 };
const PAN_X = 64;
const PAN_Y = 80;

function paintKitchen(c: Ctx) {
  const floorY = 122;
  paintWall(c, floorY);
  // tiled kitchen floor (checker, muted)
  for (let y = floorY; y < H; y += 8) {
    for (let x = 0; x < W; x += 16) {
      const odd = ((x >> 4) + ((y - floorY) >> 3)) & 1;
      rect(c, x, y, 16, 8, odd ? '#433f59' : '#3c3852');
    }
    rect(c, 0, y, W, 1, '#353149');
  }
  // small mat in front of the stove
  rect(c, 28, 130, 56, 10, '#6b4d62');
  rect(c, 30, 132, 52, 6, '#7a5a6e');
  for (let x = 32; x < 82; x += 4) rect(c, x, 135, 2, 1, '#8e6a7c');

  // backsplash tiles behind both counters
  for (let y = 50; y < 92; y += 6) {
    for (let x = 0; x < W; x += 8) {
      if (x >= 104 && x < 200) continue;
      rect(c, x, y, 7, 5, ((x + y) & 8) ? '#4d4865' : '#48435f');
    }
  }

  // ── stove side (left) ──
  rect(c, 26, 22, 62, 20, '#5c5a7a'); // range hood
  rect(c, 30, 42, 54, 4, '#4a4866');
  rect(c, 30, 45, 54, 1, '#7c7ea0');
  rect(c, 50, 10, 14, 12, '#4a4866'); // duct
  rect(c, 0, 92, 106, 4, CREAM_D); // counter top
  rect(c, 0, 92, 106, 1, CREAM);
  rect(c, 0, 96, 104, 22, CAB);
  rect(c, 0, 96, 104, 1, CAB_D);
  rect(c, 2, 98, 22, 18, CAB_L);
  rect(c, 3, 99, 20, 16, CAB);
  rect(c, 20, 104, 1, 4, STEEL);
  rect(c, 32, 98, 48, 18, '#3a3852'); // oven door
  rect(c, 36, 102, 40, 8, '#222339');
  rect(c, 36, 99, 40, 1, STEEL);
  rect(c, 82, 98, 20, 18, CAB_L);
  rect(c, 83, 99, 18, 16, CAB);
  rect(c, 85, 104, 1, 4, STEEL);
  rect(c, 30, 88, 52, 4, '#2a2a40'); // hob
  rect(c, 34, 89, 12, 2, '#3c3c56');
  rect(c, 34, 92, 46, 1, '#1f1f30');
  rect(c, 40, 86, 2, 2, '#3c3c56'); // knob area
  // pan on the right burner
  rect(c, PAN_X - 11, PAN_Y + 4, 22, 4, '#2c2c3c');
  rect(c, PAN_X - 12, PAN_Y + 3, 24, 2, '#4a4a60');
  rect(c, PAN_X - 10, PAN_Y + 3, 20, 1, '#6a6a84');
  rect(c, PAN_X + 12, PAN_Y + 4, 14, 2, '#3a2f30'); // handle
  // spice shelf + jars
  rect(c, 6, 62, 18, 2, WOOD_L);
  rect(c, 8, 56, 4, 6, '#d9a3a7');
  rect(c, 14, 57, 4, 5, '#e9b77b');
  rect(c, 19, 55, 3, 7, '#8eacc8');
  // utensil rail
  rect(c, 88, 58, 14, 1, STEEL);
  rect(c, 90, 59, 1, 10, '#a49bcb');
  rect(c, 94, 59, 2, 8, '#a49bcb');
  rect(c, 99, 59, 1, 9, '#a49bcb');

  // ── middle wall: shelf, blank calendar, hanging plant (no text) ──
  rect(c, 116, 40, 72, 3, WOOD_L);
  rect(c, 116, 43, 72, 1, WOOD_D);
  rect(c, 120, 30, 8, 10, '#8eacc8');
  rect(c, 130, 33, 7, 7, CREAM_D);
  rect(c, 140, 28, 6, 12, '#d9a3a7');
  rect(c, 150, 32, 10, 8, '#a49bcb');
  rect(c, 168, 30, 9, 10, '#7a8a70');
  rect(c, 167, 26, 11, 4, '#6d9178');
  rect(c, 172, 43, 3, 10, '#5f7f6a');
  rect(c, 136, 56, 22, 26, CREAM_D); // calendar
  rect(c, 137, 60, 20, 21, CREAM);
  for (let y = 63; y < 80; y += 4) for (let x = 139; x < 156; x += 4) rect(c, x, y, 2, 2, '#c9b6a8');
  rect(c, 147, 71, 2, 2, '#d9a3a7');
  rect(c, 146, 54, 2, 3, STEEL);

  // ── sink side (right) under the window ──
  rect(c, 220, 22, 72, 56, CREAM_D);
  rect(c, 221, 23, 70, 54, CREAM);
  paintNightGlass(c, KIT_GLASS_L, 15);
  paintNightGlass(c, KIT_GLASS_R, 16);
  rect(c, 255, 26, 2, 48, CREAM_D);
  rect(c, 216, 78, 80, 3, CREAM);
  rect(c, 216, 18, 80, 8, PINK); // café valance
  for (let x = 218; x < 296; x += 4) rect(c, x, 18, 1, 8, PINK_D);
  rect(c, 216, 25, 80, 1, PINK_D);
  rect(c, 200, 92, 120, 4, CREAM_D); // counter top
  rect(c, 200, 92, 120, 1, CREAM);
  rect(c, 202, 96, 118, 22, CAB);
  rect(c, 202, 96, 118, 1, CAB_D);
  for (const dx of [204, 232, 262, 292]) {
    rect(c, dx, 98, 26, 18, CAB_L);
    rect(c, dx + 1, 99, 24, 16, CAB);
  }
  rect(c, 228, 104, 1, 4, STEEL);
  rect(c, 236, 104, 1, 4, STEEL);
  rect(c, 286, 104, 1, 4, STEEL);
  rect(c, 240, 92, 30, 2, '#2c2e48'); // sink
  rect(c, 241, 92, 28, 1, '#5a5c7a');
  rect(c, 254, 84, 2, 8, STEEL); // faucet
  rect(c, 254, 84, 8, 2, STEEL);
  rect(c, 276, 86, 14, 6, '#5a5c7a'); // dish rack
  for (let x = 278; x < 290; x += 3) rect(c, x, 82, 1, 6, CREAM_D);
  rect(c, 300, 84, 6, 8, '#d9a3a7'); // mug
  // phone lying on the counter (dark screen; glow drawn per frame)
  rect(c, 212, 90, 12, 2, '#151827');
}

/** Steam from the pan: a few wisps that drift up and fade. t = 0 gives a static wisp. */
function drawSteam(c: Ctx, t: number) {
  for (let i = 0; i < 3; i++) {
    for (let k = 0; k < 9; k++) {
      const rise = (k * 3.2 + t * 6 + i * 9) % 28;
      const y = PAN_Y + 2 - rise;
      const x = PAN_X - 4 + i * 4 + Math.sin(rise * 0.25 + t * 1.2 + i * 2) * 2.5;
      const a = 0.55 * (1 - rise / 28);
      c.fillStyle = `rgba(243,235,221,${a.toFixed(3)})`;
      c.fillRect(Math.round(x), Math.round(y), k % 2 === 0 ? 2 : 1, 2);
    }
  }
}

export function drawApartmentKitchen(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'bg_apartment_kitchen_base', W, H, paintKitchen);
  drawRain(c, KIT_GLASS_L, env.rain, t, 31, RAIN_GLASS);
  drawRain(c, KIT_GLASS_R, env.rain, t, 32, RAIN_GLASS);
  const on = env.lamp !== 'off';
  if (!on) drawDim(c, 0.4);
  // range-hood light: warm pool over the stove
  if (on) {
    const glow = glowLayer('bg_apartment_kitchen_glow', 57, 46, [
      { r: 12, a: 0.4 },
      { r: 30, a: 0.24 },
      { r: 62, a: 0.13 },
      { r: 120, a: 0.06 },
    ], '233,183,123', 1.6);
    if (glow) c.drawImage(glow, 0, 0);
    rect(c, 34, 46, 46, 1, '#fff4d6');
    c.fillStyle = 'rgba(233,183,123,0.05)';
    c.fillRect(0, 0, W, H);
  }
  // burner under the pan
  if (env.steam) {
    rect(c, PAN_X - 8, PAN_Y + 8, 16, 1, '#e9b77b');
    rect(c, PAN_X - 5, PAN_Y + 8, 10, 1, '#ffcf8a');
    drawSteam(c, t);
  }
  // phone screen: soft glow that breathes slowly
  const p = 0.5 + 0.5 * Math.sin(t * 1.1);
  rect(c, 213, 90, 10, 1, p > 0.5 ? '#8eacc8' : '#6a86a8');
}
