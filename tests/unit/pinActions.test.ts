import { describe, expect, it } from 'vitest';
import { sampleSave } from '../fixtures/factory';
import { SaveRoot, type PersonalityAnswer, type SharedAnswer } from '../../src/persistence/schema';
import { forgetPin, recordPinAttempt, removePin, setPin } from '../../src/store/pinActions';
import type { PinRecord } from '../../src/lib/pin';

const T = '2026-11-22T10:00:00.000Z';
const A = 'pl_playerA01';
const B = 'pl_imaginedB1';

const ans = (questionId: string, layer: 'self' | 'perceived', revision = 1): PersonalityAnswer => ({
  questionId,
  layer,
  selected: ['x'],
  meta: null,
  status: 'answered',
  revision,
  answeredAt: T,
  updatedAt: T,
});

const item = (
  key: string,
  kind: SharedAnswer['kind'],
  state: SharedAnswer['state'],
  extra: Partial<SharedAnswer>,
) => ({ key, questionId: key, kind, context: 'self', state, entries: {}, ...extra }) as SharedAnswer;

/** sampleSave + a completed together-style journey with every kind of private/revealed data. */
function richSave(): SaveRoot {
  const save = sampleSave();
  save.profiles[`${A}:perceived:${B}`] = {
    key: `${A}:perceived:${B}`,
    ownerId: A,
    aboutId: B,
    answers: { Q13: ans('Q13', 'perceived'), Q20: ans('Q20', 'perceived') },
    updatedAt: T,
  };
  save.profiles[`${B}:self`] = {
    key: `${B}:self`,
    ownerId: B,
    answers: { Q13: ans('Q13', 'self') },
    hiddenObservedCards: [],
    confirmedObserved: {},
    updatedAt: T,
  };
  const j = structuredClone(save.journeys.jr_journey001!);
  j.id = 'jr_journey002';
  j.mode = 'together';
  j.status = 'completed';
  j.storyAnswers = {
    [`${A}:r1_3`]: {
      key: `${A}:r1_3`,
      playerId: A,
      itemId: 'r1_3',
      kind: 'reflection',
      layer: 'self',
      selected: ['a'],
      meta: null,
      updatedAt: T,
    },
    [`${B}:r1_3`]: {
      key: `${B}:r1_3`,
      playerId: B,
      itemId: 'r1_3',
      kind: 'emotion_card',
      layer: 'self',
      selected: ['b'],
      meta: null,
      updatedAt: T,
    },
  };
  j.mirrorItems = {
    // Q13 revealed at the current revision → stays.
    Q13: item('Q13', 'profile', 'revealed', {
      entries: { [A]: { consent: true }, [B]: { consent: true } },
      revealedAt: T,
      revealedRevision: { [A]: 1, [B]: 1 },
    }),
    // Q16 was revealed at revision 1 but A edited it (revision 2) → current answer is unrevealed.
    Q16: item('Q16', 'profile', 'revealed', {
      entries: { [A]: { consent: true }, [B]: { consent: true } },
      revealedAt: T,
      revealedRevision: { [A]: 1, [B]: 1 },
    }),
    M01: item('M01', 'mirror', 'awaiting_consent', {
      entries: {
        [A]: { self: ans('M01', 'self'), consent: true, consentAt: T },
        [B]: { self: ans('M01', 'self'), consent: true, consentAt: T },
      },
    }),
    M02: item('M02', 'mirror', 'revealed', {
      entries: {
        [A]: { self: ans('M02', 'self'), consent: true },
        [B]: { self: ans('M02', 'self'), consent: true },
      },
      revealedAt: T,
    }),
    M03: item('M03', 'mirror', 'partial', { entries: { [A]: { self: ans('M03', 'self'), consent: false } } }),
    cs1: item('cs1', 'statement', 'revealed', {
      entries: {
        [A]: { statement: { text: 'ไม่แชร์', meta: null }, shareIntent: false, consent: true },
        [B]: { statement: { text: 'แชร์', meta: null }, shareIntent: true, consent: true },
      },
      revealedAt: T,
    }),
    cs2: item('cs2', 'statement', 'revealed', {
      entries: { [A]: { statement: { text: 'แชร์แล้ว', meta: null }, shareIntent: true, consent: true } },
      revealedAt: T,
    }),
    cs3: item('cs3', 'statement', 'partial', {
      entries: { [A]: { statement: { text: 'ยังไม่เปิด', meta: null }, shareIntent: true, consent: false } },
    }),
  };
  j.nextConversation = [
    { id: 'nc1', ownerId: A, text: 'ถามเรื่องวันหยุด', source: 'manual', done: false, createdAt: T },
  ];
  save.journeys[j.id] = j;
  save.drafts[`${B}:r1_3`] = { key: `${B}:r1_3`, playerId: B, text: 'ของเมฆ', updatedAt: T };
  save.memories.m1 = {
    id: 'm1',
    ownerId: A,
    category: 'happy',
    title: 'ทะเล',
    whatHappened: 'ไปทะเล',
    myFeelings: { selected: [] },
    myNeeds: { selected: [] },
    partnerFeelingsGuess: { selected: [] },
    background: 'bg_beach',
    shareIntent: false,
    createdAt: T,
    updatedAt: T,
  };
  expect(SaveRoot.safeParse(save).success).toBe(true);
  return save;
}

const REC: PinRecord = {
  algo: 'PBKDF2-SHA256',
  iterations: 210000,
  salt: 'c2FsdA==',
  hash: 'bmV3',
  failedAttempts: 0,
};

describe('setPin / removePin / recordPinAttempt', () => {
  it('sets, records attempts and removes the PIN', () => {
    let s = setPin(sampleSave(), B, REC);
    expect(s.players[B]!.pin).toEqual(REC);
    s = recordPinAttempt(s, B, { ...REC, failedAttempts: 5, lockedUntil: T });
    expect(s.players[B]!.pin!.failedAttempts).toBe(5);
    s = removePin(s, B);
    expect(s.players[B]!.pin).toBeUndefined();
    expect('pin' in s.players[B]!).toBe(false);
    expect(SaveRoot.safeParse(s).success).toBe(true);
  });

  it('ignores unknown players', () => {
    const s = sampleSave();
    expect(setPin(s, 'pl_nobody00', REC)).toBe(s);
  });
});

describe('forgetPin', () => {
  it('removes the PIN and unrevealed data, keeps revealed data and the partner', () => {
    const before = richSave();
    const s = forgetPin(before, A);
    expect(SaveRoot.safeParse(s).success).toBe(true);
    expect(s.players[A]!.pin).toBeUndefined();

    // Profiles: Q13 revealed at rev 1 stays; Q16 (rev 2 ≠ revealed 1) goes.
    expect(Object.keys(s.profiles[`${A}:self`]!.answers)).toEqual(['Q13']);
    expect(Object.keys(s.profiles[`${A}:perceived:${B}`]!.answers)).toEqual(['Q13']);
    expect(s.profiles[`${B}:self`]).toEqual(before.profiles[`${B}:self`]);

    const j = s.journeys.jr_journey002!;
    expect(Object.keys(j.storyAnswers)).toEqual([`${B}:r1_3`]);
    expect(s.journeys.jr_journey001!.storyAnswers).toEqual({});

    // Unrevealed mirror: A's entry dropped, partner must consent again.
    expect(j.mirrorItems.M01!.entries[A]).toBeUndefined();
    expect(j.mirrorItems.M01!.entries[B]).toEqual({ self: ans('M01', 'self'), consent: false });
    expect(j.mirrorItems.M01!.state).toBe('partial');
    expect(j.mirrorItems.M03).toBeUndefined();
    // Revealed mirror stays.
    expect(j.mirrorItems.M02).toEqual(before.journeys.jr_journey002!.mirrorItems.M02);

    // Statements: unshared text inside a revealed set is dropped; shared+revealed stays; unrevealed goes.
    expect(j.mirrorItems.cs1!.entries[A]!.statement).toBeUndefined();
    expect(j.mirrorItems.cs1!.entries[B]!.statement?.text).toBe('แชร์');
    expect(j.mirrorItems.cs2!.entries[A]!.statement?.text).toBe('แชร์แล้ว');
    expect(j.mirrorItems.cs3).toBeUndefined();

    expect(j.nextConversation).toHaveLength(1);
    expect(Object.keys(s.drafts)).toEqual([`${B}:r1_3`]);
    expect(s.memories).toEqual({});
  });

  it('works on the sample save (no journeys revealed) and stays schema-valid', () => {
    const s = forgetPin(sampleSave(), A);
    expect(SaveRoot.safeParse(s).success).toBe(true);
    expect(s.profiles[`${A}:self`]!.answers).toEqual({});
    expect(s.drafts).toEqual({});
    expect(s.players[A]!.pin).toBeUndefined();
    expect(s.journeys.jr_journey001!.chapterProgress.ch1).toBeDefined();
  });

  it('does not mutate the input', () => {
    const before = richSave();
    const copy = structuredClone(before);
    forgetPin(before, A);
    expect(before).toEqual(copy);
  });
});
