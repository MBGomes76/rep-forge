import { Box, Flex, Grid, Stack } from '@chakra-ui/react';
import { formatProgress, formatSet, stepIndexAfter, summarizeWorkout, type Progress } from '@repforge/domain';
import { Navigate, useNavigate } from 'react-router';
import { useApp } from '../../app-context';
import { Screen } from '../../components/screen';
import { useAction } from '../../components/toaster';
import { AppButton, Card, Hint, Label, Num } from '../../components/ui';
import { formatMinutes, formatVolume, plural } from '../../format';
import { useFinishedWorkouts, useProgram, useWorkoutInProgress } from '../../hooks/use-data';
import { useNow } from '../../hooks/use-now';

function progressColor(progress: Progress): string {
  if (progress.kind === 'first_time' || progress.kind === 'equal') return 'rf.muted';
  return progress.improved ? 'rf.accent' : 'rf.amber';
}

/**
 * Récapitulatif avant de terminer : la séance n'est enregistrée comme
 * terminée (et le cycle n'avance) qu'à la confirmation.
 */
export function RecapScreen() {
  const workout = useWorkoutInProgress();
  const history = useFinishedWorkouts();
  const program = useProgram(workout?.programId);
  const now = useNow(10_000);
  const navigate = useNavigate();
  const { useCases } = useApp();
  const run = useAction();

  if (workout === null) return <Navigate to="/" replace />;
  if (workout === undefined || history === undefined || program === undefined) {
    return <Screen title="Récapitulatif" footer="none">{null}</Screen>;
  }

  const recap = summarizeWorkout(workout, history, now.toISOString());

  // Étape suivante, si la séance correspond toujours à l'étape courante.
  const current = program?.steps[program.schedule.cursor];
  const next = program && current?.id === workout.stepId ? program.steps[stepIndexAfter(program, 1)] : undefined;

  const confirm = async () => {
    const finished = await run(
      () => useCases.finishWorkout(workout.id),
      next ? `Séance enregistrée · prochaine étape : ${next.name}` : 'Séance enregistrée',
    );
    if (finished) navigate('/', { replace: true });
  };

  return (
    <Screen title="Récapitulatif" backTo="/seance" footer="none">
      <Stack gap="3.5">
        <Card>
          <Stack gap="3.5">
            <Box>
              <Label color="rf.accent">Séance terminée</Label>
              <Box fontSize="26px" fontWeight="700" mt="0.5">
                {workout.name}
              </Box>
            </Box>
            <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap="2">
              <Stat label="Durée" value={formatMinutes(recap.durationSeconds)} />
              <Stat label="Séries" value={String(recap.completedSets)} />
              <Stat label="Volume" value={formatVolume(recap.volumeKg)} />
            </Grid>
          </Stack>
        </Card>

        <Stack gap="2">
          {recap.exercises.map((item) => (
            <Card key={item.workoutExerciseId} px="3.5" py="3">
              <Flex justify="space-between" align="center" gap="3">
                <Box minW="0">
                  <Box fontSize="15px" fontWeight="600">
                    {item.name}
                  </Box>
                  <Box fontSize="13px" color="rf.muted" mt="0.5">
                    {plural(item.completedSets, 'série')} · meilleure : {formatSet(item.inputKind, item.best)}
                  </Box>
                </Box>
                <Num flex="none" fontSize="15px" fontWeight="700" color={progressColor(item.progress)}>
                  {formatProgress(item.progress)}
                </Num>
              </Flex>
            </Card>
          ))}
        </Stack>

        <Hint>La variation compare ta meilleure série du jour à celle du dernier entraînement.</Hint>
        <AppButton onClick={confirm}>{next ? `Terminer · étape suivante : ${next.name}` : 'Terminer la séance'}</AppButton>
        <AppButton variant="ghost" onClick={() => navigate('/seance')}>
          Revenir à la séance
        </AppButton>
      </Stack>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box bg="rf.surface" borderRadius="control" p="2.5">
      <Label>{label}</Label>
      <Num display="block" fontSize="20px" fontWeight="700" mt="0.5">
        {value}
      </Num>
    </Box>
  );
}
