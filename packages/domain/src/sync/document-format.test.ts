import { describe, expect, it } from 'vitest';
import { DOCUMENT_FORMAT, DocumentFormatTooNew, fromStoredDocument, toStoredDocument, type FormatConfig } from './document-format';

describe('format des documents', () => {
  it('chaque document envoyé porte le format actuel, retiré à la réception', () => {
    const stored = toStoredDocument({ id: 'p1', name: 'PPL' });
    expect(stored).toEqual({ id: 'p1', name: 'PPL', format: DOCUMENT_FORMAT });
    expect(fromStoredDocument('program', stored)).toEqual({ id: 'p1', name: 'PPL' });
  });

  it('un document sans numéro (créé avant les formats) est du format 1', () => {
    expect(fromStoredDocument('program', { id: 'p1', name: 'PPL' })).toEqual({ id: 'p1', name: 'PPL' });
  });

  it('une suppression (null) reste une suppression', () => {
    expect(fromStoredDocument('workout', null)).toBeNull();
  });

  // Exemple d'évolution future : une note par série au format 2, un objectif de RIR au format 3.
  const evolution: FormatConfig = {
    current: 3,
    upgrades: {
      workout: {
        1: (data) => ({ ...data, note: '' }),
        2: (data) => ({ ...data, rirTarget: null }),
      },
    },
  };

  it('un ancien document est mis à niveau étape par étape', () => {
    expect(fromStoredDocument('workout', { id: 'w1' }, evolution)).toEqual({ id: 'w1', note: '', rirTarget: null });
    expect(fromStoredDocument('workout', { id: 'w1', note: 'Bonne forme', format: 2 }, evolution)).toEqual({
      id: 'w1',
      note: 'Bonne forme',
      rirTarget: null,
    });
  });

  it('un type sans changement traverse les formats intact', () => {
    expect(fromStoredDocument('program', { id: 'p1', format: 1 }, evolution)).toEqual({ id: 'p1' });
  });

  it('un document d’une version plus récente de l’app est refusé, sans être modifié', () => {
    expect(() => fromStoredDocument('program', { id: 'p1', format: DOCUMENT_FORMAT + 1 })).toThrow(DocumentFormatTooNew);
  });
});
