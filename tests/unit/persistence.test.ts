import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SaveRoot, createEmptySave, SCHEMA_VERSION } from '../../src/persistence/schema';
import { loadSave, writeSave, purgeBackup } from '../../src/persistence/persist';
import { KEYS } from '../../src/persistence/storage';
import { compareToCurrent } from '../../src/persistence/migrations';
import { sampleSave } from '../fixtures/factory';

describe('schema', () => {
  it('accepts an empty save and the sample fixture', () => {
    expect(SaveRoot.safeParse(createEmptySave()).success).toBe(true);
    expect(SaveRoot.safeParse(sampleSave()).success).toBe(true);
  });

  it('rejects meta answers that also have selected options (docs/07 §4 invariants)', () => {
    const s = sampleSave();
    const p = s.profiles['pl_playerA01:self'];
    if (!p || !('hiddenObservedCards' in p)) throw new Error('fixture');
    p.answers.Q16!.selected = ['q16_solution'];
    expect(SaveRoot.safeParse(s).success).toBe(false);
  });

  it('rejects more than one active journey (MVP rule A-23)', () => {
    const s = sampleSave();
    s.journeys.jr_journey002 = { ...s.journeys.jr_journey001!, id: 'jr_journey002' };
    expect(SaveRoot.safeParse(s).success).toBe(false);
  });

  it('rejects drafts not scoped to a player (audit M-3)', () => {
    const s = sampleSave();
    s.drafts.bad = {
      key: 'r1_3',
      playerId: 'pl_playerA01',
      text: 'x',
      updatedAt: '2026-11-22T10:00:00.000Z',
    };
    expect(SaveRoot.safeParse(s).success).toBe(false);
  });

  it('compares versions', () => {
    expect(compareToCurrent(SCHEMA_VERSION)).toBe('same');
    expect(compareToCurrent('2.0.0')).toBe('newer_major');
    expect(compareToCurrent('1.1.0')).toBe('newer_minor');
    expect(compareToCurrent('0.9.0')).toBe('older');
    expect(compareToCurrent(undefined)).toBe('invalid');
  });
});

describe('loadSave', () => {
  it('returns empty when nothing is stored', () => {
    expect(loadSave().status).toBe('empty');
  });

  it('round-trips a valid save', () => {
    expect(writeSave(sampleSave()).ok).toBe(true);
    const r = loadSave();
    expect(r.status).toBe('ok');
    expect(r.data).toEqual(sampleSave());
  });

  it('TC-ERR-01: reports unavailable when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(loadSave().status).toBe('unavailable');
    spy.mockRestore();
  });

  it('TC-ERR-03: corrupt JSON is reported and NOT deleted', () => {
    const raw = readFileSync(resolve(__dirname, '../fixtures/save-corrupt.json'), 'utf8');
    localStorage.setItem(KEYS.save, raw);
    const r = loadSave();
    expect(r.status).toBe('corrupt');
    if (r.status === 'corrupt') expect(r.raw).toBe(raw);
    expect(localStorage.getItem(KEYS.save)).toBe(raw);
  });

  it('schema-invalid data is reported as corrupt with a location', () => {
    localStorage.setItem(KEYS.save, JSON.stringify({ ...createEmptySave(), players: { x: { id: 'x' } } }));
    const r = loadSave();
    expect(r.status).toBe('corrupt');
    if (r.status === 'corrupt') expect(r.reason).toContain('players');
  });

  it('data from a newer version is reported, not overwritten', () => {
    const raw = JSON.stringify({ ...createEmptySave(), schemaVersion: '2.0.0' });
    localStorage.setItem(KEYS.save, raw);
    expect(loadSave().status).toBe('newer');
    expect(localStorage.getItem(KEYS.save)).toBe(raw);
  });
});

describe('writeSave', () => {
  it('TC-ERR-02: reports quota errors without throwing', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const r = writeSave(sampleSave());
    expect(r).toMatchObject({ ok: false, reason: 'quota' });
    spy.mockRestore();
  });

  it('refuses to write invalid data so good data is never overwritten', () => {
    writeSave(sampleSave());
    const before = localStorage.getItem(KEYS.save);
    const bad = { ...sampleSave(), schemaVersion: 'x' } as unknown as SaveRoot;
    expect(writeSave(bad)).toMatchObject({ ok: false, reason: 'invalid' });
    expect(localStorage.getItem(KEYS.save)).toBe(before);
  });

  it('purgeBackup removes the backup key (audit H-4)', () => {
    localStorage.setItem(KEYS.backup, 'old');
    purgeBackup();
    expect(localStorage.getItem(KEYS.backup)).toBeNull();
  });
});
