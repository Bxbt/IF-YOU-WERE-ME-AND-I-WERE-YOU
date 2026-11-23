import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from './components/toast';
import { useReducedMotion } from './lib/motion';
import { useSoundSettings } from './audio/useSound';
import { installPersistenceListeners, useGame } from './store/game';
import { router } from './routes';
import { RecoveryScreen } from './screens/RecoveryScreen';
import { StorageBanner } from './components/StorageBanner';
import { SupportCard } from './components/SupportCard';
import { followSave } from './live/sync';
import { LiveInvite } from './components/LiveInvite';

export function App() {
  const ready = useGame((s) => s.ready);
  const recovery = useGame((s) => s.recovery);
  const fontScale = useGame((s) => s.save.settings.fontScale);
  const reduced = useReducedMotion();
  useSoundSettings();

  useEffect(() => {
    useGame.getState().init();
    return installPersistenceListeners();
  }, []);

  // Phase 3C Live: keep the sync engine on the active live journey (docs/10 §10.3).
  const save = useGame((s) => s.save);
  useEffect(() => {
    if (ready && !recovery) followSave(save);
  }, [ready, recovery, save]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reduced ? 'true' : 'false';
  }, [reduced]);

  if (!ready) return null;
  // Corrupt or newer-version data: block the app until the player decides (docs/05 G10).
  if (recovery) return <RecoveryScreen />;

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <StorageBanner />
      <RouterProvider router={router} />
      <Toaster />
      <LiveInvite />
      <SupportCard />
    </MotionConfig>
  );
}
