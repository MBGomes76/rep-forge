import { Box, chakra, Flex, Heading, Stack } from '@chakra-ui/react';
import {
  EXERCISE_NAME_MAX_LENGTH,
  suggestLoadConvention,
  type CustomExercise,
  type Equipment,
  type InputKind,
  type MuscleGroup,
} from '@repforge/domain';
import { useId, useState, type FormEvent } from 'react';
import { useApp } from '../../app-context';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { textInputStyle } from '../../components/form';
import { CloseIcon } from '../../components/icons';
import { useAction } from '../../components/toaster';
import { AppButton, Chip, Hint, IconButton, Label, ScrollRow } from '../../components/ui';
import { EQUIPMENT_LABELS, INPUT_KIND_LABELS, MUSCLE_GROUP_LABELS } from '../../format';

const muscleGroups = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[];
const equipments = Object.keys(EQUIPMENT_LABELS) as Equipment[];
const inputKinds = Object.keys(INPUT_KIND_LABELS) as InputKind[];

const INPUT_KIND_HINTS: Record<InputKind, string> = {
  load: 'Poids soulevé et répétitions.',
  added_weight: 'Poids du corps, avec un lest facultatif, et répétitions.',
  assistance: 'Poids du corps moins une assistance (élastique, machine), et répétitions.',
  duration: 'Temps tenu, en secondes.',
};

interface CustomExerciseFormProps {
  /** Absent : création. Présent : modification de cet exercice. */
  exercise?: CustomExercise;
  onDone: (exercise?: CustomExercise) => void;
  onClose: () => void;
}

/**
 * Création ou modification d'un exercice personnalisé, en plein écran (par-dessus
 * le catalogue). Le type de saisie se choisit à la création, puis reste fixe.
 */
export function CustomExerciseForm({ exercise, onDone, onClose }: CustomExerciseFormProps) {
  const { useCases } = useApp();
  const run = useAction();
  const nameId = useId();
  const conventionId = useId();
  const [name, setName] = useState(exercise?.name ?? '');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(exercise?.muscleGroup ?? 'chest');
  const [equipment, setEquipment] = useState<Equipment>(exercise?.equipment ?? 'machine');
  const [inputKind, setInputKind] = useState<InputKind>(exercise?.inputKind ?? 'load');
  // La convention suit la saisie et le matériel tant qu'on ne l'a pas réécrite soi-même.
  const [convention, setConvention] = useState<string | null>(exercise?.loadConvention ?? null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const loadConvention = convention ?? suggestLoadConvention(inputKind, equipment);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = { name, muscleGroup, equipment, loadConvention };
    if (exercise) {
      const done = await run(() => useCases.updateCustomExercise(exercise.id, input).then(() => true), 'Exercice modifié');
      if (done) onDone();
    } else {
      const created = await run(() => useCases.createCustomExercise(inputKind, input), 'Exercice créé');
      if (created) onDone(created);
    }
  };

  const archive = async () => {
    setConfirmingArchive(false);
    if (!exercise) return;
    const done = await run(() => useCases.archiveCustomExercise(exercise.id).then(() => true), 'Exercice archivé');
    if (done) onDone();
  };

  return (
    <Flex
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-exercise-title"
      position="fixed"
      inset="0"
      zIndex="overlay"
      bg="rf.bg"
      direction="column"
      maxW="480px"
      mx="auto"
    >
      <Flex flex="none" align="center" gap="2.5" px="4" pt="calc(14px + env(safe-area-inset-top))" pb="2.5">
        <Heading as="h2" id="custom-exercise-title" flex="1" fontSize="22px" fontWeight="700">
          {exercise ? 'Modifier l’exercice' : 'Nouvel exercice'}
        </Heading>
        <IconButton label="Fermer" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Flex>

      <chakra.form onSubmit={submit} flex="1" minH="0" overflowY="auto" px="4" pt="1" pb="6">
        <Stack gap="4">
          <Stack gap="1.5">
            <Label as="label" {...{ htmlFor: nameId }}>
              Nom
            </Label>
            <chakra.input
              id={nameId}
              value={name}
              maxLength={EXERCISE_NAME_MAX_LENGTH}
              autoComplete="off"
              placeholder="Ex. Presse à mollets"
              onChange={(e) => setName(e.target.value)}
              {...textInputStyle}
              _placeholder={{ color: 'rf.muted' }}
            />
          </Stack>

          <ChoiceRow
            label="Groupe musculaire"
            options={muscleGroups}
            labels={MUSCLE_GROUP_LABELS}
            value={muscleGroup}
            onChange={setMuscleGroup}
          />
          <ChoiceRow label="Matériel" options={equipments} labels={EQUIPMENT_LABELS} value={equipment} onChange={setEquipment} />

          {exercise ? (
            <Stack gap="1">
              <Label>Saisie</Label>
              <Box fontSize="15px">{INPUT_KIND_LABELS[inputKind]}</Box>
              <Hint>Le type de saisie ne se change pas : tes performances déjà enregistrées resteraient illisibles.</Hint>
            </Stack>
          ) : (
            <Stack gap="1.5">
              <ChoiceRow label="Saisie" options={inputKinds} labels={INPUT_KIND_LABELS} value={inputKind} onChange={setInputKind} />
              <Hint>{INPUT_KIND_HINTS[inputKind]} Ne pourra plus être changé.</Hint>
            </Stack>
          )}

          <Stack gap="1.5">
            <Label as="label" {...{ htmlFor: conventionId }}>
              Convention de charge
            </Label>
            <chakra.input
              id={conventionId}
              value={loadConvention}
              autoComplete="off"
              onChange={(e) => setConvention(e.target.value)}
              {...textInputStyle}
            />
            <Hint>Comment lire le poids saisi : par haltère, barre incluse, lest ajouté…</Hint>
          </Stack>

          <AppButton type="submit">{exercise ? 'Enregistrer' : 'Créer l’exercice'}</AppButton>

          {exercise && (
            <chakra.button
              type="button"
              onClick={() => setConfirmingArchive(true)}
              minH="44px"
              fontSize="14px"
              fontWeight="600"
              color="rf.danger"
              textDecoration="underline"
              cursor="pointer"
            >
              Archiver cet exercice
            </chakra.button>
          )}
        </Stack>
      </chakra.form>

      <ConfirmDialog
        open={confirmingArchive}
        title={`Archiver « ${exercise?.name ?? ''} » ?`}
        description="Il disparaît du catalogue. Les programmes qui l’utilisent et ton historique ne changent pas."
        confirmLabel="Archiver"
        onConfirm={() => void archive()}
        onCancel={() => setConfirmingArchive(false)}
      />
    </Flex>
  );
}

interface ChoiceRowProps<T extends string> {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}

function ChoiceRow<T extends string>({ label, options, labels, value, onChange }: ChoiceRowProps<T>) {
  return (
    <Stack gap="1.5">
      <Label>{label}</Label>
      <ScrollRow role="group" aria-label={label}>
        {options.map((option) => (
          <Chip key={option} active={value === option} onClick={() => onChange(option)}>
            {labels[option]}
          </Chip>
        ))}
      </ScrollRow>
    </Stack>
  );
}
