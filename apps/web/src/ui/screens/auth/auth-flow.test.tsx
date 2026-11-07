import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FakeServer } from '../../../test/fake-remote';
import { renderApp } from '../../../test/render-app';

describe('connexion', () => {
  it('au premier lancement, demande de se connecter, puis ouvre l’app', async () => {
    const user = userEvent.setup();
    const server = new FakeServer();
    server.addAccount('moi@example.com');
    await renderApp('/', { signedIn: false, server });

    const email = await screen.findByLabelText('E-mail');
    await user.type(email, 'moi@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'mauvais-mot-de-passe');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect((await screen.findByRole('alert')).textContent).toBe('E-mail ou mot de passe incorrect.');

    await user.clear(screen.getByLabelText('Mot de passe'));
    await user.type(screen.getByLabelText('Mot de passe'), 'phrase-de-passe-solide');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText('Programme actif')).toBeTruthy();
  });

  it('sans réseau, explique que la connexion est impossible', async () => {
    const user = userEvent.setup();
    const { device } = await renderApp('/connexion', { signedIn: false });
    device.offline = true;

    await user.type(await screen.findByLabelText('E-mail'), 'moi@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'phrase-de-passe-solide');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Connexion impossible sans réseau. Réessaie quand tu es connecté.');
  });
});

describe('invitation', () => {
  it('l’invité choisit son mot de passe et arrive dans l’app', async () => {
    const user = userEvent.setup();
    const server = new FakeServer();
    server.invitations.set('jeton-valide', 'ami@example.com');
    await renderApp('/invitation/jeton-valide', { signedIn: false, server });

    expect(((await screen.findByLabelText('E-mail')) as HTMLInputElement).value).toBe('ami@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'phrase-de-passe');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'autre-phrase');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Les deux mots de passe ne correspondent pas.');

    await user.clear(screen.getByLabelText('Confirmer le mot de passe'));
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'phrase-de-passe');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(await screen.findByText('Programme actif')).toBeTruthy();
    expect(server.accounts.has('ami@example.com')).toBe(true);
  });

  it('un lien périmé l’annonce clairement', async () => {
    await renderApp('/invitation/jeton-perime', { signedIn: false });
    expect(await screen.findByText('Ce lien d’invitation n’est plus valable. Demande un nouveau lien.')).toBeTruthy();
  });
});

describe('déconnexion', () => {
  it('efface les données de l’appareil après confirmation', async () => {
    const user = userEvent.setup();
    const { app } = await renderApp('/profil');

    await user.click(await screen.findByRole('button', { name: 'Se déconnecter' }));
    // Le bouton de confirmation, dans la boîte de dialogue.
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Se déconnecter' }));

    expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeTruthy();
    await waitFor(async () => expect(await app.deps.programs.list()).toEqual([]));
  });
});
