import { describe, expect, it } from 'vitest';
import { DomainError } from '../shared/domain-error';
import { addDays } from '../shared/local-date';
import { pplProgram, TODAY } from '../testing/fixtures';
import { addStep, applyProgramEdits, currentStep, moveStep, nextStep, removeStep, replaceStep, stepIndexAfter } from './cycle';
import type { Program } from './program';

const emptyProgram: Program = { id: 'empty', name: 'Vide', steps: [], schedule: { cursor: 0, anchor: TODAY } };

describe('position dans le cycle', () => {
  it('donne l’étape courante et la suivante', () => {
    const program = pplProgram(1);
    expect(currentStep(program)?.name).toBe('Pull');
    expect(nextStep(program)?.name).toBe('Repos');
  });

  it('boucle sur la première étape après la dernière', () => {
    const program = pplProgram(4);
    expect(nextStep(program)?.id).toBe('push');
    expect(stepIndexAfter(program, 1)).toBe(0);
    expect(stepIndexAfter(program, 6)).toBe(0); // 4 + 6 = 10 ≡ 0 (mod 5)
  });

  it('gère un décalage négatif', () => {
    expect(stepIndexAfter(pplProgram(0), -1)).toBe(4);
  });

  it('signale un programme sans étape', () => {
    expect(currentStep(emptyProgram)).toBeUndefined();
    expect(nextStep(emptyProgram)).toBeUndefined();
    expect(() => stepIndexAfter(emptyProgram, 1)).toThrow(DomainError);
  });
});

describe('modifier les étapes garde la même étape courante', () => {
  it('ajouter une étape ne change pas l’étape courante', () => {
    const program = addStep(pplProgram(2), { kind: 'rest', id: 'rest-3', name: 'Repos' });
    expect(program.steps).toHaveLength(6);
    expect(currentStep(program)?.id).toBe('rest-1');
  });

  it('refuse une étape déjà présente', () => {
    expect(() => addStep(pplProgram(), { kind: 'rest', id: 'rest-1', name: 'Repos' })).toThrow(DomainError);
  });

  it('supprimer une étape placée avant l’étape courante ne fait pas sauter d’étape', () => {
    const program = removeStep(pplProgram(3), 'push');
    expect(currentStep(program)?.id).toBe('legs');
    expect(program.schedule.cursor).toBe(2);
  });

  it('supprimer l’étape courante passe à celle qui prend sa place', () => {
    expect(currentStep(removeStep(pplProgram(1), 'pull'))?.id).toBe('rest-1');
  });

  it('supprimer l’étape courante, si c’est la dernière, revient au début', () => {
    expect(currentStep(removeStep(pplProgram(4), 'rest-2'))?.id).toBe('push');
  });

  it('supprimer la dernière étape restante laisse un programme vide', () => {
    let program: Program = { ...emptyProgram, steps: [{ kind: 'rest', id: 'r', name: 'Repos' }] };
    program = removeStep(program, 'r');
    expect(program.steps).toEqual([]);
    expect(program.schedule.cursor).toBe(0);
  });

  it('déplacer des étapes garde l’étape courante', () => {
    const program = moveStep(pplProgram(1), 'pull', 4);
    expect(program.steps.map((s) => s.id)).toEqual(['push', 'rest-1', 'legs', 'rest-2', 'pull']);
    expect(currentStep(program)?.id).toBe('pull');
    expect(program.schedule.cursor).toBe(4);
  });

  it('refuse une position ou une étape invalide', () => {
    expect(() => moveStep(pplProgram(), 'pull', 5)).toThrow(DomainError);
    expect(() => moveStep(pplProgram(), 'inconnue', 0)).toThrow(DomainError);
    expect(() => removeStep(pplProgram(), 'inconnue')).toThrow(DomainError);
  });

  it('remplace le contenu d’une étape sans toucher au cycle', () => {
    const program = replaceStep(pplProgram(1), { kind: 'workout', id: 'pull', name: 'Dos', exercises: [] });
    expect(currentStep(program)?.name).toBe('Dos');
    expect(program.schedule).toEqual(pplProgram(1).schedule);
  });

  it('ne modifie jamais le programme d’origine', () => {
    const original = pplProgram(1);
    removeStep(original, 'push');
    expect(original.steps).toHaveLength(5);
    expect(original.schedule.cursor).toBe(1);
  });
});

describe('enregistrer un brouillon', () => {
  it('reprend le contenu du brouillon et la position du programme enregistré', () => {
    const draft = { ...moveStep(pplProgram(0), 'legs', 0), name: 'PPL revu' }; // Jambes, Push, Pull, Repos, Repos
    const saved = pplProgram(1, addDays(TODAY, 1)); // pendant l’édition, Push a été terminée : Pull est courante
    const result = applyProgramEdits(saved, draft);
    expect(result.name).toBe('PPL revu');
    expect(result.steps.map((s) => s.id)).toEqual(['legs', 'push', 'pull', 'rest-1', 'rest-2']);
    expect(currentStep(result)?.id).toBe('pull');
    expect(result.schedule.anchor).toBe(addDays(TODAY, 1));
  });

  it('si l’étape courante a été supprimée du brouillon, celle qui prend sa place devient courante', () => {
    const draft = removeStep(pplProgram(0), 'pull');
    const result = applyProgramEdits(pplProgram(1), draft);
    expect(currentStep(result)?.id).toBe('rest-1');
  });

  it('brouillon vidé de ses étapes : programme vide, curseur à zéro', () => {
    const result = applyProgramEdits(pplProgram(3), { ...pplProgram(0), steps: [] });
    expect(result.steps).toEqual([]);
    expect(result.schedule.cursor).toBe(0);
  });
});
