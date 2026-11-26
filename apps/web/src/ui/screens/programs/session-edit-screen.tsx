import { Box, chakra, Flex, Stack } from '@chakra-ui/react';
import { fixedTarget, formatTarget, rangeTarget, type Exercise, type PlannedExercise, type RepTarget } from '@repforge/domain';
import { useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { useApp } from '../../app-context';
import { ActionMenu } from '../../components/action-menu';
import { NameField, Segmented, Stepper } from '../../components/form';
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, PlusIcon, TrashIcon } from '../../components/icons';
import { Screen } from '../../components/screen';
import { useAction } from '../../components/toaster';
import { AppButton, Card, Hint, Num } from '../../components/ui';
import { formatRest } from '../../format';
import { useEditedProgram } from '../../hooks/use-data';
import { CatalogSheet } from './catalog-sheet';
import { ProgramEditFooter } from './edit-bar';

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

type PlannedPatch = Partial<Pick<PlannedExercise, 'sets' | 'target' | 'restSeconds'>>;

export function SessionEditScreen() {
  const { programId, stepId } = useParams();
  const edited = useEditedProgram(programId);
  const { useCases, deps } = useApp();
  const run = useAction();
  const [catalogOpen, setCatalogOpen] = useState(false);
  /** Une seule carte en édition à la fois : le reste de la séance se lit d'un coup d'œil. */
  const [editingId, setEditingId] = useState<string | null>(null);

  const backTo = `/programmes/${programId}`;
  if (edited === null) return <Navigate to="/programmes" replace />;
  if (edited === undefined) return <Screen title="Séance" backTo={backTo}>{null}</Screen>;
  const { program, dirty } = edited;
  const step = program.steps.find((s) => s.id === stepId);
  if (step?.kind !== 'workout') return <Navigate to={backTo} replace />;

  const exerciseOf = (planned: PlannedExercise) => deps.catalog.all().find((e) => e.id === planned.exerciseId);

  const pick = async (exercise: Exercise) => {
    setCatalogOpen(false);
    const plannedId = await run(() => useCases.addExerciseToStep(program.id, step.id, exercise.id), `${exercise.name} ajouté`);
    // Un exercice ajouté s'ouvre directement : on règle souvent ses séries juste après.
    if (plannedId) setEditingId(plannedId);
  };

  return (
    <Screen title="Séance" backTo={backTo} footer={<ProgramEditFooter programId={program.id} dirty={dirty} />}>
      <Stack gap="3">
        <NameField
          key={step.id}
          label="Nom de la séance"
          value={step.name}
          onSave={(name) => void run(() => useCases.renameStep(program.id, step.id, name))}
        />

        {step.exercises.length === 0 ? (
          <Card fontSize="15px" color="rf.soft">
            Aucun exercice pour l'instant. Ajoute-en depuis le catalogue.
          </Card>
        ) : (
          <Hint>Touche un exercice pour régler ses séries, son objectif et son repos.</Hint>
        )}

        {step.exercises.map((planned, index) => (
          <PlannedExerciseCard
            key={planned.id}
            planned={planned}
            exercise={exerciseOf(planned)}
            editing={editingId === planned.id}
            onToggle={() => setEditingId(editingId === planned.id ? null : planned.id)}
            index={index}
            count={step.exercises.length}
            onMove={(to) => void run(() => useCases.moveExercise(program.id, step.id, planned.id, to))}
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

/** Résumé d'une ligne : « 3 × 8–12 reps · repos 2:00 ». */
function summary(planned: PlannedExercise, isDuration: boolean): string {
  const target = `${formatTarget(planned.target)} ${isDuration ? 's' : 'reps'}`;
  return `${planned.sets} × ${target} · repos ${formatRest(planned.restSeconds)}`;
}

interface PlannedExerciseCardProps {
  planned: PlannedExercise;
  exercise: Exercise | undefined;
  editing: boolean;
  onToggle: () => void;
  index: number;
  count: number;
  onMove: (toIndex: number) => void;
  onChange: (patch: PlannedPatch) => void;
  onRemove: () => void;
}

/** Carte repliée : nom et résumé. Dépliée : les réglages. */
function PlannedExerciseCard({ planned, exercise, editing, onToggle, index, count, onMove, onChange, onRemove }: PlannedExerciseCardProps) {
  const isDuration = exercise?.inputKind === 'duration';
  const name = exercise?.name ?? planned.exerciseId;

  // Le menu ⋮ reste hors de la carte, aligné sur son en-tête (comme les étapes du programme).
  return (
    <Flex align="flex-start" gap="2">
      <Card p="0" flex="1" minW="0" borderColor={editing ? 'rf.doneBorder' : 'rf.border'}>
        <chakra.button
          type="button"
          onClick={onToggle}
          aria-expanded={editing}
          aria-label={`${editing ? 'Replier' : 'Régler'} ${name}`}
          w="100%"
          minH="64px"
          display="flex"
          alignItems="center"
          gap="2"
          textAlign="left"
          color="rf.text"
          cursor="pointer"
          px="4"
          py="3"
        >
          <Box flex="1" minW="0">
            <Box fontSize="16px" fontWeight="700">
              {name}
            </Box>
            {editing ? (
              <Box fontSize="13px" color="rf.muted" mt="0.5">
                {exercise?.loadConvention}
              </Box>
            ) : (
              <Num display="block" fontSize="14px" color="rf.planned" mt="1">
                {summary(planned, isDuration)}
              </Num>
            )}
          </Box>
          <Box color="rf.muted" transform={editing ? 'rotate(180deg)' : undefined} transition="transform 0.15s">
            <ChevronDownIcon size={18} />
          </Box>
        </chakra.button>
        {editing && <PlannedExerciseSettings planned={planned} isDuration={isDuration} onChange={onChange} />}
      </Card>
      <Box mt="10px">
        <ActionMenu
          label={`Actions pour ${name}`}
          actions={[
            { label: 'Monter', icon: <ArrowUpIcon size={18} />, disabled: index === 0, onSelect: () => onMove(index - 1) },
            { label: 'Descendre', icon: <ArrowDownIcon size={18} />, disabled: index === count - 1, onSelect: () => onMove(index + 1) },
            { label: 'Retirer de la séance', icon: <TrashIcon size={18} />, danger: true, onSelect: onRemove },
          ]}
        />
      </Box>
    </Flex>
  );
}

function PlannedExerciseSettings({
  planned,
  isDuration,
  onChange,
}: {
  planned: PlannedExercise;
  isDuration: boolean;
  onChange: (patch: PlannedPatch) => void;
}) {
  const { target } = planned;
  const minValue = target.kind === 'range' ? target.min : target.value;
  const minStep = isDuration ? 5 : 1;
  const minLimits = isDuration ? LIMITS.seconds : LIMITS.reps;

  return (
    <Stack gap="1" px="4" pb="3" pt="2" borderTopWidth="1px" borderColor="rf.border">
      <Stepper
        label="Séries"
        value={String(planned.sets)}
        canDecrement={planned.sets > LIMITS.sets[0]}
        canIncrement={planned.sets < LIMITS.sets[1]}
        onDecrement={() => onChange({ sets: clamp(planned.sets - 1, LIMITS.sets) })}
        onIncrement={() => onChange({ sets: clamp(planned.sets + 1, LIMITS.sets) })}
      />

      {!isDuration && (
        <Segmented
          label="Objectif"
          options={[
            { value: 'range', label: 'Plage' },
            { value: 'fixed', label: 'Fixe' },
          ]}
          value={target.kind}
          onChange={(kind) =>
            onChange({ target: kind === 'fixed' ? fixedTarget(minValue) : rangeTarget(minValue, Math.min(60, minValue + 4)) })
          }
        />
      )}

      <Stepper
        label={isDuration ? 'Durée (s)' : target.kind === 'range' ? 'Reps min' : 'Reps'}
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
  );
}
