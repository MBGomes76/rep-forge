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
 * Séance terminée ou repos validé : on passe à l'étape suivante (en bouclant),
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

/** Index de la prochaine étape d'entraînement après l'étape courante, ou `undefined` s'il n'y en a pas. */
export function nextWorkoutIndex(program: Program): number | undefined {
  const count = program.steps.length;
  for (let offset = 1; offset <= count; offset++) {
    const index = (program.schedule.cursor + offset) % count;
    if (program.steps[index]?.kind === 'workout') return index;
  }
  return undefined;
}

/**
 * « Avancer la séance » : l'inverse du report. Le ou les repos courants sont
 * sautés (ils ne comptent pas comme faits) et la prochaine séance prend leur
 * date prévue. Toutes les étapes suivantes arrivent donc plus tôt.
 */
export function advanceNextWorkout(program: Program, today: LocalDate): Program {
  if (program.steps[program.schedule.cursor]?.kind !== 'rest') {
    throw new DomainError("Seul un repos peut être sauté pour avancer la séance suivante.");
  }
  const cursor = nextWorkoutIndex(program);
  if (cursor === undefined) throw new DomainError('Ce programme ne contient aucune séance à avancer.');
  return { ...program, schedule: { cursor, anchor: effectiveAnchor(program.schedule, today) } };
}

/** Valider un repos n'a de sens que si l'étape courante est un repos. */
export function validateRest(program: Program, today: LocalDate): Program {
  if (program.steps[program.schedule.cursor]?.kind !== 'rest') {
    throw new DomainError("L'étape courante n'est pas un repos.");
  }
  return completeCurrentStep(program, today);
}
