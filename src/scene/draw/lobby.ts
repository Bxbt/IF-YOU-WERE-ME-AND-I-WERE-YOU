/**
 * bg_lobby_floor6 (docs/09 §2) — the 6th-floor elevator lobby where the partner waits (ch2_b2–ch3).
 * Night, cool and quiet. The elevator door has 3 states (env.door): closed · ajar (pried, a thin
 * strip of warm emergency light leaks out) · open (the stuck car sits low in the shaft).
 * Static parts are cached per door state; only the leaking light breathes per frame.
 */
import { H, W, mulberry32 } from '../palette';
import { blitLayer, cachedLayer, type SceneEnv } from '../env';
import { drawDim, drawRain, flickerOn } from '../effects';

type Ctx = CanvasRenderingContext2D;
type Door = SceneEnv['door'];

const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

/** Checkerboard dither of `col` over a rectangle (only for cached layers). */
function dither(c: Ctx, x: number, y: number, w: number, h: number, col: string, phase = 0) {
  c.fillStyle = col;
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x + ((yy + phase) & 1); xx < x + w; xx += 2) c.fillRect(xx, yy, 1, 1);
  }
}

const CEIL = '#151829';
const WALL = '#2a2d48';
const WALL_D = '#22253d';
const WALL_L = '#363959';
const TILE_A = '#1e2136';
const TILE_B = '#242840';
const TILE_LINE = '#171a2c';
const STEEL = '#5a5c7a';
const STEEL_L = '#7c7ea0';
const STEEL_D = '#44465f';
const FRAME = '#3c3e5c';

const FLOOR_Y = 120;
const VX = 160; // vanishing point for floor tiles
const VY = 60;
const DOOR_X0 = 130; // inner opening x 130..190
const DOOR_X1 = 190;
const DOOR_Y0 = 40;

/** Floor in one-point perspective: tile rows grow towards the viewer. */
function paintFloor(c: Ctx) {
  rect(c, 0, FLOOR_Y, W, H - FLOOR_Y, TILE_A);
  const rows = [FLOOR_Y, 124, 129, 135, 142, 151, 162, H];
  for (let r = 0; r < rows.length - 1; r++) {
    for (let y = rows[r]!; y < rows[r + 1]!; y++) {
      const k = (y - VY) / (H - VY);
      for (let col = -8; col < 8; col++) {
        if ((col + r) & 1) continue;
        const xa = Math.round(VX + col * 40 * k);
        const xb = Math.round(VX + (col + 1) * 40 * k);
        rect(c, xa, y, xb - xa, 1, TILE_B);
      }
    }
    rect(c, 0, rows[r]!, W, 1, TILE_LINE);
  }
  // Grout lines towards the vanishing point
  for (let col = -8; col <= 8; col++) {
    for (let y = FLOOR_Y; y < H; y++) {
      const k = (y - VY) / (H - VY);
      rect(c, Math.round(VX + col * 40 * k), y, 1, 1, TILE_LINE);
    }
  }
  // Soft sheen from the ceiling light along the middle of the floor
  dither(c, 96, 136, 128, 30, 'rgba(164,155,203,0.07)');
}

function paintWindow(c: Ctx) {
  // Tall window on the right: night city
  const x = 240;
  const y = 30;
  const w = 58;
  const h = 70;
  rect(c, x - 3, y - 3, w + 6, h + 7, '#1a1c2e');
  rect(c, x, y, w, h, '#141a30');
  rect(c, x, y + 30, w, h - 30, '#18203a');
  dither(c, x, y + 26, w, 4, '#18203a');
  const rnd = mulberry32(606);
  // Far buildings
  let bx = x;
  while (bx < x + w) {
    const bw = 6 + Math.floor(rnd() * 9);
    const top = y + 34 + Math.floor(rnd() * 22);
    rect(c, bx, top, Math.min(bw, x + w - bx), y + h - top, rnd() < 0.5 ? '#1d2238' : '#202542');
    for (let wy = top + 3; wy < y + h - 2; wy += 4) {
      for (let wx = bx + 2; wx < Math.min(bx + bw, x + w) - 1; wx += 3) {
        if (rnd() < 0.22) rect(c, wx, wy, 1, 1, rnd() < 0.7 ? '#e9b77b' : '#a49bcb');
      }
    }
    bx += bw + 1;
  }
  // Mullions + sill
  rect(c, x + 28, y, 2, h, '#1a1c2e');
  rect(c, x, y + 34, w, 1, '#1a1c2e');
  rect(c, x - 4, y + h + 2, w + 8, 3, WALL_L);
  rect(c, x - 4, y + h + 5, w + 8, 1, WALL_D);
  // Cool reflection streaks on the glass
  for (let i = 0; i < 6; i++) rect(c, x + 4 + i, y + 18 - i, 1, 1, 'rgba(142,172,200,0.35)');
  for (let i = 0; i < 4; i++) rect(c, x + 34 + i, y + 50 - i, 1, 1, 'rgba(142,172,200,0.3)');
}

function paintLeft(c: Ctx) {
  // Dark corridor opening at the far left
  rect(c, 12, 34, 40, FLOOR_Y - 34, '#12152a');
  rect(c, 12, 34, 40, 2, WALL_L);
  rect(c, 10, 34, 2, FLOOR_Y - 34, WALL_L);
  rect(c, 52, 34, 2, FLOOR_Y - 34, WALL_D);
  for (let i = 0; i < 4; i++) rect(c, 18 + i * 2, 44 + i * 6, 28 - i * 4, 1, i % 2 ? '#171a30' : '#1a1e36');
  rect(c, 16, 92, 32, FLOOR_Y - 92, '#161a2e');
  dither(c, 16, 92, 32, 4, '#12152a');
  // Corridor ceiling lamp far away, dim
  rect(c, 28, 40, 8, 1, '#5a5684');
  // Fire-hose cabinet (no text)
  rect(c, 66, 60, 20, 26, '#3a2c3c');
  rect(c, 67, 61, 18, 24, '#5a3a44');
  rect(c, 68, 62, 16, 1, '#7a4c52');
  rect(c, 70, 66, 12, 12, '#3a2c3c');
  for (let a = 0; a < 3; a++) rect(c, 72, 68 + a * 3, 8, 1, '#8a5a58');
  // Potted plant
  rect(c, 94, 106, 14, 14, '#4a3b45');
  rect(c, 94, 106, 14, 2, '#5d4a52');
  rect(c, 96, 118, 10, 2, '#2a2235');
  const leaves = [
    [100, 84, 2, 22],
    [96, 88, 2, 14],
    [104, 90, 2, 14],
    [92, 92, 4, 2],
    [106, 94, 4, 2],
    [98, 80, 2, 6],
    [102, 86, 4, 2],
    [94, 96, 2, 8],
    [108, 98, 2, 8],
  ] as const;
  for (const [lx, ly, lw, lh] of leaves) rect(c, lx, ly, lw, lh, '#3c5a54');
  for (const [lx, ly] of leaves) rect(c, lx, ly, 1, 1, '#5e8070');
}

function paintElevatorFrame(c: Ctx) {
  // Recessed steel surround
  rect(c, DOOR_X0 - 8, DOOR_Y0 - 6, DOOR_X1 - DOOR_X0 + 16, FLOOR_Y - DOOR_Y0 + 6, FRAME);
  rect(c, DOOR_X0 - 8, DOOR_Y0 - 6, DOOR_X1 - DOOR_X0 + 16, 1, STEEL_L);
  rect(c, DOOR_X0 - 8, DOOR_Y0 - 6, 1, FLOOR_Y - DOOR_Y0 + 6, STEEL);
  rect(c, DOOR_X1 + 7, DOOR_Y0 - 6, 1, FLOOR_Y - DOOR_Y0 + 6, '#2a2c44');
  rect(c, DOOR_X0 - 3, DOOR_Y0 - 2, DOOR_X1 - DOOR_X0 + 6, FLOOR_Y - DOOR_Y0 + 2, '#24263c');
  // Threshold
  rect(c, DOOR_X0 - 6, FLOOR_Y, DOOR_X1 - DOOR_X0 + 12, 3, STEEL);
  rect(c, DOOR_X0 - 6, FLOOR_Y, DOOR_X1 - DOOR_X0 + 12, 1, STEEL_L);
  for (let x = DOOR_X0 - 4; x < DOOR_X1 + 6; x += 4) rect(c, x, FLOOR_Y + 1, 1, 2, STEEL_D);
  // Floor indicator plate above the door (blank — numbers live in HTML)
  rect(c, 146, 24, 28, 10, '#101220');
  rect(c, 147, 25, 26, 8, '#181a2b');
  rect(c, 150, 27, 1, 4, '#2a2c44');
  // Tiny down arrow lamp, dim (shape only, no text)
  rect(c, 166, 28, 3, 1, '#5a3a24');
  rect(c, 167, 29, 1, 1, '#5a3a24');
  // Call buttons (right of the door)
  rect(c, 204, 74, 8, 18, '#3c3e5c');
  rect(c, 205, 75, 6, 16, '#2a2c44');
  rect(c, 206, 77, 4, 4, STEEL);
  rect(c, 206, 84, 4, 4, '#8a6a4c');
  rect(c, 207, 85, 2, 2, '#e9b77b');
}

function paintDoorPanels(c: Ctx, gap: number) {
  const mid = (DOOR_X0 + DOOR_X1) / 2;
  const half = (DOOR_X1 - DOOR_X0) / 2;
  const lx1 = mid - Math.floor(gap / 2); // right edge of left panel
  const rx0 = mid + Math.ceil(gap / 2);
  const panel = (x0: number, x1: number, seamRight: boolean) => {
    const w = x1 - x0;
    if (w <= 0) return;
    rect(c, x0, DOOR_Y0, w, FLOOR_Y - DOOR_Y0, STEEL);
    // brushed steel: vertical streaks
    for (let x = x0 + 2; x < x1 - 1; x += 5) rect(c, x, DOOR_Y0 + 2, 1, FLOOR_Y - DOOR_Y0 - 4, '#636584');
    rect(c, x0, DOOR_Y0, w, 1, STEEL_L);
    rect(c, seamRight ? x1 - 1 : x0, DOOR_Y0, 1, FLOOR_Y - DOOR_Y0, seamRight ? STEEL_D : STEEL_L);
    // cool light from the window sliding down the panel
    dither(c, x0, DOOR_Y0 + 1, Math.min(w, 6), FLOOR_Y - DOOR_Y0 - 1, 'rgba(142,172,200,0.18)');
    // lower kick plate
    rect(c, x0, FLOOR_Y - 8, w, 8, STEEL_D);
    rect(c, x0, FLOOR_Y - 8, w, 1, '#6a6c8a');
  };
  // panels slide into the wall: clip to the opening
  c.save();
  c.beginPath();
  c.rect(DOOR_X0, DOOR_Y0, DOOR_X1 - DOOR_X0, FLOOR_Y - DOOR_Y0);
  c.clip();
  panel(lx1 - half, lx1, true);
  panel(rx0, rx0 + half, false);
  c.restore();
}

/** What is behind the door: dark shaft; the stuck car sits low with its emergency light on. */
function paintShaft(c: Ctx, gap: number) {
  if (gap <= 0) return;
  const mid = (DOOR_X0 + DOOR_X1) / 2;
  const x0 = mid - Math.floor(gap / 2);
  rect(c, x0, DOOR_Y0, gap, FLOOR_Y - DOOR_Y0, '#0b0d18');
  // Cables
  for (const cx of [mid - 6, mid - 2, mid + 3]) {
    if (cx >= x0 && cx < x0 + gap) rect(c, cx, DOOR_Y0, 1, 32, '#20233a');
  }
  // Car roof edge + lit interior (top part of the car, stuck between floors)
  const roof = 74;
  rect(c, x0, roof, gap, 3, '#2a2c44');
  rect(c, x0, roof, gap, 1, '#44465f');
  rect(c, x0, roof + 3, gap, FLOOR_Y - roof - 3, '#5a3c30');
  if (gap > 10) {
    rect(c, x0, roof + 3, gap, 3, '#e9b77b'); // car ceiling, emergency-lit
    for (let x = x0 + 2; x < x0 + gap - 2; x += 8) rect(c, x, roof + 8, 6, 30, '#4a3228'); // wall panels
    rect(c, x0, roof + 26, gap, 2, '#7a5a44'); // handrail
  }
}

/** Static layer per door state. */
function paintLobby(c: Ctx, door: Door) {
  const gap = door === 'closed' ? 0 : door === 'ajar' ? 4 : 44;
  rect(c, 0, 0, W, H, WALL);
  // Back wall: upper plain, lower wainscot
  dither(c, 0, 14, W, 10, WALL_D);
  rect(c, 0, 82, W, 2, WALL_L);
  rect(c, 0, 84, W, FLOOR_Y - 84, WALL_D);
  for (let x = 8; x < W; x += 24) rect(c, x, 86, 1, FLOOR_Y - 90, '#1e2136');
  rect(c, 0, FLOOR_Y - 4, W, 4, '#1a1c2e'); // skirting
  // Ceiling + light fixture housing
  rect(c, 0, 0, W, 14, CEIL);
  rect(c, 0, 14, W, 1, '#1d2036');
  rect(c, 112, 6, 96, 4, '#2e3046');
  rect(c, 112, 10, 96, 1, '#3c3e58');
  paintLeft(c);
  paintWindow(c);
  paintElevatorFrame(c);
  paintShaft(c, gap);
  paintDoorPanels(c, gap);
  paintFloor(c);
  // Re-draw threshold over the floor
  rect(c, DOOR_X0 - 6, FLOOR_Y, DOOR_X1 - DOOR_X0 + 12, 3, STEEL);
  rect(c, DOOR_X0 - 6, FLOOR_Y, DOOR_X1 - DOOR_X0 + 12, 1, STEEL_L);
  // Faint steel reflection of the door on the polished floor
  dither(c, DOOR_X0, FLOOR_Y + 3, DOOR_X1 - DOOR_X0, 10, 'rgba(124,126,160,0.10)', 1);
  // Vignette corners
  dither(c, 0, 0, 6, H, 'rgba(14,17,32,0.5)');
  dither(c, W - 6, 0, 6, H, 'rgba(14,17,32,0.5)');
}

/** Light leaking from the stuck car onto the lobby floor (cached per state, alpha breathes). */
function leakLayer(door: Door): HTMLCanvasElement | null {
  return cachedLayer(`lobby6_leak_${door}`, W, H, (g) => {
    const half = door === 'ajar' ? 2 : 22;
    const mid = 160;
    // strip in the gap itself
    if (door === 'ajar') {
      g.fillStyle = '#ffcf8a';
      g.fillRect(mid - 1, DOOR_Y0 + 6, 2, FLOOR_Y - DOOR_Y0 - 6);
      g.fillStyle = '#fff4d6';
      g.fillRect(mid, DOOR_Y0 + 20, 1, FLOOR_Y - DOOR_Y0 - 30);
    }
    // wedge of light on the floor, widening towards the viewer
    for (let y = FLOOR_Y + 3; y < H; y++) {
      const u = (y - FLOOR_Y) / (H - FLOOR_Y);
      const w = Math.round(half + u * (door === 'ajar' ? 14 : 40));
      const a = 0.36 * (1 - u * 0.8);
      g.fillStyle = `rgba(255,190,120,${a.toFixed(3)})`;
      for (let x = mid - w + (y & 1); x < mid + w; x += 2) g.fillRect(x, y, 1, 1);
      if (Math.abs(y - FLOOR_Y - 3) < 1) {
        g.fillStyle = 'rgba(255,207,138,0.6)';
        g.fillRect(mid - half, y, half * 2, 1);
      }
    }
    // glow on the door frame edges
    g.fillStyle = 'rgba(233,183,123,0.22)';
    for (let y = DOOR_Y0; y < FLOOR_Y; y += 2) {
      g.fillRect(mid - half - 2, y, 1, 1);
      g.fillRect(mid + half + 1, y + 1, 1, 1);
    }
  });
}

/** Ceiling light pool (cached). */
function ceilingGlow(): HTMLCanvasElement | null {
  return cachedLayer('lobby6_ceiling_glow', W, H, (g) => {
    const rings = [
      { r: 70, a: 0.06 },
      { r: 120, a: 0.05 },
    ];
    for (const ring of rings) {
      g.fillStyle = `rgba(243,235,221,${ring.a})`;
      for (let y = 10; y < H; y++) {
        for (let x = y & 1; x < W; x += 2) {
          const dx = x - 160;
          const dy = (y - 10) * 0.9;
          if (dx * dx + dy * dy < ring.r * ring.r) g.fillRect(x, y, 1, 1);
        }
      }
    }
  });
}

export function drawLobbyFloor6(c: Ctx, t: number, env: SceneEnv) {
  const door: Door = env.door ?? 'closed';
  blitLayer(c, `lobby6_base_${door}`, W, H, (g) => paintLobby(g, door));
  drawRain(c, { x: 240, y: 30, w: 58, h: 70 }, env.rain, t, 61, 'rgba(142,172,200,0.45)');

  // Ceiling light: cool, slightly dim; flicker ≤ 2 changes/s.
  const on = env.light === 'flicker' ? flickerOn(t, 61) : env.light !== 'off';
  if (on) {
    rect(c, 112, 6, 96, 4, '#d8d4e6');
    rect(c, 112, 10, 96, 1, '#f3ebdd');
    const glow = ceilingGlow();
    if (glow) c.drawImage(glow, 0, 0);
  } else {
    drawDim(c, 0.4);
  }

  if (door !== 'closed') {
    const leak = leakLayer(door);
    if (leak) {
      c.save();
      c.globalAlpha = 0.75 + 0.25 * Math.sin(t * 2.1); // breathes with the car's emergency light
      c.drawImage(leak, 0, 0);
      c.restore();
    }
  }
}
