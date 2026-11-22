/**
 * Thin wrapper over localStorage (docs/07 §10). Every access is guarded:
 * storage can be missing, blocked (private mode) or full.
 */

export const KEYS = {
  save: 'iywm:save',
  backup: 'iywm:save:backup',
  probe: 'iywm:probe',
  /** Phase 3C: a live room created on this device that nobody has joined yet. */
  liveRoom: 'iywm:live-room',
} as const;

export type WriteResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable'; error: unknown };

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Returns true only if a write + read + delete round-trip succeeds. */
export function probeStorage(): boolean {
  const s = getStorage();
  if (!s) return false;
  try {
    s.setItem(KEYS.probe, '1');
    const ok = s.getItem(KEYS.probe) === '1';
    s.removeItem(KEYS.probe);
    return ok;
  } catch {
    return false;
  }
}

export function readKey(key: string): string | null {
  const s = getStorage();
  if (!s) return null;
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)
  );
}

export function writeKey(key: string, value: string): WriteResult {
  const s = getStorage();
  if (!s) return { ok: false, reason: 'unavailable', error: null };
  try {
    s.setItem(key, value);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'quota' : 'unavailable', error };
  }
}

export function removeKey(key: string): void {
  const s = getStorage();
  if (!s) return;
  try {
    s.removeItem(key);
  } catch {
    /* ignore — nothing else we can do */
  }
}

/** Removes every key owned by the game (docs/08 §7 "ลบข้อมูลทั้งหมด"). */
export function removeAllGameKeys(): void {
  const s = getStorage();
  if (!s) return;
  try {
    const owned: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith('iywm:')) owned.push(k);
    }
    owned.forEach((k) => s.removeItem(k));
  } catch {
    /* ignore */
  }
}
