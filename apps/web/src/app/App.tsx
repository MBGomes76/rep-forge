import { ChakraProvider } from '@chakra-ui/react';
import { fromDate } from '@repforge/domain';
import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { AppProvider, useApp } from '../ui/app-context';
import { useAccount } from '../ui/hooks/use-data';
import { useNow } from '../ui/hooks/use-now';
import { Toaster } from '../ui/components/toaster';
import { createApp, type AppContainer } from './composition';
import { createRouter } from './router';
import { SyncAgent } from './sync-agent';
import { system } from './theme';

const defaultApp = createApp();

export function App({ app = defaultApp }: { app?: AppContainer }) {
  const [ready, setReady] = useState(false);
  const [router] = useState(createRouter);

  useEffect(() => {
    // Sans compte, rien à préparer : l'écran de connexion s'en charge après la connexion.
    void (async () => {
      if (await app.account.getAccount()) await app.useCases.ensureInitialData();
      setReady(true);
    })();
  }, [app]);

  return (
    <ChakraProvider value={system}>
      <AppProvider app={app}>
        {ready && <RouterProvider router={router} />}
        {ready && <SignedInServices />}
        <Toaster />
      </AppProvider>
    </ChakraProvider>
  );
}

/** Tâches de fond, seulement quand un compte est connecté sur l'appareil. */
function SignedInServices() {
  const account = useAccount();
  if (!account) return null;
  return (
    <>
      <RestSettler />
      <SyncAgent />
    </>
  );
}

/**
 * Les repos passés comptent comme faits : on les règle au démarrage, puis à
 * chaque changement de date (l'application peut rester ouverte après minuit).
 */
function RestSettler() {
  const { useCases } = useApp();
  const today = fromDate(useNow(60_000));
  useEffect(() => {
    void useCases.settleRests();
  }, [useCases, today]);
  return null;
}
