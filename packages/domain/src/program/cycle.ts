import { DomainError } from '../shared/domain-error';
import type { Program, ProgramStep } from './program';

/**
 * Le cycle : une suite d'étapes parcourue en boucle, indépendante des jours de
 * la semaine. Seule la validation d'une étape le fait avancer (voir
 * `completeCurrentStep` dans `schedule.ts`).
 */

/** Index de l'étape située `offset` étapes après l'étape courante, en bouclant. */
export function stepIndexAfter(program: Program, offset: number): number {
  const count = program.steps.length;
  if (count === 0) {
    throw new DomainError('Ce programme ne contient aucune étape.');
  }
  // Modulo positif, même si offset est négatif.
  return (((program.schedule.cursor + offset) % count) + count) % count;
}

export function currentStep(program: Program): ProgramStep | undefined {
  return program.steps[program.schedule.cursor];
}

export function nextStep(program: Program): ProgramStep | undefined {
  if (program.steps.length === 0) return undefined;
  return program.steps[stepIndexAfter(program, 1)];
}

/**
 * Applique une modification de la liste des étapes en gardant la même étape
 * courante. Si elle a été supprimée, l'étape qui prend sa place devient
 * courante (en revenant au début si c'était la dernière).
 */
function withSteps(program: Program, steps: readonly ProgramStep[]): Program {
  const current = currentStep(program);
  let cursor = current ? steps.findIndex((s) => s.id === current.id) : -1;
  if (cursor === -1) {
    cursor = steps.length === 0 ? 0 : Math.min(program.schedule.cursor, steps.length) % steps.length;
  }
  return { ...program, steps, schedule: { ...program.schedule, cursor } };
}

export function addStep(program: Program, step: ProgramStep): Program {
  if (program.steps.some((s) => s.id === step.id)) {
    throw new DomainError('Cette étape existe déjà dans le programme.');
  }
  return withSteps(program, [...program.steps, step]);
}

export function removeStep(program: Program, stepId: string): Program {
  if (!program.steps.some((s) => s.id === stepId)) {
    throw new DomainError('Étape introuvable.');
  }
  return withSteps(
    program,
    program.steps.filter((s) => s.id !== stepId),
  );
}

export function moveStep(program: Program, stepId: string, toIndex: number): Program {
  const from = program.steps.findIndex((s) => s.id === stepId);
  if (from === -1) throw new DomainError('Étape introuvable.');
  if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= program.steps.length) {
    throw new DomainError('Position invalide.');
  }
  const steps = [...program.steps];
  const [moved] = steps.splice(from, 1);
  steps.splice(toIndex, 0, moved!);
  return withSteps(program, steps);
}

export function replaceStep(program: Program, step: ProgramStep): Program {
  if (!program.steps.some((s) => s.id === step.id)) throw new DomainError('Étape introuvable.');
  return withSteps(
    program,
    program.steps.map((s) => (s.id === step.id ? step : s)),
  );
}
