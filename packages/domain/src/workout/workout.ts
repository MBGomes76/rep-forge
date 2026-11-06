import type { Exercise, InputKind } from '../catalog/exercise';
import { currentStep } from '../program/cycle';
import type { Program } from '../program/program';
import type { RepTarget } from '../program/rep-target';
import { DomainError } from '../shared/domain-error';

/**
 * Résultat d'une série validée.
 * `weightKg` se lit selon le type de saisie de l'exercice : charge, lest ou
 * assistance (`null` = rien, c'est-à-dire poids du corps seul).
 */
export type SetPerformance =
  | { readonly kind: 'reps'; readonly weightKg: number | null; readonly reps: number; readonly rir: number | null }
  | { readonly kind: 'duration'; readonly weightKg: number | null; readonly seconds: number };

export interface WorkoutSet {
  /** Généré côté client : rend les envois au serveur idempotents. */
  readonly id: string;
  /** `null` tant que la série n'est pas validée. */
  readonly performance: SetPerformance | null;
}

/** Exercice d'une séance : copie figée de ce que prévoyait le programme au démarrage. */
export interface WorkoutExercise {
  readonly id: string;
  readonly exerciseId: string;
  readonly name: string;
  readonly inputKind: InputKind;
  readonly loadConvention: string;
  readonly target: RepTarget;
  readonly restSeconds: number;
  readonly sets: readonly WorkoutSet[];
}

export interface Workout {
  readonly id: string;
  readonly programId: string;
  readonly stepId: string;
  readonly name: string;
  /** Instants ISO 8601 complets (avec l'heure), pas des jours. */
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly exercises: readonly WorkoutExercise[];
}

export interface StartWorkoutInput {
  readonly id: string;
  readonly program: Program;
  readonly catalog: readonly Exercise[];
  readonly startedAt: string;
  readonly newId: () => string;
}

/**
 * Démarre la séance de l'étape courante.
 *
 * La séance est un INSTANTANÉ : tout est copié (objectifs, repos, nom et type
 * de saisie de l'exercice). Modifier ensuite le programme ou le catalogue ne
 * change ni cette séance ni l'historique.
 */
export function startWorkout({ id, program, catalog, startedAt, newId }: StartWorkoutInput): Workout {
  const step = currentStep(program);
  if (step?.kind !== 'workout') {
    throw new DomainError("L'étape courante n'est pas un entraînement.");
  }
  return {
    id,
    programId: program.id,
    stepId: step.id,
    name: step.name,
    startedAt,
    finishedAt: null,
    exercises: step.exercises.map((planned) => {
      const exercise = catalog.find((e) => e.id === planned.exerciseId);
      if (!exercise) throw new DomainError(`Exercice introuvable dans le catalogue : ${planned.exerciseId}.`);
      return {
        id: newId(),
        exerciseId: exercise.id,
        name: exercise.name,
        inputKind: exercise.inputKind,
        loadConvention: exercise.loadConvention,
        target: { ...planned.target },
        restSeconds: planned.restSeconds,
        sets: Array.from({ length: planned.sets }, () => ({ id: newId(), performance: null })),
      };
    }),
  };
}

export function isInProgress(workout: Workout): boolean {
  return workout.finishedAt === null;
}

/** Séance commencée et non terminée, pour « Reprendre l'entraînement ». */
export function findWorkoutInProgress(workouts: readonly Workout[]): Workout | undefined {
  return workouts.find(isInProgress);
}

export function completedSets(exercise: WorkoutExercise): (WorkoutSet & { readonly performance: SetPerformance })[] {
  return exercise.sets.filter((s): s is WorkoutSet & { performance: SetPerformance } => s.performance !== null);
}

function assertInProgress(workout: Workout): void {
  if (!isInProgress(workout)) throw new DomainError('Cette séance est déjà terminée.');
}

function updateExercise(
  workout: Workout,
  workoutExerciseId: string,
  update: (exercise: WorkoutExercise) => WorkoutExercise,
): Workout {
  assertInProgress(workout);
  if (!workout.exercises.some((e) => e.id === workoutExerciseId)) {
    throw new DomainError('Exercice introuvable dans la séance.');
  }
  return {
    ...workout,
    exercises: workout.exercises.map((e) => (e.id === workoutExerciseId ? update(e) : e)),
  };
}

/**
 * Valide une série, ou corrige une série déjà validée.
 * Pour remplir les champs vides avec la dernière performance, passer d'abord
 * par `resolveSetInput`.
 */
export function recordSet(
  workout: Workout,
  workoutExerciseId: string,
  setId: string,
  performance: SetPerformance,
): Workout {
  return updateExercise(workout, workoutExerciseId, (exercise) => {
    assertValidPerformance(exercise.inputKind, performance);
    if (!exercise.sets.some((s) => s.id === setId)) throw new DomainError('Série introuvable.');
    return { ...exercise, sets: exercise.sets.map((s) => (s.id === setId ? { ...s, performance } : s)) };
  });
}

/** Annule la validation d'une série (pour la corriger avant de la revalider). */
export function unrecordSet(workout: Workout, workoutExerciseId: string, setId: string): Workout {
  return updateExercise(workout, workoutExerciseId, (exercise) => {
    if (!exercise.sets.some((s) => s.id === setId)) throw new DomainError('Série introuvable.');
    return { ...exercise, sets: exercise.sets.map((s) => (s.id === setId ? { ...s, performance: null } : s)) };
  });
}

/** Ajoute une série vide à la fin de l'exercice. */
export function addSet(workout: Workout, workoutExerciseId: string, setId: string): Workout {
  return updateExercise(workout, workoutExerciseId, (exercise) => ({
    ...exercise,
    sets: [...exercise.sets, { id: setId, performance: null }],
  }));
}

/** Termine la séance. Il faut au moins une série validée. */
export function finishWorkout(workout: Workout, finishedAt: string): Workout {
  assertInProgress(workout);
  if (!workout.exercises.some((e) => completedSets(e).length > 0)) {
    throw new DomainError('Valide au moins une série avant de terminer la séance.');
  }
  if (Date.parse(finishedAt) < Date.parse(workout.startedAt)) {
    throw new DomainError('La fin de la séance ne peut pas précéder son début.');
  }
  return { ...workout, finishedAt };
}

/** Durée de la séance en secondes, jusqu'à sa fin ou jusqu'à `now` si elle est en cours. */
export function workoutDurationSeconds(workout: Workout, now: string): number {
  const end = workout.finishedAt ?? now;
  return Math.max(0, Math.floor((Date.parse(end) - Date.parse(workout.startedAt)) / 1000));
}

// --- Validation d'une série --------------------------------------------------

export function expectedPerformanceKind(inputKind: InputKind): SetPerformance['kind'] {
  return inputKind === 'duration' ? 'duration' : 'reps';
}

function assertValidPerformance(inputKind: InputKind, performance: SetPerformance): void {
  if (performance.kind !== expectedPerformanceKind(inputKind)) {
    throw new DomainError('Le type de saisie ne correspond pas à cet exercice.');
  }
  const { weightKg } = performance;
  if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
    throw new DomainError('Le poids doit être un nombre positif.');
  }
  if (inputKind === 'load' && weightKg === null) {
    throw new DomainError('Saisis la charge.');
  }
  if (performance.kind === 'reps') {
    if (!Number.isInteger(performance.reps) || performance.reps < 1) {
      throw new DomainError('Le nombre de répétitions doit être un entier supérieur ou égal à 1.');
    }
    if (performance.rir !== null && (!Number.isInteger(performance.rir) || performance.rir < 0 || performance.rir > 10)) {
      throw new DomainError('Le RIR doit être un entier entre 0 et 10.');
    }
  } else if (!Number.isInteger(performance.seconds) || performance.seconds < 1) {
    throw new DomainError('La durée doit être un nombre entier de secondes supérieur ou égal à 1.');
  }
}

/** Ce que l'utilisateur a saisi pour une série. Un champ absent ou `null` est vide. */
export interface SetInput {
  readonly weightKg?: number | null;
  readonly reps?: number | null;
  readonly seconds?: number | null;
  readonly rir?: number | null;
}

/**
 * Transforme la saisie en résultat de série. Chaque champ vide (poids,
 * répétitions, durée) reprend la valeur de la dernière fois. Le RIR n'est pas
 * repris : c'est un ressenti propre à chaque série.
 */
export function resolveSetInput(
  inputKind: InputKind,
  input: SetInput,
  previous: SetPerformance | undefined,
): SetPerformance {
  const last = previous?.kind === expectedPerformanceKind(inputKind) ? previous : undefined;
  const weightKg = input.weightKg ?? last?.weightKg ?? null;
  let performance: SetPerformance;

  if (inputKind === 'duration') {
    const seconds = input.seconds ?? (last?.kind === 'duration' ? last.seconds : null);
    if (seconds === null) throw new DomainError('Saisis la durée.');
    performance = { kind: 'duration', weightKg, seconds };
  } else {
    const reps = input.reps ?? (last?.kind === 'reps' ? last.reps : null);
    if (reps === null) throw new DomainError('Saisis les répétitions.');
    performance = { kind: 'reps', weightKg, reps, rir: input.rir ?? null };
  }

  assertValidPerformance(inputKind, performance);
  return performance;
}
