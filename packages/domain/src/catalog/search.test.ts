import { describe, expect, it } from 'vitest';
import type { Exercise } from './exercise';
import { normalizeForSearch, searchExercises } from './search';

const ex = (id: string, name: string, muscleGroup: Exercise['muscleGroup'], equipment: Exercise['equipment']): Exercise => ({
  id,
  name,
  muscleGroup,
  equipment,
  inputKind: 'load',
  loadConvention: '',
});

const catalog = [
  ex('ecarte', 'Écartés à la poulie', 'chest', 'cable'),
  ex('dc', 'Développé couché (barre)', 'chest', 'barbell'),
  ex('di', 'Développé incliné (haltères)', 'chest', 'dumbbell'),
  ex('mili', 'Développé militaire', 'shoulders', 'barbell'),
  ex('trac', 'Tractions', 'back', 'bodyweight'),
];

const ids = (list: Exercise[]) => list.map((e) => e.id);

describe('normalisation', () => {
  it('retire accents, majuscules et espaces superflus', () => {
    expect(normalizeForSearch('  Écartés   À la POULIE ')).toBe('ecartes a la poulie');
  });
});

describe('recherche d’exercices', () => {
  it('ignore les accents et la casse', () => {
    expect(ids(searchExercises(catalog, { query: 'ecartes' }))).toEqual(['ecarte']);
    expect(ids(searchExercises(catalog, { query: 'DÉVELOPPÉ' }))).toEqual(['dc', 'di', 'mili']);
  });

  it('exige chaque mot, dans n’importe quel ordre', () => {
    expect(ids(searchExercises(catalog, { query: 'barre developpe' }))).toEqual(['dc']);
  });

  it('filtre par groupe musculaire et par matériel', () => {
    expect(ids(searchExercises(catalog, { muscleGroup: 'chest', equipment: 'barbell' }))).toEqual(['dc']);
    expect(ids(searchExercises(catalog, { query: 'developpe', equipment: 'barbell' }))).toEqual(['dc', 'mili']);
  });

  it('renvoie tout sans filtre, et rien si aucun exercice ne correspond', () => {
    expect(searchExercises(catalog, {})).toHaveLength(5);
    expect(searchExercises(catalog, { query: 'squat' })).toEqual([]);
  });
});
