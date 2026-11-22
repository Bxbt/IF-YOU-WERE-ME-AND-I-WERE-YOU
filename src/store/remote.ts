/**
 * Phase 3A Sealed Exchange (docs/05 §5.1, docs/07 §7.1 + §11.1, docs/08 §6.1). No backend.
 * - Invitation file: who invites + journey id — never any answers (TC-EXP-12).
 * - Sealed file: the sender's own Mirror answers (self layer only), AES-GCM encrypted with a
 *   random key that stays on the sender's device until they choose to show it.
 * - Reveal key: typed in by the partner; a wrong key never shows anything (TC-EXP-11).
 * Guesses about the partner (perceived) are never sealed — they stay on the guesser's device.
 */
import { z } from 'zod';
import { MIRRORS } from '../content/th/questions';
import {
  Appearance,
  PersonalityAnswer,
  Player,
  SCHEMA_VERSION,
  type GameSession,
  type SaveRoot,
} from '../persistence/schema';
import { APP_VERSION, CONTENT_VERSION, EXPORT_FORMAT, sha256Base64 } from '../persistence/exportImport';
import { newPlayerId, nowIso } from '../lib/ids';
import { newRevealKey, openJson, sealJson } from '../engine/sealed';
import { MAX_JOURNEYS } from './journeys';

export const isRemoteSealed = (j?: GameSession) => j?.mode === 'remote_sealed';

/** The real player on this device in a remote journey. */
export const remoteSelf = (j: GameSession) => j.playerIds[0];
export const remotePartner = (j: GameSession) => j.playerIds[1];

// ---------- File formats ----------

export const InvitationData = z.object({
  journeyId: z.string().regex(/^jr_[A-Za-z0-9_-]{6,}$/),
  inviter: Player.pick({ nickname: true, sentenceEnding: true, addressStyle: true }).extend({ appearance: Appearance }),
});
export type InvitationData = z.infer<typeof InvitationData>;

export const SealedData = z.object({
  journeyId: z.string(),
  questionIds: z.array(z.string()).max(20),
  ciphertext: z.string().min(1).max(200_000),
  iv: z.string().min(1).max(64),
});
export type SealedData = z.infer<typeof SealedData>;

type Scope = 'invitation' | 'sealed';
interface Envelope<T> {
  format: typeof EXPORT_FORMAT;
  schemaVersion: string;
  contentVersion: string;
  appVersion: string;
  exportedAt: string;
  scope: Scope;
  data: T;
  checksum: string;
}

async function envelope<T>(scope: Scope, data: T): Promise<Envelope<T>> {
  return {
    format: EXPORT_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    appVersion: APP_VERSION,
    exportedAt: nowIso(),
    scope,
    data,
    checksum: await sha256Base64(JSON.stringify(data)),
  };
}

export type RemoteFileError = 'not_json' | 'wrong_format' | 'wrong_scope' | 'checksum_mismatch' | 'invalid_data';

export async function parseRemoteFile(
  text: string,
): Promise<
  | { ok: true; scope: 'invitation'; data: InvitationData }
  | { ok: true; scope: 'sealed'; data: SealedData }
  | { ok: false; error: RemoteFileError }
> {
  if (text.length > 1_000_000) return { ok: false, error: 'invalid_data' };
  let env: Partial<Envelope<unknown>>;
  try {
    env = JSON.parse(text) as Partial<Envelope<unknown>>;
  } catch {
    return { ok: false, error: 'not_json' };
  }
  if (!env || env.format !== EXPORT_FORMAT) return { ok: false, error: 'wrong_format' };
  if (env.scope !== 'invitation' && env.scope !== 'sealed') return { ok: false, error: 'wrong_scope' };
  if ((await sha256Base64(JSON.stringify(env.data))) !== env.checksum) return { ok: false, error: 'checksum_mismatch' };
  if (env.scope === 'invitation') {
    const r = InvitationData.safeParse(env.data);
    return r.success ? { ok: true, scope: 'invitation', data: r.data } : { ok: false, error: 'invalid_data' };
  }
  const r = SealedData.safeParse(env.data);
  return r.success ? { ok: true, scope: 'sealed', data: r.data } : { ok: false, error: 'invalid_data' };
}

// ---------- Invitation ----------

export function buildInvitation(save: SaveRoot, jid: string): Promise<Envelope<InvitationData>> {
  const j = save.journeys[jid]!;
  const me = save.players[remoteSelf(j)]!;
  return envelope('invitation', {
    journeyId: j.id,
    inviter: {
      nickname: me.nickname,
      sentenceEnding: me.sentenceEnding,
      addressStyle: me.addressStyle,
      appearance: me.appearance,
    },
  });
}

export type JoinError = 'exists' | 'full';

/**
 * The invited player's side: the inviter becomes this device's partner record (kind 'imagined' —
 * on this device their story role is imagined, docs/05 §5.0) and a remote journey with the same id
 * is created and made active.
 */
export function joinFromInvitation(
  save: SaveRoot,
  selfId: string,
  inv: InvitationData,
): { ok: true; save: SaveRoot } | { ok: false; error: JoinError } {
  if (save.journeys[inv.journeyId]) return { ok: false, error: 'exists' };
  if (Object.keys(save.journeys).length >= MAX_JOURNEYS) return { ok: false, error: 'full' };
  const t = nowIso();
  const partnerId = newPlayerId();
  const journeys = Object.fromEntries(
    Object.entries(save.journeys).map(([k, j]) => [
      k,
      j.status === 'active' ? { ...j, status: 'archived' as const, updatedAt: t } : j,
    ]),
  );
  journeys[inv.journeyId] = {
    id: inv.journeyId,
    mode: 'remote_sealed',
    playerIds: [selfId, partnerId],
    status: 'active',
    chapterProgress: {},
    storyAnswers: {},
    mirrorItems: {},
    observed: [],
    nextConversation: [],
    introSeen: true,
    remote: { kind: 'sealed' },
    createdAt: t,
    updatedAt: t,
    lastPlayedAt: t,
  };
  return {
    ok: true,
    save: {
      ...save,
      players: {
        ...save.players,
        [partnerId]: {
          id: partnerId,
          kind: 'imagined',
          createdBy: selfId,
          ...inv.inviter,
          remoteUserId: 'sealed',
          createdAt: t,
          updatedAt: t,
        },
      },
      journeys,
      settings: { ...save.settings, lastJourneyId: inv.journeyId },
    },
  };
}

// ---------- Sealed answers ----------

const MIRROR_IDS = new Set(MIRRORS.map((m) => m.id));

/** The player's own Mirror answers in this journey (self layer only — never guesses). */
export function ownMirrorAnswers(j: GameSession): Record<string, z.infer<typeof PersonalityAnswer>> {
  const self = remoteSelf(j);
  const out: Record<string, z.infer<typeof PersonalityAnswer>> = {};
  for (const [qid, item] of Object.entries(j.mirrorItems)) {
    const a = item.entries[self]?.self;
    if (item.kind === 'mirror' && MIRROR_IDS.has(qid) && a) out[qid] = a;
  }
  return out;
}

/**
 * Seals the current answers. The key is created once per journey and reused, so the partner can
 * open a newer file with the same key (docs/05 §5.0: they see the old answers until they get it).
 */
export async function buildSealed(
  save: SaveRoot,
  jid: string,
): Promise<{ save: SaveRoot; file: Envelope<SealedData> } | null> {
  const j = save.journeys[jid];
  if (!j || !isRemoteSealed(j)) return null;
  const answers = ownMirrorAnswers(j);
  const questionIds = Object.keys(answers).sort();
  if (questionIds.length === 0) return null;
  const key = j.remote?.myRevealKey ?? newRevealKey();
  const { ciphertext, iv } = await sealJson({ answers }, key);
  const file = await envelope('sealed', { journeyId: j.id, questionIds, ciphertext, iv });
  const next = { ...j, remote: { kind: 'sealed' as const, ...j.remote, myRevealKey: key }, updatedAt: nowIso() };
  return { save: { ...save, journeys: { ...save.journeys, [jid]: next } }, file };
}

export type SealedImportError = 'no_journey' | 'own_file';

export function importSealed(
  save: SaveRoot,
  data: SealedData,
): { ok: true; save: SaveRoot } | { ok: false; error: SealedImportError } {
  const j = save.journeys[data.journeyId];
  if (!j || !isRemoteSealed(j)) return { ok: false, error: 'no_journey' };
  const t = nowIso();
  const next: GameSession = {
    ...j,
    remote: {
      kind: 'sealed',
      ...j.remote,
      partnerSealed: { questionIds: data.questionIds, ciphertext: data.ciphertext, iv: data.iv, importedAt: t },
    },
    updatedAt: t,
  };
  return { ok: true, save: { ...save, journeys: { ...save.journeys, [j.id]: next } } };
}

/** Our own file opens with our own key — catches "imported my own file by mistake". */
export async function isOwnSealed(save: SaveRoot, data: SealedData): Promise<boolean> {
  const key = save.journeys[data.journeyId]?.remote?.myRevealKey;
  if (!key) return false;
  try {
    await openJson(data, key);
    return true;
  } catch {
    return false;
  }
}

const KNOWN = Object.fromEntries(MIRRORS.map((m) => [m.id, new Set(m.options.map((o) => o.id))]));
const Payload = z.object({ answers: z.record(PersonalityAnswer) });

export type RevealError = 'bad_key' | 'nothing_imported' | 'invalid_data';

/**
 * Opens the partner's sealed answers with the key they sent, and writes them as the partner's
 * entries (state 'revealed'). Unknown option ids are dropped; answers are stored as-is otherwise.
 */
export async function revealWithKey(
  save: SaveRoot,
  jid: string,
  key: string,
): Promise<{ ok: true; save: SaveRoot } | { ok: false; error: RevealError }> {
  const j = save.journeys[jid];
  const sealed = j?.remote?.partnerSealed;
  if (!j || !sealed) return { ok: false, error: 'nothing_imported' };
  let raw: unknown;
  try {
    raw = await openJson(sealed, key);
  } catch {
    return { ok: false, error: 'bad_key' };
  }
  const parsed = Payload.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid_data' };
  const t = nowIso();
  const self = remoteSelf(j);
  const partner = remotePartner(j);
  const items = { ...j.mirrorItems };
  for (const [qid, a] of Object.entries(parsed.data.answers)) {
    const known = KNOWN[qid];
    if (!known || a.questionId !== qid) continue;
    const answer = { ...a, layer: 'self' as const, selected: a.selected.filter((id) => known.has(id)) };
    const prev = items[qid];
    const mine = prev?.entries[self] ?? { consent: false };
    items[qid] = {
      key: qid,
      questionId: qid,
      kind: 'mirror',
      context: prev?.context ?? (qid.startsWith('w3') ? 'role' : 'self'),
      ...prev,
      state: 'revealed',
      revealedAt: t,
      entries: {
        ...(prev?.entries ?? {}),
        [self]: { ...mine, consent: true, consentAt: mine.consentAt ?? t },
        [partner]: { self: answer, submittedAt: sealed.importedAt, consent: true, consentAt: t },
      },
    };
  }
  return { ok: true, save: { ...save, journeys: { ...save.journeys, [jid]: { ...j, mirrorItems: items, updatedAt: t } } } };
}

/** Questions where the partner's real answer is on this device (after reveal). */
export function revealedMirrors(j: GameSession) {
  const partner = remotePartner(j);
  const self = remoteSelf(j);
  return MIRRORS.filter((m) => j.mirrorItems[m.id]?.entries[partner]?.self).map((m) => ({
    question: m,
    partnerSelf: j.mirrorItems[m.id]!.entries[partner]!.self!,
    myGuess: j.mirrorItems[m.id]!.entries[self]?.perceived,
    mySelf: j.mirrorItems[m.id]!.entries[self]?.self,
  }));
}
