import { describe, expect, it } from 'vitest';
import {
  buildFullExport,
  exportFileName,
  parseImport,
  MAX_IMPORT_BYTES,
  sha256Base64,
} from '../../src/persistence/exportImport';
import { sampleSave } from '../fixtures/factory';

describe('export / import (docs/07 §11)', () => {
  it('TC-EXP-01: full round-trip preserves everything except PIN hashes', async () => {
    const save = sampleSave();
    const env = await buildFullExport(save);
    const res = await parseImport(JSON.stringify(env));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const expected = sampleSave();
    delete expected.players.pl_playerA01!.pin;
    expect(res.data).toEqual(expected);
    expect(res.summary).toEqual({ players: 2, journeys: 1 });
  });

  it('TC-EXP-02: checksum mismatch is rejected as possibly corrupted', async () => {
    const env = await buildFullExport(sampleSave());
    (env.data as { settings: { textSpeed: string } }).settings.textSpeed = 'fast';
    expect(await parseImport(JSON.stringify(env))).toEqual({ ok: false, error: 'checksum_mismatch' });
  });

  it('checksum is only corruption detection: a recomputed checksum passes (documented limitation, audit H-3)', async () => {
    const env = await buildFullExport(sampleSave());
    (env.data as { settings: { textSpeed: string } }).settings.textSpeed = 'fast';
    env.checksum = await sha256Base64(JSON.stringify(env.data));
    expect((await parseImport(JSON.stringify(env))).ok).toBe(true);
  });

  it('TC-EXP-03: newer major version is rejected', async () => {
    const env = await buildFullExport(sampleSave());
    env.schemaVersion = '2.0.0';
    expect(await parseImport(JSON.stringify(env))).toEqual({ ok: false, error: 'newer_version' });
  });

  it('TC-EXP-04: non-JSON, wrong format, unsupported scope and oversize files are rejected', async () => {
    expect(await parseImport('not json')).toEqual({ ok: false, error: 'not_json' });
    expect(await parseImport(JSON.stringify({ format: 'other' }))).toEqual({ ok: false, error: 'wrong_format' });
    const env = { ...(await buildFullExport(sampleSave())), scope: 'journey' };
    expect(await parseImport(JSON.stringify(env))).toEqual({ ok: false, error: 'unsupported_scope' });
    expect((await parseImport('x'.repeat(MAX_IMPORT_BYTES + 1))).ok).toBe(false);
  });

  it('rejects schema-invalid data even with a valid checksum', async () => {
    const env = await buildFullExport(sampleSave());
    (env.data as { players: Record<string, unknown> }).players = { bad: { id: 'bad' } };
    env.checksum = await sha256Base64(JSON.stringify(env.data));
    expect(await parseImport(JSON.stringify(env))).toMatchObject({ ok: false, error: 'invalid_data' });
  });

  it('TC-EXP-09: export file name contains no player names', () => {
    const name = exportFileName('full', new Date(2026, 10, 22, 9, 5));
    expect(name).toBe('iywm-full-20261122-0905.json');
  });
});
