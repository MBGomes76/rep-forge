import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render-app';

describe('historique', () => {
  it('est vide au départ', async () => {
    await renderApp('/historique');
    expect(await screen.findByText(/Aucun entraînement pour l'instant/)).toBeTruthy();
  });

  it('liste une séance terminée avec la meilleure série de chaque exercice', async () => {
    const user = userEvent.setup();
    const { app } = await renderApp('/');
    await screen.findByText('PPL · cycle de 5 jours');

    const workout = await app.useCases.startWorkout();
    const bench = workout.exercises[0]!;
    await app.useCases.validateSet(workout.id, bench.id, bench.sets[0]!.id, { weightKg: 80, reps: 8 });
    await app.useCases.validateSet(workout.id, bench.id, bench.sets[1]!.id, { weightKg: 82.5, reps: 6 });
    await app.useCases.finishWorkout(workout.id);

    await user.click(screen.getByRole('link', { name: 'Historique' }));
    expect(await screen.findByRole('heading', { name: 'Push' })).toBeTruthy();
    expect(screen.getByText('Aujourd’hui')).toBeTruthy();
    expect(screen.getByText('2 séries · meilleure : 82,5 kg × 6 reps')).toBeTruthy();
    expect(screen.getByText(/2 séries · 1 135 kg/)).toBeTruthy();
  });
});
