import type { Exercise, LocalDate, Program, RestTimer, Workout } from '@repforge/domain';

/**
 * Ports : ce dont les cas d'utilisation ont besoin, sans dire comment c'est
 * fait. L'implémentation actuelle est Dexie (IndexedDB) ; l'étape 4 ajoutera
 * la synchronisation sans changer les cas d'utilisation.
 */

export interface ProgramRepository {
  list(): Promise<Program[]>;
  get(id: string): Promise<Program | undefined>;
  save(program: Program): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface WorkoutRepository {
  get(id: string): Promise<Workout | undefined>;
  findInProgress(): Promise<Workout | undefined>;
  /** Séances terminées, la plus récente d'abord. */
  listFinished(): Promise<Workout[]>;
  save(workout: Workout): Promise<void>;
  delete(id: string): Promise<void>;
}

/** Repos validé : sert au calendrier (jours passés). */
export interface RestDay {
  readonly id: string;
  readonly programId: string;
  readonly stepId: string;
  readonly name: string;
  readonly date: LocalDate;
}

export interface RestDayRepository {
  list(): Promise<RestDay[]>;
  add(restDay: RestDay): Promise<void>;
}

export interface SettingsRepository {
  getActiveProgramId(): Promise<string | undefined>;
  setActiveProgramId(id: string | undefined): Promise<void>;
  getRestTimer(): Promise<RestTimer | undefined>;
  setRestTimer(timer: RestTimer | undefined): Promise<void>;
}

export interface Catalog {
  all(): readonly Exercise[];
}

export interface Clock {
  now(): Date;
}

/** Exécute plusieurs écritures de façon atomique (tout ou rien). */
export type Transaction = <T>(work: () => Promise<T>) => Promise<T>;

export interface Dependencies {
  readonly programs: ProgramRepository;
  readonly workouts: WorkoutRepository;
  readonly restDays: RestDayRepository;
  readonly settings: SettingsRepository;
  readonly catalog: Catalog;
  readonly clock: Clock;
  /** Identifiants uniques générés sur l'appareil (UUID) : envois idempotents. */
  readonly newId: () => string;
  readonly transaction: Transaction;
}
