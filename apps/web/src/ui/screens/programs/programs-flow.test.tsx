import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../../test/render-app';

describe('programmes', () => {
  it('crée un programme, compose une séance depuis le catalogue et l’active', async () => {
    const user = userEvent.setup();
    const { app } = await renderApp('/programmes');

    await user.click(await screen.findByRole('button', { name: 'Nouveau programme' }));
    const name = await screen.findByRole('textbox', { name: 'Nom du programme' });
    await user.clear(name);
    await user.type(name, 'Haut / bas');

    await user.click(screen.getByRole('button', { name: '+ Entraînement' }));
    await user.click(screen.getByRole('button', { name: '+ Repos' }));
    await user.click(await screen.findByRole('button', { name: /Séance 1.*exercice/ }));

    await user.click(await screen.findByRole('button', { name: 'Ajouter un exercice' }));
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher un exercice' }), 'ecartes a la');
    expect(screen.getAllByRole('button', { name: /^Ajouter (?!un exercice)/ })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Ajouter Écartés à la poulie' }));

    expect(await screen.findByText('Écartés à la poulie')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Augmenter : Séries' }));
    await user.click(screen.getByRole('button', { name: 'Fixe' }));
    await user.click(await screen.findByRole('button', { name: 'Enregistrer' }));

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
    await renderApp('/programmes');
    await user.click(await screen.findByRole('button', { name: 'Nouveau programme' }));
    await user.click(await screen.findByRole('button', { name: '+ Entraînement' }));
    await user.click(await screen.findByRole('button', { name: /Séance 1.*exercice/ }));
    await user.click(await screen.findByRole('button', { name: 'Ajouter un exercice' }));

    await user.click(screen.getByRole('button', { name: 'Poulie' }));
    await user.click(screen.getByRole('button', { name: 'Bras' }));
    expect(screen.getAllByRole('button', { name: /^Ajouter (?!un exercice)/ }).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Ajouter Curl biceps (poulie)',
      'Ajouter Curl marteau (corde, poulie)',
      'Ajouter Extension triceps (poulie)',
      'Ajouter Extension triceps au-dessus de la tête (poulie)',
    ]);
  });

  it('duplique un programme et ouvre la copie, sans l’activer', async () => {
    const user = userEvent.setup();
    const { app } = await renderApp('/programmes');
    await user.click((await screen.findAllByRole('button', { name: 'Dupliquer' }))[0]!);
    expect(((await screen.findByRole('textbox', { name: 'Nom du programme' })) as HTMLInputElement).value).toBe('Full body · 3 jours (copie)');
    const programs = await app.deps.programs.list();
    const copy = programs.find((p) => p.name.endsWith('(copie)'))!;
    const original = programs.find((p) => p.name === 'Full body · 3 jours')!;
    expect(copy.steps.map((s) => s.name)).toEqual(original.steps.map((s) => s.name));
    expect(await app.deps.settings.getActiveProgramId()).not.toBe(copy.id);
  });

  it('modifications en brouillon : signalées, puis annulées', async () => {
    const user = userEvent.setup();
    const { app } = await renderApp('/programmes');
    const [, ppl] = await screen.findAllByRole('button', { name: 'Modifier' });
    await user.click(ppl!);
    expect(screen.queryByRole('region', { name: 'Modifications non enregistrées' })).toBeNull();

    await user.click(await screen.findByRole('button', { name: '+ Repos' }));
    expect(await screen.findByRole('region', { name: 'Modifications non enregistrées' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(await screen.findByText('Non enregistré')).toBeTruthy();

    await user.click(screen.getAllByRole('button', { name: 'Modifier' })[1]!);
    await user.click(await screen.findByRole('button', { name: 'Annuler' }));
    await user.click(await screen.findByRole('button', { name: 'Tout annuler' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Modifications non enregistrées' })).toBeNull());
    const program = (await app.deps.programs.list()).find((p) => p.name.startsWith('PPL'));
    expect(program?.steps).toHaveLength(5);
    expect(await app.deps.programDrafts.listIds()).toEqual([]);
  });

  it('supprime un programme après confirmation', async () => {
    const user = userEvent.setup();
    const { app } = await renderApp('/programmes');
    // Liste triée par nom : « Full body » vient avant « PPL ».
    const [fullBody] = await screen.findAllByRole('button', { name: 'Modifier' });
    await user.click(fullBody!);
    await user.click(await screen.findByRole('button', { name: 'Supprimer ce programme' }));
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }));

    await screen.findByRole('button', { name: 'Nouveau programme' });
    expect((await app.deps.programs.list()).map((p) => p.name)).toEqual(['PPL · cycle de 5 jours']);
  });
});

describe('réorganiser et supprimer', () => {
  it('monte un exercice ajouté en dernier à la deuxième place, via son menu', async () => {
    const user = userEvent.setup();
    const { app } = await renderApp('/programmes');
    const [fullBody] = await screen.findAllByRole('button', { name: 'Modifier' });
    await user.click(fullBody!);
    await user.click(await screen.findByRole('button', { name: /Full body A.*exercice/ }));

    // Ordre initial : Squat, Développé couché, Rowing barre.
    await user.click(await screen.findByRole('button', { name: 'Actions pour Rowing barre' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Monter' }));
    await user.click(await screen.findByRole('button', { name: 'Enregistrer' }));
    await waitFor(async () => {
      const program = (await app.deps.programs.list()).find((p) => p.name === 'Full body · 3 jours');
      const step = program?.steps[0];
      expect(step?.kind === 'workout' && step.exercises.map((e) => e.exerciseId)).toEqual([
        'back-squat',
        'barbell-row',
        'bench-press',
      ]);
    });
    await user.click(screen.getByRole('button', { name: 'Actions pour Squat (barre)' }));
    expect((await screen.findByRole('menuitem', { name: 'Monter' })).getAttribute('aria-disabled')).toBe('true');
  });

  it('les exercices s’affichent repliés en résumé, un seul se déplie pour les réglages', async () => {
    const user = userEvent.setup();
    await renderApp('/programmes');
    const [fullBody] = await screen.findAllByRole('button', { name: 'Modifier' });
    await user.click(fullBody!);
    await user.click(await screen.findByRole('button', { name: /Full body A.*exercice/ }));

    expect((await screen.findAllByText('3 × 6–8 reps · repos 2:30')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Augmenter : Séries' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Régler Squat (barre)' }));
    expect(screen.getAllByRole('button', { name: 'Augmenter : Séries' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Régler Rowing barre' }));
    expect(screen.getAllByRole('button', { name: 'Augmenter : Séries' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Replier Rowing barre' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('décrit une séance et fixe un objectif de RIR à un exercice', async () => {
    const user = userEvent.setup();
    const { app } = await renderApp('/programmes');
    const [fullBody] = await screen.findAllByRole('button', { name: 'Modifier' });
    await user.click(fullBody!);
    await user.click(await screen.findByRole('button', { name: /Full body A.*exercice/ }));

    await user.type(await screen.findByRole('textbox', { name: 'Description' }), 'Échauffement 10 min');
    await user.click(screen.getByRole('button', { name: 'Régler Squat (barre)' }));
    await user.click(screen.getByRole('button', { name: 'Plage', pressed: false }));
    await user.click(screen.getByRole('button', { name: 'Augmenter : RIR max' }));
    await user.click(screen.getByRole('button', { name: 'Replier Squat (barre)' }));
    expect(screen.getByText(/· RIR 1–3 ·/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(async () => {
      const step = (await app.deps.programs.list()).find((p) => p.name === 'Full body · 3 jours')?.steps[0];
      expect(step).toMatchObject({ description: 'Échauffement 10 min' });
      expect(step?.kind === 'workout' && step.exercises[0]?.rirTarget).toEqual({ min: 1, max: 3 });
    });
  });

  it('supprime une séance depuis son menu, après confirmation', async () => {
    const user = userEvent.setup();
    const { app } = await renderApp('/programmes');
    const [, ppl] = await screen.findAllByRole('button', { name: 'Modifier' });
    await user.click(ppl!);
    await user.click(await screen.findByRole('button', { name: 'Actions pour l’étape 4 (Jambes)' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Supprimer l’étape' }));
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }));
    await user.click(await screen.findByRole('button', { name: 'Enregistrer' }));

    await waitFor(async () => {
      const program = (await app.deps.programs.list()).find((p) => p.name.startsWith('PPL'));
      expect(program?.steps.map((s) => s.name)).toEqual(['Push', 'Pull', 'Repos', 'Repos']);
    });
  });

  it('déplace une étape du cycle en mode réorganisation, sans changer l’étape courante', async () => {
    const user = userEvent.setup();
    const { app } = await renderApp('/programmes');
    const [, ppl] = await screen.findAllByRole('button', { name: 'Modifier' });
    await user.click(ppl!);
    await user.click(await screen.findByRole('button', { name: 'Réorganiser les étapes' }));
    await user.click(screen.getByRole('button', { name: 'Descendre l’étape 1 (Push)' }));
    await user.click(await screen.findByRole('button', { name: 'Enregistrer' }));

    await waitFor(async () => {
      const program = (await app.deps.programs.list()).find((p) => p.name.startsWith('PPL'));
      expect(program?.steps.map((s) => s.name)).toEqual(['Pull', 'Push', 'Repos', 'Jambes', 'Repos']);
      expect(program?.steps[program.schedule.cursor]?.name).toBe('Push');
    });
    await user.click(screen.getByRole('button', { name: 'Terminer' }));
    expect(screen.getByRole('button', { name: 'Réorganiser les étapes' })).toBeTruthy();
  });
});
