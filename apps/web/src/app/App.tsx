import { ChakraProvider } from '@chakra-ui/react';
import { RouterProvider } from 'react-router';
import { router } from './router';
import { system } from './theme';

export function App() {
  return (
    <ChakraProvider value={system}>
      <RouterProvider router={router} />
    </ChakraProvider>
  );
}
