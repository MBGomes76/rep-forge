import type { Collection, RemoteDocument } from './remote';

/**
 * Port : ce que la synchronisation a besoin de savoir et de faire sur l'appareil.
 * Les cas d'utilisation ordinaires ne le voient pas : les dépôts marquent
 * eux-mêmes chaque modification comme « à envoyer ».
 */

export interface SyncEntry {
  readonly collection: Collection;
  readonly id: string;
  /** Version du serveur sur laquelle la copie locale est basée (0 : jamais envoyée). */
  readonly version: number;
  readonly dirty: boolean;
  /** Compteur des modifications locales : détecte une modification faite pendant un envoi. */
  readonly changeSeq: number;
}

/** Un document modifié à la fois sur l'appareil et ailleurs : en attente du choix de l'utilisateur. */
export interface SyncConflict {
  readonly collection: Collection;
  readonly id: string;
  /** Version du serveur au moment du conflit. */
  readonly remote: RemoteDocument;
}

export type SyncProblem = 'offline' | 'unauthorized' | 'error';

export interface SyncStatus {
  readonly lastSyncedAt?: string;
  readonly problem?: SyncProblem;
}

export interface SyncStore {
  /** Documents à envoyer, hors conflits en attente. */
  pending(): Promise<SyncEntry[]>;
  entry(collection: Collection, id: string): Promise<SyncEntry | undefined>;
  /** Données locales du document, `undefined` s'il est absent (supprimé). */
  readLocal(collection: Collection, id: string): Promise<unknown>;

  /**
   * Le serveur a accepté l'envoi. Si le document a encore été modifié
   * pendant l'envoi, il reste « à envoyer », basé sur la nouvelle version.
   */
  acknowledge(sent: SyncEntry, accepted: RemoteDocument): Promise<void>;
  /**
   * Remplace la copie locale par celle du serveur (ou la supprime). Avec `guard`,
   * ne fait rien si le document a été modifié sur l'appareil depuis la décision.
   */
  applyRemote(collection: Collection, remote: RemoteDocument, guard?: { readonly changeSeq: number | undefined }): Promise<void>;
  /** Garde la copie locale, désormais à jour avec cette version du serveur. */
  adoptVersion(collection: Collection, id: string, version: number): Promise<void>;
  /** Garde la copie locale, à renvoyer en se basant sur cette version du serveur. */
  rebase(collection: Collection, id: string, version: number): Promise<void>;
  /** Oublie un document supprimé localement avant d'avoir jamais été envoyé. */
  forget(collection: Collection, id: string): Promise<void>;
  /** Données créées avant la première connexion : à envoyer comme nouveaux documents. */
  trackUntracked(): Promise<void>;

  /** Dernière révision reçue du serveur, par ressource. */
  cursor(collection: Collection): Promise<number>;
  setCursor(collection: Collection, revision: number): Promise<void>;

  addConflict(conflict: SyncConflict): Promise<void>;
  conflict(collection: Collection, id: string): Promise<SyncConflict | undefined>;
  conflicts(): Promise<SyncConflict[]>;
  removeConflict(collection: Collection, id: string): Promise<void>;

  status(): Promise<SyncStatus>;
  setStatus(status: SyncStatus): Promise<void>;
}
