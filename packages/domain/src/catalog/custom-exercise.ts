import { DomainError } from '../shared/domain-error';
import type { Equipment, Exercise, InputKind, MuscleGroup } from './exercise';

/**
 * Exercice créé par l'utilisateur (machine propre à sa salle, variante…).
 * Il se synchronise comme le reste et s'utilise comme un exercice du catalogue.
 *
 * - Le type de saisie est fixé à la création : le changer rendrait illisibles
 *   les performances déjà enregistrées (des kilos lus comme des secondes…).
 * - On ne le supprime pas, on l'archive : il disparaît du catalogue, mais les
 *   programmes qui l'utilisent continuent de fonctionner.
 */
export interface CustomExercise extends Exercise {
  readonly archived: boolean;
}

export interface CustomExerciseInput {
  readonly name: string;
  readonly muscleGroup: MuscleGroup;
  readonly equipment: Equipment;
  readonly loadConvention: string;
}

export const EXERCISE_NAME_MAX_LENGTH = 60;

/** Convention de charge proposée par défaut, selon ce que l'on saisit et le matériel. */
export function suggestLoadConvention(inputKind: InputKind, equipment: Equipment): string {
  switch (inputKind) {
    case 'added_weight':
      return 'Lest ajouté, hors poids du corps';
    case 'assistance':
      return 'Assistance retirée de ton poids';
    case 'duration':
      return 'Durée en secondes, lest facultatif';
    case 'load':
      switch (equipment) {
        case 'barbell':
          return 'Poids total, barre incluse';
        case 'dumbbell':
          return 'Poids par haltère';
        case 'cable':
          return 'Charge affichée sur la pile';
        case 'machine':
          return 'Charge affichée sur la machine';
        case 'bodyweight':
          return 'Charge ajoutée';
      }
  }
}

function checked(input: CustomExerciseInput): CustomExerciseInput {
  const name = input.name.trim();
  if (!name) throw new DomainError('Donne un nom à l’exercice.');
  if (name.length > EXERCISE_NAME_MAX_LENGTH) {
    throw new DomainError(`Le nom ne doit pas dépasser ${EXERCISE_NAME_MAX_LENGTH} caractères.`);
  }
  const loadConvention = input.loadConvention.trim();
  if (!loadConvention) throw new DomainError('Précise la convention de charge (ex. « Poids par haltère »).');
  return { ...input, name, loadConvention };
}

export function createCustomExercise(id: string, inputKind: InputKind, input: CustomExerciseInput): CustomExercise {
  return { id, inputKind, ...checked(input), archived: false };
}

/** Modifie un exercice personnalisé : tout sauf son identifiant et son type de saisie. */
export function updateCustomExercise(exercise: CustomExercise, input: CustomExerciseInput): CustomExercise {
  return { ...exercise, ...checked(input) };
}

export function archiveCustomExercise(exercise: CustomExercise): CustomExercise {
  return { ...exercise, archived: true };
}

/**
 * Exercices proposés dans le catalogue : ceux de l'app, puis ceux de
 * l'utilisateur qui ne sont pas archivés.
 */
export function availableExercises(builtIn: readonly Exercise[], custom: readonly CustomExercise[]): Exercise[] {
  return [...builtIn, ...custom.filter((e) => !e.archived)];
}
