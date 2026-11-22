/**
 * Hash router (docs/10 §1). Journey-scoped screens will live under /j/:journeyId (docs/05 §1).
 * Only screens that exist are registered.
 */
import { createHashRouter } from 'react-router-dom';
import { TitleScreen } from './screens/TitleScreen';
import { IntroScreen } from './screens/IntroScreen';
import { ModeSelectScreen } from './screens/ModeSelectScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AboutScreen } from './screens/AboutScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import { ErrorScreen } from './screens/ErrorScreen';

const errorElement = <ErrorScreen />;

export const routes = [
  { path: '/', element: <TitleScreen />, errorElement },
  { path: '/intro', element: <IntroScreen />, errorElement },
  { path: '/mode', element: <ModeSelectScreen />, errorElement },
  { path: '/settings', element: <SettingsScreen />, errorElement },
  { path: '/about', element: <AboutScreen />, errorElement },
  { path: '*', element: <NotFoundScreen /> },
];

export const router = createHashRouter(routes);
