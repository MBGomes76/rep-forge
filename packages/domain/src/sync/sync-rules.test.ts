import { describe, expect, it } from 'vitest';
import { decidePull, sameContent } from './sync-rules';

const program = (name: string) => ({ id: 'p1', name, steps: [] });

describe('changement reçu du serveur', () => {
  it('appliqué quand rien n’a changé localement', () => {
    expect(decidePull({ version: 1, dirty: false }, program('A'), { version: 2, data: program('B') })).toBe('apply');
  });

  it('appliqué pour un document encore inconnu de l’appareil', () => {
    expect(decidePull(undefined, undefined, { version: 3, data: program('B') })).toBe('apply');
  });

  it('ignoré s’il est déjà connu (écho de notre propre envoi)', () => {
    expect(decidePull({ version: 2, dirty: false }, program('A'), { version: 2, data: program('A') })).toBe('skip');
    // Modifié localement depuis, sur la base de cette même version : l'envoi en attente suffit.
    expect(decidePull({ version: 2, dirty: true }, program('C'), { version: 2, data: program('A') })).toBe('skip');
  });

  it('conflit quand le document a changé des deux côtés : rien n’est écrasé', () => {
    expect(decidePull({ version: 1, dirty: true }, program('Téléphone'), { version: 2, data: program('Ordinateur') })).toBe('conflict');
  });

  it('suppression sur le serveur pendant une modification locale : conflit aussi', () => {
    expect(decidePull({ version: 1, dirty: true }, program('Téléphone'), { version: 2, data: null })).toBe('conflict');
  });

  it('pas de conflit quand les deux côtés ont abouti au même contenu', () => {
    expect(decidePull({ version: 1, dirty: true }, program('Même'), { version: 2, data: program('Même') })).toBe('adopt');
    // Supprimé des deux côtés.
    expect(decidePull({ version: 1, dirty: true }, undefined, { version: 2, data: null })).toBe('adopt');
  });
});

describe('égalité de contenu', () => {
  it('ignore l’ordre des clés, pas celui des listes', () => {
    expect(sameContent({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
    expect(sameContent([1, 2], [2, 1])).toBe(false);
  });

  it('un champ absent vaut un champ indéfini', () => {
    expect(sameContent({ a: 1, rir: undefined }, { a: 1 })).toBe(true);
  });
});
