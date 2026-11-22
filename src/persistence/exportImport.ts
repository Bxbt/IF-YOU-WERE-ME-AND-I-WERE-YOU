/**
 * Export / Import (docs/07 §11). MVP supports scope=full only.
 * The checksum detects accidental corruption only — it is NOT tamper protection (audit H-3).
 */
import { SaveRoot, SCHEMA_VERSION, type SaveRoot as SaveRootT } from './schema';
import { compareToCurrent, migrate } from './migrations';

export const EXPORT_FORMAT = 'iywm-export';
export const CONTENT_VERSION = '1.0.0';
export const APP_VERSION = '0.1.0';
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface ExportEnvelope {
  format: typeof EXPORT_FORMAT;
  schemaVersion: string;
  contentVersion: string;
  appVersion: string;
  exportedAt: string;
  scope: 'full';
  data: unknown;
  checksum: string;
}

function toBase64(bytes: ArrayBuffer): string {
  let bin = '';
  new Uint8Array(bytes).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export async function sha256Base64(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto unavailable');
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
  return `sha256-${toBase64(digest)}`;
}

/** Strips PIN hashes: they must be set again after import (docs/07 §11.1). */
function stripSecrets(save: SaveRootT): SaveRootT {
  const players = Object.fromEntries(
    Object.entries(save.players).map(([id, p]) => {
      const { pin: _pin, ...rest } = p;
      void _pin;
      return [id, rest];
    }),
  );
  return { ...save, players };
}

export async function buildFullExport(save: SaveRootT, now = new Date()): Promise<ExportEnvelope> {
  const data = stripSecrets(save);
  return {
    format: EXPORT_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    appVersion: APP_VERSION,
    exportedAt: now.toISOString(),
    scope: 'full',
    data,
    checksum: await sha256Base64(JSON.stringify(data)),
  };
}

/** File name never contains player names (docs/07 §11.1, TC-EXP-09). */
export function exportFileName(scope: string, now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
  return `iywm-${scope}-${stamp}.json`;
}

export type ImportError =
  | 'too_large'
  | 'not_json'
  | 'wrong_format'
  | 'unsupported_scope'
  | 'checksum_mismatch'
  | 'newer_version'
  | 'invalid_version'
  | 'invalid_data'
  | 'crypto_unavailable';

export type ImportResult =
  | { ok: true; data: SaveRootT; summary: { players: number; journeys: number } }
  | { ok: false; error: ImportError; detail?: string };

export const IMPORT_ERROR_TEXT: Record<ImportError, string> = {
  too_large: 'ไฟล์ใหญ่เกิน 5 MB',
  not_json: 'ไฟล์นี้ไม่ใช่ไฟล์ JSON',
  wrong_format: 'ไฟล์นี้ไม่ใช่ไฟล์ที่ส่งออกจากเกมนี้',
  unsupported_scope: 'ตอนนี้นำเข้าได้เฉพาะไฟล์สำรองข้อมูลทั้งหมด',
  checksum_mismatch: 'ไฟล์อาจเสียหาย',
  newer_version: 'ไฟล์นี้มาจากเวอร์ชันใหม่กว่า กรุณาอัปเดตเกมก่อน',
  invalid_version: 'ไม่พบเวอร์ชันของข้อมูลในไฟล์',
  invalid_data: 'ข้อมูลในไฟล์ไม่ผ่านการตรวจสอบ',
  crypto_unavailable: 'เบราว์เซอร์นี้ไม่รองรับการตรวจสอบไฟล์',
};

export async function parseImport(text: string): Promise<ImportResult> {
  if (new Blob([text]).size > MAX_IMPORT_BYTES) return { ok: false, error: 'too_large' };

  let env: unknown;
  try {
    env = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not_json' };
  }
  if (!env || typeof env !== 'object' || (env as { format?: unknown }).format !== EXPORT_FORMAT) {
    return { ok: false, error: 'wrong_format' };
  }
  const e = env as Partial<ExportEnvelope> & { scope?: unknown };
  if (e.scope !== 'full') return { ok: false, error: 'unsupported_scope' };

  try {
    const expected = await sha256Base64(JSON.stringify(e.data));
    if (expected !== e.checksum) return { ok: false, error: 'checksum_mismatch' };
  } catch {
    return { ok: false, error: 'crypto_unavailable' };
  }

  const v = compareToCurrent(e.schemaVersion);
  if (v === 'newer_major' || v === 'newer_minor') return { ok: false, error: 'newer_version' };
  if (v === 'invalid') return { ok: false, error: 'invalid_version' };

  let data = e.data as Record<string, unknown>;
  if (!data || typeof data !== 'object') return { ok: false, error: 'invalid_data' };
  if (v === 'older') {
    try {
      data = migrate(data);
    } catch (err) {
      return { ok: false, error: 'invalid_data', detail: String(err) };
    }
  }

  const parsed = SaveRoot.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: 'invalid_data', detail: first ? first.path.join('.') : undefined };
  }
  return {
    ok: true,
    data: parsed.data,
    summary: { players: Object.keys(parsed.data.players).length, journeys: Object.keys(parsed.data.journeys).length },
  };
}
