import type { Program, Workout } from '@repforge/domain';
import { Dexie, type EntityTable } from 'dexie';
import type { RestDay } from '../application/ports';

/** Une séance stockée, avec un champ indexé pour retrouver vite celle en cours. */
export interface WorkoutRecord extends Workout {
  readonly state: 'in_progress' | 'finished';
}

export interface SettingRecord {
  readonly key: string;
  readonly value: unknown;
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

  constructor(name = 'repforge') {
    super(name);
    this.version(1).stores({
      programs: 'id',
      workouts: 'id, state, startedAt',
      restDays: 'id, date',
      settings: 'key',
    });
  }
}
