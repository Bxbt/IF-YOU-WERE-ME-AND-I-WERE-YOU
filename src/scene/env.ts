/**
 * Scene environment — the state ENV lines set (docs/02 §0.2, docs/10 §4) and every background
 * draw function receives. Text never goes into the canvas (docs/06 §1.5).
 */
export type RainLevel = 'none' | 'light' | 'medium' | 'heavy';
export type LightMode = 'normal' | 'flicker' | 'emergency' | 'off';

export interface SceneEnv {
  bg: string;
  /** Two backgrounds side by side (lg) or stacked (sm) — docs/06 S6 "Split screen". */
  split: [string, string] | null;
  rain: RainLevel;
  light: LightMode;
  /** 0 none · 1 low · 2 medium (warm air in the stuck elevator). */
  haze: 0 | 1 | 2;
  lamp: 'warm' | 'off';
  /** Steam from the pan in bg_apartment_kitchen; off once the stove is turned off. */
  steam: boolean;
  /** Elevator door on bg_lobby_floor6 (Ch2–Ch3). */
  door: 'closed' | 'ajar' | 'open';
}

export const DEFAULT_ENV: SceneEnv = {
  bg: 'bg_title',
  split: null,
  rain: 'none',
  light: 'normal',
  haze: 0,
  lamp: 'warm',
  steam: true,
  door: 'closed',
};

/** Background draw function: 320×180 logical canvas, `t` seconds (0 when motion is reduced). */
export type BackgroundDraw = (c: CanvasRenderingContext2D, t: number, env: SceneEnv) => void;

const layerCache = new Map<string, HTMLCanvasElement | null>();

/**
 * Renders a static layer once and reuses it (docs/10 §6: draw once per key, then cache).
 * Returns null where canvas is unavailable (jsdom) — callers then skip the layer.
 */
export function cachedLayer(
  key: string,
  w: number,
  h: number,
  paint: (c: CanvasRenderingContext2D) => void,
): HTMLCanvasElement | null {
  if (layerCache.has(key)) return layerCache.get(key)!;
  let out: HTMLCanvasElement | null = null;
  if (typeof document !== 'undefined') {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    let g: CanvasRenderingContext2D | null = null;
    try {
      g = cv.getContext('2d');
    } catch {
      g = null;
    }
    if (g) {
      g.imageSmoothingEnabled = false;
      paint(g);
      out = cv;
    }
  }
  layerCache.set(key, out);
  return out;
}

/** Draws a cached static layer at 0,0. */
export function blitLayer(
  c: CanvasRenderingContext2D,
  key: string,
  w: number,
  h: number,
  paint: (c: CanvasRenderingContext2D) => void,
) {
  const layer = cachedLayer(key, w, h, paint);
  if (layer) c.drawImage(layer, 0, 0);
  else paint(c);
}
