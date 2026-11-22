import { describe, expect, it } from 'vitest';
import {
  checkPin,
  createPinRecord,
  hasWebCrypto,
  isPinFormat,
  lockRemainingMs,
  PIN_ITERATIONS,
  type PinRecord,
} from '../../src/lib/pin';
import { PinRecord as PinRecordSchema } from '../../src/persistence/schema';

const FAST = 1000;
const T0 = new Date('2026-11-22T10:00:00.000Z');
const at = (ms: number) => new Date(T0.getTime() + ms);

async function failTimes(rec: PinRecord, n: number, now: Date): Promise<PinRecord> {
  let r = rec;
  for (let i = 0; i < n; i++) r = (await checkPin(r, '0000', now)).record;
  return r;
}

describe('isPinFormat', () => {
  it('accepts 4–6 digits only', () => {
    expect(isPinFormat('1234')).toBe(true);
    expect(isPinFormat('123456')).toBe(true);
    expect(isPinFormat('123')).toBe(false);
    expect(isPinFormat('1234567')).toBe(false);
    expect(isPinFormat('12a4')).toBe(false);
    expect(isPinFormat(' 1234')).toBe(false);
    expect(isPinFormat('๑๒๓๔')).toBe(false);
  });
});

describe('createPinRecord / checkPin', () => {
  it('WebCrypto is available in tests', () => {
    expect(hasWebCrypto()).toBe(true);
  });

  it('defaults to 210000 iterations with 16-byte salt and 32-byte hash', async () => {
    const r = await createPinRecord('2468');
    expect(r.iterations).toBe(PIN_ITERATIONS);
    expect(PIN_ITERATIONS).toBe(210000);
    expect(r.algo).toBe('PBKDF2-SHA256');
    expect(atob(r.salt)).toHaveLength(16);
    expect(atob(r.hash)).toHaveLength(32);
    expect(r.failedAttempts).toBe(0);
    expect(PinRecordSchema.safeParse(r).success).toBe(true);
    expect(JSON.stringify(r)).not.toContain('2468');
    expect((await checkPin(r, '2468')).ok).toBe(true);
  });

  it('uses a fresh salt each time', async () => {
    const a = await createPinRecord('1234', FAST);
    const b = await createPinRecord('1234', FAST);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('rejects an invalid PIN format when creating', async () => {
    await expect(createPinRecord('12', FAST)).rejects.toThrow();
  });

  it('right PIN passes, wrong PIN counts', async () => {
    const r = await createPinRecord('1357', FAST);
    const wrong = await checkPin(r, '1358', T0);
    expect(wrong.ok).toBe(false);
    expect(wrong.record.failedAttempts).toBe(1);
    expect(wrong.lockedForMs).toBe(0);
    const right = await checkPin(wrong.record, '1357', T0);
    expect(right.ok).toBe(true);
    expect(right.record.failedAttempts).toBe(0);
    expect(right.record.lockedUntil).toBeUndefined();
  });

  it('locks 30 s at the 5th failure and refuses even the right PIN while locked', async () => {
    const r = await createPinRecord('1357', FAST);
    const four = await failTimes(r, 4, T0);
    expect(four.lockedUntil).toBeUndefined();
    const fifth = await checkPin(four, '0000', T0);
    expect(fifth.record.failedAttempts).toBe(5);
    expect(fifth.lockedForMs).toBe(30_000);
    expect(lockRemainingMs(fifth.record, at(10_000))).toBe(20_000);
    const blocked = await checkPin(fifth.record, '1357', at(29_000));
    expect(blocked.ok).toBe(false);
    expect(blocked.record).toBe(fifth.record);
    expect(blocked.lockedForMs).toBe(1_000);
    const after = await checkPin(fifth.record, '1357', at(30_000));
    expect(after.ok).toBe(true);
    expect(after.record.failedAttempts).toBe(0);
    expect(after.record.lockedUntil).toBeUndefined();
  });

  it('locks 5 min at the 10th failure and every 5 after', async () => {
    const r = await createPinRecord('1357', FAST);
    let rec = await failTimes(r, 5, T0);
    const t1 = at(30_000);
    rec = await failTimes(rec, 4, t1);
    expect(rec.failedAttempts).toBe(9);
    expect(lockRemainingMs(rec, t1)).toBe(0);
    const tenth = await checkPin(rec, '0000', t1);
    expect(tenth.record.failedAttempts).toBe(10);
    expect(tenth.lockedForMs).toBe(5 * 60_000);
    const t2 = new Date(t1.getTime() + 5 * 60_000);
    rec = await failTimes(tenth.record, 4, t2);
    const fifteenth = await checkPin(rec, '0000', t2);
    expect(fifteenth.record.failedAttempts).toBe(15);
    expect(fifteenth.lockedForMs).toBe(5 * 60_000);
  });

  it('a malformed entry is a wrong attempt', async () => {
    const r = await createPinRecord('1357', FAST);
    const res = await checkPin(r, 'abc', T0);
    expect(res.ok).toBe(false);
    expect(res.record.failedAttempts).toBe(1);
  });
});
