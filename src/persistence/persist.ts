/**
 * Load / save pipeline (docs/07 §10, docs/05 G9–G10).
 * load: probe → read → JSON.parse → version check → migrate → Zod.
 * Never deletes data on failure — the caller routes to the Recovery screen (S18).
 */
import { SaveRoot, createEmptySave, type SaveRoot as SaveRootT } from './schema';
import { compareToCurrent, migrate } from './migrations';
import { KEYS, probeStorage, readKey, removeKey, writeKey, type WriteResult } from './storage';

export type LoadResult =
  | { status: 'ok'; data: SaveRootT }
  | { status: 'empty'; data: SaveRootT }
  | { status: 'unavailable'; data: SaveRootT }
  | { status: 'corrupt'; data: SaveRootT; raw: string; reason: string }
  | { status: 'newer'; data: SaveRootT; raw: string };

export function loadSave(): LoadResult {
  if (!probeStorage()) return { status: 'unavailable', data: createEmptySave() };

  const raw = readKey(KEYS.save);
  if (raw === null) return { status: 'empty', data: createEmptySave() };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'corrupt', data: createEmptySave(), raw, reason: 'อ่านข้อมูลไม่ได้ (JSON ไม่ถูกต้อง)' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { status: 'corrupt', data: createEmptySave(), raw, reason: 'รูปแบบข้อมูลไม่ถูกต้อง' };
  }

  const record = parsed as Record<string, unknown>;
  const version = compareToCurrent(record.schemaVersion);
  if (version === 'newer_major' || version === 'newer_minor') {
    return { status: 'newer', data: createEmptySave(), raw };
  }
  if (version === 'invalid') {
    return { status: 'corrupt', data: createEmptySave(), raw, reason: 'ไม่พบเวอร์ชันของข้อมูล' };
  }

  let candidate = record;
  if (version === 'older') {
    // Keep the pre-migration copy until migration + validation succeed (docs/07 §12).
    writeKey(KEYS.backup, raw);
    try {
      candidate = migrate(record);
    } catch (e) {
      return {
        status: 'corrupt',
        data: createEmptySave(),
        raw,
        reason: `ปรับเวอร์ชันข้อมูลไม่สำเร็จ: ${String(e)}`,
      };
    }
  }

  const result = SaveRoot.safeParse(candidate);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first ? first.path.join('.') || '(root)' : '';
    return { status: 'corrupt', data: createEmptySave(), raw, reason: `ข้อมูลไม่ผ่านการตรวจสอบที่ ${where}` };
  }

  if (version === 'older') {
    const w = writeKey(KEYS.save, JSON.stringify(result.data));
    if (w.ok) removeKey(KEYS.backup);
  }
  return { status: 'ok', data: result.data };
}

/** Validates before writing so an invalid in-memory state can never overwrite good data. */
export function writeSave(data: SaveRootT): WriteResult | { ok: false; reason: 'invalid'; error: unknown } {
  const check = SaveRoot.safeParse(data);
  if (!check.success) return { ok: false, reason: 'invalid', error: check.error };
  return writeKey(KEYS.save, JSON.stringify(check.data));
}

/**
 * Must be called after any deletion (docs/07 §10, docs/08 §7, audit H-4):
 * the backup may still contain the data that was just deleted.
 */
export function purgeBackup(): void {
  removeKey(KEYS.backup);
}

export function readBackupRaw(): string | null {
  return readKey(KEYS.backup);
}
