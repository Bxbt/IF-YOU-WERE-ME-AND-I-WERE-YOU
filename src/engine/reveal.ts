/**
 * Consent-based Reveal engine (docs/04 §6, docs/07 §7). Pure functions over `SharedAnswer` for a
 * two-player journey (`playerIds: [A, B]`, Play Together / Remote). Inputs are never mutated;
 * every produced item satisfies the `SharedAnswer` zod schema.
 *
 * State machine (docs/04 §6.2): open → partial → awaiting_consent → revealed, or skipped when both
 * players skipped. Rules implemented here:
 * - R1  Every selector that returns answers takes a `viewerId`; nothing of the owner is returned to
 *       another viewer before `revealed`.
 * - R2  Consent is per player per item; `setGroupConsent` consents to a whole set with exceptions.
 * - R3  Consent can be withdrawn until `revealed`.
 * - R4  `meta = prefer_not` is shown to the other player only as `{ preferNot: true }`.
 * - R5  A player who skipped is shown as `{ skipped: true }`; the other player's answer can still be
 *       revealed. A skipped player has nothing to reveal, so only submitted, non-skipped players
 *       must consent (see `requiredConsenters`).
 * - R7  Changing an answer after `revealed` → `awaiting_consent`, both consents reset;
 *       `revealedRevision` keeps the old numbers and selectors also require the current revision to
 *       match it, so the old version is never shown again.
 *
 * Revision per player stored in `revealedRevision` (docs/04 §6.4):
 * - mirror:    max(self.revision, perceived.revision) of that player's entry (0 if none).
 * - profile:   the Profile answer's `revision`, passed in by the caller (answers live in the Profile,
 *              docs/04 §6.3.0); missing → 0, which never matches a real revision (fails closed).
 * - statement: statements carry no revision, so the number is a reveal generation counter:
 *              1 on the first reveal, +1 on every re-reveal after an edit (R7).
 */
import type { PersonalityAnswer, SharedAnswer } from '../persistence/schema';
import { categorize, type Category } from './compare';

export type PlayerId = string;
export type SharedEntry = SharedAnswer['entries'][string];
export type Statement = NonNullable<SharedEntry['statement']>;
export type RevealState = SharedAnswer['state'];

export interface EntryMeta {
  questionId: string;
  kind: SharedAnswer['kind'];
  context: SharedAnswer['context'];
}

/** mirror: the layers being submitted (the other layer, if any, is kept). */
export interface MirrorPatch {
  self?: PersonalityAnswer;
  perceived?: PersonalityAnswer;
}
export interface StatementPatch {
  statement: Statement;
  shareIntent: boolean;
}
/** profile: no answer data; optionally the Profile answer's current revision (for R7 after reveal). */
export interface ProfilePatch {
  revision?: number;
}
export type EntryPatch = MirrorPatch | StatementPatch | ProfilePatch;

export interface PreferNot {
  preferNot: true;
}
export interface Skipped {
  skipped: true;
}
export type MaskedAnswer = PersonalityAnswer | PreferNot | Skipped;

/** What a viewer may see of one owner's entry. */
export interface EntryView {
  visible: true;
  self?: MaskedAnswer;
  perceived?: MaskedAnswer;
  statement?: Statement | PreferNot;
  shareIntent?: boolean;
  submittedAt?: string;
  consent: boolean;
}
export type EntryResult = EntryView | PreferNot | Skipped | undefined;

// ---------- helpers ----------

const isSubmitted = (e: SharedEntry | undefined): boolean => !!e?.submittedAt;

const copyAnswer = (a: PersonalityAnswer): PersonalityAnswer => ({ ...a, selected: [...a.selected] });

const mirrorAnswers = (e: SharedEntry): PersonalityAnswer[] =>
  [e.self, e.perceived].filter((a): a is PersonalityAnswer => !!a);

/** The player submitted and everything they submitted is a skip (R5). Profile entries never skip. */
export function isEntrySkipped(kind: SharedAnswer['kind'], e: SharedEntry | undefined): boolean {
  if (!e || !isSubmitted(e)) return false;
  if (kind === 'statement') return e.statement?.meta === 'skipped';
  if (kind === 'mirror') {
    const answers = mirrorAnswers(e);
    return answers.length > 0 && answers.every((a) => a.status === 'skipped');
  }
  return false;
}

export const mirrorRevision = (e: SharedEntry | undefined): number =>
  e ? Math.max(0, ...mirrorAnswers(e).map((a) => a.revision)) : 0;

function withoutConsent(e: SharedEntry): SharedEntry {
  const next: SharedEntry = { ...e, consent: false };
  delete next.consentAt;
  return next;
}

const sameAnswer = (x?: PersonalityAnswer, y?: PersonalityAnswer): boolean =>
  x === y ||
  (!!x &&
    !!y &&
    x.revision === y.revision &&
    x.status === y.status &&
    x.meta === y.meta &&
    (x.freeText ?? '') === (y.freeText ?? '') &&
    x.selected.length === y.selected.length &&
    x.selected.every((id, i) => y.selected[i] === id));

function entryChanged(
  kind: SharedAnswer['kind'],
  prev: SharedEntry | undefined,
  next: SharedEntry,
  revealedRev: number | undefined,
  patch: EntryPatch,
): boolean {
  if (!prev || !isSubmitted(prev)) return true;
  if (kind === 'mirror')
    return !sameAnswer(prev.self, next.self) || !sameAnswer(prev.perceived, next.perceived);
  if (kind === 'statement') {
    const a = prev.statement;
    const b = next.statement;
    return (
      a?.text !== b?.text ||
      a?.meta !== b?.meta ||
      a?.starterId !== b?.starterId ||
      (prev.shareIntent ?? false) !== (next.shareIntent ?? false)
    );
  }
  const rev = (patch as ProfilePatch).revision;
  return rev !== undefined && revealedRev !== undefined && rev !== revealedRev;
}

function applyPatch(
  kind: SharedAnswer['kind'],
  prev: SharedEntry | undefined,
  patch: EntryPatch,
  now: string,
): SharedEntry {
  const base: SharedEntry = { consent: false, ...prev, submittedAt: now };
  if (kind === 'mirror') {
    const p = patch as MirrorPatch;
    return {
      ...base,
      ...(p.self ? { self: copyAnswer(p.self) } : {}),
      ...(p.perceived ? { perceived: copyAnswer(p.perceived) } : {}),
    };
  }
  if (kind === 'statement') {
    const p = patch as StatementPatch;
    const skipped = p.statement.meta === 'skipped';
    const statement: Statement = skipped
      ? { text: '', meta: 'skipped' }
      : {
          text: p.statement.text,
          meta: p.statement.meta,
          ...(p.statement.starterId ? { starterId: p.statement.starterId } : {}),
        };
    return { ...base, statement, shareIntent: !skipped && p.shareIntent };
  }
  return base;
}

function assertPlayer(playerIds: readonly PlayerId[], playerId: PlayerId): void {
  if (!playerIds.includes(playerId)) throw new Error(`reveal: ${playerId} is not a player of this journey`);
}

const itemPlayers = (item: SharedAnswer): PlayerId[] => Object.keys(item.entries);

/** Players whose consent is needed for reveal: submitted and not skipped (R5). */
export function requiredConsenters(item: SharedAnswer, playerIds: readonly PlayerId[] = itemPlayers(item)) {
  return playerIds.filter((p) => isSubmitted(item.entries[p]) && !isEntrySkipped(item.kind, item.entries[p]));
}

/** State from submissions only (never `revealed` — that needs consent). */
export function deriveState(item: SharedAnswer, playerIds: readonly PlayerId[]): RevealState {
  const submitted = playerIds.filter((p) => isSubmitted(item.entries[p]));
  if (submitted.length === 0) return 'open';
  if (submitted.length < playerIds.length) return 'partial';
  if (submitted.every((p) => isEntrySkipped(item.kind, item.entries[p]))) return 'skipped';
  return 'awaiting_consent';
}

/** R7 guard: the owner's current version is the one that was consented to. */
function revisionMatches(item: SharedAnswer, ownerId: PlayerId): boolean {
  if (item.kind !== 'mirror') return true;
  return item.revealedRevision?.[ownerId] === mirrorRevision(item.entries[ownerId]);
}

const isRevealedFor = (item: SharedAnswer, ownerId: PlayerId): boolean =>
  item.state === 'revealed' && revisionMatches(item, ownerId);

function maskAnswer(a: PersonalityAnswer): MaskedAnswer {
  if (a.meta === 'prefer_not') return { preferNot: true };
  if (a.status === 'skipped') return { skipped: true };
  return copyAnswer(a);
}

// ---------- transitions ----------

/**
 * A player submits (or edits) their part of an item. Creates the item if `item` is undefined, sets
 * `submittedAt` and recomputes the state. Before reveal, a changed answer resets only the
 * submitter's consent (they consented to the old version); after reveal, a change resets both
 * consents and returns to `awaiting_consent` (R7). Resubmitting an identical answer changes nothing
 * but `submittedAt`.
 */
export function submitEntry(
  item: SharedAnswer | undefined,
  key: string,
  meta: EntryMeta,
  playerIds: readonly [PlayerId, PlayerId],
  playerId: PlayerId,
  patch: EntryPatch,
  now: string,
): SharedAnswer {
  assertPlayer(playerIds, playerId);
  if (item && item.kind !== meta.kind)
    throw new Error(`reveal: ${key} is a ${item.kind} item, not ${meta.kind}`);
  const base: SharedAnswer = item ?? {
    key,
    questionId: meta.questionId,
    kind: meta.kind,
    context: meta.context,
    state: 'open',
    entries: {},
  };
  const prev = base.entries[playerId];
  const nextEntry = applyPatch(base.kind, prev, patch, now);
  const changed = entryChanged(base.kind, prev, nextEntry, base.revealedRevision?.[playerId], patch);

  if (base.state === 'revealed') {
    const entries = { ...base.entries, [playerId]: nextEntry };
    if (!changed) return { ...base, entries };
    const reset = Object.fromEntries(Object.entries(entries).map(([p, e]) => [p, withoutConsent(e)]));
    const next: SharedAnswer = { ...base, entries: reset };
    return { ...next, state: deriveState(next, playerIds) };
  }
  const entries = { ...base.entries, [playerId]: changed ? withoutConsent(nextEntry) : nextEntry };
  const next: SharedAnswer = { ...base, entries };
  return { ...next, state: deriveState(next, playerIds) };
}

/**
 * One player gives (true) or withdraws (false) consent. Only in `awaiting_consent` — otherwise the
 * item is returned unchanged (R3: withdrawing after reveal is impossible). When every required
 * consenter agrees → `revealed`, `revealedAt = now`, `revealedRevision` per player (see header).
 * `profileRevisions` = current Profile answer revision per player, used for kind 'profile' only.
 */
export function setConsent(
  item: SharedAnswer,
  playerId: PlayerId,
  consent: boolean,
  now: string,
  profileRevisions?: Record<PlayerId, number>,
): SharedAnswer {
  const entry = item.entries[playerId];
  if (item.state !== 'awaiting_consent' || !entry) return item;
  const nextEntry: SharedEntry = consent
    ? { ...entry, consent: true, consentAt: now }
    : withoutConsent(entry);
  const entries = { ...item.entries, [playerId]: nextEntry };
  const next: SharedAnswer = { ...item, entries };
  const required = requiredConsenters(next);
  if (!consent || required.length === 0 || !required.every((p) => entries[p]?.consent)) return next;

  const revealedRevision: Record<PlayerId, number> = {};
  for (const [p, e] of Object.entries(entries)) {
    if (item.kind === 'mirror') revealedRevision[p] = mirrorRevision(e);
    else if (item.kind === 'profile') revealedRevision[p] = profileRevisions?.[p] ?? 0;
    else revealedRevision[p] = (item.revealedRevision?.[p] ?? 0) + 1;
  }
  return { ...next, state: 'revealed', revealedAt: now, revealedRevision };
}

/**
 * "Reveal at the end of the chapter" (R2, TC-REV-07): `playerId` consents to every item of the set
 * at once, except the keys in `exclude`, for which their consent is withdrawn. Items not awaiting
 * consent are returned unchanged. `profileRevisions` is keyed by item key.
 */
export function setGroupConsent(
  items: Record<string, SharedAnswer>,
  playerId: PlayerId,
  consent: boolean,
  exclude: readonly string[],
  now: string,
  profileRevisions?: Record<string, Record<PlayerId, number>>,
): Record<string, SharedAnswer> {
  return Object.fromEntries(
    Object.entries(items).map(([k, item]) => [
      k,
      exclude.includes(k)
        ? setConsent(item, playerId, false, now)
        : setConsent(item, playerId, consent, now, profileRevisions?.[k]),
    ]),
  );
}

// ---------- viewer-scoped selectors ----------

/**
 * The owner's entry as `viewerId` may see it. The owner always sees their own entry unmasked.
 * Another viewer gets: undefined before reveal (R1) or for a statement the owner did not share;
 * `{ skipped: true }` when the owner skipped (R5; also for an item both skipped);
 * `{ preferNot: true }` when all the owner's answers are prefer_not (R4); otherwise the entry with
 * each prefer_not / skipped layer masked.
 */
export function entryFor(item: SharedAnswer | undefined, ownerId: PlayerId, viewerId: PlayerId): EntryResult {
  const e = item?.entries[ownerId];
  if (!item || !e) return undefined;
  if (viewerId === ownerId) {
    return {
      visible: true,
      ...(e.self ? { self: copyAnswer(e.self) } : {}),
      ...(e.perceived ? { perceived: copyAnswer(e.perceived) } : {}),
      ...(e.statement ? { statement: { ...e.statement } } : {}),
      ...(e.shareIntent !== undefined ? { shareIntent: e.shareIntent } : {}),
      ...(e.submittedAt ? { submittedAt: e.submittedAt } : {}),
      consent: e.consent,
    };
  }
  if (item.kind === 'statement' && e.shareIntent !== true) return undefined;
  if (item.state === 'skipped') return { skipped: true };
  if (!isRevealedFor(item, ownerId)) return undefined;
  if (isEntrySkipped(item.kind, e)) return { skipped: true };

  if (item.kind === 'statement') {
    if (!e.statement) return undefined;
    if (e.statement.meta === 'prefer_not') return { preferNot: true };
    return { visible: true, statement: { ...e.statement }, shareIntent: true, consent: e.consent };
  }
  const answers = mirrorAnswers(e);
  if (answers.length > 0 && answers.every((a) => a.meta === 'prefer_not')) return { preferNot: true };
  return {
    visible: true,
    ...(e.self ? { self: maskAnswer(e.self) } : {}),
    ...(e.perceived ? { perceived: maskAnswer(e.perceived) } : {}),
    ...(e.submittedAt ? { submittedAt: e.submittedAt } : {}),
    consent: e.consent,
  };
}

/**
 * Profile questions (docs/04 §6.3.0): the owner's Profile answer as `viewerId` may see it. Visible to
 * another viewer only when the journey's item is revealed and the answer's current `revision` equals
 * `revealedRevision[owner]` (R7); prefer_not / skipped are masked (R4/R5).
 */
export function profileAnswerFor(
  item: SharedAnswer | undefined,
  ownerId: PlayerId,
  viewerId: PlayerId,
  answer: PersonalityAnswer | undefined,
): MaskedAnswer | undefined {
  if (!answer) return undefined;
  if (viewerId === ownerId) return copyAnswer(answer);
  if (!item || item.kind !== 'profile' || item.state !== 'revealed') return undefined;
  if (item.revealedRevision?.[ownerId] !== answer.revision) return undefined;
  return maskAnswer(answer);
}

export interface VisibleStatement {
  key: string;
  questionId: string;
  text: string;
  starterId?: string;
  /** The owner's shareIntent (always true for another viewer). */
  shared: boolean;
}

/**
 * Ch5 statements of `ownerId` that `viewerId` may read, ordered by key (docs/04 §6.3.1, TC-REV-08).
 * The owner sees all their own written statements; another viewer only those the owner chose to
 * share (`shareIntent`) on revealed items. Skipped / prefer_not / empty statements are never listed
 * for another viewer.
 */
export function statementsVisibleTo(
  items: Record<string, SharedAnswer> | readonly SharedAnswer[],
  viewerId: PlayerId,
  ownerId: PlayerId,
): VisibleStatement[] {
  const list = Array.isArray(items) ? items : Object.values(items);
  const out: VisibleStatement[] = [];
  for (const item of list as readonly SharedAnswer[]) {
    const e = item.entries[ownerId];
    const s = e?.statement;
    if (item.kind !== 'statement' || !e || !s || s.meta === 'skipped') continue;
    if (viewerId !== ownerId) {
      if (item.state !== 'revealed' || e.shareIntent !== true || s.meta !== null || !s.text.trim()) continue;
    }
    out.push({
      key: item.key,
      questionId: item.questionId,
      text: s.text,
      ...(s.starterId ? { starterId: s.starterId } : {}),
      shared: e.shareIntent === true,
    });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Who the item is waiting for ("รอ {other}"): players who still have to submit, then — in
 * `awaiting_consent` — required consenters who have not consented yet. Empty when revealed/skipped.
 * Contains no answers.
 */
export function waitingFor(
  item: SharedAnswer | undefined,
  playerIds: readonly PlayerId[],
): { submit: PlayerId[]; consent: PlayerId[] } {
  if (!item) return { submit: [...playerIds], consent: [] };
  if (item.state === 'revealed' || item.state === 'skipped') return { submit: [], consent: [] };
  const submit = playerIds.filter((p) => !isSubmitted(item.entries[p]));
  const consent =
    item.state === 'awaiting_consent'
      ? requiredConsenters(item, playerIds).filter((p) => !item.entries[p]?.consent)
      : [];
  return { submit, consent };
}

export interface RevealPair {
  /** a_view: A.self ↔ B.perceived · b_view: B.self ↔ A.perceived · direct: A.self ↔ B.self */
  kind: 'a_view' | 'b_view' | 'direct';
  /** x belongs to this player (their self answer). */
  xOwner: PlayerId;
  yOwner: PlayerId;
  x?: PersonalityAnswer;
  y?: PersonalityAnswer;
  category: Exclude<Category, 'excluded'>;
}

/**
 * The comparisons of a revealed mirror item (docs/04 §6.1), each categorized with `categorize()`.
 * Pairs that involve prefer_not are left out (R4 → 'excluded'). Returns [] unless the item is a
 * mirror item revealed at both players' current revisions — so nothing unrevealed is ever returned.
 */
export function revealPairs(item: SharedAnswer | undefined, a: PlayerId, b: PlayerId): RevealPair[] {
  if (!item || item.kind !== 'mirror' || !isRevealedFor(item, a) || !isRevealedFor(item, b)) return [];
  const ea = item.entries[a];
  const eb = item.entries[b];
  const defs: [
    RevealPair['kind'],
    PlayerId,
    PlayerId,
    PersonalityAnswer | undefined,
    PersonalityAnswer | undefined,
  ][] = [
    ['a_view', a, b, ea?.self, eb?.perceived],
    ['b_view', b, a, eb?.self, ea?.perceived],
    ['direct', a, b, ea?.self, eb?.self],
  ];
  const out: RevealPair[] = [];
  for (const [kind, xOwner, yOwner, x, y] of defs) {
    const category = categorize(x, y);
    if (category === 'excluded') continue;
    out.push({
      kind,
      xOwner,
      yOwner,
      ...(x ? { x: copyAnswer(x) } : {}),
      ...(y ? { y: copyAnswer(y) } : {}),
      category,
    });
  }
  return out;
}
