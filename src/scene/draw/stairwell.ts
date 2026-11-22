/**
 * bg_stairwell (docs/09 §2, docs/02 ch3_end) — the building's fire stairwell after the elevator
 * incident: one straight flight climbing away from the viewer in one-point perspective to a small
 * landing with a fire door, painted-concrete walls, a handrail on the right, a small dark window
 * high on the left wall (rain only if env.rain is set). Quiet and dim; a warm wall lamp over the
 * landing (env.lamp 'warm') — 'off' leaves only a faint cool spill.
 *
 * bg_black — plain near-black title card with a few faint dithered specks.
 */
import { H, W, mulberry32 } from '../palette';
import { blitLayer, cachedLayer, type SceneEnv } from '../env';
import { drawDim, drawRain, type Rect } from '../effects';

type Ctx = CanvasRenderingContext2D;
const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

// Camera: eye height E (world units), focal F px, vanishing point (VX, VY). Floor at z = 1 hits y = 180.
const VX = 160;
const VY = 60;
const E = 1.5;
const F = 80;
const HALF = 1.1; // half-width of the stairwell (walls at x = ±HALF)
const CEIL_Y = 2.7;
const Z0 = 1.1; // first riser
const RISE = 0.15;
const RUN = 0.25;
const STEPS = 8;
const Z_LAND = Z0 + STEPS * RUN; // landing front edge
const Z_BACK = Z_LAND + 0.9;
const LAND_Y = STEPS * RISE;

const sx = (x: number, z: number) => VX + (x * F) / z;
const sy = (y: number, z: number) => VY + ((E - y) * F) / z;
/** Stair surface height at depth z (stepped). */
const stairY = (z: number) => (z < Z0 ? 0 : z >= Z_LAND ? LAND_Y : (Math.floor((z - Z0) / RUN) + 1) * RISE);
/** Smoothed stair line (for the handrail and wall skirting). */
const slopeY = (z: number) => Math.min(LAND_Y, Math.max(0, ((z - Z0) / RUN) * RISE + RISE * 0.5));

const WINDOW: Rect = { x: 22, y: 26, w: 18, h: 26 };
const LAMP_Z = 2.15;
const LAMP = { x: Math.round(sx(-HALF, LAMP_Z)) + 2, y: Math.round(sy(slopeY(LAMP_Z) + 1.45, LAMP_Z)) };

const WALL = '#3a3550';
const WALL_D = '#2e2a44';
const WALL_DD = '#221f36';
const CEIL = '#1a1a2e';
const TREAD = '#4a4258';
const TREAD_D = '#3c3550';
const RISER = '#2c2840';
const NOSE = '#6a5e6e';
const RAIL = '#8a6a52';
const RAIL_D = '#5a4236';

function paintStairwell(c: Ctx) {
  rect(c, 0, 0, W, H, WALL_D);

  // ceiling (rows above the back wall), slightly dithered
  const backTop = Math.round(sy(CEIL_Y, Z_BACK));
  for (let y = 0; y < backTop; y++) {
    const z = (-(CEIL_Y - E) * F) / (y + 0.5 - VY);
    const hw = (HALF * F) / z;
    rect(c, VX - hw, y, hw * 2, 1, y & 1 && y > 6 ? '#16162a' : CEIL);
  }

  // side walls column by column: plaster, darker dado following the stairs, skirting
  for (let x = 0; x < W; x++) {
    const dx = Math.abs(x + 0.5 - VX);
    const z = (HALF * F) / dx;
    if (z > Z_BACK) continue;
    const top = Math.round(sy(CEIL_Y, z));
    const bot = Math.round(sy(stairY(z), z));
    const near = z < 1.6;
    rect(c, x, top, 1, bot - top, near ? WALL : '#35304b');
    const dado = Math.round(sy(slopeY(z) + 0.95, z));
    rect(c, x, dado, 1, bot - dado, near ? WALL_D : '#2a2640');
    rect(c, x, dado, 1, 1, '#4a4462');
    const skirt = Math.max(1, Math.round(6 / z));
    rect(c, x, Math.round(sy(slopeY(z), z)) - skirt, 1, bot - Math.round(sy(slopeY(z), z)) + skirt, WALL_DD);
    rect(c, x, top, 1, 1, '#141426');
    // subtle plaster texture
    if ((x * 7) % 5 === 0) rect(c, x, top + ((x * 13) % Math.max(1, dado - top)), 1, 1, '#403a56');
  }

  // back wall above the landing
  const bx0 = Math.round(sx(-HALF, Z_BACK));
  const bx1 = Math.round(sx(HALF, Z_BACK));
  const by1 = Math.round(sy(LAND_Y, Z_BACK));
  rect(c, bx0, backTop, bx1 - bx0, by1 - backTop, '#332e48');
  rect(c, bx0, backTop, bx1 - bx0, 1, '#141426');
  const bdado = Math.round(sy(LAND_Y + 0.95, Z_BACK));
  rect(c, bx0, bdado, bx1 - bx0, by1 - bdado, '#2a2640');
  rect(c, bx0, bdado, bx1 - bx0, 1, '#4a4462');
  // fire door on the landing (heavy steel, small wired window, push bar; no text)
  const dw = 14;
  const dTop = Math.round(sy(LAND_Y + 0.95, Z_BACK + 0.01)) - 6;
  rect(c, VX - dw / 2 - 2, dTop - 2, dw + 4, by1 - dTop + 2, '#4a4462');
  rect(c, VX - dw / 2, dTop, dw, by1 - dTop, '#5a4a4e');
  rect(c, VX - dw / 2, dTop, 1, by1 - dTop, '#433840');
  rect(c, VX - 3, dTop + 3, 5, 5, '#1c1a2c');
  rect(c, VX - 2, dTop + 4, 1, 1, '#2c2a40');
  rect(c, VX + 3 - dw / 2 + 2, Math.round((dTop + by1) / 2) + 1, dw - 4, 1, '#8a7a7c');
  // tiny exit sign above the door: green box with a white arrow (no text)
  rect(c, VX - 4, dTop - 7, 8, 4, '#2f5a48');
  rect(c, VX - 2, dTop - 6, 4, 1, '#cfe4d6');
  rect(c, VX + 1, dTop - 7 + 0, 1, 1, '#cfe4d6');
  rect(c, VX + 1, dTop - 5, 1, 1, '#cfe4d6');

  // landing floor
  for (let y = by1; y < Math.round(sy(LAND_Y, Z_LAND)) + 1; y++) {
    const z = ((E - LAND_Y) * F) / (y + 0.5 - VY);
    const hw = (HALF * F) / z;
    rect(c, VX - hw, y, hw * 2, 1, TREAD_D);
  }

  // steps, back to front: tread at height (k+1)·RISE between z_k..z_k+1, then the riser at z_k
  for (let k = STEPS - 1; k >= 0; k--) {
    const za = Z0 + k * RUN;
    const zb = za + RUN;
    const yTop = (k + 1) * RISE;
    const ty0 = Math.round(sy(yTop, zb));
    const ty1 = Math.round(sy(yTop, za));
    for (let y = ty0; y < ty1; y++) {
      const z = ((E - yTop) * F) / (y + 0.5 - VY);
      const hw = (HALF * F) / z;
      rect(c, VX - hw, y, hw * 2, 1, (y - ty0) & 1 && y - ty0 > 1 ? TREAD_D : TREAD);
      // worn centre where feet go
      const wear = (0.42 * F) / z;
      if ((y + k) % 3 === 0) rect(c, VX - wear, y, wear * 2, 1, '#524a60');
    }
    const hw = (HALF * F) / za;
    const ry0 = ty1;
    const ry1 = Math.round(sy(k * RISE, za));
    rect(c, VX - hw, ry0, hw * 2, ry1 - ry0, RISER);
    rect(c, VX - hw, ry0, hw * 2, 1, NOSE); // nosing strip
    rect(c, VX - hw, ry1 - 1, hw * 2, 1, '#221f34');
  }
  // floor in front of the first step
  for (let y = Math.round(sy(0, Z0)); y < H; y++) {
    const z = (E * F) / (y + 0.5 - VY);
    const hw = (HALF * F) / z;
    rect(c, VX - hw, y, hw * 2, 1, y & 1 ? '#2e2a40' : '#332e46');
  }

  // handrail on the right wall: wooden rail on brackets, following the slope, then flat on the landing
  for (let x = Math.round(VX + (HALF * F) / Z_BACK); x < W; x++) {
    const z = (HALF * F) / (x + 0.5 - VX);
    const ry = Math.round(sy(slopeY(z) + 0.9, z) + 0.5);
    const th = Math.max(1, Math.round(5 / z));
    rect(c, x, ry, 1, th, RAIL);
    rect(c, x, ry + th, 1, 1, RAIL_D);
    rect(c, x, ry, 1, 1, '#b08a64');
  }
  for (let i = 0; i < 4; i++) {
    const z = Z0 + 0.4 + i * 0.7;
    const x = Math.round(sx(HALF, z)) - 1;
    const ry = Math.round(sy(slopeY(z) + 0.9, z));
    rect(c, x, ry, 2, Math.max(2, Math.round(8 / z)), '#5a5c7a');
  }

  // small dark window high on the left wall, with a deep sill
  const wnd = WINDOW;
  rect(c, wnd.x - 3, wnd.y - 3, wnd.w + 6, wnd.h + 7, '#26223a');
  rect(c, wnd.x - 2, wnd.y - 2, wnd.w + 4, wnd.h + 4, '#4a4462');
  rect(c, wnd.x, wnd.y, wnd.w, wnd.h, '#121831');
  for (let y = wnd.y + 14; y < wnd.y + wnd.h; y++) for (let x = wnd.x + (y & 1); x < wnd.x + wnd.w; x += 2) rect(c, x, y, 1, 1, '#1a2242');
  rect(c, wnd.x + 3, wnd.y + 15, 5, 11, '#0e1326');
  rect(c, wnd.x + 10, wnd.y + 11, 6, 15, '#10162c');
  rect(c, wnd.x + 5, wnd.y + 18, 1, 1, '#e9b77b');
  rect(c, wnd.x + 12, wnd.y + 14, 1, 1, '#e9b77b');
  rect(c, wnd.x - 4, wnd.y + wnd.h + 2, wnd.w + 8, 2, '#4a4462');

  // standpipe running up the near left wall (muted red, no text) with a valve wheel
  rect(c, 58, 0, 4, H, '#5a2e34');
  rect(c, 59, 0, 1, H, '#7a3e42');
  rect(c, 54, 118, 12, 3, '#5a2e34');
  rect(c, 55, 114, 10, 10, '#6a383e');
  rect(c, 57, 116, 6, 6, '#8a4a4e');
  rect(c, 59, 118, 2, 2, '#5a2e34');
  // blank floor-number plate on the right wall above the rail (no text)
  rect(c, 262, 58, 16, 12, '#26223a');
  rect(c, 263, 59, 14, 10, '#5a5684');
  rect(c, 265, 61, 10, 6, '#4a4672');
  // wall sconce on the left wall, half-way up the flight (bulb drawn per frame)
  rect(c, LAMP.x - 1, LAMP.y - 3, 3, 10, '#2a2436');
  rect(c, LAMP.x + 2, LAMP.y - 2, 3, 7, '#3a3244');
}

/** Warm dithered glow around the lamp and down the stairs (cached). */
function lampGlow() {
  return cachedLayer('bg_stairwell_glow', W, H, (g) => {
    const rings = [
      { cx: LAMP.x + 4, cy: LAMP.y + 1, rx: 14, ry: 12, a: 0.2 },
      { cx: LAMP.x + 14, cy: LAMP.y + 10, rx: 44, ry: 30, a: 0.1 },
      { cx: 150, cy: 96, rx: 110, ry: 60, a: 0.05 },
    ];
    for (const r of rings) {
      g.fillStyle = `rgba(233,183,123,${r.a})`;
      for (let y = Math.max(0, Math.floor(r.cy - r.ry)); y < Math.min(H, r.cy + r.ry); y++) {
        for (let x = Math.floor(r.cx - r.rx) + (y & 1); x < r.cx + r.rx; x += 2) {
          const dx = (x - r.cx) / r.rx;
          const dy = (y - r.cy) / r.ry;
          if (dx * dx + dy * dy < 1) g.fillRect(x, y, 1, 1);
        }
      }
    }
    // warm catch-light on each step nosing
    for (let k = 0; k < STEPS; k++) {
      const za = Z0 + k * RUN;
      const hw = Math.round((HALF * F * 0.7) / za);
      g.fillStyle = 'rgba(233,183,123,0.22)';
      g.fillRect(VX - hw, Math.round(sy((k + 1) * RISE, za)), hw * 2, 1);
    }
  });
}

export function drawStairwell(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'bg_stairwell_base', W, H, paintStairwell);
  drawRain(c, WINDOW, env.rain, t, 53, 'rgba(142,172,200,0.45)');

  const warm = env.lamp === 'warm' && env.light !== 'off';
  if (warm) {
    rect(c, LAMP.x + 2, LAMP.y - 1, 3, 5, '#fff4d6');
    rect(c, LAMP.x + 5, LAMP.y, 1, 3, '#e9b77b');
    const glow = lampGlow();
    if (glow) c.drawImage(glow, 0, 0);
    // very slow, gentle breathing of the warm air (no flicker)
    const breath = t === 0 ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.6);
    c.fillStyle = `rgba(233,183,123,${(0.025 + 0.015 * breath).toFixed(3)})`;
    c.fillRect(0, 0, W, H);
  } else {
    rect(c, LAMP.x + 2, LAMP.y - 1, 3, 5, '#4a4458');
    drawDim(c, 0.42);
    // faint cool spill from the exit sign / window keeps the steps readable
    c.fillStyle = 'rgba(142,172,200,0.04)';
    c.fillRect(0, 0, W, H);
  }
}

function paintBlack(c: Ctx) {
  rect(c, 0, 0, W, H, '#0e1120');
  const rnd = mulberry32(911);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rnd() * W);
    const y = Math.floor(rnd() * H);
    rect(c, x, y, 1, 1, rnd() > 0.5 ? '#171c2f' : '#141829');
    if (rnd() > 0.6) rect(c, x + 2, y + 1, 1, 1, '#171c2f');
  }
}

/** Static title card: `t` and `env` are part of the BackgroundDraw signature but unused. */
export function drawBlack(c: Ctx, t: number, env: SceneEnv) {
  void t;
  void env;
  blitLayer(c, 'bg_black_base', W, H, paintBlack);
}
