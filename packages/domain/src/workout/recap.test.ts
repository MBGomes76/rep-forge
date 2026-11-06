import { describe, expect, it } from 'vitest';
import type { InputKind } from '../catalog/exercise';
import { rangeTarget } from '../program/rep-target';
import { bestSet, progressBetween, summarizeWorkout, volumeKg } from './recap';
import type { SetPerformance, Workout, WorkoutExercise } from './workout';

const reps = (weightKg: number | null, count: number): SetPerformance => ({ kind: 'reps', weightKg, reps: count, rir: null });
const hold = (seconds: number, weightKg: number | null = null): SetPerformance => ({ kind: 'duration', weightKg, seconds });

function exercise(exerciseId: string, inputKind: InputKind, performances: (SetPerformance | null)[]): WorkoutExercise {
  return {
    id: `${exerciseId}-x`,
    exerciseId,
    name: exerciseId,
    inputKind,
    loadConvention: '',
    target: rangeTarget(8, 12),
    restSeconds: 90,
    sets: performances.map((performance, i) => ({ id: `${exerciseId}-${i}`, performance })),
  };
}

function workout(id: string, startedAt: string, finishedAt: string | null, exercises: WorkoutExercise[]): Workout {
  return { id, programId: 'p', stepId: 's', name: 'Push', startedAt, finishedAt, exercises };
}

describe('meilleure série', () => {
  it('à charge : la plus lourde, puis le plus de répétitions', () => {
    expect(bestSet('load', [reps(80, 8), reps(80, 7), reps(77.5, 10)])).toEqual(reps(80, 8));
  });

  it('au lest : le poids du corps seul compte comme zéro', () => {
    expect(bestSet('added_weight', [reps(null, 12), reps(5, 6)])).toEqual(reps(5, 6));
  });

  it('assistée : la moins assistée', () => {
    expect(bestSet('assistance', [reps(30, 10), reps(20, 6), reps(20, 8)])).toEqual(reps(20, 8));
  });

  it('en durée : la plus longue', () => {
    expect(bestSet('duration', [hold(45), hold(60), hold(60, 5)])).toEqual(hold(60, 5));
  });

  it('aucune série', () => {
    expect(bestSet('load', [])).toBeUndefined();
  });
});

describe('progression', () => {
  it('première fois', () => {
    expect(progressBetween('load', reps(60, 10), undefined)).toEqual({ kind: 'first_time' });
  });

  it('compare d’abord la charge', () => {
    expect(progressBetween('load', reps(82.5, 6), reps(80, 8))).toEqual({ kind: 'weight', deltaKg: 2.5, improved: true });
    expect(progressBetween('load', reps(77.5, 10), reps(80, 8))).toEqual({
      kind: 'weight',
      deltaKg: -2.5,
      improved: false,
    });
  });

  it('puis les répétitions à charge égale', () => {
    expect(progressBetween('load', reps(80, 9), reps(80, 8))).toEqual({ kind: 'reps', delta: 1, improved: true });
    expect(progressBetween('load', reps(80, 8), reps(80, 8))).toEqual({ kind: 'equal' });
  });

  it('moins d’assistance est un progrès', () => {
    expect(progressBetween('assistance', reps(20, 8), reps(30, 8))).toEqual({
      kind: 'weight',
      deltaKg: -10,
      improved: true,
    });
  });

  it('en durée, compare les secondes', () => {
    expect(progressBetween('duration', hold(60), hold(45))).toEqual({ kind: 'duration', deltaSeconds: 15, improved: true });
    expect(progressBetween('duration', hold(45), hold(45))).toEqual({ kind: 'equal' });
  });
});

describe('volume', () => {
  it('additionne charge × répétitions des séries validées, exercices à charge seulement', () => {
    const w = workout('w', '2026-11-06T18:00:00Z', null, [
      exercise('bench', 'load', [reps(80, 8), reps(80, 7), null]),
      exercise('pull-up', 'added_weight', [reps(10, 8)]),
      exercise('assisted', 'assistance', [reps(20, 8)]),
      exercise('plank', 'duration', [hold(60, 10)]),
    ]);
    expect(volumeKg(w)).toBe(80 * 8 + 80 * 7);
  });
});

describe('récapitulatif de séance', () => {
  const previous = workout('prev', '2026-11-03T18:00:00Z', '2026-11-03T19:00:00Z', [
    exercise('bench', 'load', [reps(80, 8), reps(80, 7)]),
  ]);

  const today = workout('today', '2026-11-06T18:00:00Z', '2026-11-06T19:02:00Z', [
    exercise('bench', 'load', [reps(82.5, 6), reps(80, 7), reps(80, 6)]),
    exercise('curl', 'load', [reps(14, 12), null]),
    exercise('skipped', 'load', [null, null]),
  ]);

  it('donne durée, séries, volume et progression par exercice', () => {
    const recap = summarizeWorkout(today, [previous, today], '2030-01-01T00:00:00Z');
    expect(recap.durationSeconds).toBe(62 * 60);
    expect(recap.completedSets).toBe(4);
    expect(recap.volumeKg).toBe(82.5 * 6 + 80 * 7 + 80 * 6 + 14 * 12);
    expect(recap.exercises).toEqual([
      {
        workoutExerciseId: 'bench-x',
        exerciseId: 'bench',
        name: 'bench',
        inputKind: 'load',
        completedSets: 3,
        best: reps(82.5, 6),
        progress: { kind: 'weight', deltaKg: 2.5, improved: true },
      },
      expect.objectContaining({ exerciseId: 'curl', completedSets: 1, progress: { kind: 'first_time' } }),
    ]);
  });

  it('fonctionne pour une séance en cours, jusqu’à maintenant', () => {
    const inProgress = { ...today, finishedAt: null };
    expect(summarizeWorkout(inProgress, [previous], '2026-11-06T18:30:00Z').durationSeconds).toBe(1800);
  });
});
