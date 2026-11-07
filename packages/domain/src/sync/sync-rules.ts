/**
 * Règles de synchronisation entre l'appareil et le serveur.
 *
 * Chaque document local connaît la version du serveur sur laquelle il est
 * basé (`version`) et s'il porte des modifications pas encore envoyées
 * (`dirty`). Règle d'or : jamais d'écrasement silencieux. Si le même document
 * a changé des deux côtés, c'est l'utilisateur qui choisit.
 */

export interface LocalSyncState {
  /** Version du serveur sur laquelle la copie locale est basée (0 : jamais envoyée). */
  readonly version: number;
  /** Modifications locales pas encore acceptées par le serveur. */
  readonly dirty: boolean;
}

export interface IncomingChange {
  readonly version: number;
  /** `null` : supprimé sur le serveur. */
  readonly data: unknown;
}

export type PullDecision =
  /** Prendre la version du serveur. */
  | 'apply'
  /** Déjà connu (par exemple l'écho de notre propre envoi) : rien à faire. */
  | 'skip'
  /** Même contenu des deux côtés : on retient juste la nouvelle version. */
  | 'adopt'
  /** Modifié des deux côtés : l'utilisateur choisira. */
  | 'conflict';

/**
 * Que faire d'un changement reçu du serveur ?
 *
 * @param state    état de synchronisation local (`undefined` : document inconnu ou pas encore suivi)
 * @param local    données locales (`undefined` : absent ou supprimé localement)
 */
export function decidePull(state: LocalSyncState | undefined, local: unknown, incoming: IncomingChange): PullDecision {
  if (!state || !state.dirty) {
    return state && incoming.version <= state.version ? 'skip' : 'apply';
  }
  if (incoming.version <= state.version) return 'skip';
  // Les deux côtés ont abouti au même résultat (calcul déterministe, même saisie) : pas de conflit.
  if (sameContent(local ?? null, incoming.data)) return 'adopt';
  return 'conflict';
}

/**
 * Égalité de contenu, indépendante de l'ordre des clés (le serveur stocke en
 * `jsonb`, qui réordonne les clés).
 */
export function sameContent(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort()
        .map((key) => [key, canonical(record[key])]),
    );
  }
  return value;
}
