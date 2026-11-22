/**
 * Phase 3C Live end-to-end encryption (docs/08 §6.3): AES-GCM-256 with a random key that only
 * travels inside the invite link's #fragment. The relay server only ever sees ciphertext.
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
