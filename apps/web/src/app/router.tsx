import { createBrowserRouter, Navigate } from 'react-router';
import { Screen } from '../ui/components/screen';
import { HomeScreen } from '../ui/screens/home-screen';
import { RecapScreen } from '../ui/screens/workout/recap-screen';
import { WorkoutScreen } from '../ui/screens/workout/workout-screen';

// Écrans provisoires, remplacés au fil des sous-étapes.
const placeholder = (title: string, backTo?: string) => (
  <Screen title={title} {...(backTo ? { backTo } : {})}>
    À venir
  </Screen>
);

export const createRouter = () =>
  createBrowserRouter([
  { path: '/', element: <HomeScreen /> },
  { path: '/seance', element: <WorkoutScreen /> },
  { path: '/seance/recap', element: <RecapScreen /> },
  { path: '/programmes', element: placeholder('Programmes') },
  { path: '/historique', element: placeholder('Historique') },
  { path: '/profil', element: placeholder('Profil') },
  { path: '*', element: <Navigate to="/" replace /> },
  ]);
