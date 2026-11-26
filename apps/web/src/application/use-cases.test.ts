import { currentStep, localDate, remainingRestSeconds, type Program } from '@repforge/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, createDependencies, type AppContainer } from '../app/composition';
import { staticCatalog } from '../infrastructure/catalog-data';
import { RepForgeDb } from '../infrastructure/db';
import { FakeServer } from '../test/fake-remote';
import { PROGRAM_TEMPLATES } from './program-templates';

/** Horloge pilotable : les tests avancent le temps à la main. */
function testClock(start: string) {
  let now = new Date(start);
  return {
    now: () => now,
    set: (iso: string) => {
      now = new Date(iso);
    },
    advanceSeconds: (s: number) => {
      now = new Date(now.getTime() + s * 1000);
    },
  };
}

let clock: ReturnType<typeof testClock>;
let app: AppContainer;
let dbCount = 0;

async function activeProgram(): Promise<Program> {
  const id = await app.deps.settings.getActiveProgramId();
  return (await app.deps.programs.get(id!))!;
}

beforeEach(async () => {
  clock = testClock('2026-11-06T18:00:00');
  let n = 0;
  const deps = { ...createDependencies(new RepForgeDb(`test-${++dbCount}`), new FakeServer().device()), clock, newId: () => `id-${++n}` };
  app = createApp(deps);
  await app.useCases.ensureInitialData();
});

describe('premier lancement', () => {
  it('crée les programmes modèles et active le premier', async () => {
    const programs = await app.deps.programs.list();
    expect(programs.map((p) => p.name)).toEqual(['Full body · 3 jours', 'PPL · cycle de 5 jours']);
    expect((await activeProgram()).name).toBe('PPL · cycle de 5 jours');
  });

  it('ne recrée rien au lancement suivant', async () => {
    await app.useCases.ensureInitialData();
    expect(await app.deps.programs.list()).toHaveLength(2);
  });

  it('utilise uniquement des exercices du catalogue', () => {
    const ids = new Set(staticCatalog.all().map((e) => e.id));
    const used = PROGRAM_TEMPLATES.flatMap((t) => t.steps.flatMap((s) => (s === 'rest' ? [] : s.exercises.map(([id]) => id))));
    expect(used.filter((id) => !ids.has(id))).toEqual([]);
  });
});

describe('séance complète', () => {
  it('démarre, valide des séries, termine et fait avancer le cycle', async () => {
    const workout = await app.useCases.startWorkout();
    expect(workout.name).toBe('Push');
    const bench = workout.exercises[0]!;

    await app.useCases.validateSet(workout.id, bench.id, bench.sets[0]!.id, { weightKg: 80, reps: 8, rir: 2 });
    clock.advanceSeconds(3600);
    const finished = await app.useCases.finishWorkout(workout.id);

    expect(finished.finishedAt).not.toBeNull();
    expect(await app.deps.workouts.findInProgress()).toBeUndefined();
    const program = await activeProgram();
    expect(currentStep(program)?.name).toBe('Pull');
    expect(program.schedule.anchor).toBe(localDate('2026-11-07'));
  });

  it('reprend la séance en cours au lieu d’en créer une seconde', async () => {
    const first = await app.useCases.startWorkout();
    const again = await app.useCases.startWorkout();
    expect(again.id).toBe(first.id);
  });

  it('lance le minuteur de repos de l’exercice à chaque série validée', async () => {
    const workout = await app.useCases.startWorkout();
    const bench = workout.exercises[0]!;
    await app.useCases.validateSet(workout.id, bench.id, bench.sets[0]!.id, { weightKg: 80, reps: 8 });

    const timer = (await app.deps.settings.getRestTimer())!;
    expect(timer.label).toBe('Développé couché (barre)');
    expect(remainingRestSeconds(timer, clock.now().getTime())).toBe(150);

    await app.useCases.adjustRestTimer(15);
    expect(remainingRestSeconds((await app.deps.settings.getRestTimer())!, clock.now().getTime())).toBe(165);
    await app.useCases.skipRest();
    expect(await app.deps.settings.getRestTimer()).toBeUndefined();
  });

  it('valider une série vide reprend les valeurs de la dernière séance', async () => {
    let workout = await app.useCases.startWorkout();
    let bench = workout.exercises[0]!;
    await app.useCases.validateSet(workout.id, bench.id, bench.sets[0]!.id, { weightKg: 80, reps: 8, rir: 2 });
    await app.useCases.finishWorkout(workout.id);

    // Le cycle passe par Pull, Repos, Jambes, Repos avant de revenir à Push.
    const program = await activeProgram();
    await app.deps.programs.save({ ...program, schedule: { ...program.schedule, cursor: 0 } });

    clock.set('2026-11-08T18:00:00');
    workout = await app.useCases.startWorkout();
    bench = workout.exercises[0]!;
    await app.useCases.validateSet(workout.id, bench.id, bench.sets[0]!.id, {});
    const saved = await app.deps.workouts.get(workout.id);
    expect(saved?.exercises[0]?.sets[0]?.performance).toEqual({ kind: 'reps', weightKg: 80, reps: 8, rir: null });
  });

  it('abandonner une séance ne laisse aucune trace et ne fait pas avancer le cycle', async () => {
    const workout = await app.useCases.startWorkout();
    const bench = workout.exercises[0]!;
    await app.useCases.validateSet(workout.id, bench.id, bench.sets[0]!.id, { weightKg: 80, reps: 8 });
    await app.useCases.abandonWorkout(workout.id);

    expect(await app.deps.workouts.get(workout.id)).toBeUndefined();
    expect(await app.deps.settings.getRestTimer()).toBeUndefined();
    expect(currentStep(await activeProgram())?.name).toBe('Push');
  });

  it('modifier le programme ne change pas la séance en cours', async () => {
    const workout = await app.useCases.startWorkout();
    const program = await activeProgram();
    const step = currentStep(program)!;
    const planned = step.kind === 'workout' ? step.exercises[0]! : undefined;
    await app.useCases.updatePlannedExercise(program.id, step.id, planned!.id, { sets: 6 });
    await app.useCases.saveProgramEdits(program.id);

    const saved = await app.deps.workouts.get(workout.id);
    expect(saved?.exercises[0]?.sets).toHaveLength(3);
  });
});

describe('repos et report', () => {
  it('un repos passé est accompli tout seul : il entre dans l’historique et le cycle avance', async () => {
    const program = await activeProgram();
    await app.deps.programs.save({ ...program, schedule: { ...program.schedule, cursor: 2 } });

    await app.useCases.settleRests(); // le repos du jour n’est pas encore passé
    expect(currentStep(await activeProgram())?.name).toBe('Repos');

    clock.set('2026-11-07T08:00:00');
    await app.useCases.settleRests();
    await app.useCases.settleRests(); // sans effet la seconde fois
    expect(currentStep(await activeProgram())?.name).toBe('Jambes');
    expect(await app.deps.restDays.list()).toEqual([
      expect.objectContaining({ name: 'Repos', date: localDate('2026-11-06') }),
    ]);
  });

  it('avancer un jour de repos prévoit l’étape suivante aujourd’hui, sans compter le repos', async () => {
    const program = await activeProgram();
    await app.deps.programs.save({ ...program, schedule: { ...program.schedule, cursor: 2 } });
    await app.useCases.advanceActive();
    expect((await activeProgram()).schedule).toEqual({ cursor: 3, anchor: localDate('2026-11-06') });
    expect(await app.deps.restDays.list()).toEqual([]);
  });

  it('activer un programme laissé de côté le reprend aujourd’hui', async () => {
    const activeId = (await activeProgram()).id;
    const other = (await app.deps.programs.list()).find((p) => p.id !== activeId)!;
    await app.deps.programs.save({ ...other, schedule: { cursor: 0, anchor: localDate('2026-10-01') } });
    await app.useCases.activateProgram(other.id);
    expect((await activeProgram()).schedule.anchor).toBe(localDate('2026-11-06'));
  });

  it('reporter deux fois, puis avancer à aujourd’hui', async () => {
    await app.useCases.postponeActive();
    await app.useCases.postponeActive();
    expect((await activeProgram()).schedule.anchor).toBe(localDate('2026-11-08'));
    await app.useCases.advanceActive();
    expect((await activeProgram()).schedule.anchor).toBe(localDate('2026-11-06'));
  });
});

describe('édition des programmes', () => {
  it('crée un programme, ajoute des étapes et des exercices', async () => {
    const program = await app.useCases.createProgram();
    await app.useCases.addStep(program.id, 'workout');
    const withRest = await app.useCases.addStep(program.id, 'rest');
    const step = withRest.steps[0]!;
    await app.useCases.addExerciseToStep(program.id, step.id, 'plank');
    expect((await app.deps.programs.get(program.id))!.steps).toEqual([]); // brouillon, pas encore enregistré
    await app.useCases.saveProgramEdits(program.id);

    const saved = (await app.deps.programs.get(program.id))!;
    expect(saved.steps.map((s) => s.name)).toEqual(['Séance 1', 'Repos']);
    const first = saved.steps[0]!;
    expect(first.kind === 'workout' && first.exercises[0]?.target).toEqual({ kind: 'fixed', value: 45 });
  });

  it('les modifications restent en brouillon : rien n’est à envoyer avant « Enregistrer »', async () => {
    const program = await activeProgram();
    const before = (await app.deps.syncStore.pending()).length;
    await app.useCases.renameProgram(program.id, 'PPL revu');
    await app.useCases.addStep(program.id, 'rest');

    expect((await activeProgram()).name).toBe(program.name);
    expect((await app.deps.syncStore.pending()).length).toBe(before);

    await app.useCases.saveProgramEdits(program.id);
    expect((await activeProgram()).name).toBe('PPL revu');
    expect((await activeProgram()).steps).toHaveLength(program.steps.length + 1);
    expect(await app.deps.programDrafts.get(program.id)).toBeUndefined();
  });

  it('« Annuler » abandonne le brouillon', async () => {
    const program = await activeProgram();
    await app.useCases.renameProgram(program.id, 'Brouillon');
    await app.useCases.discardProgramEdits(program.id);
    expect(await app.deps.programDrafts.get(program.id)).toBeUndefined();
    expect((await activeProgram()).name).toBe(program.name);
  });

  it('une séance terminée pendant l’édition n’est pas annulée par l’enregistrement', async () => {
    const program = await activeProgram();
    await app.useCases.renameProgram(program.id, 'PPL revu');
    const workout = await app.useCases.startWorkout();
    const first = workout.exercises[0]!;
    await app.useCases.validateSet(workout.id, first.id, first.sets[0]!.id, { weightKg: 80, reps: 8 });
    await app.useCases.finishWorkout(workout.id);
    await app.useCases.saveProgramEdits(program.id);

    const saved = await activeProgram();
    expect(saved.name).toBe('PPL revu');
    expect(currentStep(saved)?.name).toBe('Pull');
  });

  it('refuse une valeur invalide', async () => {
    const program = await activeProgram();
    const step = program.steps[0]!;
    const planned = step.kind === 'workout' ? step.exercises[0]! : undefined;
    await expect(app.useCases.updatePlannedExercise(program.id, step.id, planned!.id, { sets: 0 })).rejects.toThrow(
      'Il faut au moins une série.',
    );
  });

  it('supprimer le programme actif active le suivant, l’historique reste', async () => {
    const workout = await app.useCases.startWorkout();
    const bench = workout.exercises[0]!;
    await app.useCases.validateSet(workout.id, bench.id, bench.sets[0]!.id, { weightKg: 80, reps: 8 });
    await app.useCases.finishWorkout(workout.id);

    await app.useCases.deleteProgram((await activeProgram()).id);
    expect((await activeProgram()).name).toBe('Full body · 3 jours');
    expect(await app.deps.workouts.listFinished()).toHaveLength(1);
  });
});
