/** M10b: opening Profile Q01–Q36 between players (docs/04 §6.3.0). Fictional names only. */
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptySave, SaveRoot, type GameSession, type PersonalityAnswer } from '../../src/persistence/schema';
import { offerProfileAnswers } from '../../src/store/story';
import { compareTogether, profileRevision } from '../../src/engine/compare';
import { useGame } from '../../src/store/game';
import { useSession } from '../../src/store/session';
import { ProfileOffer } from '../../src/components/ProfileOffer';
import { createPinRecord } from '../../src/lib/pin';

const T = '2026-11-22T10:00:00.000Z';
const A = 'pl_dao0000001';
const B = 'pl_mek0000001';
const J = 'jr_together01';

const answer = (qid: string, layer: 'self' | 'perceived', selected: string[], revision = 1, meta: PersonalityAnswer['meta'] = null): PersonalityAnswer => ({
  questionId: qid, layer, selected, meta, status: 'answered', revision, answeredAt: T, updatedAt: T,
});

function base(): SaveRoot {
  const s = createEmptySave();
  const appearance = { preset: 'p1', skin: 1, hairStyle: 0, hairColor: 1, outfit: 0, outfitColor: 2, accessory: 'none' } as const;
  for (const [id, nickname] of [[A, 'ดาว'], [B, 'เมฆ']] as const) {
    s.players[id] = { id, kind: 'real', createdBy: null, nickname, sentenceEnding: '', addressStyle: 'เธอ', appearance, createdAt: T, updatedAt: T };
  }
  s.profiles[`${A}:self`] = { key: `${A}:self`, ownerId: A, hiddenObservedCards: [], confirmedObserved: {}, updatedAt: T,
    answers: { Q13: answer('Q13', 'self', ['q13_hug']), Q16: answer('Q16', 'self', ['q16_empathy']) } };
  s.profiles[`${A}:perceived:${B}`] = { key: `${A}:perceived:${B}`, ownerId: A, aboutId: B, updatedAt: T,
    answers: { Q13: answer('Q13', 'perceived', ['q13_space']) } };
  s.profiles[`${B}:self`] = { key: `${B}:self`, ownerId: B, hiddenObservedCards: [], confirmedObserved: {}, updatedAt: T,
    answers: { Q13: answer('Q13', 'self', ['q13_listen']), Q16: answer('Q16', 'self', [], 1, 'prefer_not') } };
  s.profiles[`${B}:perceived:${A}`] = { key: `${B}:perceived:${A}`, ownerId: B, aboutId: A, updatedAt: T,
    answers: { Q13: answer('Q13', 'perceived', ['q13_hug']) } };
  s.journeys[J] = {
    id: J, mode: 'together', playerIds: [A, B], status: 'active',
    chapterProgress: {}, storyAnswers: {}, mirrorItems: {}, observed: [], nextConversation: [],
    introSeen: true, createdAt: T, updatedAt: T, lastPlayedAt: T,
  };
  return s;
}
const j = (s: SaveRoot): GameSession => s.journeys[J]!;
const qids = (s: SaveRoot) => [...new Set([...compareTogether(j(s), s).similar, ...compareTogether(j(s), s).different, ...compareTogether(j(s), s).ask].map((i) => i.question.id))];

describe('offerProfileAnswers', () => {
  it('one offer alone opens nothing; both offers open the question', () => {
    let s = offerProfileAnswers(base(), J, A, ['Q13'], []);
    expect(j(s).mirrorItems.Q13!.state).toBe('partial');
    expect(qids(s)).toEqual([]);
    s = offerProfileAnswers(s, J, B, ['Q13'], []);
    expect(j(s).mirrorItems.Q13!.state).toBe('revealed');
    expect(qids(s)).toEqual(['Q13']);
    expect(SaveRoot.safeParse(s).success).toBe(true);
  });

  it('answers are never copied into the journey', () => {
    const s = offerProfileAnswers(offerProfileAnswers(base(), J, A, ['Q13'], []), J, B, ['Q13'], []);
    expect(JSON.stringify(j(s))).not.toContain('q13_hug');
  });

  it('only questions offered by both are compared; views use self vs the other’s guess', () => {
    let s = offerProfileAnswers(base(), J, A, ['Q13', 'Q16'], []);
    s = offerProfileAnswers(s, J, B, ['Q13'], []);
    const c = compareTogether(j(s), s);
    expect(qids(s)).toEqual(['Q13']);
    expect(c.similar.find((i) => i.view === 'a_view')?.question.id).toBe('Q13'); // B guessed A's hug
    expect(c.different.some((i) => i.view === 'b_view')).toBe(true); // A guessed space, B said listen
  });

  it('R4: a prefer_not answer is never compared (the direct pair is left out)', () => {
    let s = offerProfileAnswers(base(), J, A, ['Q16'], []);
    s = offerProfileAnswers(s, J, B, ['Q16'], []);
    expect(j(s).mirrorItems.Q16!.state).toBe('revealed');
    const c = compareTogether(j(s), s);
    const q16 = [...c.similar, ...c.different, ...c.ask].filter((i) => i.question.id === 'Q16');
    expect(q16.some((i) => i.view === 'direct')).toBe(false);
    expect(c.similar.concat(c.different).some((i) => i.question.id === 'Q16')).toBe(false);
  });

  it('withdrawing before the partner offers removes the offer', () => {
    let s = offerProfileAnswers(base(), J, A, ['Q13'], []);
    s = offerProfileAnswers(s, J, A, [], ['Q13']);
    expect(j(s).mirrorItems.Q13).toBeUndefined();
    s = offerProfileAnswers(s, J, B, ['Q13'], []);
    expect(j(s).mirrorItems.Q13!.state).toBe('partial');
  });

  it('R7: editing after the reveal hides it; both must offer again', () => {
    let s = offerProfileAnswers(offerProfileAnswers(base(), J, A, ['Q13'], []), J, B, ['Q13'], []);
    s.profiles[`${A}:self`]!.answers.Q13 = answer('Q13', 'self', ['q13_space'], 2);
    expect(qids(s)).toEqual([]); // hidden at once
    s = offerProfileAnswers(s, J, A, ['Q13'], []);
    expect(j(s).mirrorItems.Q13!.state).toBe('awaiting_consent');
    expect(qids(s)).toEqual([]);
    s = offerProfileAnswers(s, J, B, ['Q13'], []);
    expect(j(s).mirrorItems.Q13!.state).toBe('revealed');
    expect(j(s).mirrorItems.Q13!.revealedRevision![A]).toBe(profileRevision(s, A, B, 'Q13'));
    expect(qids(s)).toEqual(['Q13']);
  });

  it('cannot offer a question the player never answered', () => {
    const s = offerProfileAnswers(base(), J, A, ['Q01'], []);
    expect(j(s).mirrorItems.Q01).toBeUndefined();
  });
});

describe('ProfileOffer (S8)', () => {
  beforeEach(() => useSession.getState().lock());

  it('nothing is preselected; the partner’s picks are not shown', async () => {
    const s = offerProfileAnswers(base(), J, B, ['Q13'], []); // B already picked Q13
    useGame.setState({ ready: true, save: s, health: 'ok', recovery: null, lastSavedAt: null });
    const user = userEvent.setup();
    render(<ProfileOffer journey={j(s)} />);
    await user.click(screen.getByRole('button', { name: 'ดาว: เลือกข้อที่ยอมเปิด' }));
    const list = screen.getByTestId('offer-list');
    for (const box of within(list).getAllByRole('checkbox')) expect(box).not.toBeChecked();
    expect(list).not.toHaveTextContent('เมฆ เลือก');
    await user.click(within(list).getByRole('checkbox', { name: /อยากให้คนรักปลอบแบบไหน/ }));
    await user.click(screen.getByRole('button', { name: 'บันทึกที่เลือก' }));
    expect(useGame.getState().save.journeys[J]!.mirrorItems.Q13!.state).toBe('revealed');
  });

  it('a player with a PIN passes the gate before the list is shown', async () => {
    const s = base();
    s.players[A]!.pin = await createPinRecord('2580', 1000);
    useGame.setState({ ready: true, save: s, health: 'ok', recovery: null, lastSavedAt: null });
    const user = userEvent.setup();
    render(<ProfileOffer journey={j(s)} />);
    await user.click(screen.getByRole('button', { name: 'ดาว: เลือกข้อที่ยอมเปิด' }));
    expect(screen.getByRole('dialog', { name: /ใส่ PIN ของ ดาว/ })).toBeInTheDocument();
    expect(screen.queryByTestId('offer-list')).not.toBeInTheDocument();
  });
});
