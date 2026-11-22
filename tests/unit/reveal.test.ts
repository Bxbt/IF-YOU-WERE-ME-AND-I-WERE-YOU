/** Reveal engine (docs/04 §6, docs/11 TC-REV / TC-PRIV). Fictional players only. */
import { describe, expect, it } from 'vitest';
import { SharedAnswer, type PersonalityAnswer } from '../../src/persistence/schema';
import {
  entryFor,
  profileAnswerFor,
  revealPairs,
  setConsent,
  setGroupConsent,
  statementsVisibleTo,
  submitEntry,
  waitingFor,
  type EntryMeta,
  type StatementPatch,
} from '../../src/engine/reveal';

const A = 'pl_playerA01';
const B = 'pl_playerB02';
const P = [A, B] as const;
const T0 = '2026-11-22T10:00:00.000Z';
const T1 = '2026-11-22T10:05:00.000Z';
const T2 = '2026-11-22T10:10:00.000Z';
const T3 = '2026-11-22T10:15:00.000Z';

/** Every item an engine call produced; all are validated against the zod schema at the end. */
const produced: SharedAnswer[] = [];
const track = (item: SharedAnswer): SharedAnswer => {
  produced.push(item);
  return item;
};

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.values(o).forEach(deepFreeze);
    Object.freeze(o);
  }
  return o;
}

function ans(
  questionId: string,
  layer: 'self' | 'perceived',
  selected: string[],
  over: Partial<PersonalityAnswer> = {},
): PersonalityAnswer {
  return {
    questionId,
    layer,
    selected,
    meta: null,
    status: 'answered',
    revision: 1,
    answeredAt: T0,
    updatedAt: T0,
    ...over,
  };
}
const preferNot = (q: string, layer: 'self' | 'perceived', revision = 1) =>
  ans(q, layer, [], { meta: 'prefer_not', revision });
const skipped = (q: string, layer: 'self' | 'perceived') =>
  ans(q, layer, [], { meta: 'skipped', status: 'skipped' });

const mirror = (q: string): EntryMeta => ({ questionId: q, kind: 'mirror', context: 'self' });

function submitMirror(
  item: SharedAnswer | undefined,
  q: string,
  player: string,
  self: PersonalityAnswer,
  perceived: PersonalityAnswer,
  now = T1,
): SharedAnswer {
  if (item) deepFreeze(item);
  return track(submitEntry(item, q, mirror(q), P, player, { self, perceived }, now));
}

/** A and B both answered M01; A's options carry a "secretA" marker to detect leaks. */
function bothSubmitted(q = 'M01'): SharedAnswer {
  const one = submitMirror(
    undefined,
    q,
    A,
    ans(q, 'self', ['m_secretA_self']),
    ans(q, 'perceived', ['m_secretA_guess']),
  );
  return submitMirror(one, q, B, ans(q, 'self', ['m_b_self']), ans(q, 'perceived', ['m_secretA_self']));
}
const consent = (item: SharedAnswer, p: string, v: boolean, now = T2) =>
  track(setConsent(deepFreeze(item), p, v, now));
const revealed = (q = 'M01') => consent(consent(bothSubmitted(q), A, true), B, true);

describe('state machine (TC-REV-01…06)', () => {
  it('no item yet → everyone still has to submit; a first profile submission → partial', () => {
    expect(waitingFor(undefined, P)).toEqual({ submit: [A, B], consent: [] });
    const profileOnly = track(
      submitEntry(undefined, 'Q13', { questionId: 'Q13', kind: 'profile', context: 'self' }, P, A, {}, T1),
    );
    expect(profileOnly.state).toBe('partial');
  });

  it('TC-REV-01: A submits → partial', () => {
    const item = submitMirror(undefined, 'M01', A, ans('M01', 'self', ['x']), ans('M01', 'perceived', ['y']));
    expect(item.state).toBe('partial');
    expect(item.entries[A]?.submittedAt).toBe(T1);
    expect(item.entries[A]?.consent).toBe(false);
    expect(waitingFor(item, P)).toEqual({ submit: [B], consent: [] });
  });

  it('TC-REV-02: A and B submit → awaiting_consent', () => {
    const item = bothSubmitted();
    expect(item.state).toBe('awaiting_consent');
    expect(waitingFor(item, P)).toEqual({ submit: [], consent: [A, B] });
  });

  it('consent is ignored before awaiting_consent', () => {
    const partial = submitMirror(
      undefined,
      'M01',
      A,
      ans('M01', 'self', ['x']),
      ans('M01', 'perceived', ['y']),
    );
    expect(consent(partial, A, true)).toBe(partial);
  });

  it('TC-REV-03: only A consents → still awaiting_consent and B does not see A', () => {
    const item = consent(bothSubmitted(), A, true);
    expect(item.state).toBe('awaiting_consent');
    expect(item.entries[A]?.consent).toBe(true);
    expect(item.entries[A]?.consentAt).toBe(T2);
    expect(entryFor(item, A, B)).toBeUndefined();
    expect(revealPairs(item, A, B)).toEqual([]);
    expect(waitingFor(item, P)).toEqual({ submit: [], consent: [B] });
  });

  it('TC-REV-04: A consents → withdraws → B consents → not revealed (R3)', () => {
    const withdrawn = consent(consent(bothSubmitted(), A, true), A, false);
    expect(withdrawn.entries[A]?.consent).toBe(false);
    expect(withdrawn.entries[A]?.consentAt).toBeUndefined();
    const item = consent(withdrawn, B, true);
    expect(item.state).toBe('awaiting_consent');
    expect(item.revealedAt).toBeUndefined();
    expect(entryFor(item, A, B)).toBeUndefined();
    expect(entryFor(item, B, A)).toBeUndefined();
  });

  it('TC-REV-05: both consent → revealed with revealedRevision', () => {
    const item = revealed();
    expect(item.state).toBe('revealed');
    expect(item.revealedAt).toBe(T2);
    expect(item.revealedRevision).toEqual({ [A]: 1, [B]: 1 });
    expect(waitingFor(item, P)).toEqual({ submit: [], consent: [] });
    const seen = entryFor(item, A, B);
    expect(seen && 'visible' in seen && seen.self).toMatchObject({ selected: ['m_secretA_self'] });
    // withdrawing after reveal is impossible (R3/R6)
    expect(consent(item, A, false)).toBe(item);
  });

  it('revealedRevision for mirror = max(self, perceived) revision per player', () => {
    const one = submitMirror(
      undefined,
      'M02',
      A,
      ans('M02', 'self', ['a'], { revision: 3 }),
      ans('M02', 'perceived', ['b'], { revision: 5 }),
    );
    const two = submitMirror(
      one,
      'M02',
      B,
      ans('M02', 'self', ['c'], { revision: 2 }),
      ans('M02', 'perceived', ['a']),
    );
    expect(consent(consent(two, B, true), A, true).revealedRevision).toEqual({ [A]: 5, [B]: 2 });
  });

  it('TC-REV-06 / R7: A edits after reveal → awaiting_consent, both consents reset, old value never shown', () => {
    const item = revealed();
    const edited = submitMirror(
      item,
      'M01',
      A,
      ans('M01', 'self', ['m_new_self'], { revision: 2, updatedAt: T3 }),
      ans('M01', 'perceived', ['m_secretA_guess']),
      T3,
    );
    expect(edited.state).toBe('awaiting_consent');
    expect(edited.entries[A]?.consent).toBe(false);
    expect(edited.entries[B]?.consent).toBe(false);
    expect(edited.revealedRevision).toEqual({ [A]: 1, [B]: 1 });
    expect(edited.revealedAt).toBe(T2);
    // neither the old nor the new version is visible to B; B's own entry is also hidden from A again
    expect(entryFor(edited, A, B)).toBeUndefined();
    expect(entryFor(edited, B, A)).toBeUndefined();
    expect(revealPairs(edited, A, B)).toEqual([]);
    expect(JSON.stringify(entryFor(edited, A, B) ?? null)).not.toContain('m_secretA_self');
    // A still sees their own new version
    const own = entryFor(edited, A, A);
    expect(own && 'visible' in own && own.self).toMatchObject({ selected: ['m_new_self'] });

    // one consent is not enough; both → revealed again with the new revision
    const half = consent(edited, B, true, T3);
    expect(half.state).toBe('awaiting_consent');
    const again = consent(half, A, true, T3);
    expect(again.state).toBe('revealed');
    expect(again.revealedRevision).toEqual({ [A]: 2, [B]: 1 });
    const seen = entryFor(again, A, B);
    expect(seen && 'visible' in seen && seen.self).toMatchObject({ selected: ['m_new_self'] });
  });

  it('resubmitting an identical answer after reveal keeps it revealed', () => {
    const item = revealed();
    const same = submitMirror(
      item,
      'M01',
      A,
      ans('M01', 'self', ['m_secretA_self']),
      ans('M01', 'perceived', ['m_secretA_guess']),
      T3,
    );
    expect(same.state).toBe('revealed');
    expect(same.entries[B]?.consent).toBe(true);
  });

  it('editing before reveal resets only the editor’s consent', () => {
    const edited = submitMirror(
      consent(bothSubmitted(), A, true),
      'M01',
      B,
      ans('M01', 'self', ['m_b_other'], { revision: 2 }),
      ans('M01', 'perceived', ['m_secretA_self']),
    );
    expect(edited.entries[A]?.consent).toBe(true);
    expect(edited.entries[B]?.consent).toBe(false);
    expect(edited.state).toBe('awaiting_consent');
  });

  it('rejects a player outside the journey and a kind mismatch', () => {
    expect(() =>
      submitEntry(
        undefined,
        'M01',
        mirror('M01'),
        P,
        'pl_stranger9',
        { self: ans('M01', 'self', ['x']) },
        T1,
      ),
    ).toThrow();
    expect(() =>
      submitEntry(revealed(), 'M01', { questionId: 'M01', kind: 'profile', context: 'self' }, P, A, {}, T1),
    ).toThrow();
  });
});

describe('TC-REV-07: reveal at end of chapter with an exception', () => {
  it('Ch4 group consent excluding M03 → M03 not revealed, the others revealed', () => {
    const items: Record<string, SharedAnswer> = {
      M03: bothSubmitted('M03'),
      M04: bothSubmitted('M04'),
      M05: bothSubmitted('M05'),
    };
    const pending = submitMirror(
      undefined,
      'M06',
      A,
      ans('M06', 'self', ['x']),
      ans('M06', 'perceived', ['y']),
    );
    items.M06 = pending;
    deepFreeze(items);
    const afterA = setGroupConsent(items, A, true, ['M03'], T2);
    const afterB = setGroupConsent(afterA, B, true, [], T2);
    Object.values(afterA).forEach(track);
    Object.values(afterB).forEach(track);
    expect(afterB.M03?.state).toBe('awaiting_consent');
    expect(afterB.M03?.entries[A]?.consent).toBe(false);
    expect(entryFor(afterB.M03, A, B)).toBeUndefined();
    expect(afterB.M04?.state).toBe('revealed');
    expect(afterB.M05?.state).toBe('revealed');
    expect(afterB.M06).toBe(pending); // still partial: untouched
    expect(waitingFor(afterB.M03, P).consent).toEqual([A]);
  });
});

describe('TC-REV-08: Ch5 statements', () => {
  const stmt = (text: string, shareIntent: boolean): StatementPatch => ({
    statement: { text, starterId: 'st_1', meta: null },
    shareIntent,
  });
  const meta = (q: string): EntryMeta => ({ questionId: q, kind: 'statement', context: 'self' });
  function build(): Record<string, SharedAnswer> {
    const plan: Record<string, [boolean, boolean]> = {
      cs1: [true, false],
      cs2: [true, true],
      cs3: [false, false],
    };
    const out: Record<string, SharedAnswer> = {};
    for (const [q, [shareA, shareB]] of Object.entries(plan)) {
      const one = track(submitEntry(undefined, q, meta(q), P, A, stmt(`secretA ${q}`, shareA), T1));
      out[q] = track(submitEntry(one, q, meta(q), P, B, stmt(`ข้อความ B ${q}`, shareB), T1));
    }
    return out;
  }

  it('before reveal nobody sees the other’s statements; owners see their own', () => {
    const items = build();
    expect(statementsVisibleTo(items, B, A)).toEqual([]);
    expect(statementsVisibleTo(items, A, B)).toEqual([]);
    expect(statementsVisibleTo(items, A, A).map((s) => [s.key, s.shared])).toEqual([
      ['cs1', true],
      ['cs2', true],
      ['cs3', false],
    ]);
  });

  it('A shares cs1, cs2 · B shares cs2 → shows cs1, cs2 of A and cs2 of B', () => {
    const items = deepFreeze(build());
    const done = setGroupConsent(setGroupConsent(items, A, true, [], T2), B, true, [], T2);
    Object.values(done).forEach(track);
    expect(Object.values(done).every((i) => i.state === 'revealed')).toBe(true);
    expect(statementsVisibleTo(done, B, A).map((s) => s.key)).toEqual(['cs1', 'cs2']);
    expect(statementsVisibleTo(done, A, B).map((s) => s.key)).toEqual(['cs2']);
    expect(statementsVisibleTo(Object.values(done), A, B)[0]).toMatchObject({
      text: 'ข้อความ B cs2',
      shared: true,
    });
    // unshared statements stay hidden through entryFor as well
    expect(entryFor(done.cs3, A, B)).toBeUndefined();
    expect(entryFor(done.cs1, B, A)).toBeUndefined();
    // statement revision = reveal generation counter
    expect(done.cs2?.revealedRevision).toEqual({ [A]: 1, [B]: 1 });
  });

  it('editing a revealed statement hides it until both consent again; counter increments', () => {
    const items = build();
    const cs2 = consent(consent(items.cs2!, A, true), B, true);
    const edited = track(submitEntry(cs2, 'cs2', meta('cs2'), P, A, stmt('secretA new', true), T3));
    expect(edited.state).toBe('awaiting_consent');
    expect(statementsVisibleTo([edited], B, A)).toEqual([]);
    const again = consent(consent(edited, A, true), B, true);
    expect(again.revealedRevision).toEqual({ [A]: 2, [B]: 2 });
    expect(statementsVisibleTo([again], B, A).map((s) => s.text)).toEqual(['secretA new']);
  });

  it('turning shareIntent on after reveal requires new consent', () => {
    const items = build();
    const cs3 = consent(consent(items.cs3!, A, true), B, true);
    const shared = track(submitEntry(cs3, 'cs3', meta('cs3'), P, A, stmt('secretA cs3', true), T3));
    expect(shared.state).toBe('awaiting_consent');
    expect(statementsVisibleTo([shared], B, A)).toEqual([]);
  });

  it('a skipped statement is stored empty and never shared', () => {
    const item = track(
      submitEntry(
        undefined,
        'cs4',
        meta('cs4'),
        P,
        A,
        { statement: { text: 'x', meta: 'skipped' }, shareIntent: true },
        T1,
      ),
    );
    expect(item.entries[A]?.statement).toEqual({ text: '', meta: 'skipped' });
    expect(item.entries[A]?.shareIntent).toBe(false);
  });
});

describe('R4 / TC-PRIV-09: prefer_not', () => {
  it('B sees only the prefer_not marker even after reveal; pairs with it are excluded', () => {
    const one = submitMirror(
      undefined,
      'M02',
      A,
      preferNot('M02', 'self'),
      ans('M02', 'perceived', ['m_secretA_guess']),
    );
    const two = submitMirror(one, 'M02', B, ans('M02', 'self', ['m_b']), ans('M02', 'perceived', ['m_b']));
    const item = consent(consent(two, A, true), B, true);
    expect(item.state).toBe('revealed');
    const seen = entryFor(item, A, B);
    expect(seen && 'visible' in seen && seen.self).toEqual({ preferNot: true });
    expect(seen && 'visible' in seen && seen.perceived).toMatchObject({ selected: ['m_secretA_guess'] });
    const pairs = revealPairs(item, A, B);
    expect(pairs.map((p) => p.kind)).toEqual(['b_view']);
    expect(pairs[0]).toMatchObject({ category: 'different', xOwner: B, yOwner: A });
  });

  it('all answers prefer_not → whole-entry marker', () => {
    const one = submitMirror(undefined, 'M02', A, preferNot('M02', 'self'), preferNot('M02', 'perceived'));
    const two = submitMirror(one, 'M02', B, ans('M02', 'self', ['m_b']), ans('M02', 'perceived', ['m_b']));
    const item = consent(consent(two, A, true), B, true);
    expect(entryFor(item, A, B)).toEqual({ preferNot: true });
    expect(revealPairs(item, A, B)).toEqual([]);
  });
});

describe('R5: skipped', () => {
  it('B skips → A still reveals with only A’s consent; B shows as skipped', () => {
    const one = submitMirror(
      undefined,
      'M04',
      A,
      ans('M04', 'self', ['m_a']),
      ans('M04', 'perceived', ['m_b']),
    );
    const two = submitMirror(one, 'M04', B, skipped('M04', 'self'), skipped('M04', 'perceived'));
    expect(two.state).toBe('awaiting_consent');
    expect(waitingFor(two, P)).toEqual({ submit: [], consent: [A] });
    expect(entryFor(two, A, B)).toBeUndefined();
    const item = consent(two, A, true);
    expect(item.state).toBe('revealed');
    expect(entryFor(item, B, A)).toEqual({ skipped: true });
    const seen = entryFor(item, A, B);
    expect(seen && 'visible' in seen && seen.self).toMatchObject({ selected: ['m_a'] });
    expect(revealPairs(item, A, B).every((p) => p.category === 'ask')).toBe(true);
  });

  it('only one player skipped so far → partial; both skipped → skipped', () => {
    const one = submitMirror(undefined, 'M05', A, skipped('M05', 'self'), skipped('M05', 'perceived'));
    expect(one.state).toBe('partial');
    const both = submitMirror(one, 'M05', B, skipped('M05', 'self'), skipped('M05', 'perceived'));
    expect(both.state).toBe('skipped');
    expect(entryFor(both, A, B)).toEqual({ skipped: true });
    expect(waitingFor(both, P)).toEqual({ submit: [], consent: [] });
    expect(consent(both, A, true)).toBe(both);
  });
});

describe('profile questions (docs/04 §6.3.0)', () => {
  const meta: EntryMeta = { questionId: 'Q13', kind: 'profile', context: 'self' };
  const qa = ans('Q13', 'self', ['q13_secretA'], { revision: 3 });

  function revealedProfile(): SharedAnswer {
    const one = track(submitEntry(undefined, 'Q13', meta, P, A, {}, T1));
    const two = track(submitEntry(one, 'Q13', meta, P, B, {}, T1));
    expect(two.entries[A]).not.toHaveProperty('self');
    const half = track(setConsent(two, A, true, T2, { [A]: 3, [B]: 1 }));
    return track(setConsent(half, B, true, T2, { [A]: 3, [B]: 1 }));
  }

  it('visible only at the revealed revision', () => {
    const item = revealedProfile();
    expect(item.revealedRevision).toEqual({ [A]: 3, [B]: 1 });
    expect(profileAnswerFor(item, A, B, qa)).toMatchObject({ selected: ['q13_secretA'] });
    // Profile edited (revision 4) → the new version is not shown (R7)
    expect(profileAnswerFor(item, A, B, { ...qa, revision: 4 })).toBeUndefined();
    expect(profileAnswerFor(item, A, A, { ...qa, revision: 4 })).toMatchObject({ revision: 4 });
    expect(profileAnswerFor(item, A, B, { ...preferNot('Q13', 'self', 3) })).toEqual({ preferNot: true });
  });

  it('resubmitting with a new revision after reveal returns to awaiting_consent', () => {
    const item = revealedProfile();
    expect(track(submitEntry(item, 'Q13', meta, P, A, { revision: 3 }, T3)).state).toBe('revealed');
    const edited = track(submitEntry(item, 'Q13', meta, P, A, { revision: 4 }, T3));
    expect(edited.state).toBe('awaiting_consent');
    expect(edited.revealedRevision).toEqual({ [A]: 3, [B]: 1 });
    expect(profileAnswerFor(edited, A, B, qa)).toBeUndefined();
  });

  it('missing revisions fail closed', () => {
    const one = track(submitEntry(undefined, 'Q13', meta, P, A, {}, T1));
    const two = track(submitEntry(one, 'Q13', meta, P, B, {}, T1));
    const item = consent(consent(two, A, true), B, true);
    expect(item.revealedRevision).toEqual({ [A]: 0, [B]: 0 });
    expect(profileAnswerFor(item, A, B, qa)).toBeUndefined();
  });
});

describe('TC-PRIV-03: no unrevealed answer of A reaches viewer B through any selector', () => {
  it('across every non-revealed state', () => {
    const awaitingA = consent(bothSubmitted('M06'), A, true);
    const r7 = submitMirror(
      revealed('M07'),
      'M07',
      A,
      ans('M07', 'self', ['m_secretA_v2'], { revision: 2 }),
      ans('M07', 'perceived', ['m_secretA_guess']),
      T3,
    );
    const items: Record<string, SharedAnswer> = {
      M01: submitMirror(
        undefined,
        'M01',
        A,
        ans('M01', 'self', ['m_secretA_1']),
        ans('M01', 'perceived', ['m_secretA_2']),
      ),
      M02: bothSubmitted('M02'),
      M06: awaitingA,
      M07: r7,
      cs1: track(
        submitEntry(
          undefined,
          'cs1',
          { questionId: 'cs1', kind: 'statement', context: 'self' },
          P,
          A,
          { statement: { text: 'secretA', meta: null }, shareIntent: true },
          T1,
        ),
      ),
    };
    for (const item of Object.values(items)) {
      expect(entryFor(item, A, B)).toBeUndefined();
      expect(revealPairs(item, A, B)).toEqual([]);
      expect(JSON.stringify(waitingFor(item, P))).not.toContain('secretA');
    }
    expect(statementsVisibleTo(items, B, A)).toEqual([]);
    expect(profileAnswerFor(items.M02, A, B, ans('Q13', 'self', ['q13_secretA']))).toBeUndefined();
    expect(profileAnswerFor(undefined, A, B, ans('Q13', 'self', ['q13_secretA']))).toBeUndefined();
  });
});

describe('purity and schema', () => {
  it('never mutates inputs (frozen inputs throw on write)', () => {
    const item = deepFreeze(bothSubmitted());
    const snapshot = JSON.stringify(item);
    consent(item, A, true);
    submitMirror(item, 'M01', A, ans('M01', 'self', ['z'], { revision: 2 }), ans('M01', 'perceived', ['z']));
    expect(JSON.stringify(item)).toBe(snapshot);
  });

  it('every produced item passes the SharedAnswer schema', () => {
    expect(produced.length).toBeGreaterThan(30);
    for (const item of produced) expect(SharedAnswer.safeParse(item).success, item.key).toBe(true);
  });
});
