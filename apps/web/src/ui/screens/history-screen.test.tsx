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

describe('historique par exercice', () => {
  it('liste les exercices faits, puis ouvre l’historique d’un exercice avec sa meilleure série', async () => {
    const user = userEvent.setup();
    const { app } = await renderApp('/');
    await screen.findByText('PPL · cycle de 5 jours');
    const workout = await app.useCases.startWorkout();
    const bench = workout.exercises[0]!;
    await app.useCases.validateSet(workout.id, bench.id, bench.sets[0]!.id, { weightKg: 80, reps: 8, rir: 2 });
    await app.useCases.validateSet(workout.id, bench.id, bench.sets[1]!.id, { weightKg: 82.5, reps: 6 });
    await app.useCases.finishWorkout(workout.id);

    await user.click(screen.getByRole('link', { name: 'Historique' }));
    await user.click(await screen.findByRole('button', { name: 'Exercices' }));
    await user.click(await screen.findByRole('button', { name: (accessibleName) => accessibleName.startsWith(bench.name) }));

    expect(await screen.findByRole('heading', { level: 1, name: bench.name })).toBeTruthy();
    expect(await screen.findAllByText('82,5 kg × 6 reps')).toHaveLength(2); // en haut, puis dans la liste
    expect(screen.getByText('80 kg × 8 reps · RIR 2')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(await screen.findByRole('button', { name: 'Exercices', pressed: true })).toBeTruthy();
  });

  it('pendant une séance, le nom d’un exercice ouvre son historique, et le retour ramène à la séance', async () => {
    const user = userEvent.setup();
    const { app } = await renderApp('/');
    await screen.findByText('PPL · cycle de 5 jours');
    const workout = await app.useCases.startWorkout();
    const bench = workout.exercises[0]!;

    await user.click(await screen.findByRole('button', { name: /Reprendre l'entraînement/ }));
    await user.click(await screen.findByRole('button', { name: `Historique de ${bench.name}` }));
    expect(await screen.findByText(/Pas encore fait/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(await screen.findByRole('button', { name: `Historique de ${bench.name}` })).toBeTruthy();
  });
});
