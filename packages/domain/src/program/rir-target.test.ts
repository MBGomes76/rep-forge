import { describe, expect, it } from 'vitest';
import { DomainError } from '../shared/domain-error';
import { formatRirTarget, rirTarget } from './rir-target';

describe('objectif de RIR', () => {
  it('une plage de 0 à 10', () => {
    expect(rirTarget(1, 2)).toEqual({ min: 1, max: 2 });
    expect(rirTarget(0, 0)).toEqual({ min: 0, max: 0 });
  });

  it('refuse les valeurs hors bornes, non entières, ou une plage inversée', () => {
    expect(() => rirTarget(-1, 2)).toThrow(DomainError);
    expect(() => rirTarget(1, 11)).toThrow(DomainError);
    expect(() => rirTarget(1.5, 2)).toThrow(DomainError);
    expect(() => rirTarget(3, 2)).toThrow('Le RIR minimum ne peut pas dépasser le maximum.');
  });

  it('s’affiche « RIR 1–2 », ou « RIR 2 » pour une seule valeur', () => {
    expect(formatRirTarget(rirTarget(1, 2))).toBe('RIR 1–2');
    expect(formatRirTarget(rirTarget(2, 2))).toBe('RIR 2');
  });
});
