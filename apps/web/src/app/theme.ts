import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

/**
 * Thème RepForge : une seule apparence sombre, reprise de la maquette.
 * Les couleurs sont nommées par rôle (`card`, `accent`, `planned`…) pour que
 * les composants ne contiennent aucun code couleur en dur.
 */
const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        rf: {
          bg: { value: '#0B1426' },
          surface: { value: '#0F1A31' },
          card: { value: '#15213A' },
          border: { value: '#22345A' },
          control: { value: '#1D2D4D' },
          controlBorder: { value: '#2F4573' },
          accent: { value: '#5EEAB4' },
          onAccent: { value: '#062A1E' },
          doneBg: { value: '#10302F' },
          doneBorder: { value: '#1F6B57' },
          text: { value: '#E8EEF8' },
          soft: { value: '#C4D2E8' },
          muted: { value: '#9DB0CC' },
          placeholder: { value: '#7F93B3' },
          amber: { value: '#F5C26B' },
          amberBorder: { value: '#6B5A2E' },
          planned: { value: '#8FB4FF' },
        },
      },
      fonts: {
        body: { value: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" },
        heading: { value: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" },
        numeric: { value: "'Space Grotesk', Inter, system-ui, sans-serif" },
      },
      radii: {
        card: { value: '18px' },
        control: { value: '12px' },
        button: { value: '14px' },
      },
    },
  },
  globalCss: {
    'html, body': {
      bg: 'rf.bg',
      color: 'rf.text',
      fontFamily: 'body',
      WebkitTapHighlightColor: 'transparent',
      overscrollBehavior: 'none',
    },
    ':focus-visible': {
      outline: '2px solid {colors.rf.accent}',
      outlineOffset: '2px',
    },
    'input::placeholder': { color: 'rf.placeholder' },
  },
});

export const system = createSystem(defaultConfig, config);
