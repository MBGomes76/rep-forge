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

/** Comme `formatSet`, avec le RIR s'il a été noté : « 60 kg × 10 reps · RIR 2 ». */
export function formatSetWithRir(inputKind: InputKind, performance: SetPerformance): string {
  const rir = performance.kind === 'reps' && performance.rir !== null ? ` · RIR ${performance.rir}` : '';
  return `${formatSet(inputKind, performance)}${rir}`;
}

/** « Préc. : 60 kg × 10 reps · RIR 2 » ou « Préc. : première fois » */
export function formatPrevious(inputKind: InputKind, previous: SetPerformance | undefined): string {
  return previous ? `Préc. : ${formatSetWithRir(inputKind, previous)}` : 'Préc. : première fois';
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
