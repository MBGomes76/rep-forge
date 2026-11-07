import { render } from '@testing-library/react';
import { App } from '../app/App';
import { createApp, createDependencies } from '../app/composition';
import { RepForgeDb } from '../infrastructure/db';
import { FakeServer } from './fake-remote';

let dbCount = 0;

interface RenderOptions {
  /** Par défaut, un compte est déjà connecté sur l'appareil. `false` : premier lancement. */
  signedIn?: boolean;
  server?: FakeServer;
}

/** Rend l'application complète sur une base IndexedDB en mémoire neuve, et un faux serveur. */
export async function renderApp(path = '/', { signedIn = true, server = new FakeServer() }: RenderOptions = {}) {
  window.history.pushState({}, '', path);
  const device = server.device();
  const app = createApp(createDependencies(new RepForgeDb(`ui-test-${++dbCount}-${Date.now()}`), device));
  if (signedIn) {
    const account = server.addAccount(`moi-${dbCount}@example.com`);
    await device.login(account.email, 'phrase-de-passe-solide');
    await app.deps.settings.setAccount(account);
  }
  return { app, server, device, ...render(<App app={app} />) };
}
