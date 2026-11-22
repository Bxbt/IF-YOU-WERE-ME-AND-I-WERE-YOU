/**
 * Ephemeral PIN session — which player most recently passed the PIN gate (docs/08 §4).
 * Deliberately NOT persisted: a reload always asks for the PIN again.
 */
import { create } from 'zustand';

interface SessionState {
  /** playerId that passed the gate most recently, or null. */
  unlocked: string | null;
  unlock: (playerId: string) => void;
  lock: () => void;
}

export const useSession = create<SessionState>()((set) => ({
  unlocked: null,
  unlock: (playerId) => set({ unlocked: playerId }),
  lock: () => set({ unlocked: null }),
}));

/** True when the player has no PIN, or has passed the gate most recently. */
export function isUnlocked(playerId: string, hasPin: boolean): boolean {
  if (!hasPin) return true;
  return useSession.getState().unlocked === playerId;
}
