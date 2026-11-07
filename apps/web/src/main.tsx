// Alphabet latin seulement (accents, œ, guillemets français compris) : moins de fichiers à mettre en cache.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { pwa } from './infrastructure/pwa';

// Service worker : l'app s'installe et s'ouvre sans réseau (voir vite.config.ts).
pwa.start();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
