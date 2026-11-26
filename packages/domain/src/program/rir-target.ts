import { DomainError } from '../shared/domain-error';

/**
 * Objectif de RIR (« reps in reserve », répétitions gardées en réserve) d'un
 * exercice : une plage, par exemple 1 à 2. Une plage d'une seule valeur
 * (2 à 2) se lit « RIR 2 ». Facultatif : sans objectif, le champ est absent.
 */
export interface RirTarget {
  readonly min: number;
  readonly max: number;
}

export const RIR_LIMITS = { min: 0, max: 10 } as const;

export function rirTarget(min: number, max: number): RirTarget {
  for (const value of [min, max]) {
    if (!Number.isInteger(value) || value < RIR_LIMITS.min || value > RIR_LIMITS.max) {
      throw new DomainError(`Le RIR doit être un nombre entier entre ${RIR_LIMITS.min} et ${RIR_LIMITS.max}.`);
    }
  }
  if (min > max) throw new DomainError('Le RIR minimum ne peut pas dépasser le maximum.');
  return { min, max };
}

/** « RIR 1–2 », ou « RIR 2 » si la plage tient en une valeur. */
export function formatRirTarget(target: RirTarget): string {
  return target.min === target.max ? `RIR ${target.min}` : `RIR ${target.min}–${target.max}`;
}
