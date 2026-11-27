import { describe, expect, it } from 'vitest';
import type { InputKind } from '../catalog/exercise';
import { rangeTarget } from '../program/rep-target';
import { exerciseHistory, exerciseRecord, exercisesDone } from './exercise-history';
import type { SetPerformance, Workout, WorkoutExercise } from './workout';

const reps = (weightKg: number | null, count: number, rir: number | null = null): SetPerformance => ({ kind: 'reps', weightKg, reps: count, rir });
const hold = (seconds: number): SetPerformance => ({ kind: 'duration', weightKg: null, seconds });

function exercise(exerciseId: string, inputKind: InputKind, performances: (SetPerformance | null)[], name = exerciseId): WorkoutExercise {
  return {
    id: `${exerciseId}-x`,
    exerciseId,
    name,
    inputKind,
    loadConvention: '',
    target: rangeTarget(8, 12),
    restSeconds: 90,
    sets: performances.map((performance, i) => ({ id: `${exerciseId}-${i}`, performance })),
  };
}

function workout(id: string, day: number, exercises: WorkoutExercise[], finished = true): Workout {
  const at = `2026-11-${String(day).padStart(2, '0')}T18:00:00.000Z`;
  return { id, programId: 'p', stepId: 's', name: `Séance ${id}`, startedAt: at, finishedAt: finished ? at : null, exercises };
}

const history = [
  workout('w1', 3, [exercise('bench', 'load', [reps(80, 8), reps(80, 6)]), exercise('plank', 'duration', [hold(60)])]),
  workout('w2', 10, [exercise('bench', 'load', [reps(82.5, 5, 1), null])]),
  workout('w3', 6, [exercise('bench', 'load', [null, null]), exercise('plank', 'duration', [hold(75)])]), // bench sans série validée
  workout('w4', 12, [exercise('bench', 'load', [reps(90, 1)])], false), // en cours : ne compte pas
];

describe('historique d’un exercice', () => {
  it('liste les séances terminées où il a des séries validées, la plus récente d’abord', () => {
    const sessions = exerciseHistory(history, 'bench');
    expect(sessions.map((s) => s.workoutId)).toEqual(['w2', 'w1']);
    expect(sessions[0]).toMatchObject({ workoutName: 'Séance w2', exerciseName: 'bench', inputKind: 'load', sets: [reps(82.5, 5, 1)] });
    expect(sessions[1]?.sets).toEqual([reps(80, 8), reps(80, 6)]);
  });

  it('jamais fait : liste vide, pas de record', () => {
    expect(exerciseHistory(history, 'squat')).toEqual([]);
    expect(exerciseRecord([])).toBeUndefined();
  });

  it('la meilleure série de tout l’historique, avec sa date', () => {
    expect(exerciseRecord(exerciseHistory(history, 'bench'))).toEqual({ performance: reps(82.5, 5, 1), finishedAt: '2026-11-10T18:00:00.000Z' });
    expect(exerciseRecord(exerciseHistory(history, 'plank'))?.performance).toEqual(hold(75));
  });

  it('à égalité, le record date du jour où il a été établi', () => {
    const tied = [workout('a', 1, [exercise('bench', 'load', [reps(80, 8)])]), workout('b', 9, [exercise('bench', 'load', [reps(80, 8)])])];
    expect(exerciseRecord(exerciseHistory(tied, 'bench'))?.finishedAt).toBe('2026-11-01T18:00:00.000Z');
  });
});

describe('exercices déjà faits', () => {
  it('du plus récent au plus ancien, avec le nombre de séances et le dernier nom', () => {
    const renamed = [...history, workout('w5', 11, [exercise('plank', 'duration', [hold(80)], 'Gainage (planche)')])];
    expect(exercisesDone(renamed)).toEqual([
      { exerciseId: 'plank', name: 'Gainage (planche)', lastDoneAt: '2026-11-11T18:00:00.000Z', sessionCount: 3 },
      { exerciseId: 'bench', name: 'bench', lastDoneAt: '2026-11-10T18:00:00.000Z', sessionCount: 2 },
    ]);
  });
});
