import { render } from '@testing-library/react';
import { App } from '../app/App';
import { createApp, createDependencies } from '../app/composition';
import { RepForgeDb } from '../infrastructure/db';

let dbCount = 0;

/** Rend l'application complète sur une base IndexedDB en mémoire neuve. */
export function renderApp(path = '/') {
  window.history.pushState({}, '', path);
  const app = createApp(createDependencies(new RepForgeDb(`ui-test-${++dbCount}-${Date.now()}`)));
  return { app, ...render(<App app={app} />) };
}
