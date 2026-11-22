/**
 * Hash router (docs/10 §1). Journey-scoped screens live under /j/:journeyId (docs/05 §1, audit CR-2).
 * Only screens that actually work are registered; the rest arrive in later milestones.
 */
import { createHashRouter } from 'react-router-dom';
import { HomeScreen } from './screens/HomeScreen';
import { DataScreen } from './screens/DataScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import { ErrorScreen } from './screens/ErrorScreen';

export const router = createHashRouter([
  { path: '/', element: <HomeScreen />, errorElement: <ErrorScreen /> },
  { path: '/settings', element: <DataScreen />, errorElement: <ErrorScreen /> },
  { path: '*', element: <NotFoundScreen /> },
]);
