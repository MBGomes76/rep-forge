import { stepIndexAfter } from '../program/cycle';
import type { Program, ProgramSchedule } from '../program/program';
import { DomainError } from '../shared/domain-error';
import { addDays, maxDate, type LocalDate } from '../shared/local-date';

/**
 * Planification du cycle sur les jours réels.
 *
 * On stocke une seule date : `anchor`, la date prévue de l'étape courante.
 * Les étapes suivantes en découlent, une par jour. Un report modifie donc une
 * seule valeur, plutôt que d'empiler une liste de reports (plus simple à
 * synchroniser entre appareils).
 */

/**
 * Un jour manqué ne fait pas avancer le cycle : si la date prévue est passée,
 * l'étape courante est simplement prévue aujourd'hui.
 */
export function effectiveAnchor(schedule: ProgramSchedule, today: LocalDate): LocalDate {
  return maxDate(schedule.anchor, today);
}

/** « Reporter au lendemain » : tout le cycle est décalé d'un jour. Répétable. */
export function postpone(program: Program, today: LocalDate): Program {
  const anchor = addDays(effectiveAnchor(program.schedule, today), 1);
  return { ...program, schedule: { ...program.schedule, anchor } };
}

/** « Ramener à aujourd'hui » : annule les reports en cours. */
export function bringBackToToday(program: Program, today: LocalDate): Program {
  return { ...program, schedule: { ...program.schedule, anchor: today } };
}

/** L'étape courante a été reportée (elle est prévue après aujourd'hui). */
export function isPostponed(program: Program, today: LocalDate): boolean {
  return program.schedule.anchor > today;
}

/**
 * Séance terminée : on passe à l'étape suivante (en bouclant),
 * prévue pour demain.
 */
export function completeCurrentStep(program: Program, today: LocalDate): Program {
  if (program.steps.length === 0) {
    throw new DomainError('Ce programme ne contient aucune étape.');
  }
  return {
    ...program,
    schedule: { cursor: stepIndexAfter(program, 1), anchor: addDays(today, 1) },
  };
}

/**
 * Une séance terminée fait avancer le cycle, seulement si elle correspond
 * toujours à l'étape courante. Sinon (étape déjà validée sur un autre
 * appareil, programme modifié entre-temps), le programme reste inchangé :
 * on n'avance jamais deux fois pour une même séance.
 */
export function completeStepAfterWorkout(
  program: Program,
  workout: { readonly programId: string; readonly stepId: string },
  today: LocalDate,
): Program {
  const step = program.steps[program.schedule.cursor];
  if (workout.programId !== program.id || step?.id !== workout.stepId) return program;
  return completeCurrentStep(program, today);
}

/** L'étape courante est prévue aujourd'hui (ou sa date est passée, ce qui revient au même). */
export function isPlannedToday(program: Program, today: LocalDate): boolean {
  return effectiveAnchor(program.schedule, today) === today;
}

/**
 * Index de l'étape qu'« Avancer » prévoirait aujourd'hui, ou `undefined` si
 * rien n'est à avancer (une séance est déjà prévue aujourd'hui) :
 * - l'étape courante est prévue plus tard (reportée, ou demain après une séance) : elle-même ;
 * - l'étape d'aujourd'hui est un repos : l'étape suivante, entraînement ou repos.
 */
export function advanceTargetIndex(program: Program, today: LocalDate): number | undefined {
  const step = program.steps[program.schedule.cursor];
  if (!step) return undefined;
  if (!isPlannedToday(program, today)) return program.schedule.cursor;
  if (step.kind === 'rest' && program.steps.length > 1) return stepIndexAfter(program, 1);
  return undefined;
}

/**
 * « Avancer » : l'inverse du report. L'étape ciblée est prévue aujourd'hui et
 * toutes les suivantes arrivent un jour plus tôt. Un repos sauté ne compte pas
 * comme fait.
 */
export function advance(program: Program, today: LocalDate): Program {
  const cursor = advanceTargetIndex(program, today);
  if (cursor === undefined) throw new DomainError("Une séance est déjà prévue aujourd'hui : rien à avancer.");
  return { ...program, schedule: { cursor, anchor: today } };
}

export interface SettledRest {
  readonly stepId: string;
  readonly name: string;
  readonly date: LocalDate;
}

/**
 * Un repos se fait tout seul : une fois sa journée passée, il compte comme
 * fait et le cycle avance (`anchor` + 1 jour par repos). On s'arrête sur la
 * première séance, qui, elle, attend l'utilisateur.
 *
 * Le calcul ne dépend que du programme et de la date : deux appareils hors
 * ligne aboutissent au même résultat, sans conflit.
 */
export function settleElapsedRests(
  program: Program,
  today: LocalDate,
): { readonly program: Program; readonly rests: readonly SettledRest[] } {
  const rests: SettledRest[] = [];
  let { cursor, anchor } = program.schedule;
  let step = program.steps[cursor];
  while (step?.kind === 'rest' && anchor < today) {
    rests.push({ stepId: step.id, name: step.name, date: anchor });
    cursor = (cursor + 1) % program.steps.length;
    anchor = addDays(anchor, 1);
    step = program.steps[cursor];
  }
  if (rests.length === 0) return { program, rests };
  return { program: { ...program, schedule: { cursor, anchor } }, rests };
}
