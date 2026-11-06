import { describe, expect, it } from 'vitest';
import { adjustRest, remainingRestRatio, remainingRestSeconds, startRest } from './rest-timer';

const NOW = 1_000_000;

describe('minuteur de repos', () => {
  it('démarre avec le temps de repos prévu', () => {
    const timer = startRest('w1', 'Développé couché', 90, NOW);
    expect(remainingRestSeconds(timer, NOW)).toBe(90);
    expect(remainingRestSeconds(timer, NOW + 30_500)).toBe(60); // arrondi au-dessus
    expect(remainingRestSeconds(timer, NOW + 120_000)).toBe(0);
  });

  it('s’ajuste de ±15 s', () => {
    const timer = startRest('w1', 'Squat', 90, NOW);
    const longer = adjustRest(timer, 15, NOW);
    expect(remainingRestSeconds(longer, NOW)).toBe(105);
    expect(longer.totalSeconds).toBe(105);
    expect(remainingRestSeconds(adjustRest(timer, -15, NOW), NOW)).toBe(75);
  });

  it('ne descend jamais sous zéro restant', () => {
    const timer = startRest('w1', 'Squat', 10, NOW);
    const shortened = adjustRest(timer, -15, NOW);
    expect(remainingRestSeconds(shortened, NOW)).toBe(0);
    expect(shortened.totalSeconds).toBe(1);
  });

  it('donne la part restante pour la barre de progression', () => {
    const timer = startRest('w1', 'Squat', 100, NOW);
    expect(remainingRestRatio(timer, NOW)).toBe(1);
    expect(remainingRestRatio(timer, NOW + 25_000)).toBe(0.75);
    expect(remainingRestRatio(timer, NOW + 200_000)).toBe(0);
  });
});
