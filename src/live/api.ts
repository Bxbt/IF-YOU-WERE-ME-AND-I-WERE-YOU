/** Thin client for the Phase 3C relay (docs/10 §10.3). Same origin only (CSP connect-src 'self'). */
const BASE = './api/live';

export interface SlotBox {
  slot: 0 | 1;
  iv: string | null;
  data: string | null;
  rev: number;
}

export type ApiError = 'offline' | 'unauthorized' | 'taken' | 'no_room' | 'too_large' | 'server';

async function call<T>(path: string, init?: RequestInit): Promise<{ ok: true; body: T } | { ok: false; error: ApiError }> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { cache: 'no-store', ...init });
  } catch {
    return { ok: false, error: 'offline' };
  }
  if (res.ok) {
    try {
      return { ok: true, body: (await res.json()) as T };
    } catch {
      return { ok: false, error: 'server' };
    }
  }
  if (res.status === 401) return { ok: false, error: 'unauthorized' };
  if (res.status === 409) return { ok: false, error: 'taken' };
  if (res.status === 404) return { ok: false, error: 'no_room' };
  if (res.status === 413) return { ok: false, error: 'too_large' };
  return { ok: false, error: 'server' };
}

/** True only when the relay really answers (no fake "online" — docs/10 §10.3). */
export async function liveAvailable(): Promise<boolean> {
  const r = await call<{ ok: boolean }>('/health');
  return r.ok && r.body.ok === true;
}

export const claimSlot = (room: string, slot: 0 | 1) =>
  call<{ token: string }>(`/rooms/${room}/slots/${slot}`, { method: 'POST' });

export const putSlot = (room: string, slot: 0 | 1, token: string, box: { iv: string; data: string }) =>
  call<{ rev: number }>(`/rooms/${room}/slots/${slot}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(box),
  });

export const getRoom = (room: string) => call<{ slots: SlotBox[]; presence: number[] }>(`/rooms/${room}`);

export const leaveSlot = (room: string, slot: 0 | 1, token: string) =>
  call<{ ok: boolean }>(`/rooms/${room}/slots/${slot}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

export function roomEvents(room: string, slot: 0 | 1): EventSource | null {
  if (typeof EventSource === 'undefined') return null;
  return new EventSource(`${BASE}/rooms/${room}/events?slot=${slot}`);
}
