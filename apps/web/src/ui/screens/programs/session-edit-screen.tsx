import { Box, Flex, Stack } from '@chakra-ui/react';
import { fixedTarget, rangeTarget, type Exercise, type PlannedExercise, type RepTarget } from '@repforge/domain';
import { useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { useApp } from '../../app-context';
import { ActionMenu } from '../../components/action-menu';
import { NameField, Stepper } from '../../components/form';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from '../../components/icons';
import { Screen } from '../../components/screen';
import { useAction } from '../../components/toaster';
import { AppButton, Card, Chip } from '../../components/ui';
import { formatRest } from '../../format';
import { useProgram } from '../../hooks/use-data';
import { CatalogSheet } from './catalog-sheet';

/** Bornes des réglages (celles de la maquette). */
const LIMITS = {
  sets: [1, 10],
  reps: [1, 50],
  repsMax: [1, 60],
  seconds: [5, 300],
  rest: [15, 600],
} as const;

const clamp = (value: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, value));

/** Change le minimum (ou la valeur fixe) en gardant une plage cohérente. */
function withMin(target: RepTarget, value: number): RepTarget {
  if (target.kind === 'fixed') return fixedTarget(value);
  return rangeTarget(value, Math.max(value, target.max));
}

function withMax(target: RepTarget, value: number): RepTarget {
  if (target.kind === 'fixed') return target;
  return rangeTarget(Math.min(value, target.min), value);
}

export function SessionEditScreen() {
  const { programId, stepId } = useParams();
  const program = useProgram(programId);
  const { useCases, deps } = useApp();
  const run = useAction();
  const [catalogOpen, setCatalogOpen] = useState(false);

  const backTo = `/programmes/${programId}`;
  if (program === null) return <Navigate to="/programmes" replace />;
  if (program === undefined) return <Screen title="Séance" backTo={backTo}>{null}</Screen>;
  const step = program.steps.find((s) => s.id === stepId);
  if (step?.kind !== 'workout') return <Navigate to={backTo} replace />;

  const exerciseOf = (planned: PlannedExercise) => deps.catalog.all().find((e) => e.id === planned.exerciseId);

  const pick = async (exercise: Exercise) => {
    setCatalogOpen(false);
    await run(() => useCases.addExerciseToStep(program.id, step.id, exercise.id), `${exercise.name} ajouté`);
  };

  return (
    <Screen title="Séance" backTo={backTo}>
      <Stack gap="3.5">
        <NameField
          key={step.id}
          label="Nom de la séance"
          value={step.name}
          onSave={(name) => void run(() => useCases.renameStep(program.id, step.id, name))}
        />

        {step.exercises.length === 0 && (
          <Card fontSize="15px" color="rf.soft">
            Aucun exercice pour l'instant. Ajoute-en depuis le catalogue.
          </Card>
        )}

        {step.exercises.map((planned, index) => (
          <PlannedExerciseCard
            key={planned.id}
            planned={planned}
            index={index}
            count={step.exercises.length}
            onMove={(to) => void run(() => useCases.moveExercise(program.id, step.id, planned.id, to))}
            exercise={exerciseOf(planned)}
            onChange={(patch) => void run(() => useCases.updatePlannedExercise(program.id, step.id, planned.id, patch))}
            onRemove={() => void run(() => useCases.removePlannedExercise(program.id, step.id, planned.id))}
          />
        ))}

        <AppButton onClick={() => setCatalogOpen(true)}>
          <PlusIcon size={20} />
          Ajouter un exercice
        </AppButton>
      </Stack>

      {catalogOpen && <CatalogSheet onPick={pick} onClose={() => setCatalogOpen(false)} />}
    </Screen>
  );
}

interface PlannedExerciseCardProps {
  planned: PlannedExercise;
  index: number;
  count: number;
  onMove: (toIndex: number) => void;
  exercise: Exercise | undefined;
  onChange: (patch: Partial<Pick<PlannedExercise, 'sets' | 'target' | 'restSeconds'>>) => void;
  onRemove: () => void;
}

function PlannedExerciseCard({ planned, index, count, onMove, exercise, onChange, onRemove }: PlannedExerciseCardProps) {
  const isDuration = exercise?.inputKind === 'duration';
  const { target } = planned;
  const isRange = target.kind === 'range';
  const minValue = target.kind === 'range' ? target.min : target.value;
  const minStep = isDuration ? 5 : 1;
  const minLimits = isDuration ? LIMITS.seconds : LIMITS.reps;
  const name = exercise?.name ?? planned.exerciseId;

  return (
    <Card>
      <Stack gap="3">
        <Flex align="flex-start" gap="2">
          <Box flex="1" minW="0">
            <Box fontSize="16px" fontWeight="700">
              {name}
            </Box>
            <Box fontSize="13px" color="rf.muted" mt="0.5">
              {exercise?.loadConvention}
            </Box>
          </Box>
          <ActionMenu
            label={`Actions pour ${name}`}
            actions={[
              { label: 'Monter', icon: <ArrowUpIcon size={18} />, disabled: index === 0, onSelect: () => onMove(index - 1) },
              { label: 'Descendre', icon: <ArrowDownIcon size={18} />, disabled: index === count - 1, onSelect: () => onMove(index + 1) },
              { label: 'Retirer de la séance', icon: <TrashIcon size={18} />, danger: true, onSelect: onRemove },
            ]}
          />
        </Flex>

        <Stepper
          label="Séries"
          value={String(planned.sets)}
          canDecrement={planned.sets > LIMITS.sets[0]}
          canIncrement={planned.sets < LIMITS.sets[1]}
          onDecrement={() => onChange({ sets: clamp(planned.sets - 1, LIMITS.sets) })}
          onIncrement={() => onChange({ sets: clamp(planned.sets + 1, LIMITS.sets) })}
        />

        {!isDuration && (
          <Flex gap="2">
            <Chip active={isRange} onClick={() => !isRange && onChange({ target: rangeTarget(minValue, Math.min(60, minValue + 4)) })}>
              Plage de reps
            </Chip>
            <Chip active={!isRange} onClick={() => isRange && onChange({ target: fixedTarget(minValue) })}>
              Objectif fixe
            </Chip>
          </Flex>
        )}

        <Stepper
          label={isDuration ? 'Durée (s)' : isRange ? 'Reps min' : 'Reps'}
          value={String(minValue)}
          canDecrement={minValue > minLimits[0]}
          canIncrement={minValue < minLimits[1]}
          onDecrement={() => onChange({ target: withMin(target, clamp(minValue - minStep, minLimits)) })}
          onIncrement={() => onChange({ target: withMin(target, clamp(minValue + minStep, minLimits)) })}
        />

        {target.kind === 'range' && (
          <Stepper
            label="Reps max"
            value={String(target.max)}
            canDecrement={target.max > LIMITS.repsMax[0]}
            canIncrement={target.max < LIMITS.repsMax[1]}
            onDecrement={() => onChange({ target: withMax(target, clamp(target.max - 1, LIMITS.repsMax)) })}
            onIncrement={() => onChange({ target: withMax(target, clamp(target.max + 1, LIMITS.repsMax)) })}
          />
        )}

        <Stepper
          label="Repos"
          value={formatRest(planned.restSeconds)}
          canDecrement={planned.restSeconds > LIMITS.rest[0]}
          canIncrement={planned.restSeconds < LIMITS.rest[1]}
          onDecrement={() => onChange({ restSeconds: clamp(planned.restSeconds - 15, LIMITS.rest) })}
          onIncrement={() => onChange({ restSeconds: clamp(planned.restSeconds + 15, LIMITS.rest) })}
        />
      </Stack>
    </Card>
  );
}
