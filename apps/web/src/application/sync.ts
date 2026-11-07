import { decidePull } from '@repforge/domain';
import { COLLECTIONS, ConflictError, RemoteError, type Collection, type RemoteApi, type RemoteDocument } from './remote';
import type { SyncEntry, SyncStore } from './sync-store';

export type SyncOutcome = 'ok' | 'offline' | 'unauthorized' | 'error';
export type ConflictChoice = 'mine' | 'theirs';

/**
 * Synchronisation de l'appareil avec le serveur.
 *
 * 1. Envoi : chaque document modifié part dans son état actuel, avec la version
 *    du serveur sur laquelle il est basé. Dix modifications hors ligne du même
 *    programme donnent un seul envoi.
 * 2. Réception : « ce qui a changé depuis la dernière fois », ressource par ressource.
 *
 * Un conflit (modifié ici ET ailleurs) n'écrase rien : il est mis de côté
 * jusqu'au choix de l'utilisateur, et le reste continue de se synchroniser.
 */
export function createSync({ store, remote, now = () => new Date() }: { store: SyncStore; remote: RemoteApi; now?: () => Date }) {
  async function push(): Promise<void> {
    for (const entry of await store.pending()) {
      const local = await store.readLocal(entry.collection, entry.id);
      try {
        const accepted = await send(entry, local);
        if (accepted) await store.acknowledge(entry, accepted);
      } catch (error) {
        if (!(error instanceof ConflictError)) throw error;
        await store.addConflict({ collection: entry.collection, id: entry.id, remote: error.current });
      }
    }
  }

  async function send(entry: SyncEntry, local: unknown): Promise<RemoteDocument | undefined> {
    if (local !== undefined) return remote.put(entry.collection, entry.id, entry.version, local);
    // Supprimé avant d'avoir jamais été envoyé : le serveur n'a pas à le savoir.
    if (entry.version === 0) {
      await store.forget(entry.collection, entry.id);
      return undefined;
    }
    return remote.remove(entry.collection, entry.id, entry.version);
  }

  async function pull(): Promise<void> {
    for (const collection of COLLECTIONS) {
      let after = await store.cursor(collection);
      for (;;) {
        const page = await remote.changes(collection, after);
        for (const document of page.items) {
          await receive(collection, document);
          after = Math.max(after, document.revision);
        }
        await store.setCursor(collection, after);
        if (!page.hasMore) break;
      }
    }
  }

  async function receive(collection: Collection, document: RemoteDocument): Promise<void> {
    const entry = await store.entry(collection, document.id);
    const local = await store.readLocal(collection, document.id);
    const decision = decidePull(entry, local, { version: document.version, data: document.deleted ? null : document.data });

    switch (decision) {
      case 'apply':
        return store.applyRemote(collection, document, { changeSeq: entry?.changeSeq });
      case 'adopt':
        return document.deleted ? store.forget(collection, document.id) : store.adoptVersion(collection, document.id, document.version);
      case 'conflict':
        return store.addConflict({ collection, id: document.id, remote: document });
      case 'skip':
        return;
    }
  }

  async function run(): Promise<SyncOutcome> {
    try {
      await push();
      await pull();
      await store.setStatus({ lastSyncedAt: now().toISOString() });
      return 'ok';
    } catch (error) {
      // On garde l'heure de la dernière synchronisation réussie, affichée à l'utilisateur.
      const { lastSyncedAt } = await store.status();
      if (!(error instanceof RemoteError)) {
        await store.setStatus({ lastSyncedAt, problem: 'error' });
        throw error;
      }
      const outcome = error.kind === 'network' ? 'offline' : error.kind === 'unauthorized' ? 'unauthorized' : 'error';
      await store.setStatus({ lastSyncedAt, problem: outcome });
      return outcome;
    }
  }

  // Une seule synchronisation à la fois ; une demande pendant qu'elle tourne en relance une à la fin.
  let running: Promise<SyncOutcome> | undefined;
  let requestedAgain = false;

  async function synchronize(): Promise<SyncOutcome> {
    if (running) {
      requestedAgain = true;
      return running;
    }
    running = (async () => {
      let outcome: SyncOutcome;
      do {
        requestedAgain = false;
        outcome = await run();
      } while (requestedAgain && outcome === 'ok');
      return outcome;
    })();
    try {
      return await running;
    } finally {
      running = undefined;
    }
  }

  return {
    synchronize,

    /**
     * Première connexion de l'appareil : on récupère d'abord le compte, puis
     * on envoie ce que l'appareil contenait déjà (et ce que `prepare` crée). Lève une erreur si le serveur
     * est injoignable (la connexion est alors à refaire).
     */
    async firstSync(prepare: () => Promise<void>): Promise<void> {
      await pull();
      await store.trackUntracked();
      // Par exemple : créer les programmes modèles si le compte n'en a encore aucun.
      await prepare();
      await push();
      await store.setStatus({ lastSyncedAt: now().toISOString() });
    },

    /** L'utilisateur a choisi la version à garder. */
    async resolveConflict(collection: Collection, id: string, choice: ConflictChoice): Promise<void> {
      const conflict = await store.conflict(collection, id);
      if (!conflict) return;
      if (choice === 'theirs') await store.applyRemote(collection, conflict.remote);
      // Garder la sienne : elle repartira, basée cette fois sur la version du serveur.
      else await store.rebase(collection, id, conflict.remote.version);
      await store.removeConflict(collection, id);
      void synchronize();
    },
  };
}

export type Sync = ReturnType<typeof createSync>;
