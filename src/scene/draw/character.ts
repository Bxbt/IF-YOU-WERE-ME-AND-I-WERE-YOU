/**
 * Character renderer (docs/09 §3) — drawn with primitives, palette-swapped per Appearance.
 * Sprite: 32×48 frame. Portrait: 64×64. Appearance never encodes gender or personality.
 */
import type { Player } from '../../persistence/schema';

export type Appearance = Player['appearance'];
export type Expression = 'neutral' | 'happy' | 'sad' | 'worried' | 'relieved';
/** P1 expressions fall back to MVP ones (docs/09 §3.2). */
export const EXPRESSION_FALLBACK: Record<string, Expression> = {
  angry: 'worried',
  scared: 'worried',
  thinking: 'neutral',
};

const OUTLINE = '#171c2f';
const EYE = '#1d1a26';

export const SKIN = ['#f6d7c3', '#eac2a0', '#d9a57f', '#b9805c', '#8f5e41', '#6b432e'];
// 8 = salmon pink, 9 = slate navy: the pair on the cover art (docs/09 §3.1).
export const HAIR = ['#2a2430', '#4a3328', '#7a5236', '#9a4a3a', '#d9b26a', '#a49bcb', '#d9a3a7', '#8eacc8', '#d98478', '#4b5478'];
export const OUTFIT = [
  '#f3ebdd',
  '#d9a3a7',
  '#e9b77b',
  '#8eacc8',
  '#a49bcb',
  '#4b4f7a',
  '#9fb89a',
  '#3c3f52',
  '#d98a7e', // 8 = cover pink hoodie
];
export const HAIR_STYLE_NAMES = ['สั้น', 'บ็อบ', 'ยาว', 'มัดจุก', 'ฟูชี้'];
export const LEGS_NAMES = ['ขายาว', 'ขาสั้น'];
export const OUTFIT_NAMES = ['เสื้อยืด', 'ฮู้ดดี้', 'คาร์ดิแกน'];

export const PRESETS: Record<Appearance['preset'], Appearance> = {
  p1: { preset: 'p1', skin: 1, hairStyle: 0, hairColor: 1, outfit: 0, outfitColor: 2, accessory: 'none' },
  p2: { preset: 'p2', skin: 3, hairStyle: 2, hairColor: 0, outfit: 2, outfitColor: 3, accessory: 'none' },
  p3: { preset: 'p3', skin: 2, hairStyle: 1, hairColor: 3, outfit: 1, outfitColor: 4, accessory: 'glasses' },
  p4: { preset: 'p4', skin: 4, hairStyle: 3, hairColor: 2, outfit: 0, outfitColor: 6, accessory: 'none' },
  // The pair on the cover art (cover.jpg), redrawn with primitives.
  p5: { preset: 'p5', skin: 0, hairStyle: 1, hairColor: 8, outfit: 1, outfitColor: 8, accessory: 'none', legs: 'short' },
  p6: { preset: 'p6', skin: 0, hairStyle: 4, hairColor: 9, outfit: 1, outfitColor: 3, accessory: 'none' },
};

/** A pointed tuft (spiky hair): rows widen every 2px. `outline` draws the 1px border version. */
function spike(c: Ctx, sx: number, ty: number, h: number, col: string, outline = false) {
  for (let i = 0; i < h; i++) {
    const half = Math.floor(i / 2) + (outline ? 1 : 0);
    rect(c, sx - half, ty + i - (outline ? 1 : 0), 1 + 2 * half, 1, col);
  }
}

export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amount * (amount < 0 ? c : 255 - c))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

type Ctx = CanvasRenderingContext2D;
const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};
function ellipse(c: Ctx, cx: number, cy: number, rx: number, ry: number, col: string) {
  c.fillStyle = col;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) c.fillRect(x, y, 1, 1);
    }
  }
}
/** Ellipse + 1px outline. */
function blob(c: Ctx, cx: number, cy: number, rx: number, ry: number, col: string) {
  ellipse(c, cx, cy, rx + 1, ry + 1, OUTLINE);
  ellipse(c, cx, cy, rx, ry, col);
}

interface Colors {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  hairLight: string;
  cloth: string;
  clothShade: string;
}
function colors(a: Appearance): Colors {
  const skin = SKIN[a.skin] ?? SKIN[1]!;
  const hair = HAIR[a.hairColor] ?? HAIR[0]!;
  const cloth = OUTFIT[a.outfitColor] ?? OUTFIT[0]!;
  return {
    skin,
    skinShade: shade(skin, -0.14),
    hair,
    hairShade: shade(hair, -0.25),
    hairLight: shade(hair, 0.25),
    cloth,
    clothShade: shade(cloth, -0.2),
  };
}

// ---------------------------------------------------------------- sprite 32×48

/** Draws one 32×48 idle frame at (ox, oy). frame 1 = breathing (upper body 1px lower). */
export function drawSprite(
  c: Ctx,
  a: Appearance,
  ox = 0,
  oy = 0,
  frame = 0,
  expression: Expression = 'neutral',
) {
  const k = colors(a);
  const b = frame === 1 ? 1 : 0;
  const X = (x: number) => ox + x;
  const Y = (y: number) => oy + y;

  // legs + shoes
  rect(c, X(11), Y(36), 10, 9, OUTLINE);
  if (a.legs === 'short') {
    // shorts, bare legs, socks
    rect(c, X(12), Y(36), 8, 3, '#3a3f5c');
    for (const lx of [12, 17]) {
      rect(c, X(lx), Y(39), 3, 3, k.skin);
      rect(c, X(lx), Y(42), 3, 2, '#e6eef6');
    }
    rect(c, X(15), Y(39), 2, 5, OUTLINE);
  } else {
    rect(c, X(12), Y(36), 3, 8, '#3a3f5c');
    rect(c, X(17), Y(36), 3, 8, '#3a3f5c');
  }
  rect(c, X(11), Y(44), 5, 2, OUTLINE);
  rect(c, X(16), Y(44), 5, 2, OUTLINE);

  // back hair (long styles hang behind the body)
  if (a.hairStyle === 2) rect(c, X(8), Y(14 + b), 16, 14, k.hairShade);

  // torso
  rect(c, X(9), Y(21 + b), 14, 16 - b, OUTLINE);
  rect(c, X(10), Y(22 + b), 12, 14 - b, k.cloth);
  rect(c, X(10), Y(32), 12, 4, k.clothShade);
  if (a.outfit === 1) {
    rect(c, X(12), Y(28 + b), 8, 4, k.clothShade); // hoodie pocket
    rect(c, X(13), Y(22 + b), 1, 4, '#f3ebdd'); // drawstrings
    rect(c, X(18), Y(22 + b), 1, 4, '#f3ebdd');
  } else if (a.outfit === 2) {
    rect(c, X(14), Y(22 + b), 4, 14 - b, '#f3ebdd'); // shirt under open cardigan
    rect(c, X(15), Y(25 + b), 1, 1, k.clothShade);
    rect(c, X(15), Y(29 + b), 1, 1, k.clothShade);
  }
  // arms + hands
  rect(c, X(7), Y(22 + b), 3, 12, OUTLINE);
  rect(c, X(22), Y(22 + b), 3, 12, OUTLINE);
  rect(c, X(8), Y(23 + b), 2, 9, k.clothShade);
  rect(c, X(22), Y(23 + b), 2, 9, k.clothShade);
  rect(c, X(8), Y(32 + b), 2, 2, k.skin);
  rect(c, X(22), Y(32 + b), 2, 2, k.skin);

  // neck + head
  rect(c, X(14), Y(19 + b), 4, 3, k.skinShade);
  blob(c, X(16), Y(13 + b), 7, 7, k.skin);
  rect(c, X(10), Y(16 + b), 2, 1, k.skinShade);

  drawSpriteHair(c, a.hairStyle, k, X(0), Y(b));
  drawSpriteFace(c, expression, X(0), Y(b));
  if (a.accessory === 'glasses') {
    rect(c, X(11), Y(13), 4, 3, OUTLINE);
    rect(c, X(17), Y(13), 4, 3, OUTLINE);
    rect(c, X(12), Y(14), 2, 1, '#cfe0ee');
    rect(c, X(18), Y(14), 2, 1, '#cfe0ee');
    rect(c, X(15), Y(14), 2, 1, OUTLINE);
  }
}

function drawSpriteHair(c: Ctx, style: number, k: Colors, ox: number, oy: number) {
  const r = (x: number, y: number, w: number, h: number, col: string) => rect(c, ox + x, oy + y, w, h, col);
  const tufts: [number, number, number][] = [
    [11, 3, 4],
    [15, 1, 5],
    [19, 2, 4],
    [22, 5, 3],
  ];
  if (style === 4) for (const [x, y, h] of tufts) spike(c, ox + x, oy + y, h, OUTLINE, true);
  // shared cap
  ellipse(c, ox + 16, oy + 9, 8, 5, OUTLINE);
  ellipse(c, ox + 16, oy + 9, 7, 4, k.hair);
  if (style === 4) for (const [x, y, h] of tufts) spike(c, ox + x, oy + y, h + 2, k.hair);
  r(11, 6, 5, 1, k.hairLight);
  if (style === 4) {
    r(8, 9, 3, 6, k.hair);
    r(21, 9, 3, 6, k.hair);
    r(7, 11, 1, 2, k.hair);
    r(24, 11, 1, 2, k.hair);
    r(11, 10, 10, 2, k.hair); // messy fringe
    r(12, 12, 1, 1, k.hair);
    r(15, 12, 2, 1, k.hair);
    r(19, 12, 1, 1, k.hair);
  } else if (style === 0) {
    r(9, 9, 2, 5, k.hair);
    r(21, 9, 2, 4, k.hair);
    r(12, 10, 6, 2, k.hair); // fringe
  } else if (style === 1) {
    r(8, 9, 3, 10, k.hair);
    r(21, 9, 3, 10, k.hair);
    r(8, 18, 3, 1, k.hairShade);
    r(21, 18, 3, 1, k.hairShade);
    r(11, 10, 10, 2, k.hair);
  } else if (style === 2) {
    r(8, 9, 3, 14, k.hair);
    r(21, 9, 3, 14, k.hair);
    r(13, 10, 8, 2, k.hair);
  } else {
    ellipse(c, ox + 16, oy + 3, 4, 3, OUTLINE);
    ellipse(c, ox + 16, oy + 3, 3, 2, k.hair); // bun
    r(10, 9, 2, 4, k.hair);
    r(20, 9, 2, 4, k.hair);
    r(12, 10, 4, 1, k.hair);
  }
}

function drawSpriteFace(c: Ctx, e: Expression, ox: number, oy: number) {
  const r = (x: number, y: number, w: number, h: number, col: string) => rect(c, ox + x, oy + y, w, h, col);
  if (e === 'happy' || e === 'relieved') {
    r(12, 14, 2, 1, EYE);
    r(18, 14, 2, 1, EYE);
  } else {
    r(12, 13, 2, 2, EYE);
    r(18, 13, 2, 2, EYE);
  }
  if (e === 'worried' || e === 'sad') {
    r(11, 11, 2, 1, EYE);
    r(19, 11, 2, 1, EYE);
  }
  r(11, 16, 2, 1, '#e8a0a0');
  r(19, 16, 2, 1, '#e8a0a0');
  if (e === 'happy') r(15, 17, 3, 1, '#9c4a4a');
  else if (e === 'sad') {
    r(15, 18, 2, 1, '#9c4a4a');
    r(14, 18, 1, 1, '#9c4a4a');
  } else if (e === 'worried') r(15, 18, 2, 1, '#9c4a4a');
  else r(15, 17, 2, 1, '#9c4a4a');
}

// ---------------------------------------------------------------- portrait 64×64

export function drawPortrait(c: Ctx, a: Appearance, exprIn: string = 'neutral') {
  const e: Expression = (EXPRESSION_FALLBACK[exprIn] ?? exprIn) as Expression;
  const k = colors(a);
  c.clearRect(0, 0, 64, 64);
  // shoulders
  ellipse(c, 32, 66, 25, 14, OUTLINE);
  ellipse(c, 32, 66, 24, 13, k.cloth);
  rect(c, 8, 60, 48, 4, k.clothShade);
  if (a.outfit === 2) rect(c, 28, 54, 8, 10, '#f3ebdd');
  if (a.outfit === 1) {
    rect(c, 24, 54, 2, 7, '#f3ebdd');
    rect(c, 38, 54, 2, 7, '#f3ebdd');
  }
  if (a.hairStyle === 2) {
    rect(c, 13, 24, 6, 30, k.hairShade);
    rect(c, 45, 24, 6, 30, k.hairShade);
  }
  rect(c, 28, 44, 8, 8, k.skinShade); // neck
  blob(c, 32, 30, 15, 16, k.skin);
  rect(c, 18, 36, 3, 4, k.skinShade);

  // hair
  const h = a.hairStyle;
  const tufts: [number, number, number][] = [
    [19, 8, 6],
    [26, 3, 8],
    [34, 2, 8],
    [41, 5, 7],
    [47, 11, 5],
  ];
  if (h === 4) for (const [x, y, n] of tufts) spike(c, x, y, n, OUTLINE, true);
  ellipse(c, 32, 20, 17, 11, OUTLINE);
  ellipse(c, 32, 20, 16, 10, k.hair);
  if (h === 4) for (const [x, y, n] of tufts) spike(c, x, y, n + 3, k.hair);
  rect(c, 22, 12, 10, 2, k.hairLight);
  if (h === 4) {
    rect(c, 15, 20, 6, 14, k.hair);
    rect(c, 43, 20, 6, 13, k.hair);
    rect(c, 14, 24, 1, 4, k.hair);
    rect(c, 49, 24, 1, 4, k.hair);
    rect(c, 20, 22, 24, 4, k.hair); // messy fringe
    rect(c, 22, 26, 2, 2, k.hair);
    rect(c, 28, 26, 3, 1, k.hair);
    rect(c, 34, 26, 2, 2, k.hair);
    rect(c, 40, 26, 2, 1, k.hair);
  } else if (h === 0) {
    rect(c, 16, 20, 5, 10, k.hair);
    rect(c, 43, 20, 5, 9, k.hair);
    rect(c, 22, 22, 12, 4, k.hair);
  } else if (h === 1) {
    rect(c, 15, 20, 6, 22, k.hair);
    rect(c, 43, 20, 6, 22, k.hair);
    rect(c, 21, 22, 22, 4, k.hair);
    rect(c, 15, 40, 6, 2, k.hairShade);
    rect(c, 43, 40, 6, 2, k.hairShade);
  } else if (h === 2) {
    rect(c, 15, 20, 6, 32, k.hair);
    rect(c, 43, 20, 6, 32, k.hair);
    rect(c, 25, 22, 16, 4, k.hair);
  } else {
    ellipse(c, 32, 7, 8, 6, OUTLINE);
    ellipse(c, 32, 7, 7, 5, k.hair);
    rect(c, 17, 20, 4, 8, k.hair);
    rect(c, 43, 20, 4, 8, k.hair);
    rect(c, 22, 22, 8, 3, k.hair);
  }

  // face
  const eyeY = 31;
  if (e === 'happy' || e === 'relieved') {
    for (const x of [23, 37]) {
      rect(c, x, eyeY + 1, 4, 1, EYE);
      rect(c, x - 1, eyeY + 2, 1, 1, EYE);
      rect(c, x + 4, eyeY + 2, 1, 1, EYE);
    }
  } else {
    for (const x of [23, 37]) {
      rect(c, x, eyeY - 1, 4, 5, EYE);
      rect(c, x + 2, eyeY, 1, 1, '#ffffff');
    }
  }
  // brows
  if (e === 'worried' || e === 'sad') {
    rect(c, 22, 26, 2, 1, k.hairShade);
    rect(c, 24, 25, 3, 1, k.hairShade);
    rect(c, 37, 25, 3, 1, k.hairShade);
    rect(c, 40, 26, 2, 1, k.hairShade);
  } else {
    rect(c, 22, 26, 5, 1, k.hairShade);
    rect(c, 37, 26, 5, 1, k.hairShade);
  }
  if (e === 'relieved') {
    rect(c, 22, 25, 5, 1, k.hairShade);
    rect(c, 37, 25, 5, 1, k.hairShade);
  }
  // blush
  rect(c, 20, 37, 4, 2, '#e8a0a0');
  rect(c, 40, 37, 4, 2, '#e8a0a0');
  // mouth
  const m = '#9c4a4a';
  if (e === 'happy') {
    rect(c, 29, 40, 6, 1, m);
    rect(c, 30, 41, 4, 1, m);
  } else if (e === 'sad') {
    rect(c, 30, 41, 4, 1, m);
    rect(c, 29, 42, 1, 1, m);
    rect(c, 34, 42, 1, 1, m);
  } else if (e === 'worried') {
    rect(c, 30, 41, 1, 1, m);
    rect(c, 31, 40, 2, 1, m);
    rect(c, 33, 41, 1, 1, m);
  } else if (e === 'relieved') rect(c, 30, 40, 4, 1, m);
  else rect(c, 30, 41, 4, 1, m);
  if (e === 'sad') rect(c, 25, 35, 1, 2, '#8eacc8'); // tear

  if (a.accessory === 'glasses') {
    for (const x of [21, 35]) {
      rect(c, x, 28, 8, 1, OUTLINE);
      rect(c, x, 35, 8, 1, OUTLINE);
      rect(c, x, 28, 1, 8, OUTLINE);
      rect(c, x + 7, 28, 1, 8, OUTLINE);
    }
    rect(c, 29, 30, 6, 1, OUTLINE);
  }
}
