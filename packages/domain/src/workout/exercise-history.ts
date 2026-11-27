import type { InputKind } from '../catalog/exercise';
import { bestSet, compareSets } from './recap';
import { completedSets, type SetPerformance, type Workout } from './workout';

/**
 * Historique d'un exercice, reconstitué à partir des séances terminées (des
 * instantanés : les noms et les séries sont ceux du jour où la séance a été
 * faite). Toutes les séances comptent, quel que soit le programme.
 */

/** Une séance où l'exercice a été fait, avec ses séries validées. */
export interface ExerciseSession {
  readonly workoutId: string;
  readonly workoutName: string;
  /** Nom de l'exercice ce jour-là. */
  readonly exerciseName: string;
  /** Instant ISO de fin de séance. */
  readonly finishedAt: string;
  readonly inputKind: InputKind;
  readonly sets: readonly SetPerformance[];
}

export interface ExerciseRecord {
  readonly performance: SetPerformance;
  readonly finishedAt: string;
}

/** Un exercice déjà fait, pour la liste de l'onglet Historique. */
export interface ExerciseDone {
  readonly exerciseId: string;
  /** Nom lors de la séance la plus récente. */
  readonly name: string;
  readonly lastDoneAt: string;
  readonly sessionCount: number;
}

/** Séances terminées, de la plus récente à la plus ancienne. */
function finishedNewestFirst(workouts: readonly Workout[]): (Workout & { readonly finishedAt: string })[] {
  return workouts
    .filter((w): w is Workout & { finishedAt: string } => w.finishedAt !== null)
    .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt));
}

/** Les séances où l'exercice a au moins une série validée, la plus récente d'abord. */
export function exerciseHistory(workouts: readonly Workout[], exerciseId: string): ExerciseSession[] {
  return finishedNewestFirst(workouts).flatMap((workout) => {
    const done = workout.exercises.filter((e) => e.exerciseId === exerciseId);
    const sets = done.flatMap((e) => completedSets(e).map((s) => s.performance));
    if (sets.length === 0) return [];
    return [{ workoutId: workout.id, workoutName: workout.name, exerciseName: done[0]!.name, finishedAt: workout.finishedAt, inputKind: done[0]!.inputKind, sets }];
  });
}

/**
 * Meilleure série de tout l'historique (la plus lourde, la moins assistée ou la
 * plus longue : voir `compareSets`), avec sa date. À égalité, la plus ancienne :
 * c'est le jour où le record a été établi.
 */
export function exerciseRecord(sessions: readonly ExerciseSession[]): ExerciseRecord | undefined {
  let record: ExerciseRecord | undefined;
  for (const session of [...sessions].reverse()) {
    const best = bestSet(session.inputKind, session.sets);
    if (best && (!record || compareSets(session.inputKind, best, record.performance) > 0)) {
      record = { performance: best, finishedAt: session.finishedAt };
    }
  }
  return record;
}

/** Exercices déjà faits, du plus récemment fait au plus ancien. */
export function exercisesDone(workouts: readonly Workout[]): ExerciseDone[] {
  const byId = new Map<string, { name: string; lastDoneAt: string; sessionCount: number }>();
  for (const workout of finishedNewestFirst(workouts)) {
    const counted = new Set<string>();
    for (const exercise of workout.exercises) {
      if (completedSets(exercise).length === 0 || counted.has(exercise.exerciseId)) continue;
      counted.add(exercise.exerciseId);
      const known = byId.get(exercise.exerciseId);
      if (known) known.sessionCount++;
      else byId.set(exercise.exerciseId, { name: exercise.name, lastDoneAt: workout.finishedAt, sessionCount: 1 });
    }
  }
  return [...byId].map(([exerciseId, done]) => ({ exerciseId, ...done }));
}
