/**
 * Données de test partagées (non exportées par le package).
 * Reprend le programme « PPL · cycle de 5 jours » de la maquette.
 */
import type { Exercise } from '../catalog/exercise';
import type { PlannedExercise, Program, ProgramStep } from '../program/program';
import { rangeTarget } from '../program/rep-target';
import { localDate, type LocalDate } from '../shared/local-date';

export const TODAY: LocalDate = localDate('2026-11-06');

export const exercises = {
  benchPress: {
    id: 'bench-press',
    name: 'Développé couché (barre)',
    muscleGroup: 'chest',
    equipment: 'barbell',
    inputKind: 'load',
    loadConvention: 'Poids total, barre incluse',
  },
  pullUp: {
    id: 'pull-up',
    name: 'Tractions',
    muscleGroup: 'back',
    equipment: 'bodyweight',
    inputKind: 'added_weight',
    loadConvention: 'Lest ajouté, hors poids du corps',
  },
  assistedPullUp: {
    id: 'assisted-pull-up',
    name: 'Tractions assistées',
    muscleGroup: 'back',
    equipment: 'machine',
    inputKind: 'assistance',
    loadConvention: 'Assistance retirée de ton poids',
  },
  plank: {
    id: 'plank',
    name: 'Gainage',
    muscleGroup: 'abs',
    equipment: 'bodyweight',
    inputKind: 'duration',
    loadConvention: 'Durée en secondes, lest facultatif',
  },
} as const satisfies Record<string, Exercise>;

export const catalog: readonly Exercise[] = Object.values(exercises);

export function planned(id: string, exerciseId: string, sets = 3, min = 8, max = 12): PlannedExercise {
  return { id, exerciseId, sets, target: rangeTarget(min, max), restSeconds: 120 };
}

export const pplSteps: readonly ProgramStep[] = [
  {
    kind: 'workout',
    id: 'push',
    name: 'Push',
    exercises: [planned('push-1', 'bench-press', 3, 6, 8)],
  },
  { kind: 'workout', id: 'pull', name: 'Pull', exercises: [planned('pull-1', 'pull-up', 3, 6, 10)] },
  { kind: 'rest', id: 'rest-1', name: 'Repos' },
  { kind: 'workout', id: 'legs', name: 'Jambes', exercises: [planned('legs-1', 'plank', 3, 45, 45)] },
  { kind: 'rest', id: 'rest-2', name: 'Repos' },
];

export function pplProgram(cursor = 0, anchor: LocalDate = TODAY): Program {
  return { id: 'ppl', name: 'PPL · cycle de 5 jours', steps: pplSteps, schedule: { cursor, anchor } };
}

/** Générateur d'identifiants déterministe pour les tests. */
export function sequentialIds(prefix = 'id'): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}
