import { DomainError } from './domain-error';

/**
 * Jour calendaire sans heure ni fuseau, au format ISO `YYYY-MM-DD`.
 *
 * Type « marqué » : à l'exécution c'est une simple chaîne (sérialisable telle
 * quelle en JSON et dans IndexedDB), mais le compilateur refuse une chaîne
 * quelconque. On ne crée une LocalDate que via `localDate()` ou `fromDate()`.
 */
export type LocalDate = string & { readonly __brand: 'LocalDate' };

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Valide et convertit une chaîne `YYYY-MM-DD` en LocalDate. */
export function localDate(value: string): LocalDate {
  const match = ISO_DAY.exec(value);
  if (!match) {
    throw new DomainError(`Date invalide : « ${value} » (format attendu AAAA-MM-JJ).`);
  }
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const utc = new Date(Date.UTC(y, m - 1, d));
  // Rejette les dates qui « débordent » (ex. 2026-02-30 deviendrait le 2 mars).
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) {
    throw new DomainError(`Date inexistante : « ${value} ».`);
  }
  return value as LocalDate;
}

/** Jour calendaire local (fuseau de l'appareil) d'un instant donné. */
export function fromDate(date: Date): LocalDate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}` as LocalDate;
}

/** Calculs en UTC : un jour fait toujours 24 h, pas de piège d'heure d'été. */
function toUtcMs(date: LocalDate): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): LocalDate {
  return new Date(ms).toISOString().slice(0, 10) as LocalDate;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Nombre de jours de `from` à `to` (positif si `to` est après `from`). */
export function diffDays(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** Le format ISO se compare dans l'ordre lexicographique. */
export function compareDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxDate(a: LocalDate, b: LocalDate): LocalDate {
  return a >= b ? a : b;
}
