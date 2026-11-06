import { createContext, useContext, type ReactNode } from 'react';
import type { AppContainer } from '../app/composition';

const AppContext = createContext<AppContainer | null>(null);

export function AppProvider({ app, children }: { app: AppContainer; children: ReactNode }) {
  return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
}

/** Accès aux cas d'utilisation et aux dépendances depuis un composant. */
export function useApp(): AppContainer {
  const app = useContext(AppContext);
  if (!app) throw new Error('useApp doit être utilisé dans <AppProvider>.');
  return app;
}
