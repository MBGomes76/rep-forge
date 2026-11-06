import type { Dependencies } from '../application/ports';
import { createUseCases } from '../application/use-cases';
import { staticCatalog } from '../infrastructure/catalog-data';
import { RepForgeDb } from '../infrastructure/db';
import {
  dexieProgramRepository,
  dexieRestDayRepository,
  dexieSettingsRepository,
  dexieTransaction,
  dexieWorkoutRepository,
} from '../infrastructure/dexie-repositories';

/**
 * Point d'assemblage unique : c'est ici, et seulement ici, qu'on choisit les
 * implémentations concrètes (Dexie, horloge système, UUID).
 */
export function createDependencies(db: RepForgeDb = new RepForgeDb()): Dependencies {
  return {
    programs: dexieProgramRepository(db),
    workouts: dexieWorkoutRepository(db),
    restDays: dexieRestDayRepository(db),
    settings: dexieSettingsRepository(db),
    catalog: staticCatalog,
    clock: { now: () => new Date() },
    newId: () => crypto.randomUUID(),
    transaction: dexieTransaction(db),
  };
}

export function createApp(deps: Dependencies = createDependencies()) {
  return { deps, useCases: createUseCases(deps) };
}

export type AppContainer = ReturnType<typeof createApp>;
