import { describe, expect, it } from 'vitest';
import { currentStep } from '../program/cycle';
import { DomainError } from '../shared/domain-error';
import { addDays } from '../shared/local-date';
import { pplProgram, pplSteps, TODAY } from '../testing/fixtures';
import { projectCalendar } from './calendar';
import {
  advance,
  advanceTargetIndex,
  bringBackToToday,
  completeCurrentStep,
  completeStepAfterWorkout,
  effectiveAnchor,
  isPlannedToday,
  isPostponed,
  postpone,
  settleElapsedRests,
  skipCurrentWorkout,
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

describe('avancer', () => {
  it('un jour de repos : saute le repos et prévoit l’étape suivante aujourd’hui', () => {
    const program = advance(pplProgram(2), TODAY);
    expect(currentStep(program)?.name).toBe('Jambes');
    expect(program.schedule).toEqual({ cursor: 3, anchor: TODAY });
  });

  it('décale tout le cycle d’un jour plus tôt dans le calendrier', () => {
    const days = projectCalendar({ program: advance(pplProgram(2), TODAY), today: TODAY, from: TODAY, to: addDays(TODAY, 2), history: [] });
    expect(days.map((d) => (d.status.kind === 'planned' ? d.status.step.name : d.status.kind))).toEqual(['Jambes', 'Repos', 'Push']);
  });

  it('avance l’étape suivante même si c’est un repos', () => {
    const twoRests = {
      ...pplProgram(0),
      steps: [
        { kind: 'rest' as const, id: 'r1', name: 'Repos' },
        { kind: 'rest' as const, id: 'r2', name: 'Repos actif' },
        { kind: 'workout' as const, id: 'w', name: 'Full body', exercises: [] },
      ],
    };
    expect(currentStep(advance(twoRests, TODAY))?.name).toBe('Repos actif');
    // En fin de cycle, l’étape suivante est la première.
    expect(currentStep(advance(pplProgram(4), TODAY))?.name).toBe('Push');
  });

  it('une séance reportée ou prévue demain est ramenée à aujourd’hui', () => {
    const postponed = postpone(pplProgram(0), TODAY);
    expect(isPlannedToday(postponed, TODAY)).toBe(false);
    expect(advanceTargetIndex(postponed, TODAY)).toBe(0);
    expect(advance(postponed, TODAY).schedule).toEqual({ cursor: 0, anchor: TODAY });
  });

  it('un repos prévu demain (séance déjà faite aujourd’hui) est d’abord ramené à aujourd’hui', () => {
    expect(advance(pplProgram(2, tomorrow), TODAY).schedule).toEqual({ cursor: 2, anchor: TODAY });
  });

  it('rien à avancer quand une séance est prévue aujourd’hui, ou pour un cycle d’un seul repos', () => {
    expect(advanceTargetIndex(pplProgram(0), TODAY)).toBeUndefined();
    expect(() => advance(pplProgram(0), TODAY)).toThrow(DomainError);
    const onlyRest = { ...pplProgram(0), steps: [{ kind: 'rest' as const, id: 'r', name: 'Repos' }] };
    expect(advanceTargetIndex(onlyRest, TODAY)).toBeUndefined();
  });
});

describe('sauter une séance', () => {
  it('passe à l’étape suivante, prévue demain', () => {
    const program = skipCurrentWorkout(pplProgram(0), TODAY);
    expect(currentStep(program)?.name).toBe('Pull');
    expect(program.schedule).toEqual({ cursor: 1, anchor: tomorrow });
  });

  it('part d’aujourd’hui si la séance était prévue un jour déjà passé', () => {
    expect(skipCurrentWorkout(pplProgram(0, addDays(TODAY, -3)), TODAY).schedule).toEqual({ cursor: 1, anchor: tomorrow });
  });

  it('une séance reportée est sautée à sa date prévue : la suivante vient le lendemain', () => {
    const postponed = postpone(pplProgram(0), TODAY);
    expect(skipCurrentWorkout(postponed, TODAY).schedule).toEqual({ cursor: 1, anchor: addDays(TODAY, 2) });
  });

  it('boucle en fin de cycle, et l’étape suivante peut être un repos', () => {
    const lastWorkout = { ...pplProgram(0), steps: pplSteps.slice(0, 4) };
    expect(currentStep(skipCurrentWorkout({ ...lastWorkout, schedule: { cursor: 3, anchor: TODAY } }, TODAY))?.name).toBe('Push');
    expect(currentStep(skipCurrentWorkout(pplProgram(1), TODAY))?.name).toBe('Repos');
  });

  it('un repos ne se saute pas', () => {
    expect(() => skipCurrentWorkout(pplProgram(2), TODAY)).toThrow(DomainError);
  });
});

describe('repos accomplis automatiquement', () => {
  it('un repos dont la journée est passée compte comme fait, le cycle avance', () => {
    const yesterday = addDays(TODAY, -1);
    const { program, rests } = settleElapsedRests(pplProgram(2, yesterday), TODAY);
    expect(rests).toEqual([{ stepId: 'rest-1', name: 'Repos', date: yesterday }]);
    expect(program.schedule).toEqual({ cursor: 3, anchor: TODAY });
  });

  it('le repos du jour n’est pas encore accompli', () => {
    const program = pplProgram(2);
    expect(settleElapsedRests(program, TODAY)).toEqual({ program, rests: [] });
  });

  it('enchaîne plusieurs repos passés puis s’arrête sur la séance, qui attend l’utilisateur', () => {
    const steps = [
      { kind: 'rest' as const, id: 'r1', name: 'Repos' },
      { kind: 'rest' as const, id: 'r2', name: 'Repos' },
      { kind: 'workout' as const, id: 'w', name: 'Full body', exercises: [] },
    ];
    const longAgo = addDays(TODAY, -10);
    const { program, rests } = settleElapsedRests({ ...pplProgram(0), steps, schedule: { cursor: 0, anchor: longAgo } }, TODAY);
    expect(rests.map((r) => r.date)).toEqual([longAgo, addDays(longAgo, 1)]);
    expect(program.schedule).toEqual({ cursor: 2, anchor: addDays(longAgo, 2) });
    expect(effectiveAnchor(program.schedule, TODAY)).toBe(TODAY);
  });

  it('ne touche pas une séance manquée', () => {
    const program = pplProgram(0, addDays(TODAY, -3));
    expect(settleElapsedRests(program, TODAY).program).toBe(program);
  });
});
