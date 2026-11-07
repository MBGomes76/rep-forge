import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../../test/render-app';

async function startPush() {
  const user = userEvent.setup();
  const rendered = await renderApp('/');
  await user.click(await screen.findByRole('button', { name: /Démarrer l'entraînement/ }));
  await screen.findByRole('textbox', { name: 'kg de la série 1 · Développé couché (barre)' });
  return { user, ...rendered };
}

describe('séance complète', () => {
  it('saisit une série, voit le repos démarrer, termine et passe à l’étape suivante', async () => {
    const { user, app } = await startPush();

    await user.type(screen.getByRole('textbox', { name: 'kg de la série 1 · Développé couché (barre)' }), '82,5');
    await user.type(screen.getByRole('textbox', { name: 'Répétitions de la série 1 · Développé couché (barre)' }), '6');
    await user.click(screen.getByRole('button', { name: 'Valider la série 1 · Développé couché (barre)' }));

    expect(await screen.findByRole('button', { name: 'Corriger la série 1 · Développé couché (barre)' })).toBeTruthy();
    expect(await screen.findByText(/Repos · Développé couché/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: "Terminer l'entraînement" }));
    expect(await screen.findByText('Séance terminée')).toBeTruthy();
    expect(screen.getByText('1 série · meilleure : 82,5 kg × 6 reps')).toBeTruthy();
    expect(screen.getByText('Nouveau')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Terminer · étape suivante : Pull' }));
    expect(await screen.findByText('Dernier entraînement')).toBeTruthy();
    expect(screen.getByText('Étape 2 sur 5')).toBeTruthy();
    expect(await app.deps.workouts.findInProgress()).toBeUndefined();
  });

  it('refuse de valider une série sans répétitions la première fois', async () => {
    const { user } = await startPush();
    await user.click(screen.getByRole('button', { name: 'Valider la série 1 · Développé couché (barre)' }));
    expect(await screen.findByText('Saisis les répétitions.')).toBeTruthy();
  });

  it('corrige une série validée', async () => {
    const { user, app } = await startPush();
    const kg = screen.getByRole('textbox', { name: 'kg de la série 1 · Développé couché (barre)' });
    await user.type(kg, '80');
    await user.type(screen.getByRole('textbox', { name: 'Répétitions de la série 1 · Développé couché (barre)' }), '8');
    await user.click(screen.getByRole('button', { name: 'Valider la série 1 · Développé couché (barre)' }));

    await user.click(await screen.findByRole('button', { name: 'Corriger la série 1 · Développé couché (barre)' }));
    const reps = screen.getByRole('textbox', { name: 'Répétitions de la série 1 · Développé couché (barre)' });
    await screen.findByRole('button', { name: 'Valider la série 1 · Développé couché (barre)' });
    await user.clear(reps);
    await user.type(reps, '9');
    await user.click(screen.getByRole('button', { name: 'Valider la série 1 · Développé couché (barre)' }));

    await waitFor(async () => {
      const workout = await app.deps.workouts.findInProgress();
      expect(workout?.exercises[0]?.sets[0]?.performance).toEqual({ kind: 'reps', weightKg: 80, reps: 9, rir: null });
    });
  });

  it('abandonne la séance après confirmation', async () => {
    const { user, app } = await startPush();
    await user.click(screen.getByRole('button', { name: 'Abandonner la séance' }));
    await user.click(await screen.findByRole('button', { name: 'Abandonner' }));
    expect(await screen.findByRole('button', { name: /Démarrer l'entraînement/ })).toBeTruthy();
    expect(await app.deps.workouts.findInProgress()).toBeUndefined();
  });
});
