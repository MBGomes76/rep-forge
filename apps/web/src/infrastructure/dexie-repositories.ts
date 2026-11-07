import type { Program, RestTimer, Workout } from '@repforge/domain';
import type {
  ProgramRepository,
  RestDay,
  RestDayRepository,
  SettingsRepository,
  Transaction,
  WorkoutRepository,
} from '../application/ports';
import type { Account } from '../application/remote';
import type { RepForgeDb, WorkoutRecord } from './db';

/** Implémentations Dexie des ports de l'application. */

function toWorkout({ state: _state, ...workout }: WorkoutRecord): Workout {
  return workout;
}

export function dexieProgramRepository(db: RepForgeDb): ProgramRepository {
  return {
    // Ordre alphabétique : prévisible (les identifiants sont des UUID aléatoires).
    list: async () => (await db.programs.toArray()).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    get: (id) => db.programs.get(id),
    save: async (program: Program) => {
      await db.programs.put(program);
    },
    delete: (id) => db.programs.delete(id),
  };
}

export function dexieWorkoutRepository(db: RepForgeDb): WorkoutRepository {
  return {
    get: async (id) => {
      const record = await db.workouts.get(id);
      return record && toWorkout(record);
    },
    findInProgress: async () => {
      const record = await db.workouts.where('state').equals('in_progress').first();
      return record && toWorkout(record);
    },
    listFinished: async () => {
      const records = await db.workouts.where('state').equals('finished').toArray();
      return records.map(toWorkout).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },
    save: async (workout) => {
      await db.workouts.put({ ...workout, state: workout.finishedAt === null ? 'in_progress' : 'finished' });
    },
    delete: (id) => db.workouts.delete(id),
  };
}

export function dexieRestDayRepository(db: RepForgeDb): RestDayRepository {
  return {
    list: () => db.restDays.toArray(),
    add: async (restDay: RestDay) => {
      await db.restDays.put(restDay);
    },
  };
}

const ACTIVE_PROGRAM = 'activeProgramId';
const REST_TIMER = 'restTimer';
const ACCOUNT = 'account';

export function dexieSettingsRepository(db: RepForgeDb): SettingsRepository {
  async function read<T>(key: string): Promise<T | undefined> {
    return (await db.settings.get(key))?.value as T | undefined;
  }
  async function write(key: string, value: unknown): Promise<void> {
    if (value === undefined) await db.settings.delete(key);
    else await db.settings.put({ key, value });
  }
  return {
    getActiveProgramId: () => read<string>(ACTIVE_PROGRAM),
    setActiveProgramId: (id) => write(ACTIVE_PROGRAM, id),
    getRestTimer: () => read<RestTimer>(REST_TIMER),
    setRestTimer: (timer) => write(REST_TIMER, timer),
    getAccount: () => read<Account>(ACCOUNT),
    setAccount: (account) => write(ACCOUNT, account),
  };
}

/** Transaction Dexie sur toutes les tables : tout est écrit, ou rien. */
export function dexieTransaction(db: RepForgeDb): Transaction {
  return (work) => db.transaction('rw', [db.programs, db.workouts, db.restDays, db.settings], work);
}

/** Vide toutes les tables (déconnexion : rien ne reste sur l'appareil). */
export function dexieClearAll(db: RepForgeDb): () => Promise<void> {
  return () => db.transaction('rw', db.tables, () => Promise.all(db.tables.map((table) => table.clear())).then(() => undefined));
}
