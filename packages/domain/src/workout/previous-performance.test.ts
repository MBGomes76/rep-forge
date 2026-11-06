import { describe, expect, it } from 'vitest';
import { rangeTarget } from '../program/rep-target';
import { previousForSet, previousPerformance } from './previous-performance';
import type { SetPerformance, Workout, WorkoutExercise } from './workout';

const reps = (weightKg: number, count: number, rir: number | null = null): SetPerformance => ({
  kind: 'reps',
  weightKg,
  reps: count,
  rir,
});

function exercise(exerciseId: string, performances: (SetPerformance | null)[]): WorkoutExercise {
  return {
    id: `${exerciseId}-x`,
    exerciseId,
    name: exerciseId,
    inputKind: 'load',
    loadConvention: '',
    target: rangeTarget(8, 12),
    restSeconds: 90,
    sets: performances.map((performance, i) => ({ id: `${exerciseId}-${i}`, performance })),
  };
}

function workout(id: string, startedAt: string, exercises: WorkoutExercise[], finished = true): Workout {
  return {
    id,
    programId: 'p',
    stepId: 's',
    name: id,
    startedAt,
    finishedAt: finished ? startedAt : null,
    exercises,
  };
}

const older = workout('older', '2026-10-20T18:00:00Z', [exercise('bench', [reps(55, 10), reps(55, 9)])]);
const last = workout('last', '2026-10-30T18:00:00Z', [exercise('bench', [reps(60, 10, 2), reps(60, 9, 1), null])]);
const otherExercise = workout('squat-day', '2026-11-02T18:00:00Z', [exercise('squat', [reps(100, 6)])]);

describe('performance précédente', () => {
  it('vient de la dernière séance terminée contenant l’exercice, quel que soit l’ordre de l’historique', () => {
    expect(previousPerformance([otherExercise, older, last], 'bench')).toEqual([reps(60, 10, 2), reps(60, 9, 1)]);
  });

  it('ignore les séries non validées', () => {
    expect(previousPerformance([last], 'bench')).toHaveLength(2);
  });

  it('ignore la séance en cours et les séances non terminées', () => {
    const inProgress = workout('now', '2026-11-06T18:00:00Z', [exercise('bench', [reps(70, 5)])], false);
    expect(previousPerformance([older, inProgress], 'bench')).toEqual(older.exercises[0]?.sets.map((s) => s.performance));

    const finishedToday = workout('today', '2026-11-06T18:00:00Z', [exercise('bench', [reps(70, 5)])]);
    expect(previousPerformance([last, finishedToday], 'bench', { excludeWorkoutId: 'today' })?.[0]).toEqual(
      reps(60, 10, 2),
    );
  });

  it('passe une séance où l’exercice était prévu mais pas fait', () => {
    const skipped = workout('skipped', '2026-11-01T18:00:00Z', [exercise('bench', [null, null])]);
    expect(previousPerformance([last, skipped], 'bench')?.[0]).toEqual(reps(60, 10, 2));
  });

  it('est absente la première fois', () => {
    expect(previousPerformance([otherExercise], 'bench')).toBeUndefined();
    expect(previousPerformance([], 'bench')).toBeUndefined();
  });
});

describe('performance précédente d’une série', () => {
  const previous = [reps(60, 10), reps(60, 9)];

  it('correspond à la même série la dernière fois', () => {
    expect(previousForSet(previous, 1)).toEqual(reps(60, 9));
  });

  it('reprend la dernière série faite pour une série ajoutée', () => {
    expect(previousForSet(previous, 4)).toEqual(reps(60, 9));
  });

  it('est absente la première fois', () => {
    expect(previousForSet(undefined, 0)).toBeUndefined();
  });
});
