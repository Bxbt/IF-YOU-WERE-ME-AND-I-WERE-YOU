/**
 * PIN mutations (docs/08 §4.4, docs/07 §3.1). Pure `(save) => save` builders, like store/story.ts.
 */
import type { GameSession, PersonalityAnswer, Player, SaveRoot, SharedAnswer } from '../persistence/schema';
import type { PinRecord } from '../lib/pin';
import { nowIso } from '../lib/ids';

type Profile = SaveRoot['profiles'][string];
type SharedEntry = SharedAnswer['entries'][string];

function withPlayer(save: SaveRoot, playerId: string, fn: (p: Player) => Player): SaveRoot {
  const p = save.players[playerId];
  if (!p) return save;
  return { ...save, players: { ...save.players, [playerId]: fn(p) } };
}

function dropPin(p: Player): Player {
  const { pin: _pin, ...rest } = p;
  void _pin;
  return rest;
}

export function setPin(save: SaveRoot, playerId: string, record: PinRecord): SaveRoot {
  return withPlayer(save, playerId, (p) => ({ ...p, pin: record, updatedAt: nowIso() }));
}

export function removePin(save: SaveRoot, playerId: string): SaveRoot {
  return withPlayer(save, playerId, (p) => ({ ...dropPin(p), updatedAt: nowIso() }));
}

/** Stores the attempt counter / lock after a check. Does not touch `updatedAt` (not a profile edit). */
export function recordPinAttempt(save: SaveRoot, playerId: string, record: PinRecord): SaveRoot {
  return withPlayer(save, playerId, (p) => ({ ...p, pin: record }));
}

// ---------- Forget PIN ----------

/**
 * True when this profile answer is visible to the partner in some journey: a `profile` MirrorItem
 * `Qxx` that is `revealed` and whose `revealedRevision[owner]` matches the current revision (R7).
 * For perceived answers the journey must also include the person the guess is about.
 */
function isProfileAnswerRevealed(
  save: SaveRoot,
  ownerId: string,
  answer: PersonalityAnswer,
  aboutId?: string,
): boolean {
  return Object.values(save.journeys).some((j) => {
    if (!j.playerIds.includes(ownerId)) return false;
    if (aboutId && !j.playerIds.includes(aboutId)) return false;
    const item = j.mirrorItems[answer.questionId];
    return (
      !!item &&
      item.kind === 'profile' &&
      item.state === 'revealed' &&
      item.revealedRevision?.[ownerId] === answer.revision
    );
  });
}

function keepRevealedAnswers(
  save: SaveRoot,
  ownerId: string,
  answers: Record<string, PersonalityAnswer>,
  aboutId?: string,
): Record<string, PersonalityAnswer> {
  const out: Record<string, PersonalityAnswer> = {};
  for (const [qid, a] of Object.entries(answers)) {
    if (isProfileAnswerRevealed(save, ownerId, a, aboutId)) out[qid] = a;
  }
  return out;
}

function forgetProfiles(save: SaveRoot, playerId: string, t: string): Record<string, Profile> {
  const out: Record<string, Profile> = {};
  for (const [key, prof] of Object.entries(save.profiles)) {
    if (prof.ownerId !== playerId) {
      out[key] = prof;
      continue;
    }
    const aboutId = 'aboutId' in prof ? prof.aboutId : undefined;
    const answers = keepRevealedAnswers(save, playerId, prof.answers, aboutId);
    const changed = Object.keys(answers).length !== Object.keys(prof.answers).length;
    out[key] = changed ? { ...prof, answers, updatedAt: t } : prof;
  }
  return out;
}

/** A revealed statement only showed the text the owner chose to share (docs/04 §6.3.1). */
function stripUnsharedStatement(entry: SharedEntry): SharedEntry {
  if (!entry.statement || entry.shareIntent === true) return entry;
  const { statement: _s, ...rest } = entry;
  void _s;
  return rest;
}

function forgetMirrorItem(item: SharedAnswer, playerId: string): SharedAnswer | null {
  const entry = item.entries[playerId];
  if (!entry) return item;
  if (item.state === 'revealed') {
    if (item.kind !== 'statement') return item;
    const stripped = stripUnsharedStatement(entry);
    return stripped === entry ? item : { ...item, entries: { ...item.entries, [playerId]: stripped } };
  }
  const entries: Record<string, SharedEntry> = {};
  for (const [pid, e] of Object.entries(item.entries)) {
    if (pid === playerId) continue;
    // The item changed under the partner: consent must be given again for whatever is revealed later.
    if (item.state === 'awaiting_consent') {
      const { consentAt: _c, ...rest } = e;
      void _c;
      entries[pid] = { ...rest, consent: false };
    } else entries[pid] = e;
  }
  if (Object.keys(entries).length === 0) return null;
  // One side now has nothing submitted, so the item can no longer be waiting for consent.
  const state = item.state === 'awaiting_consent' ? 'partial' : item.state;
  return { ...item, state, entries };
}

function forgetJourney(j: GameSession, playerId: string, t: string): GameSession {
  if (!j.playerIds.includes(playerId)) return j;
  const storyAnswers: GameSession['storyAnswers'] = {};
  for (const [k, a] of Object.entries(j.storyAnswers)) if (a.playerId !== playerId) storyAnswers[k] = a;
  const mirrorItems: GameSession['mirrorItems'] = {};
  for (const [k, item] of Object.entries(j.mirrorItems)) {
    const next = forgetMirrorItem(item, playerId);
    if (next) mirrorItems[k] = next;
  }
  return { ...j, storyAnswers, mirrorItems, updatedAt: t };
}

/**
 * "ลืม PIN" (docs/08 §4.4): removes the PIN and everything of this player that the partner has not
 * seen — unrevealed self/perceived profile answers, reflections/interpretations/emotion cards,
 * unrevealed mirror entries and statements, drafts and private memory scenes.
 * Revealed items stay (they cannot be "un-seen", docs/04 R6). Next-conversation items are kept.
 */
export function forgetPin(save: SaveRoot, playerId: string): SaveRoot {
  if (!save.players[playerId]) return save;
  const t = nowIso();
  const profiles = forgetProfiles(save, playerId, t);
  const journeys: SaveRoot['journeys'] = {};
  for (const [id, j] of Object.entries(save.journeys)) journeys[id] = forgetJourney(j, playerId, t);
  const drafts: SaveRoot['drafts'] = {};
  for (const [k, d] of Object.entries(save.drafts)) {
    if (!k.startsWith(`${playerId}:`) && d.playerId !== playerId) drafts[k] = d;
  }
  const memories: SaveRoot['memories'] = {};
  for (const [k, m] of Object.entries(save.memories)) if (m.ownerId !== playerId) memories[k] = m;
  const players = {
    ...save.players,
    [playerId]: { ...dropPin(save.players[playerId]!), updatedAt: t },
  };
  return { ...save, players, profiles, journeys, drafts, memories };
}
