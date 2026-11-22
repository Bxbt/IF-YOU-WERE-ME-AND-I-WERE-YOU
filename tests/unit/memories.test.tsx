/** M11 Memory Scenes (docs/06 S16). TC-MEM-*. Fictional names only. */
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../../src/routes';
import { useGame } from '../../src/store/game';
import { useSession } from '../../src/store/session';
import { SaveRoot } from '../../src/persistence/schema';
import { memoriesVisibleTo, saveMemory, setMemoryShared, type MemoryInput } from '../../src/store/memories';
import { KEYS } from '../../src/persistence/storage';
import { sampleSave } from '../fixtures/factory';

const A = 'pl_playerA01';
const B = 'pl_imaginedB1';
const input = (title = 'วันที่ฝนตก'): MemoryInput => ({
  category: 'misunderstood',
  title,
  whatHappened: 'เราเถียงกันเรื่องเล็ก ๆ',
  myFeelings: { selected: ['w3e_hurt'] },
  myNeeds: { selected: [] },
  partnerFeelingsGuess: { selected: [], freeText: 'คงเหนื่อย' },
  background: 'bg_apartment_evening',
  shareIntent: false,
});

function base(): SaveRoot {
  const s = sampleSave();
  delete s.players[A]!.pin;
  return s;
}
function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}
beforeEach(() => useSession.getState().lock());

describe('memory store', () => {
  it('TC-MEM-01: saves exactly what was written, schema-valid; only the owner can edit', () => {
    const first = saveMemory(base(), A, input());
    const id = first.id;
    let save = first.save;
    expect(save.memories[id]).toMatchObject({ ownerId: A, title: 'วันที่ฝนตก', whatHappened: 'เราเถียงกันเรื่องเล็ก ๆ' });
    expect(SaveRoot.safeParse(save).success).toBe(true);
    save = saveMemory(save, B, input('แก้โดยคนอื่น'), id).save;
    expect(save.memories[id]!.title).toBe('วันที่ฝนตก');
  });

  it('TC-MEM-02: private by default; the partner sees it only after the owner shares', () => {
    const first = saveMemory(base(), A, input());
    const id = first.id;
    let save = first.save;
    expect(memoriesVisibleTo(save, B, [A])).toEqual([]);
    save = setMemoryShared(save, A, id, true);
    expect(memoriesVisibleTo(save, B, [A]).map((x) => x.id)).toEqual([id]);
    expect(setMemoryShared(save, B, id, false).memories[id]!.shareIntent).toBe(true); // only the owner can unshare
  });
});

describe('memory screens', () => {
  it('TC-MEM-03: create → play the 5-beat scene with the player’s own text and an assumption label', async () => {
    useGame.setState({ ready: true, save: base(), health: 'ok', recovery: null, lastSavedAt: null });
    const user = userEvent.setup();
    const router = renderAt(`/memories/${A}/new`);
    await user.click(screen.getByRole('button', { name: 'บันทึก' }));
    expect(screen.getByText('ตั้งชื่อฉากสั้น ๆ')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^ชื่อฉาก/), 'ตอนรอที่สถานี');
    await user.type(screen.getByRole('textbox', { name: /เกิดอะไรขึ้น/ }), 'รอนานจนหงุดหงิด');
    await user.click(screen.getByRole('button', { name: 'บันทึก' }));
    expect(router.state.location.pathname).toMatch(new RegExp(`^/memories/${A}/mem_`));
    expect(screen.getByText('รอนานจนหงุดหงิด')).toBeInTheDocument();
    expect(screen.getByText(/เรื่องที่ ผู้เล่น A เล่า/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ถัดไป' }));
    await user.click(screen.getByRole('button', { name: 'ถัดไป' }));
    expect(screen.getByRole('note')).toHaveTextContent('ไม่ใช่สิ่งที่ ผู้เล่น B บอก');
  });

  it('TC-MEM-04: delete removes it for real (and the backup)', async () => {
    const { save, id } = saveMemory(base(), A, input());
    localStorage.setItem(KEYS.backup, JSON.stringify(save));
    useGame.setState({ ready: true, save, health: 'ok', recovery: null, lastSavedAt: null });
    const user = userEvent.setup();
    renderAt(`/memories/${A}/${id}`);
    await user.click(screen.getByRole('button', { name: 'ลบความทรงจำนี้' }));
    await user.click(screen.getAllByRole('button', { name: 'ลบความทรงจำนี้' }).at(-1)!);
    expect(useGame.getState().save.memories[id]).toBeUndefined();
    expect(localStorage.getItem(KEYS.backup)).toBeNull();
  });

  it('TC-MEM-05: a partner cannot open a memory that was not shared', () => {
    const { save, id } = saveMemory(base(), A, input());
    useGame.setState({ ready: true, save, health: 'ok', recovery: null, lastSavedAt: null });
    const router = renderAt(`/memories/${B}/${id}`);
    expect(router.state.location.pathname).not.toBe(`/memories/${B}/${id}`);
  });
});
