import type { Equipment, Exercise, MuscleGroup } from './exercise';

/** Minuscules, sans accents ni espaces superflus : « Écartés » → « ecartes ». */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ExerciseFilter {
  readonly query?: string;
  readonly muscleGroup?: MuscleGroup | null;
  readonly equipment?: Equipment | null;
}

/**
 * Recherche par nom (insensible aux accents et à la casse, chaque mot de la
 * recherche doit apparaître) et filtres par groupe musculaire et matériel.
 */
export function searchExercises(catalog: readonly Exercise[], filter: ExerciseFilter): Exercise[] {
  const words = normalizeForSearch(filter.query ?? '')
    .split(' ')
    .filter(Boolean);
  return catalog.filter((exercise) => {
    if (filter.muscleGroup && exercise.muscleGroup !== filter.muscleGroup) return false;
    if (filter.equipment && exercise.equipment !== filter.equipment) return false;
    const name = normalizeForSearch(exercise.name);
    return words.every((word) => name.includes(word));
  });
}
