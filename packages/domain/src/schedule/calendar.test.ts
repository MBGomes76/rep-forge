import { describe, expect, it } from 'vitest';
import { DomainError } from '../shared/domain-error';
import { addDays, type LocalDate } from '../shared/local-date';
import { pplProgram, TODAY } from '../testing/fixtures';
import { plannedStepIndexOn, projectCalendar, type CalendarDay, type CalendarHistoryEntry } from './calendar';
import { completeCurrentStep, postpone } from './schedule';

const day = (offset: number): LocalDate => addDays(TODAY, offset);

/** Résumé lisible d'un jour pour des assertions compactes. */
function label(calendarDay: CalendarDay): string {
  const { status } = calendarDay;
  switch (status.kind) {
    case 'done':
      return `fait:${status.entries.map((e) => e.name).join('+')}`;
    case 'planned':
      return status.step.name;
    default:
      return status.kind;
  }
}

function labels(days: CalendarDay[]): string[] {
  return days.map(label);
}

describe('projection du cycle sur les jours', () => {
  it('prévoit une étape par jour à partir de l’étape courante, en bouclant', () => {
    const days = projectCalendar({ program: pplProgram(1), today: TODAY, from: TODAY, to: day(6), history: [] });
    expect(labels(days)).toEqual(['Pull', 'Repos', 'Jambes', 'Repos', 'Push', 'Pull', 'Repos']);
    expect(days[0]?.isToday).toBe(true);
    expect(days[1]?.isToday).toBe(false);
  });

  it('suit la formule (cursor + (d − anchor)) mod n', () => {
    const program = pplProgram(3, day(2));
    expect(plannedStepIndexOn(program, day(1), TODAY)).toBeUndefined();
    expect(plannedStepIndexOn(program, day(2), TODAY)).toBe(3);
    expect(plannedStepIndexOn(program, day(4), TODAY)).toBe(0);
  });

  it('après une absence, prévoit l’étape courante aujourd’hui', () => {
    const program = pplProgram(1, day(-3));
    const days = projectCalendar({ program, today: TODAY, from: day(-3), to: day(1), history: [] });
    expect(labels(days)).toEqual(['nothing', 'nothing', 'nothing', 'Pull', 'Repos']);
  });

  it('montre un programme vide comme vide', () => {
    const program = { ...pplProgram(), steps: [] };
    const days = projectCalendar({ program, today: TODAY, from: TODAY, to: day(1), history: [] });
    expect(labels(days)).toEqual(['empty', 'empty']);
    expect(plannedStepIndexOn(program, TODAY, TODAY)).toBeUndefined();
  });

  it('refuse une période inversée', () => {
    expect(() => projectCalendar({ program: pplProgram(), today: TODAY, from: day(2), to: day(1), history: [] })).toThrow(
      DomainError,
    );
  });
});

describe('report dans le calendrier', () => {
  it('reporter décale tout le cycle d’un jour', () => {
    const program = postpone(pplProgram(1), TODAY);
    const days = projectCalendar({ program, today: TODAY, from: TODAY, to: day(3), history: [] });
    expect(labels(days)).toEqual(['postponed', 'Pull', 'Repos', 'Jambes']);
  });

  it('deux reports libèrent deux jours', () => {
    const program = postpone(postpone(pplProgram(1), TODAY), TODAY);
    const days = projectCalendar({ program, today: TODAY, from: TODAY, to: day(2), history: [] });
    expect(labels(days)).toEqual(['postponed', 'postponed', 'Pull']);
  });
});

describe('jours passés depuis l’historique', () => {
  const history: CalendarHistoryEntry[] = [
    { date: day(-2), kind: 'workout', name: 'Push' },
    { date: day(-1), kind: 'rest', name: 'Repos' },
  ];

  it('affiche les séances faites et les repos validés', () => {
    const days = projectCalendar({ program: pplProgram(1), today: TODAY, from: day(-3), to: TODAY, history });
    expect(labels(days)).toEqual(['nothing', 'fait:Push', 'fait:Repos', 'Pull']);
  });

  it('affiche aujourd’hui comme fait une fois la séance terminée, et la suite dès demain', () => {
    const program = completeCurrentStep(pplProgram(1), TODAY);
    const withToday = [...history, { date: TODAY, kind: 'workout', name: 'Pull' } as const];
    const days = projectCalendar({ program, today: TODAY, from: TODAY, to: day(2), history: withToday });
    expect(labels(days)).toEqual(['fait:Pull', 'Repos', 'Jambes']);
  });

  it('regroupe plusieurs séances le même jour', () => {
    const twice: CalendarHistoryEntry[] = [
      { date: day(-1), kind: 'workout', name: 'Push' },
      { date: day(-1), kind: 'workout', name: 'Pull' },
    ];
    const days = projectCalendar({ program: pplProgram(2), today: TODAY, from: day(-1), to: day(-1), history: twice });
    expect(labels(days)).toEqual(['fait:Push+Pull']);
  });

  it('ignore l’historique pour les jours futurs', () => {
    const future: CalendarHistoryEntry[] = [{ date: day(1), kind: 'workout', name: 'Bizarre' }];
    const days = projectCalendar({ program: pplProgram(1), today: TODAY, from: day(1), to: day(1), history: future });
    expect(labels(days)).toEqual(['Repos']);
  });
});
