import { completedSets, type SetPerformance, type Workout } from './workout';

/**
 * Performance précédente d'un exercice : les séries validées lors de la
 * dernière séance terminée qui contenait cet exercice (quel que soit le
 * programme). `undefined` si c'est la première fois.
 */
export function previousPerformance(
  history: readonly Workout[],
  exerciseId: string,
  options: { readonly excludeWorkoutId?: string } = {},
): readonly SetPerformance[] | undefined {
  const finished = history
    .filter((w) => w.finishedAt !== null && w.id !== options.excludeWorkoutId)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

  for (const workout of finished) {
    const performances = workout.exercises
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => completedSets(e).map((s) => s.performance));
    if (performances.length > 0) return performances;
  }
  return undefined;
}

/**
 * Performance à afficher sous la série n° `setIndex` : la même série la
 * dernière fois, ou à défaut la dernière série faite (séries ajoutées).
 */
export function previousForSet(
  previous: readonly SetPerformance[] | undefined,
  setIndex: number,
): SetPerformance | undefined {
  if (!previous) return undefined;
  return previous[setIndex] ?? previous.at(-1);
}
