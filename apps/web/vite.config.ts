/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // En développement, l'API Symfony (symfony serve --no-tls) passe par le serveur Vite :
  // même origine que l'app, donc le cookie de session suffit, sans configuration CORS.
  server: {
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
