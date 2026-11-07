import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Program } from '@repforge/domain';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render-app';

const status = () => screen.findByRole('button', { name: /^État de sauvegarde/ });

describe('état de la synchronisation', () => {
  it('toujours visible : synchronisé, puis hors ligne', async () => {
    const { app, device } = await renderApp('/');
    await app.sync.synchronize();
    await waitFor(async () => expect((await status()).textContent).toBe('Synchronisé'));

    device.offline = true;
    await app.sync.synchronize();
    await waitFor(async () => expect((await status()).textContent).toBe('Hors ligne'));
  });

  it('session expirée : on se reconnecte depuis le profil, sans rien perdre', async () => {
    const user = userEvent.setup();
    const { app, device } = await renderApp('/profil');
    device.expireSession();
    await app.sync.synchronize();

    expect(await screen.findByText('Session expirée')).toBeTruthy();
    await user.type(screen.getByLabelText('Mot de passe'), 'phrase-de-passe-solide');
    await user.click(screen.getByRole('button', { name: 'Se reconnecter' }));
    expect(await screen.findByText('Tout est synchronisé')).toBeTruthy();
  });
});

describe('conflit', () => {
  it('propose les deux versions et applique celle qu’on choisit', async () => {
    const user = userEvent.setup();
    const { app, server } = await renderApp('/profil');
    await app.sync.synchronize();

    // Un autre appareil renomme le programme actif ; ce téléphone aussi, sans le savoir.
    const id = (await app.deps.settings.getActiveProgramId())!;
    const program = (await app.deps.programs.get(id))!;
    const other = server.device();
    const [account] = [...server.accounts.values()];
    await other.login(account!.account.email, 'phrase-de-passe-solide');
    expect((await other.put('programs', id, 1, { ...program, name: 'Nom de l’ordinateur' })).version).toBe(2);
    await app.useCases.renameProgram(id, 'Nom du téléphone');
    await app.sync.synchronize();

    const card = await screen.findByRole('group', { name: 'Conflit : Programme « Nom du téléphone »' });
    expect(within(card).getByText(/Nom du téléphone ·/)).toBeTruthy();
    expect(within(card).getByText(/Nom de l’ordinateur ·/)).toBeTruthy();
    expect((await status()).textContent).toBe('Conflit');

    await user.click(within(card).getByRole('button', { name: 'Garder l’autre' }));
    await waitFor(async () => expect(((await app.deps.programs.get(id)) as Program).name).toBe('Nom de l’ordinateur'));
    await waitFor(() => expect(screen.queryByRole('group', { name: /^Conflit/ })).toBeNull());
  });
});
