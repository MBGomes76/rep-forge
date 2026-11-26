import type { CalendarHistoryEntry, Program, RestTimer, Workout } from '@repforge/domain';
import { fromDate } from '@repforge/domain';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Account } from '../../application/remote';
import type { SyncConflict, SyncStatus } from '../../application/sync-store';
import { useApp } from '../app-context';

/**
 * Lectures réactives : chaque hook se réexécute dès que les données lues
 * changent dans IndexedDB (après un cas d'utilisation, ou plus tard après une
 * synchronisation). `undefined` = chargement en cours.
 */

export function usePrograms(): Program[] | undefined {
  const { deps } = useApp();
  return useLiveQuery(() => deps.programs.list(), [deps]);
}

export function useProgram(id: string | undefined): Program | null | undefined {
  const { deps } = useApp();
  // Sans id (pas encore connu) : chargement, pas « introuvable ».
  return useLiveQuery(async () => (id ? ((await deps.programs.get(id)) ?? null) : undefined), [deps, id]);
}

/** Programme tel qu'il s'édite : son brouillon s'il y en a un, sinon la version enregistrée. */
export interface EditedProgram {
  readonly program: Program;
  /** Des modifications attendent « Enregistrer ». */
  readonly dirty: boolean;
}

export function useEditedProgram(id: string | undefined): EditedProgram | null | undefined {
  const { deps } = useApp();
  return useLiveQuery(async () => {
    if (!id) return undefined;
    const saved = await deps.programs.get(id);
    if (!saved) return null;
    const draft = await deps.programDrafts.get(id);
    return { program: draft ?? saved, dirty: draft !== undefined };
  }, [deps, id]);
}

/** Programmes qui ont des modifications non enregistrées. */
export function useDraftProgramIds(): string[] | undefined {
  const { deps } = useApp();
  return useLiveQuery(() => deps.programDrafts.listIds(), [deps]);
}

export function useActiveProgramId(): string | null | undefined {
  const { deps } = useApp();
  return useLiveQuery(async () => (await deps.settings.getActiveProgramId()) ?? null, [deps]);
}

export function useActiveProgram(): Program | null | undefined {
  const { deps } = useApp();
  return useLiveQuery(async () => {
    const id = await deps.settings.getActiveProgramId();
    return (id && (await deps.programs.get(id))) || null;
  }, [deps]);
}

export function useWorkoutInProgress(): Workout | null | undefined {
  const { deps } = useApp();
  return useLiveQuery(async () => (await deps.workouts.findInProgress()) ?? null, [deps]);
}

export function useFinishedWorkouts(): Workout[] | undefined {
  const { deps } = useApp();
  return useLiveQuery(() => deps.workouts.listFinished(), [deps]);
}

export function useRestTimer(): RestTimer | null | undefined {
  const { deps } = useApp();
  return useLiveQuery(async () => (await deps.settings.getRestTimer()) ?? null, [deps]);
}

/** Historique au format du calendrier : séances terminées et repos validés. */
export function useCalendarHistory(): CalendarHistoryEntry[] | undefined {
  const { deps } = useApp();
  return useLiveQuery(async () => {
    const [workouts, rests] = await Promise.all([deps.workouts.listFinished(), deps.restDays.list()]);
    return [
      ...workouts.map((w) => ({ date: fromDate(new Date(w.finishedAt!)), kind: 'workout' as const, name: w.name })),
      ...rests.map((r) => ({ date: r.date, kind: 'rest' as const, name: r.name })),
    ];
  }, [deps]);
}

/** Compte connecté sur l'appareil ; `null` si personne n'est connecté. */
export function useAccount(): Account | null | undefined {
  const { deps } = useApp();
  return useLiveQuery(async () => (await deps.settings.getAccount()) ?? null, [deps]);
}

export interface SyncConflictView extends SyncConflict {
  /** Copie de l'appareil, `undefined` si supprimée localement. */
  readonly local: unknown;
}

export interface SyncState {
  readonly pending: number;
  readonly conflicts: readonly SyncConflictView[];
  readonly status: SyncStatus;
}

/** État de la synchronisation, mis à jour en direct. */
export function useSyncState(): SyncState | undefined {
  const { deps } = useApp();
  return useLiveQuery(async () => {
    const store = deps.syncStore;
    const [pending, conflicts, status] = await Promise.all([store.pending(), store.conflicts(), store.status()]);
    const withLocal = await Promise.all(conflicts.map(async (c) => ({ ...c, local: await store.readLocal(c.collection, c.id) })));
    return { pending: pending.length, conflicts: withLocal, status };
  }, [deps]);
}
