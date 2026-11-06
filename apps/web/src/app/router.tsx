import { createBrowserRouter, Navigate } from 'react-router';
import { HistoryScreen } from '../ui/screens/history-screen';
import { HomeScreen } from '../ui/screens/home-screen';
import { ProfileScreen } from '../ui/screens/profile-screen';
import { ProgramEditScreen } from '../ui/screens/programs/program-edit-screen';
import { ProgramsScreen } from '../ui/screens/programs/programs-screen';
import { SessionEditScreen } from '../ui/screens/programs/session-edit-screen';
import { RecapScreen } from '../ui/screens/workout/recap-screen';
import { WorkoutScreen } from '../ui/screens/workout/workout-screen';

/** Routes en URL : le bouton retour du téléphone fonctionne et une séance survit à un rechargement. */
export const createRouter = () =>
  createBrowserRouter([
    { path: '/', element: <HomeScreen /> },
    { path: '/seance', element: <WorkoutScreen /> },
    { path: '/seance/recap', element: <RecapScreen /> },
    { path: '/programmes', element: <ProgramsScreen /> },
    { path: '/programmes/:programId', element: <ProgramEditScreen /> },
    { path: '/programmes/:programId/seances/:stepId', element: <SessionEditScreen /> },
    { path: '/historique', element: <HistoryScreen /> },
    { path: '/profil', element: <ProfileScreen /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ]);
