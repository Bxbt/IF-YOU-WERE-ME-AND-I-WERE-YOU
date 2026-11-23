import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../lib/motion';

/**
 * S1 star layer (docs/06 S1 Motion): twinkling pixel stars and an occasional shooting star over
 * the cover art. A transparent low-res canvas scaled with crisp pixels (3 css px per pixel, like
 * the cover). Slow sine twinkle only — no fast flashing (AX-7). Off entirely with reduced motion.
 */
const PX = 3;
const FPS = 30;
const COLORS = ['#f3ebdd', '#f3ebdd', '#a49bcb', '#e9b77b'];

interface Star {
  x: number;
  y: number;
  color: string;
  /** 0 = dot, 1 = small plus, 2 = big plus (the cover's sparkle) */
  shape: 0 | 1 | 2;
  speed: number;
  phase: number;
}

interface Shooting {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
}

function makeStars(w: number, h: number): Star[] {
  const count = Math.round((w * h) / 1400);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    stars.push({
      x: Math.floor(Math.random() * w),
      // Upper part of the screen, thinning out toward the middle.
      y: Math.floor(Math.pow(Math.random(), 1.6) * h * 0.62),
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      shape: r < 0.08 ? 2 : r < 0.3 ? 1 : 0,
      speed: 0.4 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function drawStar(c: CanvasRenderingContext2D, s: Star, a: number) {
  c.globalAlpha = a;
  c.fillStyle = s.color;
  c.fillRect(s.x, s.y, 1, 1);
  if (s.shape >= 1 && a > 0.35) {
    c.globalAlpha = a * 0.75;
    c.fillRect(s.x - 1, s.y, 1, 1);
    c.fillRect(s.x + 1, s.y, 1, 1);
    c.fillRect(s.x, s.y - 1, 1, 1);
    c.fillRect(s.x, s.y + 1, 1, 1);
  }
  if (s.shape === 2 && a > 0.6) {
    c.globalAlpha = a * 0.4;
    c.fillRect(s.x - 2, s.y, 1, 1);
    c.fillRect(s.x + 2, s.y, 1, 1);
    c.fillRect(s.x, s.y - 2, 1, 1);
    c.fillRect(s.x, s.y + 2, 1, 1);
  }
}

function spawnShooting(w: number, h: number): Shooting {
  // Start near a side edge, high up, and cross diagonally toward the middle.
  const fromLeft = Math.random() < 0.5;
  const speed = 2.6 + Math.random() * 1.2; // pixels per frame
  return {
    x: fromLeft ? Math.random() * w * 0.3 : w * (0.7 + Math.random() * 0.3),
    y: 2 + Math.random() * h * 0.2,
    vx: fromLeft ? speed : -speed,
    vy: speed * 0.42,
    life: 40 + Math.floor(Math.random() * 14),
    age: 0,
  };
}

function drawShooting(c: CanvasRenderingContext2D, s: Shooting) {
  // Fade in, travel, fade out — a long soft tail behind a bright two-pixel head.
  const fade = Math.min(1, s.age / 5, (s.life - s.age) / 10);
  const dir = s.vx > 0 ? 1 : -1;
  const len = 26;
  for (let i = 0; i < len; i++) {
    const k = 1 - i / len;
    c.globalAlpha = fade * k * k;
    c.fillStyle = i < 3 ? '#fff4d6' : i < 10 ? '#f3ebdd' : '#a49bcb';
    const x = Math.round(s.x - dir * i);
    const y = Math.round(s.y - 0.42 * i);
    c.fillRect(x, y, 1, 1);
    if (i < 8) c.fillRect(x, y + 1, 1, 1); // thicker front part of the tail
  }
  c.globalAlpha = fade;
  c.fillStyle = '#fff4d6';
  c.fillRect(Math.round(s.x), Math.round(s.y) - 1, 1, 3); // head glow
  c.fillRect(Math.round(s.x) + dir, Math.round(s.y), 1, 1);
}

export function StarField() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduced) return;
    const cv = ref.current;
    let c: CanvasRenderingContext2D | null = null;
    try {
      c = cv?.getContext('2d') ?? null;
    } catch {
      c = null;
    }
    if (!cv || !c) return;
    const ctx = c;
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    const resize = () => {
      w = Math.max(1, Math.ceil(cv.clientWidth / PX));
      h = Math.max(1, Math.ceil(cv.clientHeight / PX));
      cv.width = w;
      cv.height = h;
      ctx.imageSmoothingEnabled = false;
      stars = makeStars(w, h);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = 0;
    let shooting: Shooting | null = null;
    let nextShot = 2 + Math.random() * 3; // first one soon, then every 7–12 s
    const start = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || now - last < 1000 / FPS) return;
      last = now;
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        drawStar(ctx, s, a);
      }
      if (!shooting && t >= nextShot) {
        shooting = spawnShooting(w, h);
        cv.dataset.shooting = '1';
        nextShot = t + 7 + Math.random() * 5;
      }
      if (shooting) {
        shooting.x += shooting.vx;
        shooting.y += shooting.vy;
        shooting.age++;
        drawShooting(ctx, shooting);
        if (shooting.age >= shooting.life) {
          shooting = null;
          cv.dataset.shooting = '0';
        }
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  if (reduced) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden
      data-testid="star-field"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
