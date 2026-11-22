import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../../src/routes';
import { useGame } from '../../src/store/game';
import { createEmptySave } from '../../src/persistence/schema';
import { sampleSave } from '../fixtures/factory';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  useGame.setState({ ready: true, save: createEmptySave(), health: 'ok', recovery: null, lastSavedAt: null });
});

describe('S1 Title', () => {
  it('start goes to the safety intro, then mode selection', async () => {
    const router = renderAt('/');
    await userEvent.click(screen.getByRole('button', { name: /เริ่มการเดินทางใหม่/ }));
    expect(router.state.location.pathname).toBe('/intro');
    await userEvent.click(screen.getByRole('button', { name: 'เข้าใจแล้ว เริ่มเลย' }));
    expect(router.state.location.pathname).toBe('/mode');
  });

  it('TC-RES-04: continue is disabled with a visible reason when nothing is saved', () => {
    renderAt('/');
    const btn = screen.getByRole('button', { name: /เล่นต่อ/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAccessibleDescription('ยังไม่มีการเดินทางที่บันทึกไว้');
  });

  it('continue explains it is not ready yet when a journey exists but chapters are not built', () => {
    useGame.setState({ save: sampleSave() });
    renderAt('/');
    expect(screen.getByRole('button', { name: /เล่นต่อ/ })).toHaveAccessibleDescription('เล่นต่อได้เมื่อระบบเนื้อเรื่องพร้อม');
  });

  it('about and settings are reachable', async () => {
    const router = renderAt('/');
    await userEvent.click(screen.getByRole('button', { name: /เกี่ยวกับเกมนี้/ }));
    expect(router.state.location.pathname).toBe('/about');
  });
});

describe('S2 Mode Selection', () => {
  it('together and remote stay disabled with a reason; solo opens character creation', async () => {
    const router = renderAt('/mode');
    for (const name of [/เล่นด้วยกัน/, /เล่นระยะไกล/]) {
      const card = screen.getByRole('button', { name });
      expect(card).toBeDisabled();
      expect(card).toHaveAccessibleDescription();
    }
    await userEvent.click(screen.getByRole('button', { name: /เล่นคนเดียว/ }));
    expect(router.state.location.pathname).toBe('/players/new');
    expect(router.state.location.search).toBe('?mode=solo');
  });

  it('TC-RES-09: an active journey is only archived after confirmation', async () => {
    useGame.setState({ save: sampleSave() });
    const router = renderAt('/mode');
    await userEvent.click(screen.getByRole('button', { name: /เล่นคนเดียว/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    expect(router.state.location.pathname).toBe('/mode');
    expect(useGame.getState().save.journeys.jr_journey001!.status).toBe('active');
  });
});

describe('S10 Settings', () => {
  it('changes font scale and text speed and persists them in the save', async () => {
    renderAt('/settings');
    await userEvent.click(screen.getByRole('button', { name: 'ใหญ่มาก' }));
    await userEvent.click(screen.getByRole('button', { name: 'ทันที' }));
    await userEvent.click(screen.getByRole('button', { name: 'เปิด' }));
    const s = useGame.getState().save.settings;
    expect(s).toMatchObject({ fontScale: 1.3, textSpeed: 'instant', reducedMotion: 'on' });
    expect(screen.getByRole('button', { name: 'ใหญ่มาก' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('S11 About', () => {
  it('lists support resources as tel: links (TC-SAFE-05)', () => {
    renderAt('/about');
    const link = screen.getByRole('link', { name: /1323/ });
    expect(link).toHaveAttribute('href', 'tel:1323');
    expect(screen.getAllByRole('link', { name: /^\d{3,4} ·/ })).toHaveLength(4);
  });
});
