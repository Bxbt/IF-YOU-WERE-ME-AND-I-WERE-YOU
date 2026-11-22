/**
 * Observed gameplay patterns (docs/04 §5, Phase 2 — M11b). Computed on the fly from the choices
 * already saved in each journey's choiceLog plus the content tags — no extra signal data is stored
 * (PR4). Only choices a player made *in their own role* count; choices made while playing the
 * partner's role are never read as the player's own pattern. Shown as "อาจ", confirmed or hidden
 * by the player, never written over what the player said about themselves.
 */
import type { ChapterContent } from '../content/types';
import type { SaveRoot } from '../persistence/schema';
import { playerForRole } from '../store/story';

export type TagIndex = Map<string, string>;

/** `${choiceId}:${optionId}` → "Dxx:signal" for every tagged option. */
export function tagIndex(contents: ChapterContent[]): TagIndex {
  const idx: TagIndex = new Map();
  for (const ch of contents)
    for (const sc of ch.scenes)
      for (const l of sc.lines)
        if (l.type === 'CHOICE') for (const o of l.options) if (o.tag) idx.set(`${l.id}:${o.id}`, o.tag);
  return idx;
}

export interface Signal {
  dimension: string;
  signal: string;
  key: string;
}

/** One signal per choice (the latest play of it), across all of the player's journeys. */
export function observedSignals(save: SaveRoot, playerId: string, idx: TagIndex): Signal[] {
  const byChoice = new Map<string, Signal>();
  for (const j of Object.values(save.journeys)) {
    if (!j.playerIds.includes(playerId)) continue;
    for (const p of Object.values(j.chapterProgress)) {
      for (const e of p.choiceLog) {
        if (e.byPlayerId !== playerId) continue;
        const own = e.asRole === 'self' || playerForRole(j, e.asRole) === playerId;
        if (!own) continue;
        const tag = idx.get(`${e.choiceId}:${e.optionId}`);
        if (!tag) continue;
        const [dimension, signal] = tag.split(':') as [string, string];
        byChoice.set(`${j.id}:${e.choiceId}`, { dimension, signal, key: tag });
      }
    }
  }
  return [...byChoice.values()];
}

export interface ObservedCard {
  /** "Dxx:signal", or "Dxx:varied" when no signal repeats. */
  key: string;
  dimension: string;
  signal: string | null;
}

/** docs/04 §5.2: a dimension needs ≥ 3 signals; a signal card needs the same signal ≥ 2 times. */
export function observedCards(signals: Signal[]): ObservedCard[] {
  const byDim = new Map<string, Signal[]>();
  for (const s of signals) byDim.set(s.dimension, [...(byDim.get(s.dimension) ?? []), s]);
  const out: ObservedCard[] = [];
  for (const [dimension, list] of [...byDim.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (list.length < 3) continue;
    const counts = new Map<string, number>();
    for (const s of list) counts.set(s.key, (counts.get(s.key) ?? 0) + 1);
    const repeated = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
    if (repeated.length > 0) {
      for (const [key] of repeated) out.push({ key, dimension, signal: key.split(':')[1]! });
    } else out.push({ key: `${dimension}:varied`, dimension, signal: null });
  }
  return out;
}
