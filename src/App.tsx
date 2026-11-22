import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { installPersistenceListeners, useGame } from './store/game';
import { router } from './routes';
import { RecoveryScreen } from './screens/RecoveryScreen';
import { StorageBanner } from './components/StorageBanner';

export function App() {
  const ready = useGame((s) => s.ready);
  const recovery = useGame((s) => s.recovery);
  const fontScale = useGame((s) => s.save.settings.fontScale);

  useEffect(() => {
    useGame.getState().init();
    return installPersistenceListeners();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(fontScale));
  }, [fontScale]);

  if (!ready) return null;
  // Corrupt or newer-version data: block the app until the player decides (docs/05 G10).
  if (recovery) return <RecoveryScreen />;

  return (
    <>
      <StorageBanner />
      <RouterProvider router={router} />
    </>
  );
}
