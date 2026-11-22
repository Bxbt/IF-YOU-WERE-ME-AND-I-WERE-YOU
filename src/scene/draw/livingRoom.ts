/**
 * bg_living_room_morning / bg_living_room_night (docs/09 §2) — the couple's living room (ch4).
 * One room geometry painted with two palettes, so night reads as the same room ("palette variant").
 * Sofa (left) and armchair (right) face the open floor in the middle where the couple stand / swap
 * seats; two mugs sit on the low table. Morning: a sun patch drifts slowly over the floor.
 * Night: the floor lamp glows when env.lamp === 'warm'.
 */
import { H, W, mulberry32 } from '../palette';
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

interface RoomPalette {
  wall: string; wallD: string; wallL: string; trim: string;
  floor: string; floorD: string; floorL: string;
  sky0: string; sky1: string; sky2: string; city: string; cityLit: string;
  frame: string; curtain: string; curtainD: string;
  sofa: string; sofaD: string; sofaL: string; cushion: string;
  wood: string; woodD: string; woodL: string;
  leaf: string; leafD: string; leafL: string; pot: string;
  rug: string; rugD: string; rugL: string;
  mug1: string; mug2: string; book: string[];
  shade: string; art1: string; art2: string;
  night: boolean;
}

const MORNING: RoomPalette = {
  wall: '#6a6390', wallD: '#5a5684', wallL: '#7d76a2', trim: '#4a466e',
  floor: '#6e5a62', floorD: '#5a4854', floorL: '#826c70',
  sky0: '#bcd0e2', sky1: '#e8d9c4', sky2: '#f3ebdd', city: '#9aa6c4', cityLit: '#f3ebdd',
  frame: '#f3ebdd', curtain: '#e5c7b8', curtainD: '#c9a3a2',
  sofa: '#8eacc8', sofaD: '#6f8cab', sofaL: '#b0c6da', cushion: '#d9a3a7',
  wood: '#8a6a5c', woodD: '#6a5050', woodL: '#a8846c',
  leaf: '#6e9a7c', leafD: '#4e7462', leafL: '#9cc09a', pot: '#d98e72',
  rug: '#c49aa6', rugD: '#a87e90', rugL: '#dcb6b8',
  mug1: '#f3ebdd', mug2: '#e9b77b', book: ['#d9a3a7', '#8eacc8', '#e9b77b', '#a49bcb', '#f3ebdd'],
  shade: '#f3ebdd', art1: '#e9b77b', art2: '#8eacc8',
  night: false,
};

const NIGHT: RoomPalette = {
  wall: '#2c2d4a', wallD: '#24253f', wallL: '#363858', trim: '#1c1d33',
  floor: '#2a2436', floorD: '#211c2e', floorL: '#342c40',
  sky0: '#0e1120', sky1: '#171c2f', sky2: '#202440', city: '#1d2238', cityLit: '#e9b77b',
  frame: '#4a4a6e', curtain: '#5a4a64', curtainD: '#423852',
  sofa: '#3c4e6c', sofaD: '#2e3c56', sofaL: '#4e6280', cushion: '#7a5a6a',
  wood: '#3e3240', woodD: '#2e2634', woodL: '#4e3e4c',
  leaf: '#2e4a46', leafD: '#223836', leafL: '#3e5e56', pot: '#6a4a4a',
  rug: '#5a4458', rugD: '#4a384a', rugL: '#6a5066',
  mug1: '#a49bcb', mug2: '#8a6a5c', book: ['#6a4a5a', '#3c4e6c', '#6a5240', '#4e4a70', '#6a6478'],
  shade: '#d9c4a4', art1: '#7a6050', art2: '#3c4e6c',
  night: true,
};

const FLOOR_Y = 112;
const WIN = { x: 26, y: 18, w: 70, h: 58 };

function paintWindow(c: Ctx, p: RoomPalette) {
  const { x, y, w, h } = WIN;
  // Sky with dithered bands
  rect(c, x, y, w, h, p.sky0);
  rect(c, x, y + 22, w, h - 22, p.sky1);
  dither(c, x, y + 18, w, 4, p.sky1);
  rect(c, x, y + 42, w, h - 42, p.sky2);
  dither(c, x, y + 38, w, 4, p.sky2);
  const rnd = mulberry32(44);
  if (p.night) {
    for (let i = 0; i < 14; i++) rect(c, x + Math.floor(rnd() * w), y + Math.floor(rnd() * 30), 1, 1, rnd() < 0.3 ? '#e9b77b' : '#a49bcb');
    // small moon
    for (let my = -3; my <= 3; my++) {
      for (let mx = -3; mx <= 3; mx++) {
        if (mx * mx + my * my <= 10 && (mx - 2) * (mx - 2) + (my + 1) * (my + 1) > 6) rect(c, x + 54 + mx, y + 10 + my, 1, 1, '#f3ebdd');
      }
    }
  } else {
    // soft sun-washed clouds
    rect(c, x + 8, y + 12, 16, 2, '#f3ebdd');
    rect(c, x + 12, y + 10, 8, 2, '#f3ebdd');
    rect(c, x + 44, y + 20, 14, 2, '#fff4d6');
  }
  // Rooftops beyond
  let bx = x;
  while (bx < x + w) {
    const bw = 7 + Math.floor(rnd() * 10);
    const top = y + 38 + Math.floor(rnd() * 12);
    rect(c, bx, top, Math.min(bw, x + w - bx), y + h - top, p.city);
    for (let wy = top + 3; wy < y + h - 2; wy += 4) {
      for (let wx = bx + 2; wx < Math.min(bx + bw, x + w) - 1; wx += 3) {
        if (rnd() < (p.night ? 0.3 : 0.15)) rect(c, wx, wy, 1, 1, p.night ? p.cityLit : p.wallL);
      }
    }
    bx += bw + 1;
  }
  // Frame + mullions + sill
  rect(c, x - 3, y - 3, w + 6, 3, p.frame);
  rect(c, x - 3, y + h, w + 6, 3, p.frame);
  rect(c, x - 3, y, 3, h, p.frame);
  rect(c, x + w, y, 3, h, p.frame);
  rect(c, x + w / 2 - 1, y, 2, h, p.frame);
  rect(c, x, y + 26, w, 2, p.frame);
  rect(c, x - 5, y + h + 3, w + 10, 2, p.woodL);
  rect(c, x - 5, y + h + 5, w + 10, 1, p.woodD);
  // Glass glint
  for (let i = 0; i < 5; i++) rect(c, x + 4 + i, y + 22 - i, 1, 1, 'rgba(255,244,214,0.5)');
  // Little plant on the sill
  rect(c, x + 6, y + h - 5, 7, 5, p.pot);
  rect(c, x + 7, y + h - 9, 2, 4, p.leaf);
  rect(c, x + 10, y + h - 11, 2, 6, p.leafL);
  rect(c, x + 5, y + h - 8, 2, 2, p.leafD);
  // Curtains, gathered
  for (const [cx, dir] of [[x - 10, 1], [x + w + 2, -1]] as const) {
    rect(c, cx, y - 6, 9, h + 18, p.curtain);
    for (let k = 1; k < 9; k += 3) rect(c, cx + k, y - 4, 1, h + 16, p.curtainD);
    rect(c, dir > 0 ? cx + 8 : cx, y - 6, 1, h + 18, p.curtainD);
    rect(c, cx - 1, y + 30, 11, 2, p.curtainD); // tie-back
  }
  // Rod
  rect(c, x - 14, y - 8, w + 28, 2, p.woodD);
}

function paintShelf(c: Ctx, p: RoomPalette) {
  const x = 214;
  const y = 22;
  rect(c, x, y, 58, 64, p.woodD);
  rect(c, x + 2, y + 2, 54, 60, p.trim);
  const rnd = mulberry32(9);
  for (let s = 0; s < 3; s++) {
    const sy = y + 20 + s * 20;
    rect(c, x + 2, sy, 54, 2, p.wood);
    let bx = x + 4;
    while (bx < x + 52) {
      if (rnd() < 0.18) {
        bx += 5;
        continue;
      }
      const bh = 10 + Math.floor(rnd() * 6);
      const bw = 2 + Math.floor(rnd() * 3);
      rect(c, bx, sy - bh, bw, bh, p.book[Math.floor(rnd() * p.book.length)]!);
      rect(c, bx, sy - bh, 1, bh, 'rgba(255,255,255,0.08)');
      bx += bw + 1;
    }
  }
  // Trailing plant on top
  rect(c, x + 40, y - 6, 10, 6, p.pot);
  for (let i = 0; i < 6; i++) rect(c, x + 46 + (i % 2), y - 2 + i * 4, 2, 3, i % 2 ? p.leafD : p.leaf);
  rect(c, x + 38, y - 10, 3, 4, p.leaf);
  rect(c, x + 43, y - 12, 3, 6, p.leafL);
  // Small photo frame on top
  rect(c, x + 6, y - 9, 10, 9, p.wood);
  rect(c, x + 7, y - 8, 8, 7, p.art2);
  rect(c, x + 8, y - 4, 6, 3, p.art1);
}

function paintSofa(c: Ctx, p: RoomPalette) {
  const x = 8;
  const y = 92;
  const w = 92;
  // back
  rect(c, x + 4, y, w - 8, 18, p.sofa);
  rect(c, x + 4, y, w - 8, 2, p.sofaL);
  // cushions
  for (let i = 0; i < 2; i++) {
    const cx = x + 8 + i * 40;
    rect(c, cx, y + 3, 36, 14, p.sofaL);
    rect(c, cx + 1, y + 4, 34, 12, p.sofa);
    rect(c, cx + 1, y + 15, 34, 1, p.sofaD);
  }
  // throw pillow + blanket
  rect(c, x + 12, y + 6, 10, 9, p.cushion);
  rect(c, x + 12, y + 6, 10, 1, '#f3ebdd');
  rect(c, x + 64, y + 14, 20, 14, p.curtain);
  for (let k = 0; k < 20; k += 4) rect(c, x + 64 + k, y + 14, 1, 14, p.curtainD);
  // seat
  rect(c, x, y + 18, w, 10, p.sofaL);
  rect(c, x + 2, y + 19, w - 4, 8, p.sofa);
  rect(c, x + w / 2, y + 19, 1, 8, p.sofaD);
  // arms
  rect(c, x - 2, y + 8, 8, 24, p.sofaD);
  rect(c, x - 2, y + 8, 8, 2, p.sofaL);
  rect(c, x + w - 6, y + 8, 8, 24, p.sofaD);
  rect(c, x + w - 6, y + 8, 8, 2, p.sofaL);
  // base + legs
  rect(c, x, y + 28, w, 4, p.sofaD);
  rect(c, x + 2, y + 32, 3, 3, p.woodD);
  rect(c, x + w - 5, y + 32, 3, 3, p.woodD);
  // shadow
  dither(c, x - 2, y + 35, w + 4, 3, 'rgba(14,17,32,0.35)');
}

function paintArmchair(c: Ctx, p: RoomPalette) {
  const x = 226;
  const y = 94;
  rect(c, x + 4, y, 40, 20, p.sofa);
  rect(c, x + 4, y, 40, 2, p.sofaL);
  rect(c, x + 8, y + 4, 32, 12, p.sofaL);
  rect(c, x + 9, y + 5, 30, 10, p.sofa);
  rect(c, x + 26, y + 6, 9, 8, p.cushion);
  rect(c, x + 26, y + 6, 9, 1, '#f3ebdd');
  rect(c, x + 2, y + 18, 44, 8, p.sofaL);
  rect(c, x + 3, y + 19, 42, 7, p.sofa);
  rect(c, x - 2, y + 8, 8, 22, p.sofaD);
  rect(c, x - 2, y + 8, 8, 2, p.sofaL);
  rect(c, x + 42, y + 8, 8, 22, p.sofaD);
  rect(c, x + 42, y + 8, 8, 2, p.sofaL);
  rect(c, x, y + 26, 48, 4, p.sofaD);
  rect(c, x + 2, y + 30, 3, 3, p.woodD);
  rect(c, x + 43, y + 30, 3, 3, p.woodD);
  dither(c, x - 2, y + 33, 52, 3, 'rgba(14,17,32,0.35)');
}

function paintLamp(c: Ctx, p: RoomPalette) {
  // Floor lamp right of the armchair: shade top at (292, 50)
  rect(c, 291, 62, 2, 62, p.woodD);
  rect(c, 286, 124, 12, 3, p.woodD);
  rect(c, 284, 46, 16, 3, p.shade);
  rect(c, 283, 49, 18, 10, p.shade);
  rect(c, 282, 59, 20, 2, p.curtainD);
  dither(c, 283, 49, 4, 10, 'rgba(14,17,32,0.15)');
}

function paintBigPlant(c: Ctx, p: RoomPalette) {
  // Monstera-like plant in the corner by the shelf
  rect(c, 194, 100, 14, 14, p.pot);
  rect(c, 194, 100, 14, 2, '#f3ebdd');
  rect(c, 196, 112, 10, 2, p.woodD);
  const leaves = [
    [200, 70, 3, 30], [192, 76, 6, 4], [186, 80, 6, 4], [204, 74, 6, 4], [208, 78, 6, 4],
    [196, 64, 6, 4], [190, 88, 6, 4], [206, 88, 6, 4], [200, 60, 4, 6], [194, 70, 3, 10], [206, 66, 3, 12],
  ] as const;
  for (const [lx, ly, lw, lh] of leaves) rect(c, lx, ly, lw, lh, p.leaf);
  for (const [lx, ly, lw] of leaves) rect(c, lx, ly, lw, 1, p.leafL);
  for (const [lx, ly, , lh] of leaves) rect(c, lx, ly + lh - 1, 2, 1, p.leafD);
}

function paintTable(c: Ctx, p: RoomPalette) {
  // Low coffee table in front of the sofa with two mugs (ch4_s01)
  const x = 22;
  const y = 136;
  rect(c, x, y, 64, 4, p.woodL);
  rect(c, x, y + 4, 64, 3, p.wood);
  rect(c, x + 3, y + 7, 3, 10, p.woodD);
  rect(c, x + 58, y + 7, 3, 10, p.woodD);
  dither(c, x, y + 17, 66, 3, 'rgba(14,17,32,0.35)');
  // mugs
  for (const [mx, col] of [[x + 20, p.mug1], [x + 34, p.mug2]] as const) {
    rect(c, mx, y - 6, 6, 6, col);
    rect(c, mx, y - 6, 6, 1, 'rgba(255,255,255,0.35)');
    rect(c, mx + 6, y - 5, 2, 1, col);
    rect(c, mx + 7, y - 5, 1, 3, col);
    rect(c, mx + 6, y - 3, 2, 1, col);
    rect(c, mx + 1, y - 6, 4, 1, p.woodD); // coffee
  }
  // little book
  rect(c, x + 46, y - 2, 12, 2, p.book[0]!);
  rect(c, x + 47, y - 3, 10, 1, p.book[3]!);
}

function paintRoom(c: Ctx, p: RoomPalette) {
  // Wall
  rect(c, 0, 0, W, FLOOR_Y, p.wall);
  dither(c, 0, 0, W, 10, p.wallD);
  rect(c, 0, 10, W, 2, p.wallD);
  // subtle vertical wallpaper stripes
  for (let x = 4; x < W; x += 12) dither(c, x, 12, 1, FLOOR_Y - 12, p.wallL);
  // picture rail
  rect(c, 0, 12, W, 1, p.trim);
  // Wall art: two small abstract prints (no text)
  rect(c, 128, 34, 26, 20, p.woodD);
  rect(c, 130, 36, 22, 16, p.wallL);
  rect(c, 134, 44, 10, 6, p.art1);
  rect(c, 140, 40, 8, 4, p.art2);
  rect(c, 162, 30, 18, 26, p.woodD);
  rect(c, 164, 32, 14, 22, p.wallL);
  rect(c, 166, 42, 10, 10, p.art2);
  rect(c, 168, 36, 6, 6, p.cushion);
  // Skirting
  rect(c, 0, FLOOR_Y - 4, W, 4, p.trim);
  rect(c, 0, FLOOR_Y - 4, W, 1, p.wallL);
  // Floor: wooden planks (slight perspective spacing)
  rect(c, 0, FLOOR_Y, W, H - FLOOR_Y, p.floor);
  const rows = [FLOOR_Y, 117, 123, 130, 138, 147, 157, 168, H];
  const rnd = mulberry32(5);
  for (let r = 0; r < rows.length - 1; r++) {
    const y0 = rows[r]!;
    const h = rows[r + 1]! - y0;
    rect(c, 0, y0, W, 1, p.floorD);
    if (r % 2) dither(c, 0, y0 + 1, W, 1, p.floorL);
    let x = Math.floor(rnd() * 40) - 40;
    while (x < W) {
      const len = 50 + Math.floor(rnd() * 40);
      rect(c, x + len, y0, 1, h, p.floorD);
      if (rnd() < 0.5) rect(c, x + 8, y0 + Math.floor(h / 2), 6, 1, p.floorD);
      x += len;
    }
  }
  // Rug under the open middle floor
  const cx = 160;
  const cy = 150;
  for (let y = 128; y < 174; y++) {
    const dy = (y - cy) / 23;
    const half = Math.round(72 * Math.sqrt(Math.max(0, 1 - dy * dy)));
    rect(c, cx - half, y, half * 2, 1, p.rug);
    if (half > 6) {
      rect(c, cx - half, y, 2, 1, p.rugD);
      rect(c, cx + half - 2, y, 2, 1, p.rugD);
      const inner = half - 8;
      if (inner > 0 && Math.abs(dy) < 0.82) {
        rect(c, cx - inner, y, 1, 1, p.rugL);
        rect(c, cx + inner - 1, y, 1, 1, p.rugL);
      }
    }
  }
  dither(c, 88, 128, 144, 10, 'rgba(14,17,32,0.06)');

  paintWindow(c, p);
  paintShelf(c, p);
  paintBigPlant(c, p);
  paintSofa(c, p);
  paintArmchair(c, p);
  paintLamp(c, p);
  paintTable(c, p);
  // Hanging plant from the ceiling, right of the window
  rect(c, 112, 0, 1, 14, p.woodD);
  rect(c, 108, 14, 9, 6, p.pot);
  for (let i = 0; i < 5; i++) rect(c, 106 + (i % 3) * 4, 20 + i * 3, 2, 4, i % 2 ? p.leafD : p.leaf);

  if (p.night) {
    // Overall night cast + darker corners
    dither(c, 0, 0, W, H, 'rgba(14,17,32,0.25)');
    dither(c, 0, 0, 14, H, 'rgba(14,17,32,0.4)', 1);
    dither(c, W - 14, 0, 14, H, 'rgba(14,17,32,0.4)', 1);
    // Moonlight square on the floor from the window
    for (let y = 120; y < 140; y++) {
      const off = Math.round((y - 120) * 1.4);
      dither(c, 40 + off, y, 50, 1, 'rgba(142,172,200,0.10)', y);
    }
  } else {
    // Morning: whole room lifted with warm air
    dither(c, 0, 0, W, FLOOR_Y, 'rgba(243,235,221,0.06)');
  }
}

/** Sun patch on the floor + beam through the air (cached; shifted per frame by a few px). */
function sunLayer(): HTMLCanvasElement | null {
  return cachedLayer('living_sun_patch', W + 16, H, (g) => {
    // Beam: diagonal from window down-right
    g.fillStyle = 'rgba(255,244,214,0.05)';
    for (let y = WIN.y; y < 136; y++) {
      const off = Math.round((y - WIN.y) * 0.9);
      for (let x = WIN.x + off + (y & 1); x < WIN.x + WIN.w + off; x += 2) g.fillRect(x, y, 1, 1);
    }
    // Patch on the floor: parallelogram split by the window mullions
    for (let y = 118; y < 150; y++) {
      const off = Math.round((y - 118) * 1.1) + 86;
      const u = (y - 118) / 32;
      g.fillStyle = `rgba(255,236,196,${(0.3 - u * 0.12).toFixed(3)})`;
      for (let x = off + (y & 1); x < off + 70; x += 2) {
        const rx = x - off;
        if (rx > 33 && rx < 37) continue; // mullion shadow
        if (y > 129 && y < 132) continue;
        g.fillRect(x, y, 1, 1);
      }
    }
    // Bright rim on the patch edge
    g.fillStyle = 'rgba(255,244,214,0.35)';
    for (let y = 118; y < 150; y += 2) g.fillRect(Math.round((y - 118) * 1.1) + 86, y, 1, 1);
  });
}

/** Lamp glow (cached). */
function lampGlow(): HTMLCanvasElement | null {
  return cachedLayer('living_lamp_glow', W, H, (g) => {
    const rings = [
      { r: 16, a: 0.4 },
      { r: 36, a: 0.22 },
      { r: 70, a: 0.13 },
      { r: 120, a: 0.07 },
    ];
    for (const ring of rings) {
      g.fillStyle = `rgba(233,183,123,${ring.a})`;
      for (let y = 0; y < H; y++) {
        for (let x = y & 1; x < W; x += 2) {
          const dx = x - 292;
          const dy = (y - 56) * 1.2;
          if (dx * dx + dy * dy < ring.r * ring.r) g.fillRect(x, y, 1, 1);
        }
      }
    }
    // Downward light pool under the shade
    g.fillStyle = 'rgba(255,207,138,0.18)';
    for (let y = 61; y < 128; y++) {
      const half = Math.round(10 + (y - 61) * 0.5);
      for (let x = 292 - half + (y & 1); x < 292 + half; x += 2) g.fillRect(x, y, 1, 1);
    }
  });
}

/** Dust motes drifting in the sunbeam; deterministic in t, frozen at t = 0. */
const MOTES = (() => {
  const rnd = mulberry32(77);
  return Array.from({ length: 10 }, () => ({ x: rnd() * 60, y: rnd() * 80, s: 0.6 + rnd() * 0.8, ph: rnd() * 6.28 }));
})();

export function drawLivingRoomMorning(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'living_room_morning', W, H, (g) => paintRoom(g, MORNING));
  drawRain(c, WIN, env.rain, t, 41, 'rgba(90,86,132,0.5)'); // rain has stopped in ch4_s01; kept for ENV overrides
  // Sun patch drifts ~4 px over a minute (static at t = 0)
  const dx = Math.round(4 * Math.sin((t * Math.PI * 2) / 60));
  const sun = sunLayer();
  if (sun) c.drawImage(sun, dx, 0);
  for (const m of MOTES) {
    const y = (m.y + t * m.s * 2) % 80;
    const x = WIN.x + 10 + m.x + y * 0.9 + Math.sin(t * 0.5 + m.ph) * 2;
    rect(c, Math.round(x), Math.round(WIN.y + 10 + y), 1, 1, 'rgba(255,244,214,0.55)');
  }
}

export function drawLivingRoomNight(c: Ctx, t: number, env: SceneEnv) {
  blitLayer(c, 'living_room_night', W, H, (g) => paintRoom(g, NIGHT));
  drawRain(c, WIN, env.rain, t, 42, 'rgba(142,172,200,0.45)');
  if (env.lamp === 'warm') {
    const glow = lampGlow();
    if (glow) {
      c.save();
      c.globalAlpha = 0.92 + 0.08 * Math.sin(t * 0.8); // very slow, barely-there breathing
      c.drawImage(glow, 0, 0);
      c.restore();
    }
    rect(c, 283, 49, 18, 10, '#ffcf8a');
    rect(c, 284, 46, 16, 3, '#fff4d6');
    rect(c, 283, 58, 18, 1, '#e9b77b');
  } else {
    drawDim(c, 0.25);
  }
}
