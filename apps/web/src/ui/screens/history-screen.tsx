import { Box, Flex, Stack } from '@chakra-ui/react';
import { formatSet, fromDate, summarizeWorkout } from '@repforge/domain';
import { Screen } from '../components/screen';
import { Card, Num } from '../components/ui';
import { formatMinutes, formatVolume, plural, relativeDay } from '../format';
import { useFinishedWorkouts } from '../hooks/use-data';
import { useNow } from '../hooks/use-now';

/** Historique daté des séances, avec la meilleure série de chaque exercice. */
export function HistoryScreen() {
  const workouts = useFinishedWorkouts();
  const today = fromDate(useNow(60_000));

  return (
    <Screen title="Historique">
      <Stack gap="3">
        {workouts?.length === 0 && (
          <Card fontSize="15px" color="rf.soft">
            Aucun entraînement pour l'instant. Tes séances terminées apparaîtront ici.
          </Card>
        )}
        {workouts?.map((workout) => {
          const recap = summarizeWorkout(workout, [], workout.finishedAt!);
          return (
            <Card key={workout.id} as="article">
              <Stack gap="2">
                <Flex justify="space-between" align="baseline" gap="3">
                  <Box as="h2" fontSize="18px" fontWeight="700">
                    {workout.name}
                  </Box>
                  <Box as="time" fontSize="13px" color="rf.muted" {...{ dateTime: workout.finishedAt! }}>
                    {relativeDay(fromDate(new Date(workout.finishedAt!)), today)}
                  </Box>
                </Flex>
                <Num fontSize="14px" color="rf.accent">
                  {formatMinutes(recap.durationSeconds)} · {plural(recap.completedSets, 'série')} · {formatVolume(recap.volumeKg)}
                </Num>
                <Stack gap="1.5" borderTopWidth="1px" borderColor="rf.border" pt="2">
                  {recap.exercises.map((item) => (
                    <Box key={item.workoutExerciseId}>
                      <Box fontSize="14px">{item.name}</Box>
                      <Box fontSize="13px" color="rf.muted">
                        {plural(item.completedSets, 'série')} · meilleure : {formatSet(item.inputKind, item.best)}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Screen>
  );
}
