import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render-app';

describe('accueil', () => {
  it('affiche le programme actif et la séance prévue aujourd’hui', async () => {
    renderApp('/');
    expect(await screen.findByText('PPL · cycle de 5 jours')).toBeTruthy();
    expect(screen.getByText('Étape 1 sur 5')).toBeTruthy();
    expect(screen.getByText('Prévue aujourd’hui')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Démarrer l'entraînement/ })).toBeTruthy();
  });

  it('reporter au lendemain décale l’étape, puis la ramène à aujourd’hui', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await screen.findByRole('button', { name: 'Reporter au lendemain' }));
    expect(await screen.findByText('Prévue demain')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: "Ramener à aujourd'hui" }));
    expect(await screen.findByText('Prévue aujourd’hui')).toBeTruthy();
  });

  it('bascule entre la vue Jours et la vue Cycle', async () => {
    const user = userEvent.setup();
    renderApp('/');
    expect(await screen.findByRole('list', { name: 'Calendrier des prochains jours' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cycle' }));
    expect(screen.getByRole('list', { name: 'Étapes du cycle' })).toBeTruthy();
  });
});
