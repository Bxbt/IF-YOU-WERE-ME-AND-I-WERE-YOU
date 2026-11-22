import { useEffect } from 'react';
import { useGame } from '../store/game';
import { FEATURES } from '../lib/features';
import { sound, SILENT, type AmbientTarget } from './engine';

/** App-level: keeps the engine in sync with Settings, page visibility and the first gesture. */
export function useSoundSettings() {
  const enabled = useGame((s) => s.save.settings.sound.enabled);
  const volume = useGame((s) => s.save.settings.sound.volume);

  useEffect(() => {
    sound.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    sound.setEnabled(FEATURES.sound && enabled);
  }, [enabled]);

  useEffect(() => {
    // A saved "on" cannot start audio before the player interacts with the page (autoplay rules).
    const unlock = () => sound.unlock();
    const onVis = () => sound.setPaused(document.visibilityState === 'hidden');
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}

/** Screen-level: what should be playing while this screen is shown. Silent again on leave. */
export function useAmbient(target: AmbientTarget) {
  const { music, rain, hum } = target;
  useEffect(() => {
    sound.setAmbient({ music, rain, hum });
  }, [music, rain, hum]);
  useEffect(() => () => sound.setAmbient(SILENT), []);
}

/** Turns sound on/off from a click — the click itself unlocks audio in the browser. */
export function toggleSound(on: boolean) {
  sound.setEnabled(FEATURES.sound && on);
  useGame.getState().update((s) => ({
    ...s,
    settings: { ...s.settings, sound: { ...s.settings.sound, enabled: on } },
  }));
}
