/**
 * PNG Reflection Card (docs/07 §11.4, A-16): 1080×1350, navy with a pixel frame, game title, the
 * sender's nickname, up to 5 selected items (each cut at 140 characters with "…"). Drawn with the
 * Canvas 2D API after the web fonts are ready — no screenshot library.
 */
import { templates } from '../content/th/templates';
import type { ReportItem } from './report';

export const CARD_W = 1080;
export const CARD_H = 1350;
export const MAX_ITEMS = 5;
export const MAX_CHARS = 140;

export function cut(text: string, max = MAX_CHARS): string {
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : text;
}

/** Thai has no spaces between words: break on word segments when the browser can, else per character. */
function segments(text: string): string[] {
  const Seg = (
    Intl as unknown as {
      Segmenter?: new (
        l: string,
        o: { granularity: string },
      ) => { segment: (t: string) => Iterable<{ segment: string }> };
    }
  ).Segmenter;
  if (Seg) return Array.from(new Seg('th', { granularity: 'word' }).segment(text), (s) => s.segment);
  return Array.from(text);
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const seg of segments(text)) {
    const test = line + seg;
    if (ctx.measureText(test).width > width && line) {
      lines.push(line.trimEnd());
      line = seg.trimStart();
    } else line = test;
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

function frame(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#171c2f';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const step = 12;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? '#e9b77b' : '#a49bcb';
    const o = 24 + i * step;
    ctx.fillRect(o, o, CARD_W - o * 2, step / 2);
    ctx.fillRect(o, CARD_H - o - step / 2, CARD_W - o * 2, step / 2);
    ctx.fillRect(o, o, step / 2, CARD_H - o * 2);
    ctx.fillRect(CARD_W - o - step / 2, o, step / 2, CARD_H - o * 2);
    ctx.fillStyle = '#171c2f';
    ctx.fillRect(o + step / 2, o + step / 2, CARD_W - (o + step / 2) * 2, CARD_H - (o + step / 2) * 2);
  }
  // a few stars
  ctx.fillStyle = '#f3ebdd';
  for (const [x, y] of [
    [150, 180],
    [930, 220],
    [880, 1180],
    [200, 1150],
    [960, 760],
  ] as const) {
    ctx.fillRect(x, y, 6, 6);
    ctx.fillRect(x - 6, y, 18, 6);
    ctx.fillRect(x, y - 6, 6, 18);
  }
}

export async function drawReflectionCard(
  canvas: HTMLCanvasElement,
  name: string,
  date: string,
  items: ReportItem[],
): Promise<void> {
  // Fonts load lazily: ask for the exact faces the card uses before drawing.
  if (document.fonts?.load) {
    await Promise.all(
      ['44px Silkscreen', '36px "IBM Plex Sans Thai"', '600 36px "IBM Plex Sans Thai"'].map((f) =>
        document.fonts.load(f, 'กขAB').catch(() => []),
      ),
    );
  }
  if (document.fonts?.ready) await document.fonts.ready;
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  frame(ctx);
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#e9b77b';
  ctx.font = '44px Silkscreen, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('IF YOU WERE ME,', CARD_W / 2, 150);
  ctx.fillText('AND I WERE YOU', CARD_W / 2, 205);
  ctx.fillStyle = '#a49bcb';
  ctx.font = '34px "IBM Plex Sans Thai", sans-serif';
  ctx.fillText(templates.report.heading(name), CARD_W / 2, 290);
  ctx.textAlign = 'left';

  let y = 380;
  const left = 140;
  const width = CARD_W - left * 2;
  for (const item of items.slice(0, MAX_ITEMS)) {
    ctx.fillStyle = '#a49bcb';
    ctx.font = '28px "IBM Plex Sans Thai", sans-serif';
    ctx.fillText(`[${templates.report.source[item.source]}]`, left, y);
    y += 44;
    ctx.fillStyle = '#f3ebdd';
    ctx.font = '36px "IBM Plex Sans Thai", sans-serif';
    for (const line of wrap(ctx, cut(item.text), width)) {
      if (y > CARD_H - 200) break;
      ctx.fillText(line, left, y);
      y += 56;
    }
    y += 34;
    if (y > CARD_H - 200) break;
  }
  ctx.fillStyle = '#a49bcb';
  ctx.font = '26px "IBM Plex Sans Thai", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(templates.report.fileFooter(date), CARD_W / 2, CARD_H - 130);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png failed'))), 'image/png'),
  );
}
