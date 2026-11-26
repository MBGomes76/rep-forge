import type { Program, RestTimer, Workout } from '@repforge/domain';
import type {
  ProgramDraftRepository,
  ProgramRepository,
  RestDay,
  RestDayRepository,
  SettingsRepository,
  Transaction,
  WorkoutRepository,
} from '../application/ports';
import type { Account } from '../application/remote';
import type { RepForgeDb, WorkoutRecord } from './db';
import { markChanged, SYNCED_SETTING, trackedTables } from './dexie-sync-store';

/**
 * Implémentations Dexie des ports de l'application. Chaque écriture d'une
 * donnée synchronisée la marque « à envoyer », dans la même transaction.
 */

function toWorkout({ state: _state, ...workout }: WorkoutRecord): Workout {
  return workout;
}

export function dexieProgramRepository(db: RepForgeDb): ProgramRepository {
  return {
    // Ordre alphabétique : prévisible (les identifiants sont des UUID aléatoires).
    list: async () => (await db.programs.toArray()).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    get: (id) => db.programs.get(id),
    save: (program: Program) =>
      db.transaction('rw', db.programs, db.syncState, async () => {
        await db.programs.put(program);
        await markChanged(db, 'programs', program.id);
      }),
    delete: (id) =>
      db.transaction('rw', db.programs, db.syncState, async () => {
        await db.programs.delete(id);
        await markChanged(db, 'programs', id);
      }),
  };
}

/** Brouillons : table locale, sans marquage pour la synchronisation. */
export function dexieProgramDraftRepository(db: RepForgeDb): ProgramDraftRepository {
  return {
    get: (programId) => db.programDrafts.get(programId),
    listIds: async () => (await db.programDrafts.toCollection().primaryKeys()) as string[],
    save: async (draft) => {
      await db.programDrafts.put(draft);
    },
    delete: (programId) => db.programDrafts.delete(programId),
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
    save: (workout) =>
      db.transaction('rw', db.workouts, db.syncState, async () => {
        await db.workouts.put({ ...workout, state: workout.finishedAt === null ? 'in_progress' : 'finished' });
        await markChanged(db, 'workouts', workout.id);
      }),
    delete: (id) =>
      db.transaction('rw', db.workouts, db.syncState, async () => {
        await db.workouts.delete(id);
        await markChanged(db, 'workouts', id);
      }),
  };
}

export function dexieRestDayRepository(db: RepForgeDb): RestDayRepository {
  return {
    list: () => db.restDays.toArray(),
    add: (restDay: RestDay) =>
      db.transaction('rw', db.restDays, db.syncState, async () => {
        await db.restDays.put(restDay);
        await markChanged(db, 'rest-days', restDay.id);
      }),
  };
}

const ACTIVE_PROGRAM = SYNCED_SETTING;
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
    setActiveProgramId: (id) =>
      db.transaction('rw', db.settings, db.syncState, async () => {
        await write(ACTIVE_PROGRAM, id);
        await markChanged(db, 'settings', ACTIVE_PROGRAM);
      }),
    getRestTimer: () => read<RestTimer>(REST_TIMER),
    setRestTimer: (timer) => write(REST_TIMER, timer),
    getAccount: () => read<Account>(ACCOUNT),
    setAccount: (account) => write(ACCOUNT, account),
  };
}

/** Transaction Dexie sur les tables de données (brouillons compris) : tout est écrit, ou rien. */
export function dexieTransaction(db: RepForgeDb): Transaction {
  return (work) => db.transaction('rw', [...trackedTables(db), db.programDrafts], work);
}

/** Vide toutes les tables (déconnexion : rien ne reste sur l'appareil). */
export function dexieClearAll(db: RepForgeDb): () => Promise<void> {
  return () => db.transaction('rw', db.tables, () => Promise.all(db.tables.map((table) => table.clear())).then(() => undefined));
}
