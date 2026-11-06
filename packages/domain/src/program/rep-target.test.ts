import { describe, expect, it } from 'vitest';
import type { Exercise } from '../catalog/exercise';
import { DomainError } from '../shared/domain-error';
import { assertValidPlannedExercise, DEFAULT_EXERCISE_SETTINGS, moveExercise, planExercise, type WorkoutStep } from './program';
import { fixedTarget, formatTarget, meetsTarget, rangeTarget } from './rep-target';

const benchPress: Exercise = {
  id: 'bench-press',
  name: 'Développé couché (barre)',
  muscleGroup: 'chest',
  equipment: 'barbell',
  inputKind: 'load',
  loadConvention: 'Poids total, barre incluse',
};

const plank: Exercise = {
  id: 'plank',
  name: 'Gainage',
  muscleGroup: 'abs',
  equipment: 'bodyweight',
  inputKind: 'duration',
  loadConvention: 'Durée en secondes, lest facultatif',
};

describe('objectif de répétitions', () => {
  it('accepte une plage et une valeur fixe', () => {
    expect(rangeTarget(8, 12)).toEqual({ kind: 'range', min: 8, max: 12 });
    expect(rangeTarget(10, 10)).toEqual({ kind: 'range', min: 10, max: 10 });
    expect(fixedTarget(5)).toEqual({ kind: 'fixed', value: 5 });
  });

  it('refuse une plage inversée', () => {
    expect(() => rangeTarget(12, 8)).toThrow(DomainError);
  });

  it.each([0, -3, 7.5, Number.NaN])('refuse une valeur non entière ou inférieure à 1 : %s', (value) => {
    expect(() => fixedTarget(value)).toThrow(DomainError);
    expect(() => rangeTarget(value, 12)).toThrow(DomainError);
  });

  it('considère l’objectif atteint dès le minimum de la plage', () => {
    const target = rangeTarget(8, 12);
    expect(meetsTarget(target, 7)).toBe(false);
    expect(meetsTarget(target, 8)).toBe(true);
    expect(meetsTarget(target, 13)).toBe(true);
    expect(meetsTarget(fixedTarget(5), 5)).toBe(true);
  });

  it('se formate pour l’affichage', () => {
    expect(formatTarget(rangeTarget(8, 12))).toBe('8–12');
    expect(formatTarget(fixedTarget(5))).toBe('5');
  });
});

describe('valeurs par défaut d’un exercice ajouté', () => {
  it('propose 3 séries de 8 à 12 répétitions', () => {
    const planned = planExercise('p1', benchPress);
    expect(planned).toEqual({
      id: 'p1',
      exerciseId: 'bench-press',
      sets: 3,
      target: { kind: 'range', min: 8, max: 12 },
      restSeconds: 90,
    });
  });

  it('propose une durée fixe pour un exercice de gainage', () => {
    expect(planExercise('p2', plank).target).toEqual({ kind: 'fixed', value: 45 });
  });

  it('applique des valeurs par défaut personnalisées', () => {
    const custom = { ...DEFAULT_EXERCISE_SETTINGS, sets: 4, repTarget: fixedTarget(5) };
    const planned = planExercise('p3', benchPress, custom);
    expect(planned.sets).toBe(4);
    expect(planned.target).toEqual({ kind: 'fixed', value: 5 });
  });

  it('refuse un exercice prévu sans série ou avec un repos négatif', () => {
    const planned = planExercise('p4', benchPress);
    expect(() => assertValidPlannedExercise(planned)).not.toThrow();
    expect(() => assertValidPlannedExercise({ ...planned, sets: 0 })).toThrow(DomainError);
    expect(() => assertValidPlannedExercise({ ...planned, restSeconds: -15 })).toThrow(DomainError);
    expect(() =>
      assertValidPlannedExercise({ ...planned, target: { kind: 'range', min: 12, max: 8 } }),
    ).toThrow(DomainError);
  });
});

describe('ordre des exercices d’une séance', () => {
  const step: WorkoutStep = {
    kind: 'workout',
    id: 's',
    name: 'Push',
    exercises: ['a', 'b', 'c'].map((id) => ({ ...planExercise(id, benchPress), id })),
  };
  const order = (s: WorkoutStep) => s.exercises.map((e) => e.id);

  it('déplace un exercice ajouté en dernier à la deuxième place', () => {
    expect(order(moveExercise(step, 'c', 1))).toEqual(['a', 'c', 'b']);
  });

  it('déplace vers le bas et ne modifie pas la séance d’origine', () => {
    expect(order(moveExercise(step, 'a', 2))).toEqual(['b', 'c', 'a']);
    expect(order(step)).toEqual(['a', 'b', 'c']);
  });

  it('refuse une position ou un exercice invalide', () => {
    expect(() => moveExercise(step, 'a', 3)).toThrow(DomainError);
    expect(() => moveExercise(step, 'z', 0)).toThrow(DomainError);
  });
});
