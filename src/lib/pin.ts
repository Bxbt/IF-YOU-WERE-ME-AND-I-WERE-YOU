/**
 * PIN hashing and lockout (docs/08 §4.4). PBKDF2-SHA256 via WebCrypto so the PIN is never stored
 * as plain text — this is NOT encryption of the answers (docs/08 §4.2). The lockout counter lives in
 * localStorage, so it is only a delay, not protection.
 */
import type { z } from 'zod';
import type { PinRecord as PinRecordSchema } from '../persistence/schema';

export type PinRecord = z.infer<typeof PinRecordSchema>;

export const PIN_ITERATIONS = 210_000;
export const PIN_SALT_BYTES = 16;
export const PIN_HASH_BYTES = 32;
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

/** 5th wrong attempt → 30 s; 10th and every further 5th → 5 min (docs/08 §4.4). */
export const FIRST_LOCK_AT = 5;
export const FIRST_LOCK_MS = 30_000;
export const LONG_LOCK_AT = 10;
export const LONG_LOCK_MS = 5 * 60_000;

const PIN_RE = /^\d{4,6}$/;

export function isPinFormat(pin: string): boolean {
  return PIN_RE.test(pin);
}

/** False in insecure contexts / old browsers: the PIN feature is then off, the game still works (docs/10 §7). */
export function hasWebCrypto(): boolean {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  return (
    !!c &&
    typeof c.getRandomValues === 'function' &&
    !!c.subtle &&
    typeof c.subtle.importKey === 'function' &&
    typeof c.subtle.deriveBits === 'function'
  );
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    PIN_HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/**
 * Hashes a new PIN with a fresh random salt.
 * `iterations` exists only so tests can run fast; app code must not pass it.
 */
export async function createPinRecord(pin: string, iterations: number = PIN_ITERATIONS): Promise<PinRecord> {
  if (!isPinFormat(pin)) throw new Error('PIN must be 4–6 digits');
  const salt = crypto.getRandomValues(new Uint8Array(PIN_SALT_BYTES));
  const hash = await derive(pin, salt, iterations);
  return {
    algo: 'PBKDF2-SHA256',
    iterations,
    salt: toBase64(salt),
    hash: toBase64(hash),
    failedAttempts: 0,
  };
}

export function lockRemainingMs(record: PinRecord, now: Date = new Date()): number {
  if (!record.lockedUntil) return 0;
  const until = Date.parse(record.lockedUntil);
  if (Number.isNaN(until)) return 0;
  return Math.max(0, until - now.getTime());
}

/** Lock duration that starts after the n-th consecutive failure (0 = no lock). */
export function lockMsAfterFailures(n: number): number {
  if (n >= LONG_LOCK_AT && n % FIRST_LOCK_AT === 0) return LONG_LOCK_MS;
  if (n === FIRST_LOCK_AT) return FIRST_LOCK_MS;
  return 0;
}

export interface PinCheckResult {
  ok: boolean;
  /** The record to persist (attempt counter / lock updated). Unchanged while locked. */
  record: PinRecord;
  /** > 0 when the PIN is (now) locked. */
  lockedForMs: number;
}

export async function checkPin(
  record: PinRecord,
  pin: string,
  now: Date = new Date(),
): Promise<PinCheckResult> {
  const remaining = lockRemainingMs(record, now);
  if (remaining > 0) return { ok: false, record, lockedForMs: remaining };

  let match = false;
  if (isPinFormat(pin)) {
    try {
      const expected = fromBase64(record.hash);
      const actual = await derive(pin, fromBase64(record.salt), record.iterations);
      match = sameBytes(expected, actual);
    } catch {
      match = false;
    }
  }

  if (match) {
    const { lockedUntil: _l, ...rest } = record;
    void _l;
    return { ok: true, record: { ...rest, failedAttempts: 0 }, lockedForMs: 0 };
  }

  const failedAttempts = record.failedAttempts + 1;
  const lockMs = lockMsAfterFailures(failedAttempts);
  const { lockedUntil: _old, ...rest } = record;
  void _old;
  const next: PinRecord =
    lockMs > 0
      ? { ...rest, failedAttempts, lockedUntil: new Date(now.getTime() + lockMs).toISOString() }
      : { ...rest, failedAttempts };
  return { ok: false, record: next, lockedForMs: lockMs };
}
