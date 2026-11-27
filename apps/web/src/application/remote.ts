/**
 * Port vers l'API (serveur Symfony). Les cas d'utilisation ne savent pas que
 * c'est du HTTP : les tests utilisent un faux serveur en mémoire.
 */

export interface Account {
  readonly id: string;
  readonly email: string;
}

/** Ressources synchronisées, une par type de données. */
export type Collection = 'exercises' | 'programs' | 'workouts' | 'rest-days' | 'settings';

/** Les exercices personnalisés d'abord : les programmes qui les utilisent arrivent ensuite. */
export const COLLECTIONS: readonly Collection[] = ['exercises', 'programs', 'workouts', 'rest-days', 'settings'];

/** Un document tel que le serveur le connaît. `data` vaut null s'il a été supprimé. */
export interface RemoteDocument {
  readonly id: string;
  readonly version: number;
  readonly revision: number;
  readonly deleted: boolean;
  readonly updatedAt: string;
  readonly data: unknown;
}

export type RemoteErrorKind =
  /** Pas de réseau, ou serveur injoignable. */
  | 'network'
  /** Session absente ou expirée. */
  | 'unauthorized'
  /** Refusé par le serveur (données invalides, lien expiré…) : le message est affichable. */
  | 'rejected'
  /** Données écrites par une version plus récente de l'application : il faut la mettre à jour. */
  | 'outdated';

export class RemoteError extends Error {
  constructor(
    message: string,
    readonly kind: RemoteErrorKind,
  ) {
    super(message);
    this.name = 'RemoteError';
  }
}

/** Le document a été modifié sur un autre appareil : `current` est la version du serveur. */
export class ConflictError extends Error {
  constructor(readonly current: RemoteDocument) {
    super('Ce document a été modifié sur un autre appareil.');
    this.name = 'ConflictError';
  }
}

export interface ChangesPage {
  readonly items: readonly RemoteDocument[];
  readonly hasMore: boolean;
}

export interface RemoteApi {
  login(email: string, password: string): Promise<Account>;
  logout(): Promise<void>;
  /** Adresse invitée, si le lien est encore valable. */
  getInvitation(token: string): Promise<{ email: string }>;
  acceptInvitation(token: string, password: string): Promise<Account>;

  /** Documents modifiés après la révision `after`. */
  changes(collection: Collection, after: number): Promise<ChangesPage>;
  /** Création (`baseVersion` 0) ou modification. Lève `ConflictError` si le serveur a une version plus récente. */
  put(collection: Collection, id: string, baseVersion: number, data: unknown): Promise<RemoteDocument>;
  remove(collection: Collection, id: string, baseVersion: number): Promise<RemoteDocument>;
}
