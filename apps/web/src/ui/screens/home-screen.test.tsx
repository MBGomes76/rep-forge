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

  it('une séance reportée ne se démarre pas : on peut l’avancer à aujourd’hui', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await screen.findByRole('button', { name: 'Reporter au lendemain' }));
    expect(await screen.findByText('Prévue demain')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Démarrer l'entraînement/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Avancer Push à aujourd’hui' }));
    expect(await screen.findByText('Prévue aujourd’hui')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Démarrer l'entraînement/ })).toBeTruthy();
  });

  it('bascule entre la vue Jours et la vue Cycle', async () => {
    const user = userEvent.setup();
    renderApp('/');
    expect(await screen.findByRole('list', { name: 'Calendrier des prochains jours' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cycle' }));
    expect(screen.getByRole('list', { name: 'Étapes du cycle' })).toBeTruthy();
  });
});

describe('jour de repos', () => {
  it('pas de validation du repos : on avance la séance suivante à aujourd’hui', async () => {
    const user = userEvent.setup();
    const { app } = renderApp('/');
    await screen.findByText('PPL · cycle de 5 jours');
    const id = await app.deps.settings.getActiveProgramId();
    const program = (await app.deps.programs.get(id!))!;
    await app.deps.programs.save({ ...program, schedule: { ...program.schedule, cursor: 2 } }); // Repos

    expect(await screen.findByText('Prévu aujourd’hui')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Valider/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Avancer Jambes à aujourd’hui' }));
    expect(await screen.findByRole('button', { name: /Démarrer l'entraînement/ })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: /aujourd’hui : Jambes/ })).toBeTruthy();
    expect(screen.getByText('Étape 4 sur 5')).toBeTruthy();
  });
});
