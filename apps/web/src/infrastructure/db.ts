import type { Program, Workout } from '@repforge/domain';
import { Dexie, type EntityTable } from 'dexie';
import type { RestDay } from '../application/ports';
import type { Collection } from '../application/remote';

/** Une séance stockée, avec un champ indexé pour retrouver vite celle en cours. */
export interface WorkoutRecord extends Workout {
  readonly state: 'in_progress' | 'finished';
}

export interface SettingRecord {
  readonly key: string;
  readonly value: unknown;
}

/** État de synchronisation d'un document (clé « collection/id »). `dirty` vaut 0 ou 1 : IndexedDB n'indexe pas les booléens. */
export interface SyncStateRecord {
  readonly key: string;
  readonly collection: Collection;
  readonly id: string;
  readonly version: number;
  readonly dirty: 0 | 1;
  readonly changeSeq: number;
}

export interface ConflictRecord {
  readonly key: string;
  readonly collection: Collection;
  readonly id: string;
  readonly remote: unknown;
  readonly detectedAt: string;
}

/**
 * Base IndexedDB de l'appareil. Les objets du domaine y sont stockés tels
 * quels (ce sont des données sérialisables), sans couche de conversion.
 */
export class RepForgeDb extends Dexie {
  programs!: EntityTable<Program, 'id'>;
  workouts!: EntityTable<WorkoutRecord, 'id'>;
  restDays!: EntityTable<RestDay, 'id'>;
  settings!: EntityTable<SettingRecord, 'key'>;
  syncState!: EntityTable<SyncStateRecord, 'key'>;
  conflicts!: EntityTable<ConflictRecord, 'key'>;

  constructor(name = 'repforge') {
    super(name);
    this.version(1).stores({
      programs: 'id',
      workouts: 'id, state, startedAt',
      restDays: 'id, date',
      settings: 'key',
    });
    // Étape 4 : synchronisation avec le serveur.
    this.version(2).stores({
      syncState: 'key, dirty',
      conflicts: 'key',
    });
  }
}
