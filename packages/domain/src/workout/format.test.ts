import { describe, expect, it } from 'vitest';
import { formatKg, formatPrevious, formatProgress, formatSet } from './format';

describe('libellés d’une série', () => {
  it('formate les décimales à la française', () => {
    expect(formatKg(77.5)).toBe('77,5');
    expect(formatKg(80)).toBe('80');
  });

  it('selon le type de saisie', () => {
    expect(formatSet('load', { kind: 'reps', weightKg: 60, reps: 10, rir: 2 })).toBe('60 kg × 10 reps');
    expect(formatSet('added_weight', { kind: 'reps', weightKg: 10, reps: 8, rir: null })).toBe('+10 kg × 8 reps');
    expect(formatSet('added_weight', { kind: 'reps', weightKg: null, reps: 12, rir: null })).toBe(
      'poids du corps × 12 reps',
    );
    expect(formatSet('assistance', { kind: 'reps', weightKg: 20, reps: 1, rir: null })).toBe('−20 kg × 1 rep');
    expect(formatSet('duration', { kind: 'duration', weightKg: null, seconds: 45 })).toBe('45 s');
    expect(formatSet('duration', { kind: 'duration', weightKg: 5, seconds: 45 })).toBe('45 s · +5 kg');
  });
});

describe('performance précédente', () => {
  it('suit le format « Préc. : 60 kg × 10 reps · RIR 2 »', () => {
    expect(formatPrevious('load', { kind: 'reps', weightKg: 60, reps: 10, rir: 2 })).toBe(
      'Préc. : 60 kg × 10 reps · RIR 2',
    );
  });

  it('omet le RIR s’il n’a pas été saisi', () => {
    expect(formatPrevious('load', { kind: 'reps', weightKg: 60, reps: 10, rir: null })).toBe('Préc. : 60 kg × 10 reps');
  });

  it('indique la première fois', () => {
    expect(formatPrevious('load', undefined)).toBe('Préc. : première fois');
  });
});

describe('progression', () => {
  it.each([
    [{ kind: 'first_time' } as const, 'Nouveau'],
    [{ kind: 'equal' } as const, 'Égal'],
    [{ kind: 'weight', deltaKg: 2.5, improved: true } as const, '+2,5 kg'],
    [{ kind: 'weight', deltaKg: -5, improved: false } as const, '−5 kg'],
    [{ kind: 'reps', delta: -1, improved: false } as const, '−1 rep'],
    [{ kind: 'reps', delta: 2, improved: true } as const, '+2 reps'],
    [{ kind: 'duration', deltaSeconds: 15, improved: true } as const, '+15 s'],
  ])('%o → %s', (progress, expected) => {
    expect(formatProgress(progress)).toBe(expected);
  });
});
