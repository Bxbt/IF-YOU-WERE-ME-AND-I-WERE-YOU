/**
 * Phase 3A Sealed Exchange crypto (docs/08 §6.1, docs/10 §10.1). AES-GCM-128 via WebCrypto.
 * The reveal key is 16 random bytes shown as 26 Base32 characters. A wrong key fails the GCM
 * auth tag, so the caller can say "รหัสไม่ถูกต้อง" instead of showing garbage.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Returns null for anything that is not 26 Base32 characters (spaces and dashes ignored). */
export function base32DecodeKey(input: string): Uint8Array | null {
  const clean = input.toUpperCase().replace(/[\s-]/g, '');
  if (clean.length !== 26) return null;
  const out = new Uint8Array(16);
  let bits = 0;
  let value = 0;
  let i = 0;
  for (const ch of clean) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    value = ((value << 5) | v) & 0xffff;
    bits += 5;
    if (bits >= 8 && i < 16) {
      out[i++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return i === 16 ? out : null;
}

/** "ABCD EFGH IJKL MNOP QRSTU VWXYZ" — groups of 4–5 so it can be read aloud (docs/08 §6.1). */
export function formatKey(key: string): string {
  const k = key.replace(/[\s-]/g, '');
  return [k.slice(0, 4), k.slice(4, 8), k.slice(8, 12), k.slice(12, 16), k.slice(16, 21), k.slice(21)]
    .filter(Boolean)
    .join(' ');
}

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('crypto_unavailable');
  return s;
}

const b64 = (bytes: Uint8Array) => {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};
const unb64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

export function newRevealKey(): string {
  return base32Encode(globalThis.crypto.getRandomValues(new Uint8Array(16)));
}

async function aesKey(key: string, usage: KeyUsage): Promise<CryptoKey> {
  const raw = base32DecodeKey(key);
  if (!raw) throw new Error('bad_key');
  return subtle().importKey('raw', raw, { name: 'AES-GCM' }, false, [usage]);
}

export async function sealJson(value: unknown, key: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, await aesKey(key, 'encrypt'), data);
  return { ciphertext: b64(new Uint8Array(ct)), iv: b64(iv) };
}

/** Throws Error('bad_key') when the key is malformed or does not open this ciphertext. */
export async function openJson(sealed: { ciphertext: string; iv: string }, key: string): Promise<unknown> {
  const k = await aesKey(key, 'decrypt');
  let plain: ArrayBuffer;
  try {
    plain = await subtle().decrypt({ name: 'AES-GCM', iv: unb64(sealed.iv) }, k, unb64(sealed.ciphertext));
  } catch {
    throw new Error('bad_key');
  }
  return JSON.parse(new TextDecoder().decode(plain));
}
