/** Phase 3C Live: merge rules (TC-LIVE-01..04) and the relay server (TC-LIVE-05/06). Fictional names only. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createEmptySave, SaveRoot, type GameSession, type SaveRoot as Save } from '../../src/persistence/schema';
import { buildPayload, mergePartner, remoteFor, stampSeq, type LiveLink, type SlotPayload } from '../../src/live/merge';
import { decryptJson, encryptJson, newRoomId, newRoomKey, parseJoin } from '../../src/live/crypto';
import { submitTogetherMirror, consentItems, setPendingPrivate, startChapter } from '../../src/store/story';
// @ts-expect-error — plain ESM server module without types
import { createApp, memoryStore } from '../../server/index.mjs';

const A = 'pl_liveAAA01';
const B = 'pl_liveBBB01';
const JID = 'jr_liveJRN01';
const T0 = '2026-11-23T10:00:00.000Z';
const appearance = { preset: 'p1', skin: 1, hairStyle: 1, hairColor: 1, outfit: 0, outfitColor: 1, accessory: 'none' } as const;

const player = (id: string, nickname: string) => ({
  id,
  kind: 'real' as const,
  createdBy: null,
  nickname,
  sentenceEnding: '' as const,
  addressStyle: 'เธอ' as const,
  appearance,
  createdAt: T0,
  updatedAt: T0,
});

function journey(): GameSession {
  return {
    id: JID,
    mode: 'remote_online',
    playerIds: [A, B],
    status: 'active',
    chapterProgress: {},
    storyAnswers: {},
    mirrorItems: {},
    observed: [],
    nextConversation: [],
    introSeen: true,
    createdAt: T0,
    updatedAt: T0,
    lastPlayedAt: T0,
  };
}

const linkFor = (slot: 0 | 1): LiveLink => ({
  room: 'r'.repeat(22),
  key: 'k'.repeat(43),
  token: 't',
  slot,
  localPlayerId: slot === 0 ? A : B,
  journeyId: JID,
});

function device(slot: 0 | 1): Save {
  const s = createEmptySave();
  s.players = { [A]: player(A, 'เอ'), [B]: player(B, 'บี') };
  s.journeys = { [JID]: { ...journey(), remote: remoteFor(linkFor(slot)) } };
  return s;
}

const payloadOf = (s: Save, slot: 0 | 1) => buildPayload(s, linkFor(slot)) as SlotPayload;
const progress = (s: Save, ch = 'ch1') => s.journeys[JID]!.chapterProgress[ch]!;

function withProgress(s: Save, p: Partial<GameSession['chapterProgress'][string]>): Save {
  const j = s.journeys[JID]!;
  const base = { chapterId: 'ch1' as const, status: 'in_progress' as const, flags: {}, choiceLog: [], skippedScenes: [], playCount: 1 };
  return { ...s, journeys: { [JID]: { ...j, chapterProgress: { ch1: { ...base, ...p } } } } };
}

const mirrorInput = (sel: string) => ({ selected: [sel], meta: null, freeText: '' });

describe('Live merge', () => {
  it('TC-LIVE-01: a slot cannot change the other player’s answers', () => {
    let a = device(0);
    let b = device(1);
    a = submitTogetherMirror(a, JID, 'M01', 'self', A, 'self', mirrorInput('x'));
    // B's device forges an answer for A
    b = submitTogetherMirror(b, JID, 'M01', 'self', A, 'self', mirrorInput('forged'));
    b = submitTogetherMirror(b, JID, 'M01', 'self', B, 'self', mirrorInput('y'));
    const merged = mergePartner(a, linkFor(0), payloadOf(b, 1));
    const item = merged.journeys[JID]!.mirrorItems.M01!;
    expect(item.entries[A]!.self!.selected).toEqual(['x']);
    expect(item.entries[B]!.self!.selected).toEqual(['y']);
    expect(SaveRoot.safeParse(merged).success).toBe(true);
  });

  it('never sends PINs, and the local journey link stays on the device', () => {
    const a = device(0);
    a.players[A] = { ...a.players[A]!, pin: { algo: 'PBKDF2-SHA256', iterations: 1, salt: 's', hash: 'h', failedAttempts: 0 } };
    const p = payloadOf(a, 0);
    expect(JSON.stringify(p)).not.toContain('PBKDF2');
    expect(p.journey && 'remote' in p.journey).toBe(false);
    const merged = mergePartner(device(1), linkFor(1), p);
    expect(merged.journeys[JID]!.remote?.liveSlot).toBe(1);
  });

  it('TC-LIVE-02: both submit a private step at once → empty waiting list on both devices', () => {
    const start = (s: Save) => withProgress(s, { currentSceneId: 's1', lineIndex: 3, syncSeq: 5 });
    let a = start(device(0));
    let b = start(device(1));
    a = setPendingPrivate(a, JID, 'ch1', 's1:3', [B], true);
    b = setPendingPrivate(b, JID, 'ch1', 's1:3', [A], true);
    const a2 = mergePartner(a, linkFor(0), payloadOf(b, 1));
    const b2 = mergePartner(b, linkFor(1), payloadOf(a, 0));
    for (const s of [a2, b2]) expect(progress(s).pendingPrivateSteps).toEqual([{ itemId: 's1:3', playerIds: [] }]);
  });

  it('TC-LIVE-09: a chapter starts only after both entered it — one after the other, or at once', () => {
    // Device enters ch2: start it (commit hook stamps syncSeq) and wait for everyone else.
    const enter = (s: Save, self: string) => {
      const started = startChapter(s, JID, 'ch2', 's1', 0);
      const stamped = { ...started, journeys: { [JID]: stampSeq(s.journeys[JID], started.journeys[JID]!) } };
      return setPendingPrivate(stamped, JID, 'ch2', 'ready', [A, B].filter((x) => x !== self), true);
    };
    const ready = (s: Save) => progress(s, 'ch2').pendingPrivateSteps?.find((x) => x.itemId === 'ready')?.playerIds;

    // One after the other: A waits for B; B receives A's start and arrives.
    const a = enter(device(0), A);
    expect(ready(a)).toEqual([B]);
    let b = mergePartner(device(1), linkFor(1), payloadOf(a, 0));
    expect(ready(b)).toEqual([B]);
    b = setPendingPrivate(b, JID, 'ch2', 'ready', [], true);
    expect(ready(mergePartner(a, linkFor(0), payloadOf(b, 1)))).toEqual([]);

    // At once: both start from the same state, each waiting for the other → nobody is stuck.
    const a2 = enter(device(0), A);
    const b2 = enter(device(1), B);
    expect(ready(mergePartner(a2, linkFor(0), payloadOf(b2, 1)))).toEqual([]);
    expect(ready(mergePartner(b2, linkFor(1), payloadOf(a2, 0)))).toEqual([]);
  });

  it('TC-LIVE-03: the higher syncSeq wins; a tie goes to slot 0 on both devices', () => {
    const a = withProgress(device(0), { currentSceneId: 's2', lineIndex: 0, syncSeq: 7, choiceLog: [] });
    const b = withProgress(device(1), { currentSceneId: 's1', lineIndex: 9, syncSeq: 6 });
    expect(progress(mergePartner(b, linkFor(1), payloadOf(a, 0))).currentSceneId).toBe('s2');
    expect(progress(mergePartner(a, linkFor(0), payloadOf(b, 1))).currentSceneId).toBe('s2');
    const a3 = withProgress(device(0), { currentSceneId: 'sA', lineIndex: 0, syncSeq: 7 });
    const b3 = withProgress(device(1), { currentSceneId: 'sB', lineIndex: 0, syncSeq: 7 });
    expect(progress(mergePartner(a3, linkFor(0), payloadOf(b3, 1))).currentSceneId).toBe('sA');
    expect(progress(mergePartner(b3, linkFor(1), payloadOf(a3, 0))).currentSceneId).toBe('sA');
  });

  it('stampSeq bumps only when the position changed', () => {
    const j = withProgress(device(0), { currentSceneId: 's1', lineIndex: 0, syncSeq: 3 }).journeys[JID]!;
    const moved = { ...j, chapterProgress: { ch1: { ...j.chapterProgress.ch1!, lineIndex: 1 } } };
    expect(stampSeq(j, moved).chapterProgress.ch1!.syncSeq).toBe(4);
    const waiting = { ...j, chapterProgress: { ch1: { ...j.chapterProgress.ch1!, pendingPrivateSteps: [] } } };
    expect(stampSeq(j, waiting)).toBe(waiting);
  });

  it('reveal: both consent on their own device → revealed on both', async () => {
    let a = submitTogetherMirror(device(0), JID, 'M01', 'self', A, 'self', mirrorInput('x'));
    let b = submitTogetherMirror(device(1), JID, 'M01', 'self', B, 'self', mirrorInput('y'));
    a = mergePartner(a, linkFor(0), payloadOf(b, 1));
    b = mergePartner(b, linkFor(1), payloadOf(a, 0));
    expect(a.journeys[JID]!.mirrorItems.M01!.state).toBe('awaiting_consent');
    await new Promise((r) => setTimeout(r, 5));
    a = consentItems(a, JID, ['M01'], A, true);
    b = consentItems(b, JID, ['M01'], B, true);
    a = mergePartner(a, linkFor(0), payloadOf(b, 1));
    b = mergePartner(b, linkFor(1), payloadOf(a, 0));
    expect(a.journeys[JID]!.mirrorItems.M01!.state).toBe('revealed');
    expect(b.journeys[JID]!.mirrorItems.M01!.state).toBe('revealed');
  });

  it('TC-LIVE-04: an edit after the other consented asks for consent again', async () => {
    let a = submitTogetherMirror(device(0), JID, 'M01', 'self', A, 'self', mirrorInput('x'));
    let b = submitTogetherMirror(device(1), JID, 'M01', 'self', B, 'self', mirrorInput('y'));
    a = mergePartner(a, linkFor(0), payloadOf(b, 1));
    b = mergePartner(b, linkFor(1), payloadOf(a, 0));
    await new Promise((r) => setTimeout(r, 5));
    a = consentItems(a, JID, ['M01'], A, true);
    await new Promise((r) => setTimeout(r, 5));
    b = submitTogetherMirror(b, JID, 'M01', 'self', B, 'self', mirrorInput('changed'));
    const merged = mergePartner(b, linkFor(1), payloadOf(a, 0));
    const item = merged.journeys[JID]!.mirrorItems.M01!;
    expect(item.state).toBe('awaiting_consent');
    expect(item.entries[A]!.consent).toBe(false);
  });

  it('the inviter adopts the journey the partner created', () => {
    const a = createEmptySave();
    a.players = { [A]: player(A, 'เอ') };
    const merged = mergePartner(a, linkFor(0), payloadOf(device(1), 1));
    expect(merged.journeys[JID]!.mode).toBe('remote_online');
    expect(merged.journeys[JID]!.remote?.localPlayerId).toBe(A);
    expect(merged.players[B]!.nickname).toBe('บี');
    expect(SaveRoot.safeParse(merged).success).toBe(true);
  });
});

describe('Live crypto', () => {
  it('round-trips; a wrong key fails', async () => {
    const key = newRoomKey();
    const box = await encryptJson({ hello: 'บี' }, key);
    expect(await decryptJson(box, key)).toEqual({ hello: 'บี' });
    await expect(decryptJson(box, newRoomKey())).rejects.toThrow('bad_key');
    expect(parseJoin(`${newRoomId()}.${key}`)).not.toBeNull();
    expect(parseJoin('nope')).toBeNull();
  });
});

describe('Live relay server', () => {
  const store = memoryStore();
  let base = '';
  let server: { close: () => void; listen: (p: number, cb: () => void) => void; address: () => AddressInfo };
  beforeAll(async () => {
    server = createApp({ store, distDir: null });
    await new Promise<void>((r) => server.listen(0, r));
    base = `http://127.0.0.1:${server.address().port}/api/live`;
  });
  afterAll(() => server.close());

  const room = newRoomId();
  const put = (slot: number, token: string | null, body: unknown) =>
    fetch(`${base}/rooms/${room}/slots/${slot}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  it('TC-LIVE-05: claim, auth, slot limits, body size', async () => {
    expect((await fetch(`${base}/health`)).status).toBe(200);
    expect((await fetch(`${base}/rooms/${room}/slots/1`, { method: 'POST' })).status).toBe(409); // no room yet
    const c0 = await fetch(`${base}/rooms/${room}/slots/0`, { method: 'POST' });
    expect(c0.status).toBe(201);
    const { token } = (await c0.json()) as { token: string };
    expect((await fetch(`${base}/rooms/${room}/slots/0`, { method: 'POST' })).status).toBe(409);
    expect((await put(0, null, { iv: 'a', data: 'b' })).status).toBe(401);
    expect((await put(0, 'wrong', { iv: 'a', data: 'b' })).status).toBe(401);
    expect((await fetch(`${base}/rooms/${room}/slots/2`, { method: 'POST' })).status).toBe(404);
    expect((await put(0, token, 'x'.repeat(600 * 1024))).status).toBe(413);
    expect((await put(0, token, { iv: 'a', data: 'b' })).status).toBe(200);
    const g = (await (await fetch(`${base}/rooms/${room}`)).json()) as { slots: { slot: number; rev: number }[] };
    expect(g.slots).toEqual([expect.objectContaining({ slot: 0, rev: 1 })]);
  });

  it('TC-LIVE-06: only ciphertext is stored', async () => {
    const key = newRoomKey();
    const c1 = (await (await fetch(`${base}/rooms/${room}/slots/1`, { method: 'POST' })).json()) as { token: string };
    const box = await encryptJson({ nickname: 'ชื่อลับมาก' }, key);
    expect((await put(1, c1.token, box)).status).toBe(200);
    expect(store.dump()).not.toContain('ชื่อลับมาก');
    expect(store.dump()).not.toContain(key);
  });
});
