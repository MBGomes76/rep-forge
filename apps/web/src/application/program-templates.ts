import { rangeTarget, type LocalDate, type Program, type ProgramStep } from '@repforge/domain';

/**
 * Programmes modèles créés au premier lancement (modifiables et supprimables).
 * Les identifiants d'exercice doivent exister dans le catalogue (vérifié par un test).
 */

type ExerciseLine = readonly [exerciseId: string, sets: number, min: number, max: number, restSeconds: number];
type StepTemplate = { readonly name: string; readonly exercises: readonly ExerciseLine[] } | 'rest';

interface ProgramTemplate {
  readonly name: string;
  readonly steps: readonly StepTemplate[];
}

export const PROGRAM_TEMPLATES: readonly ProgramTemplate[] = [
  {
    name: 'PPL · cycle de 5 jours',
    steps: [
      {
        name: 'Push',
        exercises: [
          ['bench-press', 3, 6, 8, 150],
          ['incline-dumbbell-press', 3, 8, 12, 120],
          ['cable-triceps-extension', 3, 10, 12, 75],
        ],
      },
      {
        name: 'Pull',
        exercises: [
          ['pull-up', 3, 6, 10, 120],
          ['barbell-row', 3, 8, 12, 120],
          ['dumbbell-curl', 3, 10, 12, 75],
        ],
      },
      'rest',
      {
        name: 'Jambes',
        exercises: [
          ['back-squat', 4, 6, 8, 150],
          ['romanian-deadlift', 3, 8, 10, 120],
          ['leg-press', 3, 10, 12, 90],
          ['standing-calf-raise', 3, 12, 15, 60],
        ],
      },
      'rest',
    ],
  },
  {
    name: 'Full body · 3 jours',
    steps: [
      {
        name: 'Full body A',
        exercises: [
          ['back-squat', 3, 6, 8, 150],
          ['bench-press', 3, 6, 8, 150],
          ['barbell-row', 3, 8, 10, 120],
        ],
      },
      'rest',
      {
        name: 'Full body B',
        exercises: [
          ['romanian-deadlift', 3, 8, 10, 120],
          ['overhead-press', 3, 6, 8, 120],
          ['pull-up', 3, 6, 10, 120],
        ],
      },
    ],
  },
];

export function buildProgramFromTemplate(template: ProgramTemplate, newId: () => string, today: LocalDate): Program {
  const steps: ProgramStep[] = template.steps.map((step) =>
    step === 'rest'
      ? { kind: 'rest', id: newId(), name: 'Repos' }
      : {
          kind: 'workout',
          id: newId(),
          name: step.name,
          exercises: step.exercises.map(([exerciseId, sets, min, max, restSeconds]) => ({
            id: newId(),
            exerciseId,
            sets,
            target: rangeTarget(min, max),
            restSeconds,
          })),
        },
  );
  return { id: newId(), name: template.name, steps, schedule: { cursor: 0, anchor: today } };
}
