import { describe, expect, it } from 'vitest';
import { addDays } from '../shared/local-date';
import { pplProgram, sequentialIds, TODAY } from '../testing/fixtures';
import { duplicateProgram } from './program';

describe('dupliquer un programme', () => {
  const original = pplProgram(3, addDays(TODAY, 2));
  const copy = duplicateProgram(original, sequentialIds('copie'), TODAY);

  it('garde les étapes, les exercices et leurs réglages', () => {
    expect(copy.name).toBe('PPL · cycle de 5 jours (copie)');
    expect(copy.steps.map((s) => s.name)).toEqual(original.steps.map((s) => s.name));
    const [push] = copy.steps;
    expect(push?.kind === 'workout' && push.exercises[0]).toMatchObject({ exerciseId: 'bench-press', sets: 3 });
  });

  it('donne de nouveaux identifiants partout : la copie évolue seule', () => {
    const ids = [copy.id, ...copy.steps.flatMap((s) => [s.id, ...(s.kind === 'workout' ? s.exercises.map((e) => e.id) : [])])];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('copie-'))).toBe(true);
  });

  it('commence le cycle à la première étape, aujourd’hui', () => {
    expect(copy.schedule).toEqual({ cursor: 0, anchor: TODAY });
  });
});
