import { Box, chakra, Grid } from '@chakra-ui/react';
import { DomainError, formatKg, formatPrevious, type SetInput, type SetPerformance, type WorkoutExercise, type WorkoutSet } from '@repforge/domain';
import { useState } from 'react';
import { CheckIcon } from '../../components/icons';
import { notify } from '../../components/toaster';

/** Colonnes : N°, prévu, poids, reps (ou secondes), RIR, valider. */
export function setGridColumns(exercise: WorkoutExercise): string {
  return exercise.inputKind === 'duration' ? '24px 50px 1fr 1fr 44px' : '24px 50px 1fr 1fr 44px 44px';
}

export function weightColumnLabel(exercise: WorkoutExercise): string {
  if (exercise.inputKind === 'load') return 'kg';
  if (exercise.inputKind === 'assistance') return 'Assist.';
  return 'Lest';
}

/** « 62,5 » ou « 62.5 » → 62.5 ; vide → null. */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) throw new DomainError(`Valeur invalide : « ${text} ».`);
  return value;
}

const show = (n: number | null | undefined) => (n === null || n === undefined ? '' : formatKg(n));

interface Draft {
  weight: string;
  amount: string;
  rir: string;
}

const emptyDraft: Draft = { weight: '', amount: '', rir: '' };

function draftFrom(performance: SetPerformance): Draft {
  return performance.kind === 'reps'
    ? { weight: show(performance.weightKg), amount: String(performance.reps), rir: show(performance.rir) }
    : { weight: show(performance.weightKg), amount: String(performance.seconds), rir: '' };
}

interface SetRowProps {
  exercise: WorkoutExercise;
  set: WorkoutSet;
  index: number;
  target: string;
  previous: SetPerformance | undefined;
  onValidate: (input: SetInput) => Promise<boolean>;
  onUnvalidate: () => Promise<void>;
}

export function SetRow({ exercise, set, index, target, previous, onValidate, onUnvalidate }: SetRowProps) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const done = set.performance !== null;
  const values = done ? draftFrom(set.performance!) : draft;
  const isDuration = exercise.inputKind === 'duration';
  const n = index + 1;

  // Les valeurs de la dernière fois servent d'indication (placeholder).
  const previousDraft = previous ? draftFrom(previous) : undefined;

  const toggle = async () => {
    if (done) {
      setDraft(draftFrom(set.performance!));
      await onUnvalidate();
      return;
    }
    try {
      const input: SetInput = isDuration
        ? { weightKg: parseDecimal(draft.weight), seconds: parseDecimal(draft.amount) }
        : { weightKg: parseDecimal(draft.weight), reps: parseDecimal(draft.amount), rir: parseDecimal(draft.rir) };
      if (await onValidate(input)) setDraft(emptyDraft);
    } catch (error) {
      if (error instanceof DomainError) notify(error.message, 'error');
      else throw error;
    }
  };

  const field = (key: keyof Draft, label: string, inputMode: 'decimal' | 'numeric', placeholder: string) => (
    <chakra.input
      aria-label={`${label} de la série ${n} · ${exercise.name}`}
      inputMode={inputMode}
      enterKeyHint="done"
      autoComplete="off"
      readOnly={done}
      value={values[key]}
      placeholder={placeholder}
      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
      h="44px"
      w="100%"
      minW="0"
      borderRadius="control"
      borderWidth="1px"
      borderColor={done ? 'rf.doneBorder' : 'rf.controlBorder'}
      bg={done ? '#0C2A29' : 'rf.surface'}
      color={done ? 'rf.accent' : 'rf.text'}
      fontSize="17px"
      fontWeight="600"
      fontFamily="numeric"
      textAlign="center"
      px="1"
    />
  );

  return (
    <Box
      borderRadius="button"
      p="2"
      borderWidth="1px"
      borderColor={done ? 'rf.doneBorder' : 'transparent'}
      bg={done ? 'rf.doneBg' : 'transparent'}
    >
      <Grid templateColumns={setGridColumns(exercise)} gap="1.5" alignItems="center">
        <Box fontFamily="numeric" fontWeight="700" color="rf.muted" textAlign="center">
          {n}
        </Box>
        <Box fontFamily="numeric" fontSize="13px" color="rf.planned" textAlign="center">
          {target}
        </Box>
        {field('weight', weightColumnLabel(exercise), 'decimal', previousDraft?.weight || '–')}
        {field('amount', isDuration ? 'Durée en secondes' : 'Répétitions', 'numeric', previousDraft?.amount ?? '')}
        {!isDuration && field('rir', 'RIR', 'numeric', '–')}
        <chakra.button
          type="button"
          aria-label={`${done ? "Corriger" : "Valider"} la série ${n} · ${exercise.name}`}
          aria-pressed={done}
          onClick={toggle}
          w="44px"
          h="44px"
          borderRadius="control"
          borderWidth="1px"
          borderColor={done ? 'rf.accent' : 'rf.controlBorder'}
          bg={done ? 'rf.accent' : 'rf.control'}
          color={done ? 'rf.onAccent' : 'rf.muted'}
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
        >
          <CheckIcon />
        </chakra.button>
      </Grid>
      <Box fontSize="12px" color="rf.muted" mt="1.5" ml="30px">
        {formatPrevious(exercise.inputKind, previous)}
      </Box>
    </Box>
  );
}
