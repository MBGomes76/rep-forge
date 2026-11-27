import type { Dependencies } from '../application/ports';
import type { RemoteApi } from '../application/remote';
import { createAccountUseCases } from '../application/account';
import { createSync } from '../application/sync';
import { createUseCases } from '../application/use-cases';
import { staticCatalog } from '../infrastructure/catalog-data';
import { RepForgeDb } from '../infrastructure/db';
import {
  dexieClearAll,
  dexieCustomExerciseRepository,
  dexieProgramDraftRepository,
  dexieProgramRepository,
  dexieRestDayRepository,
  dexieSettingsRepository,
  dexieTransaction,
  dexieWorkoutRepository,
} from '../infrastructure/dexie-repositories';
import { dexieSyncStore } from '../infrastructure/dexie-sync-store';
import { httpApi } from '../infrastructure/http-api';

/**
 * Point d'assemblage unique : c'est ici, et seulement ici, qu'on choisit les
 * implémentations concrètes (Dexie, horloge système, UUID).
 */
export function createDependencies(db: RepForgeDb = new RepForgeDb(), remote: RemoteApi = httpApi()): Dependencies {
  return {
    programs: dexieProgramRepository(db),
    programDrafts: dexieProgramDraftRepository(db),
    workouts: dexieWorkoutRepository(db),
    restDays: dexieRestDayRepository(db),
    settings: dexieSettingsRepository(db),
    catalog: staticCatalog,
    customExercises: dexieCustomExerciseRepository(db),
    clock: { now: () => new Date() },
    newId: () => crypto.randomUUID(),
    transaction: dexieTransaction(db),
    remote,
    clearLocalData: dexieClearAll(db),
    syncStore: dexieSyncStore(db),
  };
}

export function createApp(deps: Dependencies = createDependencies()) {
  const useCases = createUseCases(deps);
  const sync = createSync({ store: deps.syncStore, remote: deps.remote, now: () => deps.clock.now() });
  return { deps, useCases, sync, account: createAccountUseCases(deps, useCases, sync) };
}

export type AppContainer = ReturnType<typeof createApp>;
