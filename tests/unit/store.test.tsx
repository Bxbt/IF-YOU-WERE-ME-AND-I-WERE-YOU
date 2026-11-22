import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGame } from '../../src/store/game';
import { KEYS } from '../../src/persistence/storage';
import { createEmptySave } from '../../src/persistence/schema';
import { writeSave } from '../../src/persistence/persist';
import { App } from '../../src/App';
import { sampleSave } from '../fixtures/factory';

function resetStore() {
  useGame.setState({ ready: false, save: createEmptySave(), health: 'ok', recovery: null, lastSavedAt: null });
}

describe('game store', () => {
  beforeEach(resetStore);

  it('flush writes the current save', () => {
    useGame.getState().init();
    useGame.getState().update(() => sampleSave());
    useGame.getState().flush();
    expect(JSON.parse(localStorage.getItem(KEYS.save)!)).toEqual(sampleSave());
  });

  it('does not write while recovery is pending (docs/05 G10)', () => {
    localStorage.setItem(KEYS.save, '{broken');
    useGame.getState().init();
    useGame.getState().update(() => sampleSave());
    useGame.getState().flush();
    expect(localStorage.getItem(KEYS.save)).toBe('{broken');
  });

  it('TC-DEL-04: deleteAll removes every iywm:* key', () => {
    writeSave(sampleSave());
    localStorage.setItem(KEYS.backup, 'old');
    localStorage.setItem('other-app', 'keep');
    useGame.getState().init();
    useGame.getState().deleteAll();
    expect(Object.keys(localStorage).filter((k) => k.startsWith('iywm:'))).toEqual([]);
    expect(localStorage.getItem('other-app')).toBe('keep');
    expect(useGame.getState().save).toEqual(createEmptySave());
  });

  it('TC-DEL-07 / TC-EXP-10: replaceAll leaves no backup behind after success', () => {
    writeSave(sampleSave());
    useGame.getState().init();
    const res = useGame.getState().replaceAll(createEmptySave());
    expect(res.ok).toBe(true);
    expect(localStorage.getItem(KEYS.backup)).toBeNull();
    expect(JSON.parse(localStorage.getItem(KEYS.save)!)).toEqual(createEmptySave());
  });

  it('marks the store stale when another tab changes the save', () => {
    useGame.getState().markStaleTab();
    useGame.getState().update(() => sampleSave());
    useGame.getState().flush();
    expect(localStorage.getItem(KEYS.save)).toBeNull();
  });
});

describe('App screens', () => {
  beforeEach(() => {
    resetStore();
    window.location.hash = '#/';
  });

  it('TC-ERR-03: corrupt save shows Recovery and keeps the data until the player chooses', async () => {
    localStorage.setItem(KEYS.save, '{broken');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'พบปัญหาในการอ่านข้อมูลที่บันทึกไว้' })).toBeInTheDocument();
    expect(localStorage.getItem(KEYS.save)).toBe('{broken');

    await userEvent.click(screen.getByRole('button', { name: /เริ่มใหม่/ }));
    expect(localStorage.getItem(KEYS.save)).toBe('{broken');
    await userEvent.click(screen.getByRole('button', { name: /ยืนยัน/ }));
    expect(JSON.parse(localStorage.getItem(KEYS.save)!)).toEqual(createEmptySave());
  });

  it('TC-ERR-01: unavailable storage shows the banner and the app still renders', async () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    render(<App />);
    expect(await screen.findByText(/ความคืบหน้าจะไม่ถูกบันทึก/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    Storage.prototype.setItem = orig;
  });

  it('TC-DEL-03: delete-all button stays disabled until the exact word is typed', async () => {
    window.location.hash = '#/settings';
    render(<App />);
    const button = await screen.findByRole('button', { name: /ลบข้อมูลทั้งหมด/ });
    expect(button).toBeDisabled();
    const input = screen.getByLabelText(/พิมพ์คำว่า/);
    await userEvent.type(input, 'ลบทั้ง');
    expect(button).toBeDisabled();
    await userEvent.type(input, 'หมด');
    expect(button).toBeEnabled();
  });

  it('TC-ERR-07: unknown route shows not-found with a way home', async () => {
    window.location.hash = '#/xyz';
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'ไม่พบหน้านี้' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'กลับหน้าแรก' })).toBeInTheDocument();
  });
});
