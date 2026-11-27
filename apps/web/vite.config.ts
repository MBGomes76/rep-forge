/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const NIGHT_BLUE = '#0B1426';

export default defineConfig({
  // Date du build, affichée dans le Profil : on sait quelle version tourne sur un téléphone.
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  plugins: [
    react(),
    /**
     * Application installable et utilisable hors ligne (voir docs/decisions/0012).
     * - Le manifeste dit au téléphone comment installer l'app (nom, icônes, couleurs).
     * - Le service worker garde une copie de l'application (HTML, JS, CSS, polices,
     *   icônes) : elle s'ouvre même sans réseau. Les données, elles, sont dans
     *   IndexedDB et se synchronisent à part : l'API n'est jamais mise en cache.
     */
    VitePWA({
      // Une nouvelle version attend l'accord de l'utilisateur : jamais de rechargement en pleine séance.
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'RepForge',
        short_name: 'RepForge',
        description: 'Carnet d’entraînement de musculation, utilisable hors ligne.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: NIGHT_BLUE,
        theme_color: NIGHT_BLUE,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout ce que le build produit (dont les polices Inter et Space Grotesk) est gardé en cache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Hors ligne, toute adresse de l'app (/seance, /programmes/…) s'ouvre sur l'application…
        navigateFallback: '/index.html',
        // … sauf l'API : ses réponses ne sont jamais mises en cache (données privées et vivantes).
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
      // Pas de service worker en développement : il cacherait les modifications du code.
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        /**
         * Les bibliothèques dans leurs propres fichiers : elles changent rarement, le
         * téléphone les garde en cache d'une version à l'autre et ne retélécharge
         * que le code de l'app. Les écrans, eux, sont découpés par le routeur.
         */
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/, priority: 3 },
            { name: 'chakra', test: /node_modules[\\/](@chakra-ui|@ark-ui|@zag-js|@emotion|@pandacss|@floating-ui)[\\/]/, priority: 2 },
            { name: 'dexie', test: /node_modules[\\/](dexie|dexie-react-hooks)[\\/]/, priority: 2 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  // En développement, l'API Symfony (symfony serve --no-tls) passe par le serveur Vite :
  // même origine que l'app, donc le cookie de session suffit, sans configuration CORS.
  server: {
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Pas de service worker sous jsdom : le module virtuel du plugin PWA est remplacé par un substitut.
    alias: { 'virtual:pwa-register': '/src/test/pwa-register-stub.ts' },
  },
});
