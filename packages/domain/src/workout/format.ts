import type { InputKind } from '../catalog/exercise';
import type { Progress } from './recap';
import type { SetPerformance } from './workout';

/**
 * Libellés français des performances, tels que définis par la maquette.
 * Fonctions pures : l'interface les affiche sans retraitement.
 */

const kgFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** 77.5 → « 77,5 » */
export function formatKg(value: number): string {
  return kgFormat.format(value);
}

function formatReps(count: number): string {
  return `${count} ${count > 1 ? 'reps' : 'rep'}`;
}

/** « 60 kg × 10 reps », « +10 kg × 8 reps », « poids du corps × 12 reps », « 45 s · +5 kg » */
export function formatSet(inputKind: InputKind, performance: SetPerformance): string {
  const weight = performance.weightKg ?? 0;
  if (performance.kind === 'duration') {
    return `${performance.seconds} s${weight ? ` · +${formatKg(weight)} kg` : ''}`;
  }
  let load: string;
  if (inputKind === 'load') load = `${formatKg(weight)} kg`;
  else if (!weight) load = 'poids du corps';
  else load = `${inputKind === 'assistance' ? '−' : '+'}${formatKg(weight)} kg`;
  return `${load} × ${formatReps(performance.reps)}`;
}

/** « Préc. : 60 kg × 10 reps · RIR 2 » ou « Préc. : première fois » */
export function formatPrevious(inputKind: InputKind, previous: SetPerformance | undefined): string {
  if (!previous) return 'Préc. : première fois';
  const rir = previous.kind === 'reps' && previous.rir !== null ? ` · RIR ${previous.rir}` : '';
  return `Préc. : ${formatSet(inputKind, previous)}${rir}`;
}

const sign = (n: number): string => (n > 0 ? '+' : '−');

/** « Nouveau », « Égal », « +2,5 kg », « −1 rep », « +15 s » */
export function formatProgress(progress: Progress): string {
  switch (progress.kind) {
    case 'first_time':
      return 'Nouveau';
    case 'equal':
      return 'Égal';
    case 'weight':
      return `${sign(progress.deltaKg)}${formatKg(Math.abs(progress.deltaKg))} kg`;
    case 'reps':
      return `${sign(progress.delta)}${formatReps(Math.abs(progress.delta))}`;
    case 'duration':
      return `${sign(progress.deltaSeconds)}${Math.abs(progress.deltaSeconds)} s`;
  }
}
