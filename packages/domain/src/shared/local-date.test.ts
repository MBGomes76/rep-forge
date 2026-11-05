import { describe, expect, it } from 'vitest';
import { DomainError } from './domain-error';
import { addDays, compareDates, diffDays, fromDate, localDate, maxDate } from './local-date';

describe('localDate', () => {
  it('accepte une date ISO valide', () => {
    expect(localDate('2026-11-06')).toBe('2026-11-06');
  });

  it.each(['2026-2-01', '06/11/2026', '2026-11-06T10:00', ''])('refuse un format invalide : %s', (value) => {
    expect(() => localDate(value)).toThrow(DomainError);
  });

  it('refuse une date inexistante', () => {
    expect(() => localDate('2026-02-30')).toThrow(DomainError);
    expect(localDate('2028-02-29')).toBe('2028-02-29'); // année bissextile
  });
});

describe('arithmétique des jours', () => {
  it('ajoute et retire des jours en changeant de mois et d’année', () => {
    expect(addDays(localDate('2026-12-31'), 1)).toBe('2027-01-01');
    expect(addDays(localDate('2026-03-01'), -1)).toBe('2026-02-28');
  });

  it('n’est pas perturbée par le passage à l’heure d’été ou d’hiver', () => {
    expect(addDays(localDate('2026-03-28'), 2)).toBe('2026-03-30');
    expect(diffDays(localDate('2026-10-24'), localDate('2026-10-26'))).toBe(2);
  });

  it('calcule un écart signé', () => {
    expect(diffDays(localDate('2026-11-06'), localDate('2026-11-10'))).toBe(4);
    expect(diffDays(localDate('2026-11-10'), localDate('2026-11-06'))).toBe(-4);
  });

  it('compare et prend le maximum', () => {
    const a = localDate('2026-11-06');
    const b = localDate('2026-11-07');
    expect(compareDates(a, b)).toBe(-1);
    expect(compareDates(b, a)).toBe(1);
    expect(compareDates(a, a)).toBe(0);
    expect(maxDate(a, b)).toBe(b);
  });
});

describe('fromDate', () => {
  it('prend le jour local de l’instant', () => {
    expect(fromDate(new Date(2026, 10, 6, 23, 59))).toBe('2026-11-06');
  });
});
