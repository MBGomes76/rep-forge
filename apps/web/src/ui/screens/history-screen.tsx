import { Box, chakra, Flex, Stack } from '@chakra-ui/react';
import { exercisesDone, formatSet, fromDate, summarizeWorkout, type LocalDate, type Workout } from '@repforge/domain';
import { useNavigate, useSearchParams } from 'react-router';
import { ChevronRightIcon } from '../components/icons';
import { Screen } from '../components/screen';
import { Card, Chip, Num } from '../components/ui';
import { formatMinutes, formatVolume, plural, relativeDay } from '../format';
import { useAllExercises, useFinishedWorkouts } from '../hooks/use-data';
import { useNow } from '../hooks/use-now';

/**
 * Historique, en deux vues : les séances datées (avec la meilleure série de
 * chaque exercice), ou les exercices déjà faits, qui mènent chacun à leur
 * historique. La vue est dans l'adresse : le retour depuis un exercice y revient.
 */
export function HistoryScreen() {
  const workouts = useFinishedWorkouts();
  const today = fromDate(useNow(60_000));
  const [params, setParams] = useSearchParams();
  const byExercise = params.get('vue') === 'exercices';

  return (
    <Screen title="Historique">
      <Stack gap="3">
        <Flex gap="2">
          <Chip active={!byExercise} onClick={() => setParams({}, { replace: true })}>
            Séances
          </Chip>
          <Chip active={byExercise} onClick={() => setParams({ vue: 'exercices' }, { replace: true })}>
            Exercices
          </Chip>
        </Flex>
        {workouts?.length === 0 && (
          <Card fontSize="15px" color="rf.soft">
            Aucun entraînement pour l'instant. Tes séances terminées apparaîtront ici.
          </Card>
        )}
        {workouts && (byExercise ? <ExerciseList workouts={workouts} today={today} /> : <WorkoutList workouts={workouts} today={today} />)}
      </Stack>
    </Screen>
  );
}

function WorkoutList({ workouts, today }: { workouts: Workout[]; today: LocalDate }) {
  return (
    <>
      {workouts.map((workout) => {
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
    </>
  );
}

/** Exercices déjà faits, du plus récent au plus ancien. */
function ExerciseList({ workouts, today }: { workouts: Workout[]; today: LocalDate }) {
  const navigate = useNavigate();
  const exercises = useAllExercises();
  // Le nom actuel du catalogue (un exercice a pu être renommé), sinon celui de la dernière séance.
  const nameOf = (exerciseId: string, fallback: string) => exercises.find((e) => e.id === exerciseId)?.name ?? fallback;
  return (
    <Stack gap="2">
      {exercisesDone(workouts).map((done) => (
        <chakra.button
          key={done.exerciseId}
          type="button"
          onClick={() => navigate(`/historique/exercices/${done.exerciseId}`)}
          minH="60px"
          borderRadius="button"
          bg="rf.card"
          borderWidth="1px"
          borderColor="rf.border"
          display="flex"
          alignItems="center"
          gap="3"
          px="3.5"
          py="2"
          textAlign="left"
          color="rf.text"
          cursor="pointer"
        >
          <Box flex="1" minW="0">
            <Box fontSize="16px" fontWeight="600">
              {nameOf(done.exerciseId, done.name)}
            </Box>
            <Box fontSize="13px" color="rf.muted">
              {plural(done.sessionCount, 'séance')} · dernière : {relativeDay(fromDate(new Date(done.lastDoneAt)), today).toLowerCase()}
            </Box>
          </Box>
          <Box color="rf.muted">
            <ChevronRightIcon size={18} />
          </Box>
        </chakra.button>
      ))}
    </Stack>
  );
}
