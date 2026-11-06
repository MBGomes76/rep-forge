import type { CalendarHistoryEntry, Program, RestTimer, Workout } from '@repforge/domain';
import { fromDate } from '@repforge/domain';
import { useLiveQuery } from 'dexie-react-hooks';
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
