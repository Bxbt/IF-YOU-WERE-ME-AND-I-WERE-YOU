/**
 * Memory Scenes (docs/06 S16, M11). Only what the player writes — the game never invents events,
 * lines or feelings from it. Private to the owner; sharing is the owner's explicit choice.
 */
import type { SaveRoot } from '../persistence/schema';
import { purgeBackup } from '../persistence/persist';
import { nowIso } from '../lib/ids';
import { useGame } from './game';

export type Memory = SaveRoot['memories'][string];
export type MemoryInput = Omit<Memory, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;

export const MEMORY_BACKGROUNDS = [
  'bg_apartment_evening',
  'bg_living_room_morning',
  'bg_living_room_night',
  'bg_rooftop_night',
  'bg_apartment_kitchen',
  'bg_stairwell',
  'bg_corridor',
] as const;

const clean = (m: MemoryInput): MemoryInput => ({
  ...m,
  title: m.title.trim().slice(0, 60),
  whatHappened: m.whatHappened.trim().slice(0, 500),
  myFeelings: { selected: m.myFeelings.selected, ...(m.myFeelings.freeText?.trim() ? { freeText: m.myFeelings.freeText.trim().slice(0, 280) } : {}) },
  myNeeds: { selected: m.myNeeds.selected, ...(m.myNeeds.freeText?.trim() ? { freeText: m.myNeeds.freeText.trim().slice(0, 280) } : {}) },
  partnerFeelingsGuess: {
    selected: m.partnerFeelingsGuess.selected,
    ...(m.partnerFeelingsGuess.freeText?.trim() ? { freeText: m.partnerFeelingsGuess.freeText.trim().slice(0, 280) } : {}),
  },
});

export function saveMemory(save: SaveRoot, ownerId: string, input: MemoryInput, id?: string): { save: SaveRoot; id: string } {
  const t = nowIso();
  const mid = id ?? `mem_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const prev = save.memories[mid];
  if (prev && prev.ownerId !== ownerId) return { save, id: mid }; // only the owner edits
  const memory: Memory = { id: mid, ownerId, ...clean(input), createdAt: prev?.createdAt ?? t, updatedAt: t };
  return { save: { ...save, memories: { ...save.memories, [mid]: memory } }, id: mid };
}

export function setMemoryShared(save: SaveRoot, ownerId: string, id: string, shared: boolean): SaveRoot {
  const m = save.memories[id];
  if (!m || m.ownerId !== ownerId) return save;
  return { ...save, memories: { ...save.memories, [id]: { ...m, shareIntent: shared, updatedAt: nowIso() } } };
}

/** Deleting removes it for real, including from the backup (audit H-4). */
export function deleteMemory(ownerId: string, id: string) {
  useGame.getState().update((s) => {
    const m = s.memories[id];
    if (!m || m.ownerId !== ownerId) return s;
    const memories = { ...s.memories };
    delete memories[id];
    return { ...s, memories };
  });
  useGame.getState().flush();
  purgeBackup();
}

/** What `viewerId` may see: their own memories, plus memories a partner chose to share. */
export function memoriesVisibleTo(save: SaveRoot, viewerId: string, partnerIds: string[]): Memory[] {
  return Object.values(save.memories)
    .filter((m) => m.ownerId === viewerId || (m.shareIntent && partnerIds.includes(m.ownerId)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
