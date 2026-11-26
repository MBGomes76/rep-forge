import {
  addSet as addSetToWorkout,
  advance,
  applyProgramEdits,
  addStep as addStepToProgram,
  adjustRest,
  assertValidPlannedExercise,
  effectiveAnchor,
  completeStepAfterWorkout,
  DomainError,
  duplicateProgram,
  finishWorkout as finishDomainWorkout,
  fromDate,
  planExercise,
  postpone,
  previousForSet,
  previousPerformance,
  recordSet,
  moveExercise as moveExerciseInStep,
  moveStep as moveStepInProgram,
  removeStep as removeStepFromProgram,
  replaceStep,
  resolveSetInput,
  startRest,
  startWorkout as startDomainWorkout,
  unrecordSet,
  settleElapsedRests,
  skipCurrentWorkout,
  type PlannedExercise,
  type Program,
  type RirTarget,
  type SetInput,
  type Workout,
  type WorkoutStep,
} from '@repforge/domain';
import type { Dependencies } from './ports';
import { buildProgramFromTemplate, PROGRAM_TEMPLATES } from './program-templates';

/**
 * Cas d'utilisation : chacun lit l'état, applique une règle du domaine et
 * enregistre le résultat. Aucune règle métier ici, seulement de l'orchestration.
 */
/** Une description vide retire le champ, plutôt que de garder une chaîne vide. */
function withDescription<T extends { readonly description?: string }>(item: T, description: string): T {
  const { description: _previous, ...rest } = item;
  return (description.trim() ? { ...rest, description } : rest) as T;
}

export function createUseCases(deps: Dependencies) {
  const { programs, programDrafts, workouts, restDays, settings, catalog, clock, newId, transaction } = deps;
  const today = () => fromDate(clock.now());
  const nowIso = () => clock.now().toISOString();

  async function requireProgram(id: string): Promise<Program> {
    const program = await programs.get(id);
    if (!program) throw new DomainError('Programme introuvable.');
    return program;
  }

  async function requireActiveProgram(): Promise<Program> {
    const id = await settings.getActiveProgramId();
    if (!id) throw new DomainError('Aucun programme actif.');
    return requireProgram(id);
  }

  async function requireWorkout(id: string): Promise<Workout> {
    const workout = await workouts.get(id);
    if (!workout) throw new DomainError('Séance introuvable.');
    return workout;
  }

  /**
   * Modifier un programme, c'est modifier son brouillon (créé à la première
   * modification, à partir du programme enregistré). Rien n'est synchronisé
   * avant « Enregistrer » (ADR 0014). Lire, modifier, écrire dans une
   * transaction : deux modifications rapprochées (frappe dans le nom + ajout
   * d'étape) ne s'écrasent pas l'une l'autre.
   */
  async function editProgram(id: string, change: (program: Program) => Program): Promise<Program> {
    return transaction(async () => {
      const draft = (await programDrafts.get(id)) ?? (await requireProgram(id));
      const updated = change(draft);
      await programDrafts.save(updated);
      return updated;
    });
  }

  /** Même garantie que `updateProgram`, pour deux taps rapprochés pendant une séance. */
  async function updateWorkout(id: string, change: (workout: Workout) => Workout): Promise<void> {
    await transaction(async () => {
      await workouts.save(change(await requireWorkout(id)));
    });
  }

  async function editWorkoutStep(
    programId: string,
    stepId: string,
    change: (step: WorkoutStep) => WorkoutStep,
  ): Promise<Program> {
    return editProgram(programId, (program) => {
      const step = program.steps.find((s) => s.id === stepId);
      if (step?.kind !== 'workout') throw new DomainError("Cette étape n'est pas un entraînement.");
      return replaceStep(program, change(step));
    });
  }

  async function clearRestTimerOf(workoutId: string): Promise<void> {
    const timer = await settings.getRestTimer();
    if (timer?.workoutId === workoutId) await settings.setRestTimer(undefined);
  }

  return {
    // --- Démarrage -----------------------------------------------------------

    /** Premier lancement : programmes modèles, le premier actif. Garantit un programme actif valide. */
    async ensureInitialData(): Promise<void> {
      await transaction(async () => {
        let list = await programs.list();
        if (list.length === 0) {
          list = PROGRAM_TEMPLATES.map((t) => buildProgramFromTemplate(t, newId, today()));
          for (const program of list) await programs.save(program);
        }
        const activeId = await settings.getActiveProgramId();
        if (!list.some((p) => p.id === activeId)) await settings.setActiveProgramId(list[0]?.id);
      });
    },

    // --- Calendrier et cycle -------------------------------------------------

    async postponeActive(): Promise<void> {
      const program = await requireActiveProgram();
      await programs.save(postpone(program, today()));
    },

    /**
     * « Avancer » : l'étape suivante (ou l'étape reportée) est prévue
     * aujourd'hui, tout le cycle arrive un jour plus tôt.
     */
    async advanceActive(): Promise<void> {
      const program = await requireActiveProgram();
      await programs.save(advance(program, today()));
    },

    /** « Sauter la séance » : le cycle passe à l'étape suivante, prévue demain. Rien n'entre dans l'historique. */
    async skipActive(): Promise<void> {
      const program = await requireActiveProgram();
      await programs.save(skipCurrentWorkout(program, today()));
    },

    /**
     * Les repos dont la journée est passée comptent comme faits : le cycle
     * avance et ils entrent dans l'historique. À lancer au démarrage et à
     * chaque changement de date. Ne fait rien s'il n'y a rien à régler.
     */
    async settleRests(): Promise<void> {
      await transaction(async () => {
        const id = await settings.getActiveProgramId();
        const program = id ? await programs.get(id) : undefined;
        if (!program) return;
        const settled = settleElapsedRests(program, today());
        if (settled.rests.length === 0) return;
        await programs.save(settled.program);
        for (const rest of settled.rests) {
          // Identifiant déterministe : deux appareils qui règlent le même repos produisent la même entrée.
          await restDays.add({ id: `${program.id}:${rest.date}`, programId: program.id, ...rest });
        }
      });
    },

    // --- Séance --------------------------------------------------------------

    /** Démarre la séance de l'étape courante, ou renvoie celle déjà en cours. */
    async startWorkout(): Promise<Workout> {
      const inProgress = await workouts.findInProgress();
      if (inProgress) return inProgress;
      const workout = startDomainWorkout({
        id: newId(),
        program: await requireActiveProgram(),
        catalog: catalog.all(),
        startedAt: nowIso(),
        newId,
      });
      await workouts.save(workout);
      return workout;
    },

    /**
     * Valide une série. Les champs vides reprennent la dernière fois. Lance
     * le minuteur de repos de l'exercice.
     */
    async validateSet(workoutId: string, workoutExerciseId: string, setId: string, input: SetInput): Promise<void> {
      await transaction(async () => {
        const workout = await requireWorkout(workoutId);
        const exercise = workout.exercises.find((e) => e.id === workoutExerciseId);
        if (!exercise) throw new DomainError('Exercice introuvable dans la séance.');
        const setIndex = exercise.sets.findIndex((s) => s.id === setId);

        const history = await workouts.listFinished();
        const previous = previousPerformance(history, exercise.exerciseId, { excludeWorkoutId: workoutId });
        const performance = resolveSetInput(exercise.inputKind, input, previousForSet(previous, setIndex));

        await workouts.save(recordSet(workout, workoutExerciseId, setId, performance));
        await settings.setRestTimer(startRest(workoutId, exercise.name, exercise.restSeconds, clock.now().getTime()));
      });
    },

    async unvalidateSet(workoutId: string, workoutExerciseId: string, setId: string): Promise<void> {
      await updateWorkout(workoutId, (workout) => unrecordSet(workout, workoutExerciseId, setId));
    },

    async addSet(workoutId: string, workoutExerciseId: string): Promise<void> {
      await updateWorkout(workoutId, (workout) => addSetToWorkout(workout, workoutExerciseId, newId()));
    },

    /** Termine la séance et fait avancer le cycle, en une seule écriture atomique. */
    async finishWorkout(workoutId: string): Promise<Workout> {
      return transaction(async () => {
        const finished = finishDomainWorkout(await requireWorkout(workoutId), nowIso());
        await workouts.save(finished);
        const program = await programs.get(finished.programId);
        if (program) await programs.save(completeStepAfterWorkout(program, finished, today()));
        await clearRestTimerOf(workoutId);
        return finished;
      });
    },

    /** Abandonne une séance en cours : rien n'est enregistré, le cycle n'avance pas. */
    async abandonWorkout(workoutId: string): Promise<void> {
      const workout = await requireWorkout(workoutId);
      if (workout.finishedAt !== null) throw new DomainError('Une séance terminée ne peut pas être abandonnée.');
      await transaction(async () => {
        await workouts.delete(workoutId);
        await clearRestTimerOf(workoutId);
      });
    },

    // --- Minuteur de repos ---------------------------------------------------

    async adjustRestTimer(deltaSeconds: number): Promise<void> {
      const timer = await settings.getRestTimer();
      if (timer) await settings.setRestTimer(adjustRest(timer, deltaSeconds, clock.now().getTime()));
    },

    async skipRest(): Promise<void> {
      await settings.setRestTimer(undefined);
    },

    // --- Programmes ----------------------------------------------------------

    async createProgram(): Promise<Program> {
      const program: Program = {
        id: newId(),
        name: 'Nouveau programme',
        steps: [],
        schedule: { cursor: 0, anchor: today() },
      };
      await programs.save(program);
      return program;
    },

    /** Copie un programme (nouveaux identifiants partout), sans l'activer. */
    async duplicateProgram(programId: string): Promise<Program> {
      const copy = duplicateProgram(await requireProgram(programId), newId, today());
      await programs.save(copy);
      return copy;
    },

    /** « Enregistrer » : le brouillon devient le programme (un seul envoi au serveur). */
    async saveProgramEdits(programId: string): Promise<void> {
      await transaction(async () => {
        const draft = await programDrafts.get(programId);
        if (!draft) return;
        await programs.save(applyProgramEdits(await requireProgram(programId), draft));
        await programDrafts.delete(programId);
      });
    },

    /** « Annuler » : les modifications non enregistrées sont abandonnées. */
    async discardProgramEdits(programId: string): Promise<void> {
      await programDrafts.delete(programId);
    },

    async renameProgram(programId: string, name: string): Promise<void> {
      await editProgram(programId, (p) => ({ ...p, name }));
    },

    async activateProgram(programId: string): Promise<void> {
      const program = await requireProgram(programId);
      // Un programme repris après une pause reprend aujourd'hui : ses repos « passés » n'ont pas eu lieu.
      const anchor = effectiveAnchor(program.schedule, today());
      await transaction(async () => {
        await programs.save({ ...program, schedule: { ...program.schedule, anchor } });
        await settings.setActiveProgramId(programId);
      });
    },

    /** Supprime un programme. L'historique est conservé (les séances sont des instantanés). */
    async deleteProgram(programId: string): Promise<void> {
      await transaction(async () => {
        await programs.delete(programId);
        await programDrafts.delete(programId);
        if ((await settings.getActiveProgramId()) === programId) {
          const [first] = await programs.list();
          await settings.setActiveProgramId(first?.id);
        }
      });
    },

    async addStep(programId: string, kind: 'workout' | 'rest'): Promise<Program> {
      return editProgram(programId, (program) => {
        const workoutCount = program.steps.filter((s) => s.kind === 'workout').length;
        return addStepToProgram(
          program,
          kind === 'rest'
            ? { kind: 'rest', id: newId(), name: 'Repos' }
            : { kind: 'workout', id: newId(), name: `Séance ${workoutCount + 1}`, exercises: [] },
        );
      });
    },

    async removeStep(programId: string, stepId: string): Promise<void> {
      await editProgram(programId, (program) => removeStepFromProgram(program, stepId));
    },

    /** Change la place d'une étape dans le cycle. L'étape courante reste la même. */
    async moveStep(programId: string, stepId: string, toIndex: number): Promise<void> {
      await editProgram(programId, (program) => moveStepInProgram(program, stepId, toIndex));
    },

    /** Change la place d'un exercice dans une séance du programme. */
    async moveExercise(programId: string, stepId: string, plannedId: string, toIndex: number): Promise<void> {
      await editWorkoutStep(programId, stepId, (step) => moveExerciseInStep(step, plannedId, toIndex));
    },

    async describeProgram(programId: string, description: string): Promise<void> {
      await editProgram(programId, (p) => withDescription(p, description));
    },

    async describeStep(programId: string, stepId: string, description: string): Promise<void> {
      await editWorkoutStep(programId, stepId, (step) => withDescription(step, description));
    },

    async renameStep(programId: string, stepId: string, name: string): Promise<void> {
      await editWorkoutStep(programId, stepId, (step) => ({ ...step, name }));
    },

    /** Ajoute un exercice en fin de séance et renvoie l'identifiant de la ligne créée. */
    async addExerciseToStep(programId: string, stepId: string, exerciseId: string): Promise<string> {
      const exercise = catalog.all().find((e) => e.id === exerciseId);
      if (!exercise) throw new DomainError('Exercice introuvable dans le catalogue.');
      const planned = planExercise(newId(), exercise);
      await editWorkoutStep(programId, stepId, (step) => ({ ...step, exercises: [...step.exercises, planned] }));
      return planned.id;
    },

    async updatePlannedExercise(
      programId: string,
      stepId: string,
      plannedId: string,
      patch: Partial<Pick<PlannedExercise, 'sets' | 'target' | 'restSeconds'>> & { rirTarget?: RirTarget | null },
    ): Promise<void> {
      await editWorkoutStep(programId, stepId, (step) => ({
        ...step,
        exercises: step.exercises.map((e) => {
          if (e.id !== plannedId) return e;
          const { rirTarget, ...rest } = patch;
          const updated: PlannedExercise = { ...e, ...rest };
          // `null` retire l'objectif de RIR : le champ disparaît plutôt que de valoir null.
          if (rirTarget === null) delete (updated as { rirTarget?: RirTarget }).rirTarget;
          else if (rirTarget) Object.assign(updated, { rirTarget });
          assertValidPlannedExercise(updated);
          return updated;
        }),
      }));
    },

    async removePlannedExercise(programId: string, stepId: string, plannedId: string): Promise<void> {
      await editWorkoutStep(programId, stepId, (step) => ({
        ...step,
        exercises: step.exercises.filter((e) => e.id !== plannedId),
      }));
    },
  };
}

export type UseCases = ReturnType<typeof createUseCases>;
