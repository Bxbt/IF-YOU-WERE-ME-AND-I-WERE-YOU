/** docs/06 S3: reuse an existing self; Profile Hub shows the active journey's players only. */
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../../src/routes';
import { useGame } from '../../src/store/game';
import { createEmptySave } from '../../src/persistence/schema';
import { activeJourney } from '../../src/store/actions';
import { sampleSave } from '../fixtures/factory';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

/** sampleSave + an extra real player and imagined partner from an archived journey. */
function crowdedSave() {
  const s = sampleSave();
  const base = s.players.pl_playerA01!;
  s.players.pl_oldSelf01 = { ...base, id: 'pl_oldSelf01', nickname: 'ตัวเก่า' };
  delete s.players.pl_oldSelf01.pin;
  s.players.pl_oldImag01 = {
    ...s.players.pl_imaginedB1!,
    id: 'pl_oldImag01',
    nickname: 'คู่เก่า',
    createdBy: 'pl_oldSelf01',
  };
  return s;
}

beforeEach(() => {
  useGame.setState({ ready: true, save: createEmptySave(), health: 'ok', recovery: null, lastSavedAt: null });
});

describe('Profile Hub', () => {
  it('shows only the active journey players; others are folded away but kept', () => {
    useGame.setState({ save: crowdedSave() });
    renderAt('/profile');
    const cards = screen.getAllByRole('article');
    const visible = cards.filter((c) => !c.closest('details'));
    expect(visible.map((c) => within(c).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'ผู้เล่น A',
      'ผู้เล่น B',
    ]);
    expect(screen.getByText('ตัวละครอื่นที่บันทึกไว้ (2)')).toBeInTheDocument();
  });
});

describe('S3 solo creation with an existing self', () => {
  it('offers the existing self first and reuses it (no duplicate player)', async () => {
    useGame.setState({ save: sampleSave() });
    renderAt('/players/new?mode=solo');
    expect(screen.getByRole('heading', { name: 'คุณคือใครในการเดินทางนี้' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ผู้เล่น A/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'ใช้ตัวตนนี้' }));
    await userEvent.type(screen.getByLabelText(/ชื่อเล่น/), 'ฟ้า');
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));
    const save = useGame.getState().save;
    expect(Object.values(save.players).filter((p) => p.kind === 'real')).toHaveLength(1);
    expect(activeJourney(save)?.playerIds[0]).toBe('pl_playerA01');
  });

  it('"สร้างตัวตนใหม่" still allows a new self', async () => {
    useGame.setState({ save: sampleSave() });
    renderAt('/players/new?mode=solo');
    await userEvent.click(screen.getByRole('button', { name: 'สร้างตัวตนใหม่' }));
    expect(screen.getByRole('heading', { name: 'สร้างตัวตนของคุณ' })).toBeInTheDocument();
  });

  it('without any player the form starts directly', () => {
    renderAt('/players/new?mode=solo');
    expect(screen.getByRole('heading', { name: 'สร้างตัวตนของคุณ' })).toBeInTheDocument();
  });
});
