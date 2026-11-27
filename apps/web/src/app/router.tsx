import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { useAccount } from '../ui/hooks/use-data';
import { LoginScreen } from '../ui/screens/auth/login-screen';
import { HomeScreen } from '../ui/screens/home-screen';

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

/**
 * Routes en URL : le bouton retour du téléphone fonctionne et une séance survit à un rechargement.
 *
 * L'accueil et la connexion sont dans le premier fichier chargé ; les autres écrans
 * sont chargés à la demande (`lazy`), ce qui allège le démarrage. Hors ligne, ils
 * viennent du cache du service worker, comme le reste de l'app.
 */
export const createRouter = () =>
  createBrowserRouter([
    {
      element: <GuestOnly />,
      children: [
        { path: '/connexion', element: <LoginScreen /> },
        { path: '/invitation/:token', lazy: () => import('../ui/screens/auth/invitation-screen').then((m) => ({ Component: m.InvitationScreen })) },
      ],
    },
    {
      element: <RequireAccount />,
      children: [
        { path: '/', element: <HomeScreen /> },
        { path: '/seance', lazy: () => import('../ui/screens/workout/workout-screen').then((m) => ({ Component: m.WorkoutScreen })) },
        { path: '/seance/recap', lazy: () => import('../ui/screens/workout/recap-screen').then((m) => ({ Component: m.RecapScreen })) },
        { path: '/programmes', lazy: () => import('../ui/screens/programs/programs-screen').then((m) => ({ Component: m.ProgramsScreen })) },
        { path: '/programmes/:programId', lazy: () => import('../ui/screens/programs/program-edit-screen').then((m) => ({ Component: m.ProgramEditScreen })) },
        { path: '/programmes/:programId/seances/:stepId', lazy: () => import('../ui/screens/programs/session-edit-screen').then((m) => ({ Component: m.SessionEditScreen })) },
        { path: '/historique', lazy: () => import('../ui/screens/history-screen').then((m) => ({ Component: m.HistoryScreen })) },
        { path: '/profil', lazy: () => import('../ui/screens/profile-screen').then((m) => ({ Component: m.ProfileScreen })) },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ]);
