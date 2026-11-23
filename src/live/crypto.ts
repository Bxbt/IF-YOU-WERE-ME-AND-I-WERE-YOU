/**
 * Phase 3C Live end-to-end encryption (docs/08 §6.3): AES-GCM-256 with a key that only travels
 * inside the invite link's #fragment or as the room code. The relay server only ever sees ciphertext.
 */
const b64url = (bytes: Uint8Array) => {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64url = (text: string) =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('crypto_unavailable');
  return s;
}

const rand = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));

/** 128-bit room id, base64url (22 chars) — matches the server's ROOM_RE. */
export const newRoomId = () => b64url(rand(16));
/** 256-bit key, base64url (43 chars). */
export const newRoomKey = () => b64url(rand(32));

export const ROOM_RE = /^[A-Za-z0-9_-]{22}$/;
export const KEY_RE = /^[A-Za-z0-9_-]{43}$/;

/** "room.key" as carried in `#/live?join=…`. */
export function parseJoin(code: string): { room: string; key: string } | null {
  const [room, key] = code.trim().split('.');
  return room && key && ROOM_RE.test(room) && KEY_RE.test(key) ? { room, key } : null;
}

// ---------- room code (docs/08 §6.3) ----------

/** Crockford base32: no I, L, O, U — easy to read aloud and type. */
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LEN = 10; // 50 bits
const CODE_SALT = 'iywm-live-v1';
const CODE_ROUNDS = 300_000;

/** A fresh room code, shown as `XXXXX-XXXXX`. */
export function newRoomCode(): string {
  const bytes = rand(CODE_LEN);
  const raw = Array.from(bytes, (b) => CODE_ALPHABET[b & 31]).join('');
  return formatRoomCode(raw);
}

/** Uppercase, drop spaces/dashes, read O as 0 and I/L as 1. Null when it is not a valid code. */
export function normalizeRoomCode(text: string): string | null {
  const raw = text
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  return raw.length === CODE_LEN && [...raw].every((c) => CODE_ALPHABET.includes(c)) ? raw : null;
}

export const formatRoomCode = (raw: string) => `${raw.slice(0, 5)}-${raw.slice(5)}`;

/** Room id + key from a room code (PBKDF2-SHA-256). The server never sees the code. */
export async function roomFromCode(code: string): Promise<{ room: string; key: string } | null> {
  const raw = normalizeRoomCode(code);
  if (!raw) return null;
  const enc = new TextEncoder();
  const base = await subtle().importKey('raw', enc.encode(raw), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(
    await subtle().deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(CODE_SALT), iterations: CODE_ROUNDS },
      base,
      384,
    ),
  );
  return { room: b64url(bits.slice(0, 16)), key: b64url(bits.slice(16)) };
}

async function aes(key: string, usage: KeyUsage): Promise<CryptoKey> {
  return subtle().importKey('raw', unb64url(key), { name: 'AES-GCM' }, false, [usage]);
}

export async function encryptJson(value: unknown, key: string): Promise<{ iv: string; data: string }> {
  const iv = rand(12);
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, await aes(key, 'encrypt'), plain);
  return { iv: b64url(iv), data: b64url(new Uint8Array(ct)) };
}

/** Throws Error('bad_key') when the key does not open this ciphertext. */
export async function decryptJson(box: { iv: string; data: string }, key: string): Promise<unknown> {
  const k = await aes(key, 'decrypt');
  try {
    const plain = await subtle().decrypt({ name: 'AES-GCM', iv: unb64url(box.iv) }, k, unb64url(box.data));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new Error('bad_key');
  }
}
