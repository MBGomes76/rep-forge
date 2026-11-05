import { stepIndexAfter } from '../program/cycle';
import type { Program, ProgramStep } from '../program/program';
import { DomainError } from '../shared/domain-error';
import { addDays, diffDays, type LocalDate } from '../shared/local-date';
import { effectiveAnchor } from './schedule';

/** Ce que le calendrier a besoin de savoir d'un jour passé : une séance faite ou un repos validé. */
export interface CalendarHistoryEntry {
  readonly date: LocalDate;
  readonly kind: 'workout' | 'rest';
  readonly name: string;
}

export type CalendarDayStatus =
  /** Jour passé (ou aujourd'hui) avec au moins une séance faite ou un repos validé. */
  | { readonly kind: 'done'; readonly entries: readonly CalendarHistoryEntry[] }
  /** Jour passé sans rien d'enregistré. */
  | { readonly kind: 'nothing' }
  /** Jour libéré par un report : l'étape courante est prévue plus tard. */
  | { readonly kind: 'postponed' }
  /** Étape du cycle prévue ce jour-là. */
  | { readonly kind: 'planned'; readonly stepIndex: number; readonly step: ProgramStep }
  /** Programme sans étape : rien à prévoir. */
  | { readonly kind: 'empty' };

export interface CalendarDay {
  readonly date: LocalDate;
  readonly isToday: boolean;
  readonly status: CalendarDayStatus;
}

/**
 * Étape prévue un jour donné (aujourd'hui ou plus tard), ou `undefined` si ce
 * jour précède la date prévue de l'étape courante.
 * Jour d >= anchor : étape (cursor + (d - anchor)) mod n.
 */
export function plannedStepIndexOn(program: Program, date: LocalDate, today: LocalDate): number | undefined {
  if (program.steps.length === 0) return undefined;
  const anchor = effectiveAnchor(program.schedule, today);
  const offset = diffDays(anchor, date);
  return offset < 0 ? undefined : stepIndexAfter(program, offset);
}

export interface CalendarRange {
  readonly program: Program;
  readonly today: LocalDate;
  readonly from: LocalDate;
  readonly to: LocalDate;
  readonly history: readonly CalendarHistoryEntry[];
}

/** Projette le cycle sur les jours `from`..`to` inclus. */
export function projectCalendar({ program, today, from, to, history }: CalendarRange): CalendarDay[] {
  const length = diffDays(from, to) + 1;
  if (length < 1) throw new DomainError('La période du calendrier est vide.');

  const historyByDate = new Map<LocalDate, CalendarHistoryEntry[]>();
  for (const entry of history) {
    historyByDate.set(entry.date, [...(historyByDate.get(entry.date) ?? []), entry]);
  }

  return Array.from({ length }, (_, i) => {
    const date = addDays(from, i);
    return { date, isToday: date === today, status: dayStatus(program, date, today, historyByDate.get(date)) };
  });
}

function dayStatus(
  program: Program,
  date: LocalDate,
  today: LocalDate,
  entries: readonly CalendarHistoryEntry[] | undefined,
): CalendarDayStatus {
  // L'historique fait foi pour le passé et pour aujourd'hui (séance déjà faite).
  if (date <= today && entries?.length) return { kind: 'done', entries };
  if (date < today) return { kind: 'nothing' };
  if (program.steps.length === 0) return { kind: 'empty' };

  const stepIndex = plannedStepIndexOn(program, date, today);
  if (stepIndex === undefined) return { kind: 'postponed' };
  return { kind: 'planned', stepIndex, step: program.steps[stepIndex]! };
}
