/** Link an imagined partner to the real partner (docs/05 §4.3, audit M-1). Fictional names only. */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../../src/routes';
import { useGame } from '../../src/store/game';
import { SaveRoot } from '../../src/persistence/schema';
import { imaginedWithThoughts, linkImaginedToReal } from '../../src/store/actions';
import { sampleSave } from '../fixtures/factory';

import { ui } from '../../src/content/th/ui';
const USE_SELF = ui.player.useSelf;
const A = 'pl_playerA01';
const IM = 'pl_imaginedB1';
const T = '2026-11-22T10:00:00.000Z';
const ans = (qid: string, sel: string[]) => ({ questionId: qid, layer: 'perceived' as const, selected: sel, meta: null, status: 'answered' as const, revision: 1, answeredAt: T, updatedAt: T });

function withThoughts(): SaveRoot {
  const s = sampleSave();
  delete s.players[A]!.pin;
  s.profiles[`${A}:perceived:${IM}`] = { key: `${A}:perceived:${IM}`, ownerId: A, aboutId: IM, updatedAt: T, answers: { Q13: ans('Q13', ['q13_hug']), Q16: ans('Q16', ['q16_empathy']) } };
  return s;
}

describe('linkImaginedToReal', () => {
  it('copies thoughts to the real partner, keeps the original and existing answers', () => {
    let s = withThoughts();
    s.players.pl_realB00001 = { ...s.players[IM]!, id: 'pl_realB00001', kind: 'real', createdBy: null, nickname: 'เมฆ' };
    s.profiles[`${A}:perceived:pl_realB00001`] = { key: `${A}:perceived:pl_realB00001`, ownerId: A, aboutId: 'pl_realB00001', updatedAt: T, answers: { Q16: ans('Q16', ['q16_solution']) } };
    s = linkImaginedToReal(s, A, IM, 'pl_realB00001');
    const copied = s.profiles[`${A}:perceived:pl_realB00001`]!.answers;
    expect(copied.Q13!.selected).toEqual(['q13_hug']);
    expect(copied.Q16!.selected).toEqual(['q16_solution']); // existing answer wins
    expect(s.profiles[`${A}:perceived:${IM}`]).toBeDefined();
    expect(SaveRoot.safeParse(s).success).toBe(true);
  });

  it('lists only imagined partners with thoughts', () => {
    expect(imaginedWithThoughts(sampleSave(), A)).toEqual([]);
    expect(imaginedWithThoughts(withThoughts(), A).map((p) => p.id)).toEqual([IM]);
  });
});

describe('Together setup asks to carry over solo thoughts', () => {
  it('asks once, and "yes" copies to the new partner', async () => {
    const s = withThoughts();
    s.journeys.jr_journey001!.status = 'completed';
    useGame.setState({ ready: true, save: s, health: 'ok', recovery: null, lastSavedAt: null });
    const router = createMemoryRouter(routes, { initialEntries: ['/players/new?mode=together'] });
    render(<RouterProvider router={router} />);
    await userEvent.click(screen.getByRole('button', { name: /ผู้เล่น A/ }));
    await userEvent.click(screen.getByRole('button', { name: USE_SELF }));
    await userEvent.type(screen.getByLabelText(/ชื่อเล่น/), 'เมฆ');
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));
    expect(screen.getByTestId('link-imagined')).toHaveTextContent('เมฆ คือคนที่ ผู้เล่น A เคยสร้างไว้');
    await userEvent.click(screen.getByRole('button', { name: 'ใช่ คือ ผู้เล่น B' }));
    expect(router.state.location.pathname).toBe('/profile');
    const save = useGame.getState().save;
    const meghId = Object.values(save.players).find((p) => p.nickname === 'เมฆ')!.id;
    expect(save.profiles[`${A}:perceived:${meghId}`]!.answers.Q13!.selected).toEqual(['q13_hug']);
  });
});
