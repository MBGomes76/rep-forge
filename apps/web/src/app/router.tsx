import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { useAccount } from '../ui/hooks/use-data';
import { InvitationScreen } from '../ui/screens/auth/invitation-screen';
import { LoginScreen } from '../ui/screens/auth/login-screen';
import { HistoryScreen } from '../ui/screens/history-screen';
import { HomeScreen } from '../ui/screens/home-screen';
import { ProfileScreen } from '../ui/screens/profile-screen';
import { ProgramEditScreen } from '../ui/screens/programs/program-edit-screen';
import { ProgramsScreen } from '../ui/screens/programs/programs-screen';
import { SessionEditScreen } from '../ui/screens/programs/session-edit-screen';
import { RecapScreen } from '../ui/screens/workout/recap-screen';
import { WorkoutScreen } from '../ui/screens/workout/workout-screen';

/** Les écrans de l'app demandent un compte sur l'appareil ; sinon, direction la connexion. */
function RequireAccount() {
  const account = useAccount();
  if (account === undefined) return null;
  return account ? <Outlet /> : <Navigate to="/connexion" replace />;
}

/** Déjà connecté : la page de connexion n'a plus de sens. */
function GuestOnly() {
  const account = useAccount();
  if (account === undefined) return null;
  return account ? <Navigate to="/" replace /> : <Outlet />;
}

/** Routes en URL : le bouton retour du téléphone fonctionne et une séance survit à un rechargement. */
export const createRouter = () =>
  createBrowserRouter([
    {
      element: <GuestOnly />,
      children: [
        { path: '/connexion', element: <LoginScreen /> },
        { path: '/invitation/:token', element: <InvitationScreen /> },
      ],
    },
    {
      element: <RequireAccount />,
      children: [
        { path: '/', element: <HomeScreen /> },
        { path: '/seance', element: <WorkoutScreen /> },
        { path: '/seance/recap', element: <RecapScreen /> },
        { path: '/programmes', element: <ProgramsScreen /> },
        { path: '/programmes/:programId', element: <ProgramEditScreen /> },
        { path: '/programmes/:programId/seances/:stepId', element: <SessionEditScreen /> },
        { path: '/historique', element: <HistoryScreen /> },
        { path: '/profil', element: <ProfileScreen /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ]);
