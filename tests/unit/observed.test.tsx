/** M11b observed patterns (docs/04 §5). TC-PROF-07, TC-PROF-08. Fictional names only. */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { observedCards, observedSignals, type TagIndex } from '../../src/engine/observed';
import { setObservedFeedback } from '../../src/store/actions';
import { buildReport } from '../../src/engine/report';
import { compareSolo } from '../../src/engine/compare';
import { SaveRoot } from '../../src/persistence/schema';
import { ObservedSection } from '../../src/components/ObservedSection';
import { useGame } from '../../src/store/game';
import { useSession } from '../../src/store/session';
import { sampleSave } from '../fixtures/factory';

const A = 'pl_playerA01';
const J = 'jr_journey001';
const T = '2026-11-22T10:00:00.000Z';

const idx: TagIndex = new Map([
  ['c1:a', 'D01:open'],
  ['c2:a', 'D01:open'],
  ['c3:a', 'D01:hold_back'],
  ['c4:a', 'D01:downplay'],
  ['c5:a', 'D02:reach_out'],
  ['c6:a', 'D02:acknowledge'],
]);

function withChoices(log: { choiceId: string; asRole: 'insider' | 'waiter' | 'self'; by?: string }[]): SaveRoot {
  const s = sampleSave();
  s.journeys[J]!.chapterProgress.ch1!.choiceLog = log.map((l) => ({
    choiceId: l.choiceId,
    optionId: 'a',
    byPlayerId: l.by ?? A,
    asRole: l.asRole,
    at: T,
  }));
  return s;
}

describe('observed engine', () => {
  it('TC-PROF-07: only choices made in the player’s own role count', () => {
    const s = withChoices([
      { choiceId: 'c1', asRole: 'insider' }, // A is the insider in this solo journey
      { choiceId: 'c2', asRole: 'waiter' }, // playing the partner — ignored
      { choiceId: 'c3', asRole: 'self' },
    ]);
    expect(observedSignals(s, A, idx).map((x) => x.key).sort()).toEqual(['D01:hold_back', 'D01:open']);
  });

  it('needs ≥ 3 signals in a dimension, and a repeated signal for a signal card', () => {
    const sig = (key: string) => ({ key, dimension: key.split(':')[0]!, signal: key.split(':')[1]! });
    expect(observedCards([sig('D01:open'), sig('D01:open')])).toEqual([]);
    expect(observedCards([sig('D01:open'), sig('D01:open'), sig('D01:downplay')]).map((c) => c.key)).toEqual(['D01:open']);
    expect(observedCards([sig('D01:open'), sig('D01:hold_back'), sig('D01:downplay')]).map((c) => c.key)).toEqual([
      'D01:varied',
    ]);
  });

  it('TC-PROF-08: feedback is saved on the player’s own profile, schema-valid, and never touches answers', () => {
    let s = sampleSave();
    const before = s.profiles[`${A}:self`]!.answers;
    s = setObservedFeedback(s, A, 'D01:open', 'confirm');
    s = setObservedFeedback(s, A, 'D02:reach_out', 'reject');
    s = setObservedFeedback(s, A, 'D02:reach_out', 'hide');
    const p = s.profiles[`${A}:self`] as { confirmedObserved: Record<string, boolean>; hiddenObservedCards: string[] };
    expect(p.confirmedObserved).toEqual({ 'D01:open': true, 'D02:reach_out': false });
    expect(p.hiddenObservedCards).toEqual(['D02:reach_out']);
    expect(s.profiles[`${A}:self`]!.answers).toEqual(before);
    expect(SaveRoot.safeParse(s).success).toBe(true);
    s = setObservedFeedback(s, A, 'D02:reach_out', 'unhide');
    expect((s.profiles[`${A}:self`] as { hiddenObservedCards: string[] }).hiddenObservedCards).toEqual([]);
  });

  it('the report lists only confirmed patterns', () => {
    let s = setObservedFeedback(sampleSave(), A, 'D01:open', 'confirm');
    s = setObservedFeedback(s, A, 'D02:reach_out', 'reject');
    const text = JSON.stringify(buildReport(s, s.journeys[J]!, A, compareSolo(s, s.journeys[J]!, A)));
    expect(text).toContain('บอกความรู้สึกออกมาตรง ๆ');
    expect(text).not.toContain('ติดต่ออีกฝ่ายก่อน');
  });
});

describe('ObservedSection', () => {
  it('opens behind the gate and says when there is no clear pattern yet', async () => {
    const s = withChoices([{ choiceId: 'ch1_none', asRole: 'insider' }]);
    delete s.players[A]!.pin;
    useGame.setState({ ready: true, save: s, health: 'ok', recovery: null, lastSavedAt: null });
    useSession.getState().lock();
    const user = userEvent.setup();
    render(<ObservedSection playerId={A} />);
    await user.click(screen.getByRole('button', { name: /รูปแบบ/ }));
    expect(await screen.findByTestId('observed')).toBeInTheDocument();
    expect(screen.getByText(/ยังไม่มี|ยังไม่พอ/)).toBeInTheDocument();
  });
});
