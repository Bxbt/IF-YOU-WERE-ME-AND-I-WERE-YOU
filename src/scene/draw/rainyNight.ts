/**
 * "คืนที่ฝนตกหนัก" backgrounds (docs/09 §2, replaces the elevator scenes in Ch1–Ch3):
 * - bg_convenience_store: the small shop in front of the building at night — bright shelves and
 *   counter inside, a wall of glass with heavy rain outside. env.light 'flicker' = lightning.
 * - bg_building_entrance: the ground-floor lobby by the glass doors, rain outside. The glass
 *   doors have 3 states (env.door): closed · ajar · open (someone is about to step in).
 * Static parts are cached; only rain, lightning and the door move.
 */
import { H, W, ditherBands, mulberry32 } from '../palette';
import { blitLayer, type SceneEnv } from '../env';
import { drawRain, flickerOn } from '../effects';

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

/** Night street seen through glass: dark sky, a far building and a few blurred lights. */
function nightOutside(c: Ctx, x: number, y: number, w: number, h: number, seed: number) {
  ditherBands(
    c,
    [
      { y, c: 0 },
      { y: y + Math.round(h * 0.5), c: 2 },
    ],
    x,
    x + w,
  );
  const rnd = mulberry32(seed);
  for (let i = 0; i < 6; i++) {
    const bx = x + Math.floor(rnd() * (w - 20));
    const bw = 12 + Math.floor(rnd() * 18);
    const top = y + Math.floor(h * 0.25 + rnd() * h * 0.3);
    rect(c, bx, top, bw, y + h - top, '#1b1f36');
    for (let wy = top + 3; wy < y + h - 4; wy += 4)
      for (let wx = bx + 2; wx < bx + bw - 2; wx += 3) if (rnd() < 0.18) rect(c, wx, wy, 1, 1, '#e9b77b');
  }
  // Wet ground reflecting the shop light
  rect(c, x, y + h - 8, w, 8, '#262a45');
  dither(c, x, y + h - 8, w, 8, 'rgba(233,183,123,0.18)');
}

// ---------------------------------------------------------------- bg_convenience_store

const STORE_GLASS = { x: 8, y: 22, w: 128, h: 104 };

function paintStore(c: Ctx) {
  // Ceiling + cool shop light
  rect(c, 0, 0, W, 20, '#d9dfe9');
  for (let x = 20; x < W; x += 70) rect(c, x, 8, 40, 4, '#ffffff');
  rect(c, 0, 18, W, 2, '#a9b4c4');
  // Back wall
  rect(c, 0, 20, W, 120, '#c9d0db');
  dither(c, 0, 20, W, 120, 'rgba(142,172,200,0.25)');
  // Glass front (left) with the night and rain outside
  const g = STORE_GLASS;
  nightOutside(c, g.x, g.y, g.w, g.h, 4401);
  rect(c, g.x - 3, g.y - 3, g.w + 6, 3, '#6b7385');
  rect(c, g.x - 3, g.y + g.h, g.w + 6, 3, '#6b7385');
  rect(c, g.x + g.w / 2 - 1, g.y, 2, g.h, '#6b7385');
  rect(c, g.x - 3, g.y, 3, g.h, '#6b7385');
  rect(c, g.x + g.w, g.y, 3, g.h, '#6b7385');
  // Sticker on the glass
  rect(c, g.x + 10, g.y + 70, 18, 8, '#e9b77b');
  rect(c, g.x + 12, g.y + 72, 14, 1, '#ffffff');
  // Shelves (right) with colourful goods
  const rnd = mulberry32(77);
  const goods = ['#d9a3a7', '#e9b77b', '#8eacc8', '#9fb89a', '#a49bcb', '#f3ebdd', '#c46a5a'];
  for (let s = 0; s < 4; s++) {
    const sy = 34 + s * 24;
    rect(c, 152, sy + 18, 160, 3, '#7d8597');
    for (let x = 156; x < 308; x += 6) {
      const h = 8 + Math.floor(rnd() * 8);
      rect(c, x, sy + 18 - h, 5, h, goods[Math.floor(rnd() * goods.length)]!);
      rect(c, x, sy + 18 - h, 5, 1, 'rgba(255,255,255,0.35)');
    }
  }
  // Fridge glow at the far right
  rect(c, 296, 30, 22, 100, '#a9c4e0');
  dither(c, 296, 30, 22, 100, 'rgba(255,255,255,0.3)');
  rect(c, 306, 30, 1, 100, '#6b7385');
  // Counter with a bench by the window
  rect(c, 150, 128, 100, 14, '#e6e9ef');
  rect(c, 150, 128, 100, 2, '#ffffff');
  rect(c, 230, 116, 14, 12, '#3a3d56'); // register
  rect(c, 232, 118, 10, 4, '#8eacc8');
  rect(c, 18, 132, 110, 5, '#8a7a6a'); // bench by the glass
  rect(c, 22, 137, 4, 10, '#6e604f');
  rect(c, 120, 137, 4, 10, '#6e604f');
  // Floor tiles
  rect(c, 0, 140, W, H - 140, '#b8bfcc');
  for (let x = 0; x < W; x += 20) rect(c, x, 140, 1, H - 140, '#a3aaba');
  for (let y = 150; y < H; y += 12) rect(c, 0, y, W, 1, '#a3aaba');
  // Wet footprints by the door
  for (let i = 0; i < 6; i++) dither(c, 30 + i * 14, 150 + (i % 2) * 8, 6, 3, 'rgba(90,99,120,0.5)');
}

export function drawConvenienceStore(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'convenience_store', W, H, paintStore);
  drawRain(c, STORE_GLASS, env.rain, t, 29, 'rgba(200,215,235,0.7)');
  // Lightning: the glass flashes pale for a moment (≤ 2 changes/s, off with reduced motion).
  if (env.light === 'flicker' && !flickerOn(t, 11)) {
    c.fillStyle = 'rgba(243,235,221,0.55)';
    c.fillRect(STORE_GLASS.x, STORE_GLASS.y, STORE_GLASS.w, STORE_GLASS.h);
  }
}

// ---------------------------------------------------------------- bg_building_entrance

const DOOR = { x: 112, y: 40, w: 96, h: 104 };

function paintEntrance(c: Ctx) {
  // Lobby: warm wall, ceiling lights, a mailbox wall and a plant
  rect(c, 0, 0, W, 24, '#2a2d48');
  for (let x = 30; x < W; x += 80) {
    rect(c, x, 10, 24, 3, '#fff4d6');
    dither(c, x - 8, 13, 40, 10, 'rgba(255,244,214,0.15)');
  }
  rect(c, 0, 24, W, 120, '#4b4468');
  dither(c, 0, 24, W, 120, 'rgba(164,155,203,0.12)');
  // Mailboxes (left)
  rect(c, 6, 54, 55, 56, '#5a5684');
  for (let r = 0; r < 4; r++)
    for (let k = 0; k < 4; k++) {
      rect(c, 9 + k * 13, 57 + r * 13, 11, 11, '#6b6696');
      rect(c, 11 + k * 13, 61 + r * 13, 7, 1, '#3a3660');
    }
  // Plant (right)
  rect(c, 262, 118, 22, 24, '#6b4a3a');
  const leaves = mulberry32(53);
  for (let i = 0; i < 30; i++)
    rect(
      c,
      258 + Math.floor(leaves() * 30),
      84 + Math.floor(leaves() * 36),
      3,
      2,
      leaves() < 0.5 ? '#4e6b52' : '#6f8f6a',
    );
  // Door frame
  rect(c, DOOR.x - 6, DOOR.y - 6, DOOR.w + 12, DOOR.h + 6, '#3a3d56');
  // Floor
  rect(c, 0, 144, W, H - 144, '#3a3550');
  for (let x = 0; x < W; x += 24) rect(c, x, 144, 1, H - 144, '#332f48');
  rect(c, DOOR.x - 10, 144, DOOR.w + 20, 6, '#2a2640'); // doormat
  dither(c, DOOR.x - 10, 150, DOOR.w + 20, 20, 'rgba(142,172,200,0.18)'); // wet patch
}

function paintEntranceOutside(c: Ctx) {
  nightOutside(c, DOOR.x, DOOR.y, DOOR.w, DOOR.h, 911);
}

export function drawBuildingEntrance(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'building_entrance', W, H, paintEntrance);
  // The street seen through the doors (behind the glass panels)
  c.save();
  c.beginPath();
  c.rect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  c.clip();
  paintEntranceOutside(c);
  c.restore();
  drawRain(c, DOOR, env.rain, t, 47, 'rgba(200,215,235,0.7)');
  // Two sliding glass panels: closed · ajar · open
  const gap = env.door === 'open' ? 40 : env.door === 'ajar' ? 10 : 0;
  const half = DOOR.w / 2;
  for (const side of [0, 1] as const) {
    const x = side === 0 ? DOOR.x - gap : DOOR.x + half + gap;
    c.fillStyle = 'rgba(164,190,220,0.22)';
    c.fillRect(x, DOOR.y, half, DOOR.h);
    rect(c, x, DOOR.y, half, 2, '#6b7385');
    rect(c, x, DOOR.y + DOOR.h - 2, half, 2, '#6b7385');
    rect(c, side === 0 ? x + half - 2 : x, DOOR.y, 2, DOOR.h, '#6b7385');
    rect(c, side === 0 ? x + half - 6 : x + 4, DOOR.y + 48, 2, 14, '#c9d0db'); // handle
    // A glint on the glass
    for (let i = 0; i < 10; i++) rect(c, x + 8 + i, DOOR.y + 10 + i, 1, 1, 'rgba(255,255,255,0.35)');
  }
  // Wall pieces that hide the panels when they slide open
  rect(c, DOOR.x - 50, DOOR.y - 6, 44, DOOR.h + 6, '#4b4468');
  rect(c, DOOR.x + DOOR.w + 6, DOOR.y - 6, 44, DOOR.h + 6, '#4b4468');
  rect(c, DOOR.x - 6, DOOR.y - 6, 6, DOOR.h + 6, '#3a3d56');
  rect(c, DOOR.x + DOOR.w, DOOR.y - 6, 6, DOOR.h + 6, '#3a3d56');
}
