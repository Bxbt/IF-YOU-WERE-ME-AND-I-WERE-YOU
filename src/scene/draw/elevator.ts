/**
 * bg_elevator_emergency (docs/09 §2) — prototype scene for owner review (audit H-5).
 * Drawn with primitives on the 320×180 canvas; text stays in HTML.
 */
import { H, W, mulberry32 } from '../palette';
import { blitLayer, type SceneEnv } from '../env';
import { drawDim, drawHaze, flickerOn } from '../effects';

type Ctx = CanvasRenderingContext2D;
const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

const WALL = '#2c2e48';
const WALL_D = '#222339';
const WALL_L = '#3a3c5c';
const FLOOR = '#1b1d2e';
const STEEL = '#5a5c7a';
const STEEL_L = '#7c7ea0';

export function drawElevatorBase(c: Ctx) {
  rect(c, 0, 0, W, H, WALL_D);
  // back wall panels
  for (let x = 40; x < 280; x += 40) {
    rect(c, x, 22, 38, 118, WALL);
    rect(c, x, 22, 1, 118, WALL_L);
    rect(c, x + 37, 22, 1, 118, WALL_D);
  }
  // ceiling + dead light strip
  rect(c, 0, 0, W, 22, '#181a2a');
  rect(c, 90, 8, 140, 4, '#2e3046');
  rect(c, 90, 12, 140, 1, '#3c3e58');
  // side walls (perspective)
  for (let y = 0; y < H; y++) {
    const inset = Math.round(40 - (y / H) * 6);
    rect(c, 0, y, inset, 1, y % 6 === 0 ? WALL_L : WALL_D);
    rect(c, W - inset, y, inset, 1, y % 6 === 0 ? WALL_L : WALL_D);
  }
  // floor
  rect(c, 34, 140, 252, 40, FLOOR);
  for (let x = 34; x < 286; x += 12) rect(c, x, 140, 1, 40, '#232539');
  // handrail
  rect(c, 44, 100, 232, 3, STEEL);
  rect(c, 44, 100, 232, 1, STEEL_L);
  // control panel (right)
  rect(c, 286, 58, 18, 50, '#3a3c5a');
  rect(c, 287, 59, 16, 48, '#2a2c44');
  const rnd = mulberry32(3);
  for (let i = 0; i < 8; i++) {
    const bx = 290 + (i % 2) * 6;
    const by = 64 + Math.floor(i / 2) * 8;
    rect(c, bx, by, 4, 4, rnd() < 0.2 ? '#e9b77b' : STEEL);
  }
  rect(c, 290, 98, 10, 5, '#b85a4a'); // alarm button
  // floor indicator (blank — numbers are HTML)
  rect(c, 142, 26, 36, 10, '#101220');
  rect(c, 143, 27, 34, 8, '#191b2c');
}

let glowCache: HTMLCanvasElement | null = null;

/** The dithered glow is expensive (≈57k pixels × 4 rings), so it is rendered once and reused. */
function glowLayer(): HTMLCanvasElement | null {
  if (glowCache) return glowCache;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  if (!g) return null;
  const rings = [
    { r: 18, a: 0.5 },
    { r: 40, a: 0.3 },
    { r: 80, a: 0.17 },
    { r: 140, a: 0.09 },
  ];
  for (const ring of rings) {
    g.fillStyle = `rgba(233,183,123,${ring.a})`;
    for (let y = 0; y < H; y++) {
      for (let x = y & 1; x < W; x += 2) {
        const dx = x - 255;
        const dy = (y - 17) * 1.3;
        if (dx * dx + dy * dy < ring.r * ring.r) g.fillRect(x, y, 1, 1);
      }
    }
  }
  glowCache = cv;
  return cv;
}

/** Emergency light: orange glow that breathes; `haze` 0..2 adds warm air. */
export function drawElevatorLight(c: Ctx, t: number, haze = 1) {
  const pulse = 0.65 + 0.35 * Math.sin(t * 2.1);
  rect(c, 248, 14, 14, 6, '#5a3a24');
  rect(c, 249, 15, 12, 4, pulse > 0.6 ? '#ffcf8a' : '#e9b77b');
  const glow = glowLayer();
  if (glow) {
    c.save();
    c.globalAlpha = pulse;
    c.drawImage(glow, 0, 0);
    c.restore();
  }
  if (haze > 0) {
    c.fillStyle = `rgba(120,70,40,${0.05 * haze})`;
    c.fillRect(0, 0, W, H);
  }
}

/** bg_elevator_interior — same car with the ceiling light on; `light: flicker` blinks it (≤ 2 Hz). */
export function drawElevatorInterior(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'bg_elevator_base', W, H, drawElevatorBase);
  const on = env.light === 'flicker' ? flickerOn(t, 11) : env.light !== 'off';
  if (on) {
    rect(c, 90, 8, 140, 4, '#f3ebdd');
    rect(c, 90, 12, 140, 1, '#fff4d6');
    c.fillStyle = 'rgba(243,235,221,0.10)';
    c.fillRect(34, 20, 252, 160);
  } else {
    drawDim(c, 0.45);
  }
  if (env.light === 'emergency') drawElevatorLight(c, t, env.haze);
}

/** bg_elevator_emergency — main light dead, orange emergency light breathing, optional haze. */
export function drawElevatorEmergency(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'bg_elevator_base', W, H, drawElevatorBase);
  drawDim(c, 0.35);
  drawElevatorLight(c, t, env.haze);
  drawHaze(c, env.haze);
}
