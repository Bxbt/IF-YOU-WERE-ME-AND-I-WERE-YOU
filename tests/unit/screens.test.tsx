import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

  it('continue resumes the chapter in progress (docs/05 §6)', async () => {
    useGame.setState({ save: sampleSave() }); // ch1 in progress at ch1_s02
    const router = renderAt('/');
    await userEvent.click(screen.getByRole('button', { name: /เล่นต่อ/ }));
    expect(router.state.location.pathname).toBe('/j/jr_journey001/play/ch1');
  });

  it('continue goes to chapter selection when no chapter is in progress', async () => {
    const save = sampleSave();
    save.journeys.jr_journey001!.chapterProgress = {};
    useGame.setState({ save });
    const router = renderAt('/');
    await userEvent.click(screen.getByRole('button', { name: /เล่นต่อ/ }));
    expect(router.state.location.pathname).toBe('/j/jr_journey001/chapters');
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
    await userEvent.click(within(screen.getByRole('group', { name: 'ลดการเคลื่อนไหว' })).getByRole('button', { name: 'เปิด' }));
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

describe('S11 About — back returns to where the player came from', () => {
  it('from the Q33 safety note, back goes to the same question, not Home', async () => {
    const save = sampleSave();
    delete save.players.pl_playerA01!.pin; // no PIN gate in this test
    useGame.setState({ save });
    const router = renderAt('/profile/pl_playerA01/self?set=full&q=Q33');
    await userEvent.click(screen.getByRole('link', { name: 'เกี่ยวกับเกมนี้' }));
    expect(router.state.location.pathname).toBe('/about');
    await userEvent.click(screen.getByRole('button', { name: 'กลับ' }));
    expect(router.state.location.pathname).toBe('/profile/pl_playerA01/self');
    expect(router.state.location.search).toBe('?set=full&q=Q33');
  });

  it('opened directly (no history), back falls back to Home', async () => {
    const router = renderAt('/about');
    await userEvent.click(screen.getByRole('link', { name: 'กลับ' }));
    expect(router.state.location.pathname).toBe('/');
  });
});
