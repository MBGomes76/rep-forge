import type { Exercise } from '../catalog/exercise';
import { DomainError } from '../shared/domain-error';
import type { LocalDate } from '../shared/local-date';
import { fixedTarget, rangeTarget, type RepTarget } from './rep-target';
import { rirTarget, type RirTarget } from './rir-target';

/** Un exercice tel que prévu dans une séance du programme. */
export interface PlannedExercise {
  readonly id: string;
  readonly exerciseId: string;
  readonly sets: number;
  readonly target: RepTarget;
  /** Objectif de RIR, facultatif (absent = pas d'objectif). */
  readonly rirTarget?: RirTarget;
  readonly restSeconds: number;
}

export interface WorkoutStep {
  readonly kind: 'workout';
  readonly id: string;
  readonly name: string;
  /** Notes libres sur la séance (consignes, échauffement…). */
  readonly description?: string;
  readonly exercises: readonly PlannedExercise[];
}

export interface RestStep {
  readonly kind: 'rest';
  readonly id: string;
  readonly name: string;
}

export type ProgramStep = WorkoutStep | RestStep;

/**
 * Où en est l'utilisateur dans son cycle.
 * - `cursor` : index de l'étape courante dans `steps` ;
 * - `anchor` : date prévue de l'étape courante (voir `schedule.ts`).
 */
export interface ProgramSchedule {
  readonly cursor: number;
  readonly anchor: LocalDate;
}

export interface Program {
  readonly id: string;
  readonly name: string;
  /** Notes libres sur le programme (objectif, progression…). */
  readonly description?: string;
  readonly steps: readonly ProgramStep[];
  readonly schedule: ProgramSchedule;
}

/** Réglages appliqués à un exercice ajouté à une séance. Modifiables par l'utilisateur. */
export interface ExerciseDefaults {
  readonly sets: number;
  readonly repTarget: RepTarget;
  readonly durationTarget: RepTarget;
  readonly restSeconds: number;
  readonly durationRestSeconds: number;
}

export const DEFAULT_EXERCISE_SETTINGS: ExerciseDefaults = {
  sets: 3,
  repTarget: rangeTarget(8, 12),
  durationTarget: fixedTarget(45),
  restSeconds: 90,
  durationRestSeconds: 60,
};

export function planExercise(
  id: string,
  exercise: Exercise,
  defaults: ExerciseDefaults = DEFAULT_EXERCISE_SETTINGS,
): PlannedExercise {
  const isDuration = exercise.inputKind === 'duration';
  return {
    id,
    exerciseId: exercise.id,
    sets: defaults.sets,
    target: isDuration ? defaults.durationTarget : defaults.repTarget,
    restSeconds: isDuration ? defaults.durationRestSeconds : defaults.restSeconds,
  };
}

/** Vérifie les valeurs saisies pour un exercice prévu. */
export function assertValidPlannedExercise(planned: PlannedExercise): void {
  if (!Number.isInteger(planned.sets) || planned.sets < 1) {
    throw new DomainError('Il faut au moins une série.');
  }
  if (!Number.isInteger(planned.restSeconds) || planned.restSeconds < 0) {
    throw new DomainError('Le temps de repos doit être un nombre entier de secondes, positif ou nul.');
  }
  // Revalide l'objectif (il peut venir du stockage ou de l'API).
  if (planned.target.kind === 'range') rangeTarget(planned.target.min, planned.target.max);
  else fixedTarget(planned.target.value);
  if (planned.rirTarget) rirTarget(planned.rirTarget.min, planned.rirTarget.max);
}

/**
 * Déplace un exercice dans une séance (ordre d'exécution).
 * Le programme seul change : une séance déjà commencée garde son ordre.
 */
export function moveExercise(step: WorkoutStep, plannedId: string, toIndex: number): WorkoutStep {
  const from = step.exercises.findIndex((e) => e.id === plannedId);
  if (from === -1) throw new DomainError('Exercice introuvable dans la séance.');
  if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= step.exercises.length) {
    throw new DomainError('Position invalide.');
  }
  const exercises = [...step.exercises];
  const [moved] = exercises.splice(from, 1);
  exercises.splice(toIndex, 0, moved!);
  return { ...step, exercises };
}

/**
 * Copie d'un programme, pour en faire une variante. Tous les identifiants sont
 * neufs : la copie et l'original évoluent séparément, et l'historique de
 * l'original ne se mélange pas à celui de la copie. Le cycle de la copie
 * commence à la première étape, aujourd'hui.
 */
export function duplicateProgram(program: Program, newId: () => string, today: LocalDate): Program {
  return {
    ...program,
    id: newId(),
    name: `${program.name} (copie)`,
    steps: program.steps.map((step) =>
      step.kind === 'rest'
        ? { ...step, id: newId() }
        : { ...step, id: newId(), exercises: step.exercises.map((e) => ({ ...e, id: newId() })) },
    ),
    schedule: { cursor: 0, anchor: today },
  };
}
