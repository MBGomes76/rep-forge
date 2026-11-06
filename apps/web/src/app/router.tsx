import { createBrowserRouter, Navigate } from 'react-router';
import { Screen } from '../ui/components/screen';

// Écrans provisoires, remplacés au fil des sous-étapes.
const placeholder = (title: string, backTo?: string) => (
  <Screen title={title} {...(backTo ? { backTo } : {})}>
    À venir
  </Screen>
);

export const router = createBrowserRouter([
  { path: '/', element: placeholder('RepForge') },
  { path: '/programmes', element: placeholder('Programmes') },
  { path: '/historique', element: placeholder('Historique') },
  { path: '/profil', element: placeholder('Profil') },
  { path: '*', element: <Navigate to="/" replace /> },
]);
