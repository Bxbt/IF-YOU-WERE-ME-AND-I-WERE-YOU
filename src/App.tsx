import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from './components/toast';
import { useReducedMotion } from './lib/motion';
import { installPersistenceListeners, useGame } from './store/game';
import { router } from './routes';
import { RecoveryScreen } from './screens/RecoveryScreen';
import { StorageBanner } from './components/StorageBanner';

export function App() {
  const ready = useGame((s) => s.ready);
  const recovery = useGame((s) => s.recovery);
  const fontScale = useGame((s) => s.save.settings.fontScale);
  const reduced = useReducedMotion();

  useEffect(() => {
    useGame.getState().init();
    return installPersistenceListeners();
  }, []);

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
    </MotionConfig>
  );
}
