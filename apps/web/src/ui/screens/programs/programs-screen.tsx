import { Box, Flex, Stack } from '@chakra-ui/react';
import { useNavigate } from 'react-router';
import { useApp } from '../../app-context';
import { PlusIcon } from '../../components/icons';
import { Screen } from '../../components/screen';
import { useAction } from '../../components/toaster';
import { AppButton, Card } from '../../components/ui';
import { plural } from '../../format';
import { useActiveProgramId, usePrograms } from '../../hooks/use-data';

export function ProgramsScreen() {
  const programs = usePrograms();
  const activeId = useActiveProgramId();
  const navigate = useNavigate();
  const { useCases } = useApp();
  const run = useAction();

  const duplicate = async (programId: string) => {
    const copy = await run(() => useCases.duplicateProgram(programId), 'Programme dupliqué');
    if (copy) navigate(`/programmes/${copy.id}`);
  };

  const create = async () => {
    const program = await run(() => useCases.createProgram());
    if (program) navigate(`/programmes/${program.id}`);
  };

  return (
    <Screen title="Programmes">
      <Stack gap="3">
        {programs?.map((program) => {
          const workouts = program.steps.filter((s) => s.kind === 'workout').length;
          const active = program.id === activeId;
          return (
            <Card key={program.id}>
              <Stack gap="2.5">
                <Flex justify="space-between" align="center" gap="2">
                  <Box fontSize="18px" fontWeight="700" minW="0">
                    {program.name || 'Sans nom'}
                  </Box>
                  {active && (
                    <Box flex="none" fontSize="12px" fontWeight="700" color="rf.onAccent" bg="rf.accent" borderRadius="full" px="2.5" py="1">
                      Actif
                    </Box>
                  )}
                </Flex>
                <Box fontSize="14px" color="rf.muted">
                  {plural(program.steps.length, 'étape')} · {plural(workouts, 'entraînement')}
                </Box>
                <Box fontSize="14px" color="rf.soft" lineHeight="1.4">
                  {program.steps.length ? program.steps.map((s) => s.name).join(' · ') : 'Aucune étape pour l’instant'}
                </Box>
                <Flex gap="2">
                  <AppButton variant="ghost" small onClick={() => navigate(`/programmes/${program.id}`)}>
                    Modifier
                  </AppButton>
                  <AppButton variant="ghost" small onClick={() => duplicate(program.id)}>
                    Dupliquer
                  </AppButton>
                  {!active && (
                    <AppButton
                      variant="ghost"
                      small
                      onClick={() => run(() => useCases.activateProgram(program.id), `Programme activé : ${program.name}`)}
                    >
                      Activer
                    </AppButton>
                  )}
                </Flex>
              </Stack>
            </Card>
          );
        })}
        <AppButton onClick={create}>
          <PlusIcon size={20} />
          Nouveau programme
        </AppButton>
      </Stack>
    </Screen>
  );
}
