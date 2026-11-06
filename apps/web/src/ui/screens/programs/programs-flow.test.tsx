import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../../test/render-app';

describe('programmes', () => {
  it('crée un programme, compose une séance depuis le catalogue et l’active', async () => {
    const user = userEvent.setup();
    const { app } = renderApp('/programmes');

    await user.click(await screen.findByRole('button', { name: 'Nouveau programme' }));
    const name = await screen.findByRole('textbox', { name: 'Nom du programme' });
    await user.clear(name);
    await user.type(name, 'Haut / bas');

    await user.click(screen.getByRole('button', { name: '+ Entraînement' }));
    await user.click(screen.getByRole('button', { name: '+ Repos' }));
    await user.click(await screen.findByRole('button', { name: /Séance 1.*exercice/ }));

    await user.click(await screen.findByRole('button', { name: 'Ajouter un exercice' }));
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher un exercice' }), 'ecartes');
    expect(screen.getAllByRole('button', { name: /^Ajouter (?!un exercice)/ })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Ajouter Écartés à la poulie' }));

    expect(await screen.findByText('Écartés à la poulie')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Augmenter : Séries' }));
    await user.click(screen.getByRole('button', { name: 'Objectif fixe' }));

    await waitFor(async () => {
      const programs = await app.deps.programs.list();
      const created = programs.find((p) => p.name === 'Haut / bas');
      const step = created?.steps[0];
      expect(created?.steps.map((s) => s.kind)).toEqual(['workout', 'rest']);
      expect(step?.kind === 'workout' && step.exercises[0]).toMatchObject({
        exerciseId: 'cable-fly',
        sets: 4,
        target: { kind: 'fixed', value: 8 },
      });
    });

    await user.click(screen.getByRole('button', { name: 'Retour' }));
    await user.click(await screen.findByRole('button', { name: 'Activer ce programme' }));
    await waitFor(async () => {
      const activeId = await app.deps.settings.getActiveProgramId();
      expect((await app.deps.programs.get(activeId!))?.name).toBe('Haut / bas');
    });
  });

  it('filtre le catalogue par matériel', async () => {
    const user = userEvent.setup();
    renderApp('/programmes');
    await user.click(await screen.findByRole('button', { name: 'Nouveau programme' }));
    await user.click(await screen.findByRole('button', { name: '+ Entraînement' }));
    await user.click(await screen.findByRole('button', { name: /Séance 1.*exercice/ }));
    await user.click(await screen.findByRole('button', { name: 'Ajouter un exercice' }));

    await user.click(screen.getByRole('button', { name: 'Poulie' }));
    await user.click(screen.getByRole('button', { name: 'Bras' }));
    expect(screen.getAllByRole('button', { name: /^Ajouter (?!un exercice)/ }).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Ajouter Extension triceps (poulie)',
    ]);
  });

  it('supprime un programme après confirmation', async () => {
    const user = userEvent.setup();
    const { app } = renderApp('/programmes');
    // Liste triée par nom : « Full body » vient avant « PPL ».
    const [fullBody] = await screen.findAllByRole('button', { name: 'Modifier' });
    await user.click(fullBody!);
    await user.click(await screen.findByRole('button', { name: 'Supprimer ce programme' }));
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }));

    await screen.findByRole('button', { name: 'Nouveau programme' });
    expect((await app.deps.programs.list()).map((p) => p.name)).toEqual(['PPL · cycle de 5 jours']);
  });
});

describe('réorganiser', () => {
  it('monte un exercice ajouté en dernier à la deuxième place', async () => {
    const user = userEvent.setup();
    const { app } = renderApp('/programmes');
    const [fullBody] = await screen.findAllByRole('button', { name: 'Modifier' });
    await user.click(fullBody!);
    await user.click(await screen.findByRole('button', { name: /Full body A.*exercice/ }));

    // Ordre initial : Squat, Développé couché, Rowing barre.
    await user.click(await screen.findByRole('button', { name: 'Monter Rowing barre' }));
    await waitFor(async () => {
      const program = (await app.deps.programs.list()).find((p) => p.name === 'Full body · 3 jours');
      const step = program?.steps[0];
      expect(step?.kind === 'workout' && step.exercises.map((e) => e.exerciseId)).toEqual([
        'back-squat',
        'barbell-row',
        'bench-press',
      ]);
    });
    expect((screen.getByRole('button', { name: 'Monter Squat (barre)' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('déplace une étape du cycle en mode réorganisation, sans changer l’étape courante', async () => {
    const user = userEvent.setup();
    const { app } = renderApp('/programmes');
    const [, ppl] = await screen.findAllByRole('button', { name: 'Modifier' });
    await user.click(ppl!);
    await user.click(await screen.findByRole('button', { name: 'Réorganiser les étapes' }));
    await user.click(screen.getByRole('button', { name: 'Descendre l’étape 1 (Push)' }));

    await waitFor(async () => {
      const program = (await app.deps.programs.list()).find((p) => p.name.startsWith('PPL'));
      expect(program?.steps.map((s) => s.name)).toEqual(['Pull', 'Push', 'Repos', 'Jambes', 'Repos']);
      expect(program?.steps[program.schedule.cursor]?.name).toBe('Push');
    });
    await user.click(screen.getByRole('button', { name: 'Terminer' }));
    expect(screen.getByRole('button', { name: 'Réorganiser les étapes' })).toBeTruthy();
  });
});
