import { diffDays, type Equipment, type InputKind, type LocalDate, type MuscleGroup } from '@repforge/domain';

/** Libellés d'affichage (présentation uniquement). */

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pectoraux',
  back: 'Dos',
  shoulders: 'Épaules',
  arms: 'Bras',
  legs: 'Jambes',
  abs: 'Abdos',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  bodyweight: 'Poids du corps',
  barbell: 'Barre',
  dumbbell: 'Haltères',
  machine: 'Machine',
  cable: 'Poulie',
};

/** Ce que l'on saisit pour une série. */
export const INPUT_KIND_LABELS: Record<InputKind, string> = {
  load: 'Charge',
  added_weight: 'Lest',
  assistance: 'Assistance',
  duration: 'Durée',
};

const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function toUtcDate(date: LocalDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function weekdayShort(date: LocalDate): string {
  return WEEKDAYS[toUtcDate(date).getUTCDay()]!;
}

export function dayOfMonth(date: LocalDate): number {
  return toUtcDate(date).getUTCDate();
}

/** « aujourd'hui », « demain », « dans 3 jours » */
export function plannedWhen(date: LocalDate, today: LocalDate): string {
  const days = diffDays(today, date);
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'demain';
  return `dans ${days} jours`;
}

/** « Aujourd'hui », « Hier », « Il y a 3 jours », puis « 12 oct. » */
export function relativeDay(date: LocalDate, today: LocalDate): string {
  const days = diffDays(date, today);
  if (days <= 0) return 'Aujourd’hui';
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return toUtcDate(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Chrono de séance : « 01:02:05 » */
export function formatClock(seconds: number): string {
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

/** Repos : « 1:30 » */
export function formatRest(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`;
}

/** Durée de séance : « 62 min » */
export function formatMinutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/** Volume : « 9 840 kg », ou « — » s'il n'y a pas d'exercice à charge. */
export function formatVolume(kg: number): string {
  return kg > 0 ? `${Math.round(kg).toLocaleString('fr-FR')} kg` : '—';
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}
