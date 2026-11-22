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
import { CreatePlayersScreen } from './screens/CreatePlayersScreen';
import { EditPlayerScreen } from './screens/EditPlayerScreen';
import { ProfileHubScreen } from './screens/ProfileHubScreen';
import { QuestionnaireScreen } from './screens/QuestionnaireScreen';
import { AnswersScreen } from './screens/AnswersScreen';
import { ArtPreviewScreen } from './screens/ArtPreviewScreen';
import { ChaptersScreen } from './screens/ChaptersScreen';
import { ScenarioScreen } from './screens/ScenarioScreen';
import { PlayScreen } from './screens/PlayScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import { ErrorScreen } from './screens/ErrorScreen';

const errorElement = <ErrorScreen />;

export const routes = [
  { path: '/', element: <TitleScreen />, errorElement },
  { path: '/intro', element: <IntroScreen />, errorElement },
  { path: '/mode', element: <ModeSelectScreen />, errorElement },
  { path: '/settings', element: <SettingsScreen />, errorElement },
  { path: '/about', element: <AboutScreen />, errorElement },
  { path: '/players/new', element: <CreatePlayersScreen />, errorElement },
  { path: '/players/:playerId/edit', element: <EditPlayerScreen />, errorElement },
  { path: '/profile', element: <ProfileHubScreen />, errorElement },
  { path: '/profile/:playerId/self', element: <QuestionnaireScreen layer="self" />, errorElement },
  { path: '/profile/:playerId/self/answers', element: <AnswersScreen layer="self" />, errorElement },
  { path: '/profile/:playerId/perceived/:aboutId', element: <QuestionnaireScreen layer="perceived" />, errorElement },
  { path: '/profile/:playerId/perceived/:aboutId/answers', element: <AnswersScreen layer="perceived" />, errorElement },
  { path: '/j/:journeyId/chapters', element: <ChaptersScreen />, errorElement },
  { path: '/j/:journeyId/scenario', element: <ScenarioScreen />, errorElement },
  { path: '/j/:journeyId/play/:chapterId', element: <PlayScreen />, errorElement },
  { path: '/art-preview', element: <ArtPreviewScreen />, errorElement },
  { path: '*', element: <NotFoundScreen /> },
];

export const router = createHashRouter(routes);
