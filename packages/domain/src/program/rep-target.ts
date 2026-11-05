import { DomainError } from '../shared/domain-error';

/**
 * Objectif d'une série : une plage (« 8 à 12 ») ou une valeur fixe (« 5 »).
 * L'unité est la répétition, ou la seconde pour un exercice de durée.
 */
export type RepTarget =
  | { readonly kind: 'range'; readonly min: number; readonly max: number }
  | { readonly kind: 'fixed'; readonly value: number };

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new DomainError(`${label} doit être un nombre entier supérieur ou égal à 1.`);
  }
}

export function rangeTarget(min: number, max: number): RepTarget {
  assertPositiveInteger(min, 'Le minimum');
  assertPositiveInteger(max, 'Le maximum');
  if (min > max) {
    throw new DomainError('Le minimum ne peut pas dépasser le maximum.');
  }
  return { kind: 'range', min, max };
}

export function fixedTarget(value: number): RepTarget {
  assertPositiveInteger(value, "L'objectif");
  return { kind: 'fixed', value };
}

/** Une valeur atteint l'objectif si elle est au moins égale au minimum visé. */
export function meetsTarget(target: RepTarget, value: number): boolean {
  return value >= (target.kind === 'range' ? target.min : target.value);
}

/** « 8–12 » ou « 5 » : l'unité est ajoutée par l'interface. */
export function formatTarget(target: RepTarget): string {
  return target.kind === 'range' ? `${target.min}–${target.max}` : String(target.value);
}
