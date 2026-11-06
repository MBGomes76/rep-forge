import { describe, expect, it } from 'vitest';
import { currentStep } from '../program/cycle';
import { DomainError } from '../shared/domain-error';
import { addDays } from '../shared/local-date';
import { pplProgram, TODAY } from '../testing/fixtures';
import {
  bringBackToToday,
  completeCurrentStep,
  completeStepAfterWorkout,
  effectiveAnchor,
  isPostponed,
  postpone,
  validateRest,
} from './schedule';

const tomorrow = addDays(TODAY, 1);

describe('date prévue de l’étape courante', () => {
  it('reste la date stockée si elle est à venir', () => {
    expect(effectiveAnchor({ cursor: 0, anchor: tomorrow }, TODAY)).toBe(tomorrow);
  });

  it('devient aujourd’hui si elle est passée : une absence ne fait pas avancer le cycle', () => {
    const program = pplProgram(1, addDays(TODAY, -4));
    expect(effectiveAnchor(program.schedule, TODAY)).toBe(TODAY);
    expect(currentStep(program)?.name).toBe('Pull');
  });
});

describe('reporter au lendemain', () => {
  it('décale l’étape courante à demain', () => {
    const program = postpone(pplProgram(1), TODAY);
    expect(program.schedule).toEqual({ cursor: 1, anchor: tomorrow });
    expect(isPostponed(program, TODAY)).toBe(true);
  });

  it('peut être répété', () => {
    const program = postpone(postpone(pplProgram(1), TODAY), TODAY);
    expect(program.schedule.anchor).toBe(addDays(TODAY, 2));
  });

  it('part d’aujourd’hui si l’étape était prévue un jour déjà passé', () => {
    const program = postpone(pplProgram(1, addDays(TODAY, -3)), TODAY);
    expect(program.schedule.anchor).toBe(tomorrow);
  });

  it('ne fait pas avancer le cycle', () => {
    expect(postpone(pplProgram(1), TODAY).schedule.cursor).toBe(1);
  });
});

describe('ramener à aujourd’hui', () => {
  it('annule tous les reports', () => {
    const postponed = postpone(postpone(pplProgram(1), TODAY), TODAY);
    const program = bringBackToToday(postponed, TODAY);
    expect(program.schedule).toEqual({ cursor: 1, anchor: TODAY });
    expect(isPostponed(program, TODAY)).toBe(false);
  });
});

describe('terminer une étape', () => {
  it('passe à l’étape suivante, prévue demain', () => {
    const program = completeCurrentStep(pplProgram(1), TODAY);
    expect(program.schedule).toEqual({ cursor: 2, anchor: tomorrow });
    expect(currentStep(program)?.name).toBe('Repos');
  });

  it('recommence le cycle après la dernière étape', () => {
    expect(completeCurrentStep(pplProgram(4), TODAY).schedule.cursor).toBe(0);
  });

  it('efface un report en cours (séance faite en avance)', () => {
    const postponed = postpone(pplProgram(1), TODAY);
    expect(completeCurrentStep(postponed, TODAY).schedule.anchor).toBe(tomorrow);
  });

  it('refuse un programme sans étape', () => {
    const empty = { ...pplProgram(), steps: [] };
    expect(() => completeCurrentStep(empty, TODAY)).toThrow(DomainError);
  });
});

describe('terminer une séance fait avancer le cycle', () => {
  it('quand la séance correspond à l’étape courante', () => {
    const program = completeStepAfterWorkout(pplProgram(1), { programId: 'ppl', stepId: 'pull' }, TODAY);
    expect(program.schedule).toEqual({ cursor: 2, anchor: tomorrow });
  });

  it('pas si l’étape a déjà été validée ailleurs (pas de double avancement)', () => {
    const program = pplProgram(2);
    expect(completeStepAfterWorkout(program, { programId: 'ppl', stepId: 'pull' }, TODAY)).toBe(program);
  });

  it('pas pour la séance d’un autre programme', () => {
    const program = pplProgram(1);
    expect(completeStepAfterWorkout(program, { programId: 'autre', stepId: 'pull' }, TODAY)).toBe(program);
  });
});

describe('valider un repos', () => {
  it('fait avancer le cycle quand l’étape courante est un repos', () => {
    expect(validateRest(pplProgram(2), TODAY).schedule).toEqual({ cursor: 3, anchor: tomorrow });
  });

  it('est refusé sur une étape d’entraînement', () => {
    expect(() => validateRest(pplProgram(0), TODAY)).toThrow(DomainError);
  });
});
