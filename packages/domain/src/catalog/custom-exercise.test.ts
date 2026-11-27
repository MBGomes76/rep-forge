import { describe, expect, it } from 'vitest';
import { DomainError } from '../shared/domain-error';
import { catalog } from '../testing/fixtures';
import {
  archiveCustomExercise,
  availableExercises,
  createCustomExercise,
  suggestLoadConvention,
  updateCustomExercise,
} from './custom-exercise';

const input = { name: '  Presse à mollets  ', muscleGroup: 'legs', equipment: 'machine', loadConvention: 'Charge affichée sur la machine' } as const;

describe('exercices personnalisés', () => {
  it('se créent avec un nom nettoyé, non archivés', () => {
    expect(createCustomExercise('c1', 'load', input)).toEqual({
      id: 'c1',
      name: 'Presse à mollets',
      muscleGroup: 'legs',
      equipment: 'machine',
      inputKind: 'load',
      loadConvention: 'Charge affichée sur la machine',
      archived: false,
    });
  });

  it('refusent un nom vide ou trop long, ou une convention vide', () => {
    expect(() => createCustomExercise('c1', 'load', { ...input, name: '   ' })).toThrow(DomainError);
    expect(() => createCustomExercise('c1', 'load', { ...input, name: 'x'.repeat(61) })).toThrow(DomainError);
    expect(() => createCustomExercise('c1', 'load', { ...input, loadConvention: ' ' })).toThrow(DomainError);
  });

  it('se modifient sans changer de type de saisie', () => {
    const exercise = createCustomExercise('c1', 'load', input);
    const updated = updateCustomExercise(exercise, { ...input, name: 'Mollets à la presse', equipment: 'cable' });
    expect(updated).toMatchObject({ id: 'c1', name: 'Mollets à la presse', equipment: 'cable', inputKind: 'load' });
  });

  it('archivés, ils sortent du catalogue proposé', () => {
    const active = createCustomExercise('c1', 'load', input);
    const archived = archiveCustomExercise(createCustomExercise('c2', 'duration', { ...input, name: 'Planche lestée' }));
    const available = availableExercises(catalog, [active, archived]);
    expect(available.map((e) => e.id)).toContain('c1');
    expect(available.map((e) => e.id)).not.toContain('c2');
    expect(available).toHaveLength(catalog.length + 1);
  });

  it('proposent une convention de charge selon la saisie et le matériel', () => {
    expect(suggestLoadConvention('load', 'dumbbell')).toBe('Poids par haltère');
    expect(suggestLoadConvention('load', 'barbell')).toBe('Poids total, barre incluse');
    expect(suggestLoadConvention('added_weight', 'bodyweight')).toBe('Lest ajouté, hors poids du corps');
    expect(suggestLoadConvention('duration', 'bodyweight')).toBe('Durée en secondes, lest facultatif');
  });
});
