import type { Collection, RemoteDocument } from '../application/remote';
import type { SyncConflict, SyncEntry, SyncStatus, SyncStore } from '../application/sync-store';
import type { RepForgeDb, SyncStateRecord, WorkoutRecord } from './db';

/** Seul réglage partagé entre appareils ; le minuteur de repos et le reste sont propres à l'appareil. */
export const SYNCED_SETTING = 'activeProgramId';
const STATUS = 'sync.status';
const cursorKey = (collection: Collection) => `sync.cursor.${collection}`;
const keyOf = (collection: Collection, id: string) => `${collection}/${id}`;

function toEntry({ collection, id, version, dirty, changeSeq }: SyncStateRecord): SyncEntry {
  return { collection, id, version, dirty: dirty === 1, changeSeq };
}

/**
 * Marque un document comme modifié sur l'appareil. Appelé par les dépôts dans
 * la même transaction que l'écriture : une modification n'est jamais oubliée.
 */
export async function markChanged(db: RepForgeDb, collection: Collection, id: string): Promise<void> {
  const key = keyOf(collection, id);
  const state = await db.syncState.get(key);
  await db.syncState.put({
    key,
    collection,
    id,
    version: state?.version ?? 0,
    dirty: 1,
    changeSeq: (state?.changeSeq ?? 0) + 1,
  });
}

/** Tables touchées par une écriture suivie (à inclure dans les transactions). */
export const trackedTables = (db: RepForgeDb) => [db.programs, db.workouts, db.restDays, db.settings, db.syncState];

/** Lecture et écriture « brutes » d'un document, sans marquage : réservées à la synchronisation. */
function documents(db: RepForgeDb) {
  return {
    async read(collection: Collection, id: string): Promise<unknown> {
      switch (collection) {
        case 'programs':
          return db.programs.get(id);
        case 'workouts': {
          const record = await db.workouts.get(id);
          if (!record) return undefined;
          const { state: _state, ...workout } = record;
          return workout;
        }
        case 'rest-days':
          return db.restDays.get(id);
        case 'settings': {
          const setting = await db.settings.get(id);
          return setting && { value: setting.value };
        }
      }
    },
    async write(collection: Collection, id: string, data: unknown): Promise<void> {
      if (data === null || data === undefined) {
        if (collection === 'programs') await db.programs.delete(id);
        if (collection === 'workouts') await db.workouts.delete(id);
        if (collection === 'rest-days') await db.restDays.delete(id);
        if (collection === 'settings') await db.settings.delete(id);
        return;
      }
      if (collection === 'programs') await db.programs.put(data as never);
      if (collection === 'workouts') {
        const workout = data as Omit<WorkoutRecord, 'state'>;
        await db.workouts.put({ ...workout, state: workout.finishedAt === null ? 'in_progress' : 'finished' });
      }
      if (collection === 'rest-days') await db.restDays.put(data as never);
      if (collection === 'settings') await db.settings.put({ key: id, value: (data as { value: unknown }).value });
    },
  };
}

export function dexieSyncStore(db: RepForgeDb): SyncStore {
  const docs = documents(db);
  const all = () => [...trackedTables(db), db.conflicts];

  async function putState(collection: Collection, id: string, version: number, dirty: boolean, changeSeq?: number) {
    const key = keyOf(collection, id);
    const current = await db.syncState.get(key);
    await db.syncState.put({ key, collection, id, version, dirty: dirty ? 1 : 0, changeSeq: changeSeq ?? current?.changeSeq ?? 0 });
  }

  return {
    async pending() {
      const [dirty, conflicts] = await Promise.all([db.syncState.where('dirty').equals(1).toArray(), db.conflicts.toArray()]);
      const blocked = new Set(conflicts.map((c) => c.key));
      return dirty.filter((s) => !blocked.has(s.key)).map(toEntry);
    },

    async entry(collection, id) {
      const state = await db.syncState.get(keyOf(collection, id));
      return state && toEntry(state);
    },

    readLocal: (collection, id) => docs.read(collection, id),

    acknowledge: (sent, accepted) =>
      db.transaction('rw', all(), async () => {
        const current = await db.syncState.get(keyOf(sent.collection, sent.id));
        const unchangedSinceSent = !current || current.changeSeq === sent.changeSeq;
        if (unchangedSinceSent && accepted.deleted) {
          await db.syncState.delete(keyOf(sent.collection, sent.id));
          return;
        }
        await putState(sent.collection, sent.id, accepted.version, !unchangedSinceSent);
      }),

    applyRemote: (collection, remote, guard) =>
      db.transaction('rw', all(), async () => {
        if (guard && (await db.syncState.get(keyOf(collection, remote.id)))?.changeSeq !== guard.changeSeq) return;
        await docs.write(collection, remote.id, remote.deleted ? null : remote.data);
        if (remote.deleted) await db.syncState.delete(keyOf(collection, remote.id));
        else await putState(collection, remote.id, remote.version, false);
      }),

    adoptVersion: (collection, id, version) => db.transaction('rw', all(), () => putState(collection, id, version, false)),

    rebase: (collection, id, version) => db.transaction('rw', all(), () => putState(collection, id, version, true)),

    forget: (collection, id) => db.syncState.delete(keyOf(collection, id)).then(() => undefined),

    trackUntracked: () =>
      db.transaction('rw', all(), async () => {
        const known = new Set(await db.syncState.toCollection().primaryKeys());
        const local: [Collection, string][] = [
          ...(await db.programs.toCollection().primaryKeys()).map((id): [Collection, string] => ['programs', id]),
          ...(await db.workouts.toCollection().primaryKeys()).map((id): [Collection, string] => ['workouts', id]),
          ...(await db.restDays.toCollection().primaryKeys()).map((id): [Collection, string] => ['rest-days', id]),
          ...((await db.settings.get(SYNCED_SETTING)) ? [['settings', SYNCED_SETTING] as [Collection, string]] : []),
        ];
        for (const [collection, id] of local) {
          if (!known.has(keyOf(collection, id))) await markChanged(db, collection, id);
        }
      }),

    async cursor(collection) {
      return ((await db.settings.get(cursorKey(collection)))?.value as number | undefined) ?? 0;
    },
    setCursor: (collection, revision) => db.settings.put({ key: cursorKey(collection), value: revision }).then(() => undefined),

    addConflict: (conflict: SyncConflict) =>
      db.conflicts.put({ key: keyOf(conflict.collection, conflict.id), ...conflict, detectedAt: new Date().toISOString() }).then(() => undefined),
    async conflict(collection, id) {
      const record = await db.conflicts.get(keyOf(collection, id));
      return record && { collection: record.collection, id: record.id, remote: record.remote as RemoteDocument };
    },
    removeConflict: (collection, id) => db.conflicts.delete(keyOf(collection, id)).then(() => undefined),

    setStatus: (status: SyncStatus) => db.settings.put({ key: STATUS, value: status }).then(() => undefined),
  };
}

export const SYNC_STATUS_KEY = STATUS;
