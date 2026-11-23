/**
 * Storyline 2 "อีกด้านของเรื่อง" backgrounds (docs/09 §2, M16) — same palette and pixel scale as
 * the main story, quieter moods: a dim bedroom with rain on the glass, an empty balcony at night,
 * a bathroom mirror in the morning, and a quiet street at sunrise. Static layers are painted once
 * and cached; only rain, lamps and the rising sun move.
 */
import { H, W, ditherBands, mulberry32 } from '../palette';
import { blitLayer, cachedLayer, type SceneEnv } from '../env';
import { drawDim, drawRain } from '../effects';

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

/** Dithered round glow (lamps, sun), drawn into its own cached layer. */
function glowLayer(key: string, cx: number, cy: number, rgb: string, rings: { r: number; a: number }[]) {
  return cachedLayer(key, W, H, (g) => {
    for (const ring of rings) {
      g.fillStyle = `rgba(${rgb},${ring.a})`;
      for (let y = Math.max(0, cy - ring.r); y < Math.min(H, cy + ring.r); y++) {
        for (let x = Math.max(0, cx - ring.r) + (y & 1); x < Math.min(W, cx + ring.r); x += 2) {
          const dx = x - cx;
          const dy = (y - cy) * 1.15;
          if (dx * dx + dy * dy < ring.r * ring.r) g.fillRect(x, y, 1, 1);
        }
      }
    }
  });
}

/** A strip of far city: blocks with scattered lit windows. */
function city(c: Ctx, seed: number, y0: number, y1: number, body: string, lit: string[], density: number) {
  const rnd = mulberry32(seed);
  let x = -3;
  while (x < W) {
    const bw = 10 + Math.floor(rnd() * 18);
    const top = y0 + Math.floor(rnd() * (y1 - y0) * 0.6);
    rect(c, x, top, bw, y1 - top, body);
    for (let wy = top + 3; wy < y1 - 1; wy += 4) {
      for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
        const r = rnd();
        if (r < density) rect(c, wx, wy, 1, 1, lit[Math.floor(rnd() * lit.length)]!);
      }
    }
    x += bw;
  }
}

// ---------------------------------------------------------------- bg_bedroom_night

const BED_WIN = { x: 176, y: 22, w: 112, h: 78 };

function paintBedroom(c: Ctx) {
  ditherBands(c, [
    { y: 0, c: 1 },
    { y: 60, c: 2 },
    { y: 132, c: 12 },
  ]);
  // Wall texture: faint vertical seams
  for (let x = 6; x < W; x += 40) dither(c, x, 0, 1, 132, 'rgba(90,86,132,0.25)');
  // Window: night city blurred by rain
  const { x, y, w, h } = BED_WIN;
  rect(c, x - 4, y - 4, w + 8, h + 8, '#2c2f4f');
  ditherBands(
    c,
    [
      { y, c: 0 },
      { y: y + 40, c: 2 },
    ],
    x,
    x + w,
  );
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  city(c, 812, y + 34, y + h, '#171b31', ['#e9b77b', '#8eacc8', '#d9a3a7'], 0.18);
  // Blurry bokeh of far lights behind wet glass
  const rnd = mulberry32(77);
  for (let i = 0; i < 18; i++) {
    const bx = x + Math.floor(rnd() * w);
    const by = y + 30 + Math.floor(rnd() * (h - 34));
    const col = rnd() < 0.6 ? 'rgba(233,183,123,0.28)' : 'rgba(142,172,200,0.25)';
    dither(c, bx - 2, by - 2, 5, 5, col, i & 1);
  }
  // Water drops resting on the glass
  for (let i = 0; i < 40; i++) {
    const dx = x + Math.floor(rnd() * w);
    const dy = y + Math.floor(rnd() * h);
    rect(c, dx, dy, 1, 2, 'rgba(164,155,203,0.45)');
    rect(c, dx, dy + 2, 1, 1, 'rgba(243,235,221,0.35)');
  }
  c.restore();
  // Frame + cross bar + sill
  rect(c, x - 4, y - 4, w + 8, 3, '#3a3a5e');
  rect(c, x + w / 2 - 1, y, 2, h, '#3a3a5e');
  rect(c, x - 6, y + h + 2, w + 12, 4, '#4b4f7a');
  rect(c, x - 6, y + h + 6, w + 12, 1, '#202440');
  // Curtain on the left of the window
  rect(c, x - 18, y - 8, 14, h + 18, '#3c3f6a');
  for (let i = 0; i < 4; i++) rect(c, x - 16 + i * 3, y - 6, 1, h + 14, '#2e3152');

  // Bed (left), seen from the foot: headboard, pillows, blanket
  rect(c, 8, 96, 150, 10, '#2e2a44'); // headboard
  rect(c, 8, 96, 150, 2, '#4a4468');
  rect(c, 14, 106, 40, 12, '#cfc6e4'); // pillow
  rect(c, 14, 116, 40, 2, '#a49bcb');
  rect(c, 60, 106, 40, 12, '#bfb5d9');
  rect(c, 60, 116, 40, 2, '#9a90c0');
  rect(c, 6, 118, 156, 40, '#5a5684'); // blanket
  dither(c, 6, 118, 156, 6, '#6a66a0');
  for (let i = 0; i < 6; i++) rect(c, 20 + i * 24, 124 + (i % 2) * 6, 14, 1, '#4b4774'); // folds
  rect(c, 6, 156, 156, 4, '#3a3660'); // blanket edge
  rect(c, 6, 160, 156, 10, '#241f38'); // bed frame
  // Bedside table + lamp (right of the bed)
  rect(c, 168, 120, 26, 34, '#3a2f3a');
  rect(c, 168, 120, 26, 2, '#5a4652');
  rect(c, 172, 132, 18, 1, '#2a2230');
  rect(c, 178, 106, 6, 14, '#8a7a88'); // lamp base
  rect(c, 172, 96, 18, 10, '#5a4b5e'); // shade (off)
  // Phone face down on the table
  rect(c, 180, 117, 10, 3, '#171c2f');
  // Floor
  rect(c, 0, 160, W, 20, '#141829');
  dither(c, 0, 160, W, 2, '#1d2238');
  // Rug
  rect(c, 196, 164, 96, 10, '#2e3152');
  dither(c, 196, 164, 96, 10, '#3a3d63', 1);
}

export function drawBedroomNight(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'bedroom_night', W, H, paintBedroom);
  drawRain(c, BED_WIN, env.rain, t, 61, 'rgba(142,172,200,0.4)');
  if (env.lamp === 'warm') {
    const glow = glowLayer('bedroom_lamp', 181, 100, '233,183,123', [
      { r: 14, a: 0.42 },
      { r: 34, a: 0.22 },
      { r: 70, a: 0.12 },
      { r: 120, a: 0.06 },
    ]);
    if (glow) {
      c.save();
      c.globalAlpha = 0.93 + 0.07 * Math.sin(t * 0.7);
      c.drawImage(glow, 0, 0);
      c.restore();
    }
    rect(c, 172, 96, 18, 10, '#ffcf8a');
    rect(c, 173, 94, 16, 2, '#fff4d6');
  } else {
    drawDim(c, 0.18);
  }
}

// ---------------------------------------------------------------- bg_balcony_night

const RAIL_Y = 112;

function paintBalcony(c: Ctx) {
  ditherBands(c, [
    { y: 0, c: 0 },
    { y: 34, c: 1 },
    { y: 66, c: 2 },
    { y: 88, c: 3 },
  ]);
  const rnd = mulberry32(4242);
  for (let i = 0; i < 70; i++) {
    const sx = Math.floor(rnd() * W);
    const sy = Math.floor(rnd() * 70);
    rect(c, sx, sy, 1, 1, rnd() < 0.3 ? '#f3ebdd' : '#5a5684');
  }
  // City glow and two layers of buildings
  dither(c, 0, 76, W, 12, 'rgba(164,155,203,0.14)');
  city(c, 9001, 70, RAIL_Y + 8, '#1e2340', ['#5a5684', '#8eacc8'], 0.1);
  city(c, 9002, 86, RAIL_Y + 8, '#161a2f', ['#e9b77b', '#e9b77b', '#8eacc8', '#d9a3a7'], 0.2);
  // Balcony floor
  rect(c, 0, 150, W, 30, '#2a2c44');
  for (let x = 0; x < W; x += 20) rect(c, x, 150, 1, 30, '#22243a');
  rect(c, 0, 164, W, 1, '#22243a');
  rect(c, 0, 150, W, 1, '#3a3d5a');
  // Railing: top bar, balusters, glass panel tint
  dither(c, 0, RAIL_Y + 4, W, 34, 'rgba(142,172,200,0.08)');
  rect(c, 0, RAIL_Y, W, 4, '#5a5f80');
  rect(c, 0, RAIL_Y, W, 1, '#8a8fb0');
  for (let x = 4; x < W; x += 12) rect(c, x, RAIL_Y + 4, 2, 34, '#3e4262');
  rect(c, 0, RAIL_Y + 37, W, 3, '#3e4262');
  // Sliding door (left) with warm light from inside
  rect(c, 0, 0, 46, 150, '#20233a');
  rect(c, 4, 6, 38, 144, '#3a3248');
  dither(c, 4, 6, 38, 144, 'rgba(233,183,123,0.16)');
  dither(c, 46, 150, 40, 6, 'rgba(233,183,123,0.12)'); // light spilling onto the floor
  rect(c, 4, 6, 38, 2, '#5a4b5e');
  rect(c, 22, 6, 2, 144, '#20233a');
  rect(c, 44, 0, 3, 150, '#14172a');
  // Potted plant (right)
  rect(c, 282, 132, 22, 18, '#6b4a3a');
  rect(c, 280, 130, 26, 3, '#7d5a48');
  const leaves = mulberry32(31);
  for (let i = 0; i < 26; i++) {
    const lx = 284 + Math.floor(leaves() * 20);
    const ly = 104 + Math.floor(leaves() * 28);
    rect(c, lx, ly, 3, 2, leaves() < 0.5 ? '#4e6b52' : '#6f8f6a');
  }
}

export function drawBalconyNight(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'balcony_night', W, H, paintBalcony);
  // A few far windows switch on and off very slowly (≤ 1 change every few seconds).
  const slot = Math.floor(t / 3);
  const rnd = mulberry32(slot * 31 + 7);
  for (let i = 0; i < 4; i++) {
    const wx = 60 + Math.floor(rnd() * 200);
    const wy = 92 + Math.floor(rnd() * 18);
    rect(c, wx, wy, 1, 1, rnd() < 0.5 ? '#e9b77b' : '#161a2f');
  }
  drawRain(c, { x: 46, y: 0, w: W - 46, h: 150 }, env.rain, t, 17);
}

// ---------------------------------------------------------------- bg_bathroom_mirror

const MIRROR = { x: 104, y: 18, w: 112, h: 84 };

function paintBathroom(c: Ctx) {
  // Pale tiles, cool morning light
  rect(c, 0, 0, W, 120, '#5f6f8c');
  for (let y = 0; y < 120; y += 10) rect(c, 0, y, W, 1, '#53627e');
  for (let y = 0; y < 120; y += 10)
    for (let x = (y / 10) % 2 ? 5 : 0; x < W; x += 10) rect(c, x, y, 1, 10, '#53627e');
  dither(c, 0, 0, W, 120, 'rgba(243,235,221,0.06)');
  // Small high window (right) letting in morning light
  rect(c, 248, 10, 52, 26, '#3c4660');
  rect(c, 251, 13, 46, 20, '#c9d6e6');
  dither(c, 251, 13, 46, 20, '#f3ebdd', 1);
  rect(c, 273, 13, 2, 20, '#3c4660');
  // Light beam from the window
  c.fillStyle = 'rgba(243,235,221,0.08)';
  for (let y = 36; y < 140; y++) {
    const x0 = 250 - Math.floor((y - 36) * 0.9);
    for (let x = x0 + (y & 1); x < x0 + 40; x += 2) c.fillRect(x, y, 1, 1);
  }
  // Mirror: frame, cool reflection of the room, a soft highlight
  const { x, y, w, h } = MIRROR;
  rect(c, x - 5, y - 5, w + 10, h + 10, '#c8b48a');
  rect(c, x - 4, y - 4, w + 8, h + 8, '#9c8762');
  ditherBands(
    c,
    [
      { y, c: 4 },
      { y: y + 50, c: 5 },
    ],
    x,
    x + w,
  );
  // Reflected tiles (fainter)
  for (let yy = y; yy < y + h; yy += 10) rect(c, x, yy, w, 1, 'rgba(83,98,126,0.6)');
  // Reflected door frame
  rect(c, x + 12, y + 8, 22, h - 8, '#4b4f7a');
  rect(c, x + 14, y + 10, 18, h - 10, '#3a3d63');
  // Highlight streaks
  for (let i = 0; i < 18; i++) rect(c, x + w - 30 + i, y + 6 + i, 1, 1, 'rgba(243,235,221,0.5)');
  for (let i = 0; i < 10; i++) rect(c, x + w - 22 + i, y + 6 + i, 1, 1, 'rgba(243,235,221,0.35)');
  // Fog at the mirror edges
  dither(c, x, y + h - 10, w, 10, 'rgba(243,235,221,0.18)');
  dither(c, x, y, 6, h, 'rgba(243,235,221,0.12)', 1);
  dither(c, x + w - 6, y, 6, h, 'rgba(243,235,221,0.12)');
  // Counter + sink
  rect(c, 70, 112, 180, 10, '#d8d2c6');
  rect(c, 70, 112, 180, 2, '#f3ebdd');
  rect(c, 70, 122, 180, 26, '#8a7a6a');
  rect(c, 70, 122, 180, 2, '#6e604f');
  rect(c, 140, 113, 40, 6, '#b9b2a6'); // basin
  rect(c, 157, 104, 6, 9, '#a9b4c4'); // faucet
  rect(c, 153, 104, 14, 2, '#c9d4e4');
  // Cup with two toothbrushes, a towel
  rect(c, 196, 102, 8, 10, '#8eacc8');
  rect(c, 197, 94, 1, 8, '#d9a3a7');
  rect(c, 201, 93, 1, 9, '#e9b77b');
  rect(c, 84, 98, 14, 14, '#d9a3a7');
  rect(c, 84, 98, 14, 2, '#e9c1c4');
  // Floor tiles
  rect(c, 0, 120, 70, 60, '#3a3d56');
  rect(c, 250, 120, 70, 60, '#3a3d56');
  rect(c, 0, 148, W, 32, '#33364e');
  for (let x = 0; x < W; x += 16) rect(c, x, 148, 1, 32, '#2a2c42');
  for (let yy = 148; yy < H; yy += 10) rect(c, 0, yy, W, 1, '#2a2c42');
}

export function drawBathroomMirror(c: Ctx, t: number) {
  blitLayer(c, 'bathroom_mirror', W, H, paintBathroom);
  // Mist on the glass breathes very slowly.
  const a = 0.05 + 0.03 * Math.sin(t * 0.4);
  c.fillStyle = `rgba(243,235,221,${a.toFixed(3)})`;
  for (let y = MIRROR.y; y < MIRROR.y + MIRROR.h; y += 2) c.fillRect(MIRROR.x, y, MIRROR.w, 1);
}

// ---------------------------------------------------------------- bg_street_sunrise

const HORIZON = 104;

function paintStreetSky(c: Ctx) {
  ditherBands(c, [
    { y: 0, c: 3 },
    { y: 26, c: 5 },
    { y: 52, c: 6 },
  ]);
  // Warm band near the horizon
  rect(c, 0, 72, W, HORIZON - 72, '#d9a3a7');
  dither(c, 0, 68, W, 4, '#d9a3a7');
  rect(c, 0, 90, W, HORIZON - 90, '#e9b77b');
  dither(c, 0, 86, W, 4, '#e9b77b');
  // Thin clouds
  const rnd = mulberry32(2611);
  for (let i = 0; i < 7; i++) {
    const cx = Math.floor(rnd() * W);
    const cy = 30 + Math.floor(rnd() * 40);
    const cw = 20 + Math.floor(rnd() * 30);
    rect(c, cx, cy, cw, 2, 'rgba(243,235,221,0.35)');
    rect(c, cx + 6, cy - 1, cw - 12, 1, 'rgba(243,235,221,0.25)');
  }
}

function paintStreetFront(c: Ctx) {
  rect(c, 0, HORIZON, W, H - HORIZON, '#2e2f4a'); // ground behind everything
  // Buildings: left and right, stepping down toward the vanishing point
  const blocks: [number, number, number, string][] = [
    [0, 30, 40, '#2a2c48'],
    [38, 50, 30, '#303256'],
    [66, 66, 26, '#3a3a5e'],
    [90, 78, 18, '#4b4b72'],
    [218, 80, 16, '#4b4b72'],
    [232, 68, 26, '#3a3a5e'],
    [256, 48, 32, '#303256'],
    [286, 26, 34, '#2a2c48'],
  ];
  for (const [bx, top, bw, col] of blocks) {
    rect(c, bx, top, bw, 150 - top, col);
    rect(c, bx, top, bw, 1, '#5a5684');
    const rnd = mulberry32(bx * 13 + 5);
    for (let wy = top + 4; wy < 140; wy += 6) {
      for (let wx = bx + 3; wx < bx + bw - 3; wx += 5) {
        const r = rnd();
        rect(c, wx, wy, 2, 3, r < 0.12 ? '#e9b77b' : '#232541');
      }
    }
  }
  // Road converging to the horizon
  c.fillStyle = '#3a3a52';
  for (let y = HORIZON; y < H; y++) {
    const k = (y - HORIZON) / (H - HORIZON);
    const half = Math.round(12 + k * 150);
    c.fillRect(160 - half, y, half * 2, 1);
  }
  // Sidewalks
  c.fillStyle = '#56577a';
  for (let y = HORIZON + 6; y < H; y++) {
    const k = (y - HORIZON) / (H - HORIZON);
    const half = Math.round(12 + k * 150);
    const sw = Math.round(2 + k * 30);
    c.fillRect(160 - half - sw, y, sw, 1);
    c.fillRect(160 + half, y, sw, 1);
  }
  // Centre dashes
  for (let i = 0; i < 6; i++) {
    const y0 = HORIZON + 4 + i * i * 2 + i * 4;
    const len = 1 + i;
    rect(c, 159, y0, 2, len, '#e9b77b');
  }
  // Warm light on the wet road — only inside the road, narrowing toward the viewer
  c.fillStyle = 'rgba(233,183,123,0.22)';
  for (let y = HORIZON; y < HORIZON + 40; y++) {
    const k = (y - HORIZON) / (H - HORIZON);
    const half = Math.max(1, Math.round((12 + k * 150) * (0.5 - (y - HORIZON) / 100)));
    for (let x = 160 - half + (y & 1); x < 160 + half; x += 2) c.fillRect(x, y, 1, 1);
  }
  // Lamp posts (left and right), lights already off
  const posts: [number, number, number][] = [
    [70, 92, 2],
    [44, 84, 3],
    [250, 92, 2],
    [276, 84, 3],
  ];
  for (const [px, top, wdt] of posts) {
    rect(c, px, top, wdt, 150 - top, '#232541');
    rect(c, px - 2, top, wdt + 4, 2, '#232541');
  }
}

export function drawStreetSunrise(c: Ctx, t: number) {
  blitLayer(c, 'street_sky', W, H, paintStreetSky);
  // The sun rises a few pixels over the first half minute, then stays.
  const rise = Math.min(t * 0.25, 8);
  const sunY = HORIZON - 2 - rise;
  const glow = glowLayer('street_sun_glow', 160, HORIZON - 6, '243,235,221', [
    { r: 18, a: 0.3 },
    { r: 40, a: 0.16 },
    { r: 80, a: 0.08 },
  ]);
  if (glow) c.drawImage(glow, 0, -Math.round(rise));
  for (let yy = -9; yy <= 9; yy++) {
    for (let xx = -9; xx <= 9; xx++) {
      if (xx * xx + yy * yy <= 81 && sunY + yy < HORIZON)
        rect(c, 160 + xx, Math.round(sunY + yy), 1, 1, xx * xx + yy * yy > 60 ? '#ffcf8a' : '#fff4d6');
    }
  }
  blitLayer(c, 'street_front', W, H, paintStreetFront);
}
