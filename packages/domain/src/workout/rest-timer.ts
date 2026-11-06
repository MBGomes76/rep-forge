/**
 * Minuteur de repos entre deux séries.
 *
 * On stocke l'instant de fin (`endsAt`, en millisecondes) plutôt qu'un
 * décompte : le temps restant reste juste même si le téléphone met l'écran en
 * veille ou si la page est rechargée.
 */
export interface RestTimer {
  readonly workoutId: string;
  /** Nom de l'exercice qui vient d'être fait, pour l'affichage. */
  readonly label: string;
  readonly endsAt: number;
  /** Durée totale prévue (ajustements compris), pour la barre de progression. */
  readonly totalSeconds: number;
}

export const REST_ADJUST_STEP_SECONDS = 15;

/** Démarre le repos à la validation d'une série. */
export function startRest(workoutId: string, label: string, seconds: number, nowMs: number): RestTimer {
  return { workoutId, label, endsAt: nowMs + seconds * 1000, totalSeconds: seconds };
}

/** Ajoute ou retire du temps (±15 s), sans descendre sous zéro restant. */
export function adjustRest(timer: RestTimer, deltaSeconds: number, nowMs: number): RestTimer {
  const endsAt = Math.max(nowMs, timer.endsAt + deltaSeconds * 1000);
  const appliedSeconds = (endsAt - timer.endsAt) / 1000;
  return { ...timer, endsAt, totalSeconds: Math.max(1, timer.totalSeconds + appliedSeconds) };
}

export function remainingRestSeconds(timer: RestTimer, nowMs: number): number {
  return Math.max(0, Math.ceil((timer.endsAt - nowMs) / 1000));
}

/** Part restante, de 1 (début) à 0 (fini). */
export function remainingRestRatio(timer: RestTimer, nowMs: number): number {
  return Math.min(1, remainingRestSeconds(timer, nowMs) / timer.totalSeconds);
}
