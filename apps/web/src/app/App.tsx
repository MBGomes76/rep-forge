import { ChakraProvider } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { AppProvider } from '../ui/app-context';
import { Toaster } from '../ui/components/toaster';
import { createApp, type AppContainer } from './composition';
import { router } from './router';
import { system } from './theme';

const defaultApp = createApp();

export function App({ app = defaultApp }: { app?: AppContainer }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void app.useCases.ensureInitialData().then(() => setReady(true));
  }, [app]);

  return (
    <ChakraProvider value={system}>
      <AppProvider app={app}>
        {ready && <RouterProvider router={router} />}
        <Toaster />
      </AppProvider>
    </ChakraProvider>
  );
}
