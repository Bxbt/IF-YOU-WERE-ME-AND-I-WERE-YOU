/**
 * Phase 3C Live relay (docs/10 §10.3, docs/08 §6.3).
 * Serves the built game from dist/ and a tiny encrypted mailbox at /api/live:
 * each room has two slots; each device writes only its own slot (write token) and reads both.
 * Everything stored is ciphertext made in the browser — the server never sees a key.
 */
import http from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOM_RE = /^[A-Za-z0-9_-]{22}$/;
const MAX_BODY = 512 * 1024;
const ROOM_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RATE_PER_MIN = 120;

const sha = (s) => createHash('sha256').update(s).digest('hex');

// ---------- stores ----------

export function memoryStore() {
  /** @type {Map<string, {tokenHash:string, iv:string|null, data:string|null, rev:number, updatedAt:number}>} */
  const slots = new Map();
  const k = (room, slot) => `${room}:${slot}`;
  return {
    kind: 'memory',
    async init() {},
    async claim(room, slot, tokenHash) {
      if (slots.has(k(room, slot))) return false;
      if (slot === 1 && !slots.has(k(room, 0))) return false;
      slots.set(k(room, slot), { tokenHash, iv: null, data: null, rev: 0, updatedAt: Date.now() });
      return true;
    },
    async tokenHash(room, slot) {
      return slots.get(k(room, slot))?.tokenHash ?? null;
    },
    async put(room, slot, iv, data) {
      const s = slots.get(k(room, slot));
      if (!s) return null;
      s.iv = iv;
      s.data = data;
      s.rev += 1;
      s.updatedAt = Date.now();
      return s.rev;
    },
    async get(room) {
      const out = [];
      for (const slot of [0, 1]) {
        const s = slots.get(k(room, slot));
        if (s) out.push({ slot, iv: s.iv, data: s.data, rev: s.rev });
      }
      return out;
    },
    async remove(room, slot) {
      slots.delete(k(room, slot));
    },
    async sweep(olderThan) {
      for (const [key, s] of slots) if (s.updatedAt < olderThan) slots.delete(key);
    },
    /** Test helper: everything stored, as one string. */
    dump() {
      return JSON.stringify([...slots.entries()]);
    },
  };
}

export async function pgStore(url) {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: url, max: 5 });
  return {
    kind: 'postgres',
    async init() {
      await pool.query(`CREATE TABLE IF NOT EXISTS live_slots (
        room text NOT NULL, slot smallint NOT NULL CHECK (slot IN (0, 1)),
        token_hash text NOT NULL, iv text, data text, rev integer NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (room, slot))`);
    },
    async claim(room, slot, tokenHash) {
      if (slot === 1) {
        const r = await pool.query('SELECT 1 FROM live_slots WHERE room=$1 AND slot=0', [room]);
        if (!r.rowCount) return false;
      }
      const r = await pool.query(
        'INSERT INTO live_slots (room, slot, token_hash) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [room, slot, tokenHash],
      );
      return r.rowCount === 1;
    },
    async tokenHash(room, slot) {
      const r = await pool.query('SELECT token_hash FROM live_slots WHERE room=$1 AND slot=$2', [room, slot]);
      return r.rows[0]?.token_hash ?? null;
    },
    async put(room, slot, iv, data) {
      const r = await pool.query(
        'UPDATE live_slots SET iv=$3, data=$4, rev=rev+1, updated_at=now() WHERE room=$1 AND slot=$2 RETURNING rev',
        [room, slot, iv, data],
      );
      return r.rows[0]?.rev ?? null;
    },
    async get(room) {
      const r = await pool.query('SELECT slot, iv, data, rev FROM live_slots WHERE room=$1 ORDER BY slot', [room]);
      return r.rows;
    },
    async remove(room, slot) {
      await pool.query('DELETE FROM live_slots WHERE room=$1 AND slot=$2', [room, slot]);
    },
    async sweep(olderThan) {
      await pool.query('DELETE FROM live_slots WHERE updated_at < $1', [new Date(olderThan)]);
    },
  };
}

// ---------- app ----------

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};

export function createApp({ store, distDir }) {
  /** room → Map<res, slot> of open event streams */
  const streams = new Map();
  const hits = new Map();

  function limited(ip) {
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || now - h.start > 60_000) {
      hits.set(ip, { start: now, n: 1 });
      return false;
    }
    h.n += 1;
    return h.n > RATE_PER_MIN;
  }

  function presence(room) {
    const m = streams.get(room);
    return m ? [...new Set(m.values())].sort() : [];
  }

  function broadcast(room, event, data) {
    const m = streams.get(room);
    if (!m) return;
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of m.keys()) res.write(msg);
  }

  function json(res, code, body) {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
    res.end(JSON.stringify(body));
  }

  async function readBody(req) {
    if (Number(req.headers['content-length'] ?? 0) > MAX_BODY) return null;
    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > MAX_BODY) return null;
      chunks.push(c);
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  async function authorized(req, room, slot) {
    const stored = await store.tokenHash(room, slot);
    const auth = req.headers.authorization ?? '';
    if (!stored || !auth.startsWith('Bearer ')) return false;
    const a = Buffer.from(sha(auth.slice(7)), 'hex');
    const b = Buffer.from(stored, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async function api(req, res, url) {
    const parts = url.pathname.split('/').filter(Boolean); // api live rooms :room slots :n
    if (parts[2] === 'health' && parts.length === 3 && req.method === 'GET')
      return json(res, 200, { ok: true, store: store.kind });
    if (parts[2] !== 'rooms' || !ROOM_RE.test(parts[3] ?? '')) return json(res, 404, { error: 'not_found' });
    const room = parts[3];

    if (parts.length === 4 && req.method === 'GET') {
      const slots = await store.get(room);
      if (!slots.length) return json(res, 404, { error: 'no_room' });
      return json(res, 200, { slots, presence: presence(room) });
    }

    if (parts.length === 5 && parts[4] === 'events' && req.method === 'GET') {
      const slot = Number(url.searchParams.get('slot'));
      if (slot !== 0 && slot !== 1) return json(res, 400, { error: 'bad_slot' });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        ...SECURITY_HEADERS,
      });
      res.write('retry: 3000\n\n');
      if (!streams.has(room)) streams.set(room, new Map());
      streams.get(room).set(res, slot);
      broadcast(room, 'presence', presence(room));
      const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
      req.on('close', () => {
        clearInterval(ping);
        const m = streams.get(room);
        m?.delete(res);
        if (m && m.size === 0) streams.delete(room);
        else broadcast(room, 'presence', presence(room));
      });
      return;
    }

    if (parts.length === 6 && parts[4] === 'slots') {
      const slot = Number(parts[5]);
      if (slot !== 0 && slot !== 1) return json(res, 404, { error: 'bad_slot' });

      if (req.method === 'POST') {
        const token = randomBytes(24).toString('base64url');
        const ok = await store.claim(room, slot, sha(token));
        return ok ? json(res, 201, { token }) : json(res, 409, { error: slot === 1 ? 'taken_or_no_room' : 'taken' });
      }
      if (!(await authorized(req, room, slot))) return json(res, 401, { error: 'unauthorized' });
      if (req.method === 'PUT') {
        const raw = await readBody(req);
        if (raw === null) {
          res.setHeader('Connection', 'close');
          json(res, 413, { error: 'too_large' });
          req.resume();
          return;
        }
        let body;
        try {
          body = JSON.parse(raw);
        } catch {
          return json(res, 400, { error: 'bad_json' });
        }
        if (typeof body?.iv !== 'string' || typeof body?.data !== 'string' || body.iv.length > 64)
          return json(res, 400, { error: 'bad_body' });
        const rev = await store.put(room, slot, body.iv, body.data);
        if (rev === null) return json(res, 404, { error: 'no_slot' });
        broadcast(room, 'rev', { slot, rev });
        return json(res, 200, { rev });
      }
      if (req.method === 'DELETE') {
        await store.remove(room, slot);
        broadcast(room, 'left', { slot });
        return json(res, 200, { ok: true });
      }
    }
    return json(res, 404, { error: 'not_found' });
  }

  async function serveStatic(req, res, url) {
    if (!distDir) return json(res, 404, { error: 'not_found' });
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(distDir, rel));
    if (!file.startsWith(distDir + path.sep)) return json(res, 403, { error: 'forbidden' });
    let target = file;
    try {
      if (!(await stat(target)).isFile()) throw new Error('dir');
    } catch {
      target = path.join(distDir, 'index.html'); // hash router: unknown paths get the app
    }
    try {
      const buf = await readFile(target);
      const ext = path.extname(target);
      res.writeHead(200, {
        'Content-Type': TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': target.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
        ...SECURITY_HEADERS,
      });
      res.end(req.method === 'HEAD' ? undefined : buf);
    } catch {
      json(res, 404, { error: 'not_found' });
    }
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://local');
      if (url.pathname.startsWith('/api/live/')) {
        const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
        if (!url.pathname.endsWith('/events') && limited(ip)) return json(res, 429, { error: 'rate_limited' });
        return await api(req, res, url);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'method' });
      return await serveStatic(req, res, url);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) json(res, 500, { error: 'server' });
      else res.end();
    }
  });

  const sweep = setInterval(() => store.sweep(Date.now() - ROOM_TTL_MS).catch(console.error), 60 * 60 * 1000);
  sweep.unref();
  server.on('close', () => clearInterval(sweep));
  return server;
}

// ---------- main ----------

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.resolve(process.env.DIST_DIR ?? path.join(here, '..', 'dist'));
  const store = process.env.DATABASE_URL ? await pgStore(process.env.DATABASE_URL) : memoryStore();
  await store.init();
  const port = Number(process.env.PORT ?? 8080);
  createApp({ store, distDir }).listen(port, () =>
    console.log(`live relay on :${port} (store: ${store.kind}, dist: ${distDir})`),
  );
}
