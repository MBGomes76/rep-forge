import { Box, Flex, Stack } from '@chakra-ui/react';
import { exerciseHistory, exerciseRecord, formatSet, formatSetWithRir, fromDate } from '@repforge/domain';
import { useLocation, useParams } from 'react-router';
import { Screen } from '../components/screen';
import { Card, Label, Num } from '../components/ui';
import { plural, relativeDay } from '../format';
import { useAllExercises, useFinishedWorkouts } from '../hooks/use-data';
import { useNow } from '../hooks/use-now';

/** D'où l'on vient (la séance en cours, ou l'onglet Historique) : le bouton retour y ramène. */
export interface ExerciseHistoryState {
  readonly from?: string;
}

/**
 * Historique d'un exercice : sa meilleure série, puis chaque séance où il a
 * été fait, avec toutes ses séries. Ouvert depuis l'onglet Historique ou
 * pendant une séance.
 */
export function ExerciseHistoryScreen() {
  const { exerciseId } = useParams();
  const state = useLocation().state as ExerciseHistoryState | null;
  const workouts = useFinishedWorkouts();
  const exercises = useAllExercises();
  const today = fromDate(useNow(60_000));

  const sessions = workouts && exerciseId ? exerciseHistory(workouts, exerciseId) : [];
  const record = exerciseRecord(sessions);
  // Le nom actuel du catalogue, sinon celui de la dernière séance.
  const name = exercises.find((e) => e.id === exerciseId)?.name ?? sessions[0]?.exerciseName ?? 'Exercice';
  const dayOf = (iso: string) => relativeDay(fromDate(new Date(iso)), today);

  return (
    <Screen title={name} backTo={state?.from ?? '/historique?vue=exercices'}>
      <Stack gap="3">
        {workouts && sessions.length === 0 && (
          <Card fontSize="15px" color="rf.soft">
            Pas encore fait. Ses séries apparaîtront ici après ta première séance terminée.
          </Card>
        )}

        {record && (
          <Card borderColor="rf.doneBorder">
            <Stack gap="1">
              <Label color="rf.accent">Meilleure série</Label>
              <Num fontSize="20px" fontWeight="700">
                {formatSet(sessions[0]!.inputKind, record.performance)}
              </Num>
              <Box fontSize="13px" color="rf.muted">
                {dayOf(record.finishedAt)} · {plural(sessions.length, 'séance')} en tout
              </Box>
            </Stack>
          </Card>
        )}

        {sessions.map((session) => (
          <Card key={session.workoutId} as="article">
            <Stack gap="2">
              <Flex justify="space-between" align="baseline" gap="3">
                <Box as="h2" fontSize="16px" fontWeight="700">
                  {session.workoutName}
                </Box>
                <Box as="time" flex="none" fontSize="13px" color="rf.muted" {...{ dateTime: session.finishedAt }}>
                  {dayOf(session.finishedAt)}
                </Box>
              </Flex>
              <Stack as="ol" gap="1" borderTopWidth="1px" borderColor="rf.border" pt="2" listStyleType="none">
                {session.sets.map((set, i) => (
                  <Flex as="li" key={i} gap="3" fontSize="14px">
                    <Num flex="none" w="20px" color="rf.muted">
                      {i + 1}
                    </Num>
                    <Num>{formatSetWithRir(session.inputKind, set)}</Num>
                  </Flex>
                ))}
              </Stack>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Screen>
  );
}
