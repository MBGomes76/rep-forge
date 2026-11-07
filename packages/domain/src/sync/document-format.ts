import { DomainError } from '../shared/domain-error';

/**
 * Format des documents stockés sur le serveur.
 *
 * Les documents survivent aux versions de l'application : un programme créé
 * aujourd'hui sera relu par l'app de l'an prochain. Chaque document porte donc
 * son numéro de format, et l'app sait mettre à niveau les anciens, une étape à
 * la fois (1 → 2 → 3…). Quand le modèle change, on incrémente
 * `DOCUMENT_FORMAT` et on ajoute la fonction de passage, avec son test.
 */

export type DocumentKind = 'program' | 'workout' | 'rest-day' | 'setting';

type StoredData = Record<string, unknown>;

/** Passage d'un format au suivant : `upgrades[n]` transforme un document du format n en format n + 1. */
export type FormatUpgrades = Partial<Record<DocumentKind, Readonly<Record<number, (data: StoredData) => StoredData>>>>;

export interface FormatConfig {
  readonly current: number;
  readonly upgrades: FormatUpgrades;
}

/** Format actuel. Les documents sans numéro (créés avant son introduction) sont du format 1. */
export const DOCUMENT_FORMAT = 1;

/** Aucune mise à niveau pour l'instant : le format 1 est le premier. */
export const FORMAT_UPGRADES: FormatUpgrades = {};

const DEFAULT_CONFIG: FormatConfig = { current: DOCUMENT_FORMAT, upgrades: FORMAT_UPGRADES };

/** Le document vient d'une version plus récente de l'application. */
export class DocumentFormatTooNew extends DomainError {
  constructor(readonly format: number) {
    super('Une version plus récente de l’application a modifié tes données : mets l’application à jour.');
  }
}

/** Ajoute le numéro de format avant l'envoi au serveur. */
export function toStoredDocument(data: object, config: FormatConfig = DEFAULT_CONFIG): StoredData {
  return { ...data, format: config.current };
}

/**
 * Document reçu du serveur → données au format actuel, sans le champ `format`.
 * Lève `DocumentFormatTooNew` si le document vient d'une version plus récente.
 */
export function fromStoredDocument(kind: DocumentKind, stored: unknown, config: FormatConfig = DEFAULT_CONFIG): unknown {
  if (stored === null || typeof stored !== 'object') return stored;
  const { format: rawFormat, ...rest } = stored as StoredData;
  let format = typeof rawFormat === 'number' ? rawFormat : 1;
  if (format > config.current) throw new DocumentFormatTooNew(format);

  let data: StoredData = rest;
  while (format < config.current) {
    const upgrade = config.upgrades[kind]?.[format];
    if (upgrade) data = upgrade(data);
    format++;
  }
  return data;
}
