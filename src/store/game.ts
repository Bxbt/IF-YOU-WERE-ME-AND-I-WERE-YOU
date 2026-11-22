/**
 * Single Zustand store (docs/10 §2). Holds the save root plus storage health.
 * Writes are debounced (300 ms) and flushed on page hide (docs/07 §10).
 */
import { create } from 'zustand';
import { createEmptySave, type SaveRoot } from '../persistence/schema';
import { loadSave, purgeBackup, writeSave } from '../persistence/persist';
import { KEYS, removeAllGameKeys, writeKey } from '../persistence/storage';

export type StorageHealth = 'ok' | 'unavailable' | 'quota' | 'stale_tab';

export interface RecoveryInfo {
  kind: 'corrupt' | 'newer';
  raw: string;
  reason?: string;
}

interface GameState {
  ready: boolean;
  save: SaveRoot;
  health: StorageHealth;
  /** When set, the app must show the Recovery screen and must not write (docs/05 G10). */
  recovery: RecoveryInfo | null;
  lastSavedAt: number | null;
  init: () => void;
  update: (fn: (draft: SaveRoot) => SaveRoot) => void;
  flush: () => void;
  replaceAll: (data: SaveRoot) => { ok: boolean };
  deleteAll: () => void;
  startFreshFromRecovery: () => void;
  markStaleTab: () => void;
}

const DEBOUNCE_MS = 300;
let timer: ReturnType<typeof setTimeout> | null = null;

export const useGame = create<GameState>()((set, get) => ({
  ready: false,
  save: createEmptySave(),
  health: 'ok',
  recovery: null,
  lastSavedAt: null,

  init: () => {
    const r = loadSave();
    switch (r.status) {
      case 'ok':
      case 'empty':
        set({ ready: true, save: r.data, health: 'ok', recovery: null });
        break;
      case 'unavailable':
        set({ ready: true, save: r.data, health: 'unavailable', recovery: null });
        break;
      case 'corrupt':
        set({ ready: true, save: r.data, recovery: { kind: 'corrupt', raw: r.raw, reason: r.reason } });
        break;
      case 'newer':
        set({ ready: true, save: r.data, recovery: { kind: 'newer', raw: r.raw } });
        break;
    }
  },

  update: (fn) => {
    set({ save: fn(get().save) });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => get().flush(), DEBOUNCE_MS);
  },

  flush: () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const { recovery, health, save } = get();
    if (recovery || health === 'unavailable' || health === 'stale_tab') return;
    const res = writeSave(save);
    if (res.ok) set({ lastSavedAt: Date.now(), health: 'ok' });
    else if (res.reason === 'quota') set({ health: 'quota' });
    else if (res.reason === 'unavailable') set({ health: 'unavailable' });
    else console.error('Refusing to write invalid save', res.error);
  },

  replaceAll: (data) => {
    const { save, health } = get();
    if (health === 'unavailable') {
      set({ save: data, recovery: null });
      return { ok: true };
    }
    // Keep the current data as backup until the new data is safely written (docs/07 §11.2 step 7).
    writeKey(KEYS.backup, JSON.stringify(save));
    const res = writeSave(data);
    if (!res.ok) return { ok: false };
    purgeBackup();
    set({ save: data, recovery: null, lastSavedAt: Date.now(), health: 'ok' });
    return { ok: true };
  },

  deleteAll: () => {
    if (timer) clearTimeout(timer);
    timer = null;
    removeAllGameKeys();
    set({ save: createEmptySave(), recovery: null, lastSavedAt: null });
  },

  startFreshFromRecovery: () => {
    removeAllGameKeys();
    set({ save: createEmptySave(), recovery: null, health: 'ok' });
    get().flush();
  },

  markStaleTab: () => set({ health: 'stale_tab' }),
}));

/** Wires page-lifecycle flushing and cross-tab detection. Returns a cleanup function. */
export function installPersistenceListeners(): () => void {
  const onHide = () => {
    if (document.visibilityState === 'hidden') useGame.getState().flush();
  };
  const onPageHide = () => useGame.getState().flush();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEYS.save || e.key === null) useGame.getState().markStaleTab();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('storage', onStorage);
  return () => {
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('storage', onStorage);
  };
}
