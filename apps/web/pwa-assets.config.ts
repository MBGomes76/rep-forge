import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

/**
 * Icônes de l'application installée, générées depuis le logo SVG
 * (`npm run icons`). Le fond bleu nuit remplit la marge des icônes
 * « maskable », que le téléphone découpe selon sa forme (rond, squircle…).
 */
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0B1426' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0B1426' } },
  },
  images: ['public/icon.svg'],
});
