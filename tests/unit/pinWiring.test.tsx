/**
 * M9 wiring: PIN gates on private routes and on full export (docs/05 §4.2, docs/08 §4, TC-PRIV-04/10).
 * Gate component behaviour itself is covered in pinGate.test.tsx.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../../src/routes';
import { useGame } from '../../src/store/game';
import { useSession } from '../../src/store/session';
import { createPinRecord, type PinRecord } from '../../src/lib/pin';
import { sampleSave } from '../fixtures/factory';
import * as download from '../../src/lib/download';

let pin: PinRecord;
beforeAll(async () => {
  pin = await createPinRecord('2580', 1000);
});

const A = 'pl_playerA01';

function seedWithPin(withPin: boolean) {
  const save = sampleSave();
  const a = save.players[A]!;
  if (withPin) a.pin = pin;
  else delete a.pin;
  useGame.setState({ ready: true, save, health: 'ok', recovery: null, lastSavedAt: null });
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

async function enterPin(user: ReturnType<typeof userEvent.setup>, digits: string) {
  for (const d of digits) await user.click(screen.getByRole('button', { name: `เลข ${d}` }));
  await user.click(screen.getByRole('button', { name: 'ยืนยัน PIN' }));
}

beforeEach(() => useSession.getState().lock());

describe('RouteGate on private profile pages (TC-PRIV-04)', () => {
  it('no PIN → page opens directly', async () => {
    seedWithPin(false);
    renderAt(`/profile/${A}/self/answers`);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('คำตอบ');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('with PIN → gate first; answers stay hidden until the right PIN', async () => {
    seedWithPin(true);
    const user = userEvent.setup();
    renderAt(`/profile/${A}/self/answers`);
    expect(screen.getByRole('dialog', { name: /ใส่ PIN ของ/ })).toBeInTheDocument();
    expect(screen.queryByText('ฟังเงียบ ๆ ไม่ต้องแนะนำ')).not.toBeInTheDocument();
    await enterPin(user, '2580');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(/ฟังเงียบ ๆ ไม่ต้องแนะนำ/)).toBeInTheDocument();
    expect(useSession.getState().unlocked).toBe(A);
  });

  it('the unlock is not persisted: a fresh session asks again', async () => {
    seedWithPin(true);
    useSession.getState().unlock(A);
    useSession.getState().lock();
    renderAt(`/profile/${A}/self`);
    expect(screen.getByRole('dialog', { name: /ใส่ PIN ของ/ })).toBeInTheDocument();
  });

  it('cancel leaves the page without showing it', async () => {
    seedWithPin(true);
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, { initialEntries: ['/profile', `/profile/${A}/self/answers`], initialIndex: 1 });
    render(<RouterProvider router={router} />);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/profile'));
  });
});

describe('full export with PINs (TC-PRIV-10)', () => {
  it('asks for each PIN before the file is created', async () => {
    seedWithPin(true);
    const spy = vi.spyOn(download, 'downloadText').mockReturnValue(true);
    const user = userEvent.setup();
    renderAt('/settings');
    expect(screen.getByText(/คนที่ตั้ง PIN ไว้ต้องใส่ PIN ก่อน/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ส่งออกข้อมูลทั้งหมด/ }));
    expect(screen.getByRole('dialog', { name: /ใส่ PIN ของ/ })).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    await enterPin(user, '2580');
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    spy.mockRestore();
  });

  it('wrong PIN does not export', async () => {
    seedWithPin(true);
    const spy = vi.spyOn(download, 'downloadText').mockReturnValue(true);
    const user = userEvent.setup();
    renderAt('/settings');
    await user.click(screen.getByRole('button', { name: /ส่งออกข้อมูลทั้งหมด/ }));
    await enterPin(user, '1111');
    await screen.findByText(/ไม่ถูกต้อง/);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('without PINs exports straight away', async () => {
    seedWithPin(false);
    const spy = vi.spyOn(download, 'downloadText').mockReturnValue(true);
    const user = userEvent.setup();
    renderAt('/settings');
    await user.click(screen.getByRole('button', { name: /ส่งออกข้อมูลทั้งหมด/ }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    spy.mockRestore();
  });
});
