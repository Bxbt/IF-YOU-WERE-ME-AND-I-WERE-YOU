/**
 * Who stands in each scene (docs/09 §3 sprites in scenes). Backgrounds stay empty of people; the
 * cast is drawn on top so every player's own appearance is used. Roles follow the story:
 * in = the one stuck in the elevator, out = the one waiting; A/B = the players themselves (Ch4–Ch5).
 */
import type { SceneEnv } from './env';
import { drawSprite, type Appearance, type Expression } from './draw/character';

export type CastRole = 'in' | 'out' | 'A' | 'B';

export interface CastMember {
  role: CastRole;
  appearance: Appearance;
  expression: Expression;
}

interface Staging {
  roles: CastRole[];
  /** y of the feet on the 320×180 canvas (in front of the floor line of that background). */
  feet: number;
}

const STAGING: Record<string, Staging> = {
  bg_apartment_evening: { roles: ['in', 'out'], feet: 160 },
  bg_apartment_kitchen: { roles: ['out'], feet: 162 },
  bg_corridor: { roles: ['in'], feet: 166 },
  bg_elevator_interior: { roles: ['in'], feet: 166 },
  bg_elevator_emergency: { roles: ['in'], feet: 166 },
  bg_lobby_floor6: { roles: ['out'], feet: 162 },
  bg_stairwell: { roles: ['in', 'out'], feet: 170 },
  bg_living_room_morning: { roles: ['A', 'B'], feet: 156 },
  bg_living_room_night: { roles: ['A', 'B'], feet: 156 },
  bg_rooftop_night: { roles: ['A', 'B'], feet: 160 },
  bg_convenience_store: { roles: ['in'], feet: 166 },
  bg_building_entrance: { roles: ['out'], feet: 164 },
  // M16: storyline 2 — the teller (in) alone; the bedroom stays empty (the teller lies in bed).
  bg_balcony_night: { roles: ['in'], feet: 162 },
  bg_bathroom_mirror: { roles: ['in'], feet: 174 },
  bg_street_sunrise: { roles: ['in'], feet: 172 },
};

/** Roles on stage for a background. In the lobby the elevator person joins once the door is open. */
export function rolesFor(bg: string, env: SceneEnv): CastRole[] {
  if (env.cast) return env.cast;
  const s = STAGING[bg];
  if (!s) return [];
  if ((bg === 'bg_lobby_floor6' || bg === 'bg_building_entrance') && env.door === 'open')
    return ['out', 'in'];
  return s.roles;
}

/** Sprite centre x for slot `i` of `n` (one centred, two facing each other with a gap). */
function slotX(i: number, n: number): number {
  if (n === 1) return 160;
  return i === 0 ? 122 : 198;
}

/** Draws the cast for one background. Emergency light tints people like the room. */
export function drawCast(
  c: CanvasRenderingContext2D,
  bg: string,
  env: SceneEnv,
  cast: CastMember[],
  t: number,
) {
  const feet = STAGING[bg]?.feet ?? 162;
  if (cast.length === 0) return;
  const frame = Math.floor(t * 2) % 2;
  const tint =
    env.light === 'off' ? 'rgba(8,10,20,0.6)' : env.light === 'emergency' ? 'rgba(160,85,40,0.28)' : null;
  cast.forEach((m, i) => {
    const x = Math.round(slotX(i, cast.length) - 16);
    const y = feet - 48;
    if (!tint) {
      drawSprite(c, m.appearance, x, y, frame, m.expression);
      return;
    }
    // Tint only the person (not the room, which already draws its own light): draw on a scratch
    // canvas, colour it with source-atop, then copy it in.
    const tmp = scratch();
    const g = tmp?.getContext('2d');
    if (!tmp || !g) {
      drawSprite(c, m.appearance, x, y, frame, m.expression);
      return;
    }
    g.clearRect(0, 0, 32, 48);
    g.globalCompositeOperation = 'source-over';
    drawSprite(g, m.appearance, 0, 0, frame, m.expression);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = tint;
    g.fillRect(0, 0, 32, 48);
    g.globalCompositeOperation = 'source-over';
    c.drawImage(tmp, x, y);
  });
}

let scratchCanvas: HTMLCanvasElement | null = null;
function scratch(): HTMLCanvasElement | null {
  if (scratchCanvas) return scratchCanvas;
  if (typeof document === 'undefined') return null;
  scratchCanvas = document.createElement('canvas');
  scratchCanvas.width = 32;
  scratchCanvas.height = 48;
  return scratchCanvas;
}
