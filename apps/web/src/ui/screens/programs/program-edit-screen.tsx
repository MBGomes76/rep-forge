import { Box, chakra, Flex, Stack } from '@chakra-ui/react';
import type { ProgramStep } from '@repforge/domain';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useApp } from '../../app-context';
import { ActionMenu } from '../../components/action-menu';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { MoveButtons, NameField } from '../../components/form';
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, EditIcon, TrashIcon } from '../../components/icons';
import { Screen } from '../../components/screen';
import { useAction } from '../../components/toaster';
import { AppButton, Card, Num } from '../../components/ui';
import { plural } from '../../format';
import { useActiveProgramId, useProgram } from '../../hooks/use-data';

type PendingDeletion = { kind: 'step'; step: ProgramStep } | { kind: 'program' } | null;

export function ProgramEditScreen() {
  const { programId } = useParams();
  const program = useProgram(programId);
  const activeId = useActiveProgramId();
  const navigate = useNavigate();
  const { useCases } = useApp();
  const run = useAction();
  const [pending, setPending] = useState<PendingDeletion>(null);
  const [reordering, setReordering] = useState(false);

  if (program === null) return <Navigate to="/programmes" replace />;
  if (program === undefined) return <Screen title="Programme" backTo="/programmes">{null}</Screen>;

  const openStep = (stepId: string) => navigate(`/programmes/${program.id}/seances/${stepId}`);
  const move = (stepId: string, toIndex: number) => void run(() => useCases.moveStep(program.id, stepId, toIndex));

  const confirmDeletion = async () => {
    const target = pending;
    setPending(null);
    if (target?.kind === 'step') await run(() => useCases.removeStep(program.id, target.step.id));
    if (target?.kind === 'program') {
      await run(() => useCases.deleteProgram(program.id), 'Programme supprimé');
      navigate('/programmes', { replace: true });
    }
  };

  return (
    <Screen title="Programme" backTo="/programmes">
      <Stack gap="3.5">
        <NameField
          key={program.id}
          label="Nom du programme"
          value={program.name}
          onSave={(name) => void run(() => useCases.renameProgram(program.id, name))}
        />
        <Box fontSize="14px" color="rf.muted">
          {program.steps.length
            ? `Cycle de ${plural(program.steps.length, 'étape')}. Après la dernière, il recommence à la première.`
            : 'Ajoute des étapes pour composer ton cycle.'}
        </Box>

        <Stack gap="2">
          {program.steps.map((step, i) => (
            <Flex key={step.id} gap="2" align="center">
              <StepRow
                step={step}
                index={i}
                reordering={reordering}
                onOpen={() => openStep(step.id)}
              />
              {reordering ? (
                <MoveButtons
                  itemLabel={`l’étape ${i + 1} (${step.name})`}
                  index={i}
                  count={program.steps.length}
                  onMove={(to) => move(step.id, to)}
                />
              ) : (
                <ActionMenu
                  label={`Actions pour l’étape ${i + 1} (${step.name})`}
                  actions={[
                    ...(step.kind === 'workout'
                      ? [{ label: 'Modifier la séance', icon: <EditIcon size={18} />, onSelect: () => openStep(step.id) }]
                      : []),
                    { label: 'Monter', icon: <ArrowUpIcon size={18} />, disabled: i === 0, onSelect: () => move(step.id, i - 1) },
                    {
                      label: 'Descendre',
                      icon: <ArrowDownIcon size={18} />,
                      disabled: i === program.steps.length - 1,
                      onSelect: () => move(step.id, i + 1),
                    },
                    {
                      label: 'Supprimer l’étape',
                      icon: <TrashIcon size={18} />,
                      danger: true,
                      onSelect: () =>
                        step.kind === 'rest' ? void run(() => useCases.removeStep(program.id, step.id)) : setPending({ kind: 'step', step }),
                    },
                  ]}
                />
              )}
            </Flex>
          ))}
        </Stack>

        {reordering ? (
          <AppButton onClick={() => setReordering(false)}>Terminer</AppButton>
        ) : (
          <Stack gap="2">
            <Flex gap="2">
              <AppButton variant="secondary" small flex="1" onClick={() => run(() => useCases.addStep(program.id, 'workout'))}>
                + Entraînement
              </AppButton>
              <AppButton variant="secondary" small flex="1" onClick={() => run(() => useCases.addStep(program.id, 'rest'))}>
                + Repos
              </AppButton>
            </Flex>
            {program.steps.length > 1 && (
              <AppButton variant="secondary" small onClick={() => setReordering(true)}>
                Réorganiser les étapes
              </AppButton>
            )}
          </Stack>
        )}

        {program.id !== activeId && (
          <AppButton onClick={() => run(() => useCases.activateProgram(program.id), `Programme activé : ${program.name}`)}>
            Activer ce programme
          </AppButton>
        )}

        <Card fontSize="14px" color="rf.muted" lineHeight="1.5">
          Modifier le programme ne change ni l'historique ni une séance déjà commencée : elle garde les objectifs d'origine.
        </Card>

        <chakra.button
          type="button"
          onClick={() => setPending({ kind: 'program' })}
          minH="44px"
          fontSize="14px"
          fontWeight="600"
          color="rf.danger"
          textDecoration="underline"
          cursor="pointer"
        >
          Supprimer ce programme
        </chakra.button>
      </Stack>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'program' ? 'Supprimer ce programme ?' : `Supprimer « ${pending?.kind === 'step' ? pending.step.name : ''} » ?`}
        description={
          pending?.kind === 'program'
            ? 'Le programme et ses séances prévues seront supprimés. Ton historique est conservé.'
            : 'Cette séance et ses exercices seront retirés du cycle. Ton historique est conservé.'
        }
        confirmLabel="Supprimer"
        onConfirm={confirmDeletion}
        onCancel={() => setPending(null)}
      />
    </Screen>
  );
}

function StepNumber({ n, workout }: { n: number; workout: boolean }) {
  return (
    <Num
      flex="none"
      w="28px"
      h="28px"
      borderRadius="full"
      bg={workout ? 'rf.doneBg' : 'rf.control'}
      color={workout ? 'rf.accent' : 'rf.muted'}
      fontWeight="700"
      fontSize="13px"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      {n}
    </Num>
  );
}

const rowStyle = {
  flex: '1',
  minW: '0',
  minH: '60px',
  borderRadius: 'button',
  bg: 'rf.card',
  borderWidth: '1px',
  borderColor: 'rf.border',
  display: 'flex',
  alignItems: 'center',
  gap: '3',
  px: '3.5',
  py: '2',
  textAlign: 'left',
} as const;

interface StepRowProps {
  step: ProgramStep;
  index: number;
  /** En mode réorganisation, la ligne n'ouvre pas la séance (évite un tap involontaire). */
  reordering: boolean;
  onOpen: () => void;
}

function StepRow({ step, index, reordering, onOpen }: StepRowProps) {
  if (step.kind === 'workout' && reordering) {
    return (
      <Box {...rowStyle}>
        <StepNumber n={index + 1} workout />
        <Box flex="1" minW="0" fontSize="16px" fontWeight="600" truncate>
          {step.name || 'Sans nom'}
        </Box>
      </Box>
    );
  }
  if (step.kind === 'rest') {
    return (
      <Box {...rowStyle} borderStyle="dashed">
        <StepNumber n={index + 1} workout={false} />
        <Box flex="1" minW="0">
          <Box fontSize="16px" fontWeight="600">
            Repos
          </Box>
          <Box fontSize="13px" color="rf.muted">
            Étape sans entraînement
          </Box>
        </Box>
      </Box>
    );
  }
  return (
    <chakra.button type="button" onClick={onOpen} cursor="pointer" color="rf.text" {...rowStyle}>
      <StepNumber n={index + 1} workout />
      <Box flex="1" minW="0">
        <Box fontSize="16px" fontWeight="600">
          {step.name || 'Sans nom'}
        </Box>
        <Box fontSize="13px" color="rf.muted">
          {plural(step.exercises.length, 'exercice')}
        </Box>
      </Box>
      <Box color="rf.muted">
        <ChevronRightIcon size={18} />
      </Box>
    </chakra.button>
  );
}
