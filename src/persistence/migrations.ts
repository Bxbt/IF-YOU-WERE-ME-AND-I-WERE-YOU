/**
 * Schema migrations (docs/07 §12). 1.0.0 is the baseline, so the list is empty.
 * Add a migration only together with a fixture of the previous version and a unit test.
 */
import { SCHEMA_VERSION } from './schema';

export type Migration = {
  from: string;
  to: string;
  up: (data: Record<string, unknown>) => Record<string, unknown>;
};

export const migrations: Migration[] = [];

export function parseVersion(v: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export type VersionCheck = 'same' | 'older' | 'newer_major' | 'newer_minor' | 'invalid';

export function compareToCurrent(version: unknown): VersionCheck {
  if (typeof version !== 'string') return 'invalid';
  const v = parseVersion(version);
  const cur = parseVersion(SCHEMA_VERSION)!;
  if (!v) return 'invalid';
  if (v[0] > cur[0]) return 'newer_major';
  if (v[0] === cur[0] && v[1] === cur[1] && v[2] === cur[2]) return 'same';
  if (v[0] === cur[0] && (v[1] > cur[1] || (v[1] === cur[1] && v[2] > cur[2]))) return 'newer_minor';
  return 'older';
}

/** Runs migrations in order until the data reaches SCHEMA_VERSION. Throws if no path exists. */
export function migrate(data: Record<string, unknown>): Record<string, unknown> {
  let current = data;
  let guard = 0;
  while (current.schemaVersion !== SCHEMA_VERSION) {
    const step = migrations.find((m) => m.from === current.schemaVersion);
    if (!step) throw new Error(`No migration from ${String(current.schemaVersion)} to ${SCHEMA_VERSION}`);
    current = { ...step.up(current), schemaVersion: step.to };
    if (++guard > 100) throw new Error('Migration loop detected');
  }
  return current;
}
