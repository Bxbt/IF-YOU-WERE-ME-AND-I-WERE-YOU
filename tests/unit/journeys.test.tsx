/** M11b: Journey List (S1b) and merge import. TC-RES-05, TC-EXP-05, TC-EXP-13. Fictional names only. */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../../src/routes';
import { useGame } from '../../src/store/game';
import { SaveRoot } from '../../src/persistence/schema';
import { activateJourney } from '../../src/store/journeys';
import { mergeSaves } from '../../src/persistence/exportImport';
import { KEYS } from '../../src/persistence/storage';
import { sampleSave } from '../fixtures/factory';

const J = 'jr_journey001';
function twoJourneys(): SaveRoot {
  const s = sampleSave();
  s.journeys.jr_journey002 = { ...s.journeys[J]!, id: 'jr_journey002', status: 'completed', lastPlayedAt: '2026-11-21T10:00:00.000Z' };
  return s;
}

describe('journey actions', () => {
  it('activating another journey archives the active one (one active at a time)', () => {
    const s = activateJourney(twoJourneys(), 'jr_journey002');
    expect(s.journeys.jr_journey002!.status).toBe('active');
    expect(s.journeys[J]!.status).toBe('archived');
    expect(SaveRoot.safeParse(s).success).toBe(true);
  });
});

describe('S1b Journey List', () => {
  it('TC-RES-05: lists journeys without any answers; delete removes one and the backup', async () => {
    const s = twoJourneys();
    localStorage.setItem(KEYS.backup, JSON.stringify(s));
    useGame.setState({ ready: true, save: s, health: 'ok', recovery: null, lastSavedAt: null });
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, { initialEntries: ['/journeys'] });
    render(<RouterProvider router={router} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(document.body.textContent).not.toContain('q13_listen');
    await user.click(within(screen.getByTestId('journey-jr_journey002')).getByRole('button', { name: 'ลบ' }));
    await user.click(screen.getAllByRole('button', { name: 'ลบ' }).at(-1)!);
    expect(useGame.getState().save.journeys.jr_journey002).toBeUndefined();
    expect(localStorage.getItem(KEYS.backup)).toBeNull();
  });
});

describe('merge import', () => {
  it('TC-EXP-05: clashing ids are kept as copies; the device keeps its active journey', () => {
    const current = sampleSave();
    const incoming = sampleSave();
    const r = mergeSaves(current, incoming);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.data.players)).toHaveLength(4);
    expect(Object.keys(r.data.journeys)).toHaveLength(2);
    expect(Object.values(r.data.journeys).filter((j) => j.status === 'active')).toHaveLength(1);
    expect(r.data.journeys[J]).toEqual(current.journeys[J]);
    expect(r.renamed).toBeGreaterThan(0);
  });

  it('TC-EXP-13: reveals from a file with two real players go back to awaiting consent', () => {
    const incoming = sampleSave();
    incoming.players.pl_imaginedB1!.kind = 'real';
    incoming.players.pl_imaginedB1!.createdBy = null;
    incoming.journeys[J]!.mode = 'together';
    incoming.journeys[J]!.mirrorItems.M01 = {
      key: 'M01', questionId: 'M01', kind: 'mirror', context: 'self', state: 'revealed',
      revealedAt: '2026-11-22T10:00:00.000Z', revealedRevision: { pl_playerA01: 1, pl_imaginedB1: 1 },
      entries: { pl_playerA01: { consent: true, submittedAt: '2026-11-22T10:00:00.000Z' }, pl_imaginedB1: { consent: true, submittedAt: '2026-11-22T10:00:00.000Z' } },
    };
    const r = mergeSaves(SaveRoot.parse({ ...sampleSave(), players: {}, profiles: {}, journeys: {}, drafts: {} }), incoming);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const item = Object.values(r.data.journeys)[0]!.mirrorItems.M01!;
    expect(item.state).toBe('awaiting_consent');
    expect(Object.values(item.entries).every((e) => !e.consent)).toBe(true);
  });

  it('refuses to go over 5 journeys', () => {
    const big = sampleSave();
    for (let i = 2; i <= 5; i++) big.journeys[`jr_journey00${i}`] = { ...big.journeys[J]!, id: `jr_journey00${i}`, status: 'archived' };
    expect(mergeSaves(big, sampleSave())).toEqual({ ok: false, error: 'too_many_journeys' });
  });
});
