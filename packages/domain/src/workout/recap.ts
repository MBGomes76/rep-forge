import type { InputKind } from '../catalog/exercise';
import { previousPerformance } from './previous-performance';
import { completedSets, workoutDurationSeconds, type SetPerformance, type Workout } from './workout';

/** Progression de la meilleure série par rapport à la séance précédente. */
export type Progress =
  | { readonly kind: 'first_time' }
  | { readonly kind: 'equal' }
  | { readonly kind: 'weight'; readonly deltaKg: number; readonly improved: boolean }
  | { readonly kind: 'reps'; readonly delta: number; readonly improved: boolean }
  | { readonly kind: 'duration'; readonly deltaSeconds: number; readonly improved: boolean };

export interface ExerciseRecap {
  readonly workoutExerciseId: string;
  readonly exerciseId: string;
  readonly name: string;
  readonly inputKind: InputKind;
  readonly completedSets: number;
  readonly best: SetPerformance;
  readonly progress: Progress;
}

export interface WorkoutRecap {
  readonly durationSeconds: number;
  readonly completedSets: number;
  /** Somme charge × répétitions des exercices à charge (voir `volumeKg`). */
  readonly volumeKg: number;
  /** Exercices avec au moins une série validée, dans l'ordre de la séance. */
  readonly exercises: readonly ExerciseRecap[];
}

const weightOf = (p: SetPerformance): number => p.weightKg ?? 0;
const amountOf = (p: SetPerformance): number => (p.kind === 'reps' ? p.reps : p.seconds);

/**
 * Compare deux séries : > 0 si `a` est meilleure.
 * - charge et lest : le plus lourd, puis le plus de répétitions ;
 * - assistance : la moins assistée, puis le plus de répétitions ;
 * - durée : la plus longue, puis la plus lestée.
 */
export function compareSets(inputKind: InputKind, a: SetPerformance, b: SetPerformance): number {
  if (inputKind === 'duration') return amountOf(a) - amountOf(b) || weightOf(a) - weightOf(b);
  const weightDiff = inputKind === 'assistance' ? weightOf(b) - weightOf(a) : weightOf(a) - weightOf(b);
  return weightDiff || amountOf(a) - amountOf(b);
}

export function bestSet(inputKind: InputKind, performances: readonly SetPerformance[]): SetPerformance | undefined {
  return performances.reduce<SetPerformance | undefined>(
    (best, p) => (best === undefined || compareSets(inputKind, p, best) > 0 ? p : best),
    undefined,
  );
}

/** Compare la meilleure série du jour à la meilleure de la fois précédente. */
export function progressBetween(
  inputKind: InputKind,
  today: SetPerformance,
  previousBest: SetPerformance | undefined,
): Progress {
  if (!previousBest) return { kind: 'first_time' };

  if (inputKind === 'duration') {
    const deltaSeconds = amountOf(today) - amountOf(previousBest);
    return deltaSeconds === 0 ? { kind: 'equal' } : { kind: 'duration', deltaSeconds, improved: deltaSeconds > 0 };
  }

  const deltaKg = weightOf(today) - weightOf(previousBest);
  if (deltaKg !== 0) {
    // Moins d'assistance = progrès.
    return { kind: 'weight', deltaKg, improved: inputKind === 'assistance' ? deltaKg < 0 : deltaKg > 0 };
  }
  const delta = amountOf(today) - amountOf(previousBest);
  return delta === 0 ? { kind: 'equal' } : { kind: 'reps', delta, improved: delta > 0 };
}

/**
 * Volume (tonnage) d'une séance : somme de charge × répétitions des séries
 * validées, pour les exercices à charge uniquement. Le lest, l'assistance et
 * le gainage n'y entrent pas : sans le poids du corps, le chiffre serait
 * trompeur. La charge est comptée telle que saisie, selon la convention de
 * l'exercice (ex. un seul haltère pour « poids par haltère »).
 */
export function volumeKg(workout: Workout): number {
  return workout.exercises
    .filter((e) => e.inputKind === 'load')
    .flatMap((e) => completedSets(e))
    .reduce((sum, { performance: p }) => sum + (p.kind === 'reps' ? weightOf(p) * p.reps : 0), 0);
}

/**
 * Récapitulatif d'une séance (terminée, ou en cours jusqu'à `now`), comparé à
 * la dernière fois pour chaque exercice.
 */
export function summarizeWorkout(workout: Workout, history: readonly Workout[], now: string): WorkoutRecap {
  const exercises: ExerciseRecap[] = [];
  let totalSets = 0;

  for (const exercise of workout.exercises) {
    const done = completedSets(exercise).map((s) => s.performance);
    const best = bestSet(exercise.inputKind, done);
    if (!best) continue;
    totalSets += done.length;

    const previous = previousPerformance(history, exercise.exerciseId, { excludeWorkoutId: workout.id });
    const previousBest = previous && bestSet(exercise.inputKind, previous);
    exercises.push({
      workoutExerciseId: exercise.id,
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      inputKind: exercise.inputKind,
      completedSets: done.length,
      best,
      progress: progressBetween(exercise.inputKind, best, previousBest),
    });
  }

  return {
    durationSeconds: workoutDurationSeconds(workout, now),
    completedSets: totalSets,
    volumeKg: volumeKg(workout),
    exercises,
  };
}
