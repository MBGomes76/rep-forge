import { describe, expect, it } from 'vitest';
import { replaceStep } from '../program/cycle';
import type { Program, WorkoutStep } from '../program/program';
import { DomainError } from '../shared/domain-error';
import { catalog, pplProgram, sequentialIds } from '../testing/fixtures';
import {
  addSet,
  findWorkoutInProgress,
  finishWorkout,
  recordSet,
  resolveSetInput,
  startWorkout,
  workoutDurationSeconds,
  type SetPerformance,
  type Workout,
} from './workout';

const STARTED_AT = '2026-11-06T18:00:00.000Z';

function startPush(program: Program = pplProgram(0)): Workout {
  return startWorkout({ id: 'w1', program, catalog, startedAt: STARTED_AT, newId: sequentialIds() });
}

const reps = (weightKg: number | null, count: number, rir: number | null = null): SetPerformance => ({
  kind: 'reps',
  weightKg,
  reps: count,
  rir,
});

describe('démarrer une séance', () => {
  it('copie la séance de l’étape courante avec des séries vides', () => {
    const workout = startPush();
    expect(workout).toMatchObject({ id: 'w1', programId: 'ppl', stepId: 'push', name: 'Push', finishedAt: null });
    const [bench] = workout.exercises;
    expect(bench).toMatchObject({
      exerciseId: 'bench-press',
      name: 'Développé couché (barre)',
      inputKind: 'load',
      loadConvention: 'Poids total, barre incluse',
      target: { kind: 'range', min: 6, max: 8 },
      restSeconds: 120,
    });
    expect(bench?.sets).toEqual([
      { id: 'id-2', performance: null },
      { id: 'id-3', performance: null },
      { id: 'id-4', performance: null },
    ]);
  });

  it('refuse de démarrer sur une étape de repos', () => {
    expect(() => startPush(pplProgram(2))).toThrow(DomainError);
  });

  it('refuse un exercice absent du catalogue', () => {
    expect(() =>
      startWorkout({ id: 'w', program: pplProgram(0), catalog: [], startedAt: STARTED_AT, newId: sequentialIds() }),
    ).toThrow(DomainError);
  });
});

describe('une séance démarrée est un instantané', () => {
  it('modifier le programme ne change pas les objectifs de la séance en cours', () => {
    const program = pplProgram(0);
    const workout = startPush(program);

    const push = program.steps[0] as WorkoutStep;
    const edited = replaceStep(program, {
      ...push,
      name: 'Pecs',
      exercises: push.exercises.map((e) => ({ ...e, sets: 5, target: { kind: 'fixed', value: 5 }, restSeconds: 60 })),
    });

    expect(edited.steps[0]?.name).toBe('Pecs');
    expect(workout.name).toBe('Push');
    expect(workout.exercises[0]?.sets).toHaveLength(3);
    expect(workout.exercises[0]?.target).toEqual({ kind: 'range', min: 6, max: 8 });
    expect(workout.exercises[0]?.restSeconds).toBe(120);
  });

  it('ne partage aucun objet avec le programme (une mutation accidentelle ne se propage pas)', () => {
    const program = JSON.parse(JSON.stringify(pplProgram(0))) as Program;
    const workout = startPush(program);
    const target = (program.steps[0] as WorkoutStep).exercises[0]!.target as { min: number };
    target.min = 1;
    expect(workout.exercises[0]?.target).toEqual({ kind: 'range', min: 6, max: 8 });
  });
});

describe('saisir les séries', () => {
  it('valide une série puis la corrige', () => {
    let workout = startPush();
    const exercise = workout.exercises[0]!;
    const setId = exercise.sets[0]!.id;

    workout = recordSet(workout, exercise.id, setId, reps(60, 10, 2));
    expect(workout.exercises[0]?.sets[0]?.performance).toEqual(reps(60, 10, 2));

    workout = recordSet(workout, exercise.id, setId, reps(62.5, 8, 1));
    expect(workout.exercises[0]?.sets[0]?.performance).toEqual(reps(62.5, 8, 1));
  });

  it('ajoute une série', () => {
    const workout = startPush();
    const exercise = workout.exercises[0]!;
    const updated = addSet(workout, exercise.id, 'extra');
    expect(updated.exercises[0]?.sets).toHaveLength(4);
    expect(updated.exercises[0]?.sets.at(-1)).toEqual({ id: 'extra', performance: null });
  });

  it.each<[string, SetPerformance]>([
    ['charge manquante', reps(null, 10)],
    ['zéro répétition', reps(60, 0)],
    ['poids négatif', reps(-5, 10)],
    ['RIR hors limites', reps(60, 10, 11)],
    ['durée sur un exercice à répétitions', { kind: 'duration', weightKg: null, seconds: 30 }],
  ])('refuse une saisie invalide : %s', (_, performance) => {
    const workout = startPush();
    const exercise = workout.exercises[0]!;
    expect(() => recordSet(workout, exercise.id, exercise.sets[0]!.id, performance)).toThrow(DomainError);
  });

  it('refuse un exercice ou une série inconnus', () => {
    const workout = startPush();
    const exercise = workout.exercises[0]!;
    expect(() => recordSet(workout, 'inconnu', exercise.sets[0]!.id, reps(60, 10))).toThrow(DomainError);
    expect(() => recordSet(workout, exercise.id, 'inconnue', reps(60, 10))).toThrow(DomainError);
  });
});

describe('valider une série sans rien saisir', () => {
  const previous = reps(60, 10, 2);

  it('reprend le poids et les répétitions de la dernière fois, pas le RIR', () => {
    expect(resolveSetInput('load', {}, previous)).toEqual(reps(60, 10, null));
  });

  it('complète seulement les champs vides', () => {
    expect(resolveSetInput('load', { reps: 8, rir: 1 }, previous)).toEqual(reps(60, 8, 1));
    expect(resolveSetInput('load', { weightKg: 65, reps: null }, previous)).toEqual(reps(65, 10, null));
  });

  it('exige une saisie la première fois', () => {
    expect(() => resolveSetInput('load', {}, undefined)).toThrow('Saisis les répétitions.');
    expect(() => resolveSetInput('load', { reps: 10 }, undefined)).toThrow('Saisis la charge.');
  });

  it('accepte une série au poids du corps sans lest', () => {
    expect(resolveSetInput('added_weight', { reps: 8 }, undefined)).toEqual(reps(null, 8, null));
  });

  it('reprend la durée pour un exercice de gainage', () => {
    const plank: SetPerformance = { kind: 'duration', weightKg: null, seconds: 45 };
    expect(resolveSetInput('duration', {}, plank)).toEqual(plank);
    expect(() => resolveSetInput('duration', {}, undefined)).toThrow('Saisis la durée.');
  });

  it('ignore une performance précédente d’un autre type', () => {
    expect(() => resolveSetInput('duration', {}, previous)).toThrow(DomainError);
  });
});

describe('terminer une séance', () => {
  const ENDED_AT = '2026-11-06T19:02:30.000Z';

  function withOneSet(): Workout {
    const workout = startPush();
    const exercise = workout.exercises[0]!;
    return recordSet(workout, exercise.id, exercise.sets[0]!.id, reps(60, 10));
  }

  it('enregistre l’heure de fin et calcule la durée', () => {
    const finished = finishWorkout(withOneSet(), ENDED_AT);
    expect(finished.finishedAt).toBe(ENDED_AT);
    expect(workoutDurationSeconds(finished, '2030-01-01T00:00:00.000Z')).toBe(3750);
  });

  it('calcule la durée d’une séance en cours jusqu’à maintenant', () => {
    expect(workoutDurationSeconds(startPush(), '2026-11-06T18:01:05.000Z')).toBe(65);
  });

  it('exige au moins une série validée', () => {
    expect(() => finishWorkout(startPush(), ENDED_AT)).toThrow(DomainError);
  });

  it('refuse une fin antérieure au début', () => {
    expect(() => finishWorkout(withOneSet(), '2026-11-06T17:00:00.000Z')).toThrow(DomainError);
  });

  it('interdit de modifier une séance terminée', () => {
    const finished = finishWorkout(withOneSet(), ENDED_AT);
    const exercise = finished.exercises[0]!;
    expect(() => recordSet(finished, exercise.id, exercise.sets[1]!.id, reps(60, 10))).toThrow(DomainError);
    expect(() => addSet(finished, exercise.id, 'x')).toThrow(DomainError);
    expect(() => finishWorkout(finished, ENDED_AT)).toThrow(DomainError);
  });

  it('retrouve la séance en cours pour « Reprendre l’entraînement »', () => {
    const finished = finishWorkout(withOneSet(), ENDED_AT);
    const inProgress = { ...startPush(), id: 'w2' };
    expect(findWorkoutInProgress([finished, inProgress])?.id).toBe('w2');
    expect(findWorkoutInProgress([finished])).toBeUndefined();
  });
});
