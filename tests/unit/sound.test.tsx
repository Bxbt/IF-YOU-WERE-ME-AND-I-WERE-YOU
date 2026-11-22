/** Synthesised sound (Q-08 option 1, docs/09 §5). Fictional names only. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../../src/routes';
import { useGame } from '../../src/store/game';
import { createEmptySave } from '../../src/persistence/schema';
import { ambientFor, isSoundSupported, sound } from '../../src/audio/engine';
import { musicAt, sfxBetween, type Step } from '../../src/engine/dialogue';
import { SoundToggle } from '../../src/components/Misc';

beforeEach(() => {
  useGame.setState({ ready: true, save: createEmptySave(), health: 'ok', recovery: null, lastSavedAt: null });
  sound.setEnabled(false);
});
afterEach(() => vi.restoreAllMocks());

describe('ambient mapping', () => {
  it('explicit music wins; otherwise inferred from the background', () => {
    expect(ambientFor('bg_apartment_evening', 'light', 'normal')).toEqual({ music: 'home', rain: 'light', hum: false });
    expect(ambientFor('bg_rooftop_night', 'none', 'normal')).toMatchObject({ music: 'night' });
    expect(ambientFor('bg_elevator_emergency', 'none', 'emergency')).toEqual({ music: 'none', rain: 'none', hum: true });
    expect(ambientFor('bg_elevator_interior', 'none', 'normal').hum).toBe(false);
    expect(ambientFor('bg_rooftop_night', 'none', 'normal', 'ending_theme').music).toBe('ending');
    expect(ambientFor('bg_lobby_floor6', 'none', 'normal', 'none').music).toBe('none');
  });

  it('sfxBetween / musicAt read ENV steps', () => {
    const steps = [
      { kind: 'env', set: { music: 'ambient_home' } },
      { kind: 'env', set: { sfx: 'door_close' } },
      { kind: 'env', set: { sfx: 'elevator_jolt', shake: 'small' } },
    ] as unknown as Step[];
    expect(sfxBetween(steps, 0, 3)).toEqual(['door_close', 'elevator_jolt']);
    expect(sfxBetween(steps, 2, 3)).toEqual(['elevator_jolt']);
    expect(musicAt(steps, 3)).toBe('ambient_home');
    expect(musicAt(steps, 0)).toBeUndefined();
  });
});

describe('engine without WebAudio (jsdom)', () => {
  it('every call is a safe no-op', () => {
    expect(isSoundSupported()).toBe(false);
    expect(() => {
      sound.setEnabled(true);
      sound.setAmbient({ music: 'home', rain: 'heavy', hum: true });
      sound.playSfx('elevator_jolt');
      sound.setVolume(2);
      sound.setPaused(true);
      sound.unlock();
      sound.setEnabled(false);
    }).not.toThrow();
  });
});

describe('controls', () => {
  it('sound is off by default; the toggle turns it on and saves it', async () => {
    const spy = vi.spyOn(sound, 'setEnabled');
    render(<SoundToggle />);
    const btn = screen.getByRole('button', { name: 'เปิดเสียง' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(btn);
    expect(spy).toHaveBeenCalledWith(true);
    expect(useGame.getState().save.settings.sound.enabled).toBe(true);
    expect(screen.getByRole('button', { name: 'ปิดเสียง' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('settings explain when the browser cannot play sound', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/settings'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('heading', { name: 'เสียง' })).toBeInTheDocument();
    expect(screen.getByText(/เบราว์เซอร์นี้เล่นเสียงของเกมไม่ได้/)).toBeInTheDocument();
  });

  it('settings show on/off and a volume slider when WebAudio exists', async () => {
    class FakeCtx {}
    vi.stubGlobal('AudioContext', FakeCtx);
    const router = createMemoryRouter(routes, { initialEntries: ['/settings'] });
    render(<RouterProvider router={router} />);
    const slider = screen.getByRole('slider', { name: 'ความดัง' });
    expect(slider).toBeDisabled();
    await userEvent.click(screen.getByRole('group', { name: 'เสียงในเกม' }).querySelector('button:last-child')!);
    expect(useGame.getState().save.settings.sound.enabled).toBe(true);
    expect(slider).toBeEnabled();
    vi.unstubAllGlobals();
  });
});
