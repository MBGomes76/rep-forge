import { Box, chakra, Flex, Grid, Stack } from '@chakra-ui/react';
import {
  completedSets,
  formatRirTarget,
  formatTarget,
  previousForSet,
  previousPerformance,
  remainingRestRatio,
  remainingRestSeconds,
  workoutDurationSeconds,
  type Workout,
  type WorkoutExercise,
} from '@repforge/domain';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useApp } from '../../app-context';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { CheckIcon, ChevronRightIcon } from '../../components/icons';
import { Screen } from '../../components/screen';
import { notify, useAction } from '../../components/toaster';
import { AppButton, Card, Hint, Label, Num } from '../../components/ui';
import { formatClock, formatRest } from '../../format';
import { useFinishedWorkouts, useRestTimer, useWorkoutInProgress } from '../../hooks/use-data';
import { useNow } from '../../hooks/use-now';
import type { ExerciseHistoryState } from '../exercise-history-screen';
import { setGridColumns, SetRow, weightColumnLabel } from './set-row';

export function WorkoutScreen() {
  const workout = useWorkoutInProgress();
  const history = useFinishedWorkouts();
  const navigate = useNavigate();
  const { useCases } = useApp();
  const run = useAction();
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  if (workout === null) return <Navigate to="/" replace />;
  if (workout === undefined || history === undefined) return <Screen title="Séance" footer="none">{null}</Screen>;

  const finish = () => {
    if (!workout.exercises.some((e) => completedSets(e).length > 0)) {
      notify('Valide au moins une série avant de terminer la séance.', 'error');
      return;
    }
    navigate('/seance/recap');
  };

  const abandon = async () => {
    setConfirmAbandon(false);
    await run(() => useCases.abandonWorkout(workout.id), 'Séance abandonnée');
    navigate('/');
  };

  return (
    <Screen title={workout.name} backTo="/" footer={<WorkoutFooter workout={workout} />}>
      <Stack gap="3.5">
        <Flex align="center" gap="2" fontSize="13px" color="rf.muted">
          <Box color="rf.accent">
            <CheckIcon size={16} />
          </Box>
          Enregistré sur l'appareil à chaque série
        </Flex>

        {workout.exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} workout={workout} exercise={exercise} history={history} />
        ))}

        <Hint>Astuce : si tu valides une série sans rien saisir, elle reprend les valeurs du dernier entraînement.</Hint>
        <AppButton onClick={finish}>Terminer l'entraînement</AppButton>
        <chakra.button
          type="button"
          onClick={() => setConfirmAbandon(true)}
          minH="44px"
          fontSize="14px"
          fontWeight="600"
          color="rf.muted"
          textDecoration="underline"
          cursor="pointer"
        >
          Abandonner la séance
        </chakra.button>
      </Stack>

      <ConfirmDialog
        open={confirmAbandon}
        title="Abandonner la séance ?"
        description="Les séries saisies seront perdues et le programme restera à cette étape."
        confirmLabel="Abandonner"
        onConfirm={abandon}
        onCancel={() => setConfirmAbandon(false)}
      />
    </Screen>
  );
}

function ExerciseCard({ workout, exercise, history }: { workout: Workout; exercise: WorkoutExercise; history: Workout[] }) {
  const { useCases } = useApp();
  const run = useAction();
  const navigate = useNavigate();
  const previous = previousPerformance(history, exercise.exerciseId, { excludeWorkoutId: workout.id });
  const target = formatTarget(exercise.target);
  const isDuration = exercise.inputKind === 'duration';

  return (
    <Card px="2" pt="3.5" pb="3">
      <Stack gap="1.5">
        <Box px="2">
          {/* Le nom ouvre l'historique de l'exercice ; le retour ramène à la séance. */}
          <chakra.button
            type="button"
            onClick={() => navigate(`/historique/exercices/${exercise.exerciseId}`, { state: { from: '/seance' } satisfies ExerciseHistoryState })}
            aria-label={`Historique de ${exercise.name}`}
            display="flex"
            alignItems="center"
            gap="1"
            minH="32px"
            fontSize="17px"
            fontWeight="700"
            color="rf.text"
            textAlign="left"
            cursor="pointer"
          >
            {exercise.name}
            <Box as="span" color="rf.muted">
              <ChevronRightIcon size={16} />
            </Box>
          </chakra.button>
          <Box fontSize="13px" color="rf.muted" mt="0.5">
            {exercise.loadConvention}
          </Box>
          <Num display="block" fontSize="13px" color="rf.planned" mt="1">
            Objectif : {exercise.sets.length} × {target}
            {isDuration ? ' s' : ' reps'}
            {exercise.rirTarget && ` · ${formatRirTarget(exercise.rirTarget)}`} · repos {formatRest(exercise.restSeconds)}
          </Num>
        </Box>

        <Grid
          aria-hidden="true"
          templateColumns={setGridColumns(exercise)}
          gap="1.5"
          px="2"
          pt="1.5"
          fontSize="11px"
          fontWeight="600"
          color="rf.muted"
          textTransform="uppercase"
          letterSpacing="0.04em"
          textAlign="center"
        >
          <span>N°</span>
          <span>Prévu</span>
          <span>{weightColumnLabel(exercise)}</span>
          <span>{isDuration ? 'Sec' : 'Reps'}</span>
          {!isDuration && <span>RIR</span>}
          <span />
        </Grid>

        {exercise.sets.map((set, index) => (
          <SetRow
            key={set.id}
            exercise={exercise}
            set={set}
            index={index}
            target={target}
            previous={previousForSet(previous, index)}
            onValidate={async (input) =>
              (await run(async () => {
                await useCases.validateSet(workout.id, exercise.id, set.id, input);
                return true;
              })) ?? false
            }
            onUnvalidate={async () => {
              await run(() => useCases.unvalidateSet(workout.id, exercise.id, set.id));
            }}
          />
        ))}

        <Box px="2" pt="1">
          <AppButton variant="ghost" small onClick={() => run(() => useCases.addSet(workout.id, exercise.id))}>
            + Ajouter une série
          </AppButton>
        </Box>
      </Stack>
    </Card>
  );
}

/** Chrono de la séance et minuteur de repos, toujours visibles. */
function WorkoutFooter({ workout }: { workout: Workout }) {
  const { useCases } = useApp();
  const run = useAction();
  const now = useNow(250);
  const storedTimer = useRestTimer();
  const timer = storedTimer && storedTimer.workoutId === workout.id ? storedTimer : null;
  const nowMs = now.getTime();
  const remaining = timer ? remainingRestSeconds(timer, nowMs) : 0;

  return (
    <Stack
      as="footer"
      flex="none"
      bg="rf.surface"
      borderTopWidth="1px"
      borderColor="rf.border"
      px="4"
      pt="3"
      pb="calc(16px + env(safe-area-inset-bottom))"
      gap="2.5"
    >
      <Flex align="flex-end" justify="space-between" gap="3">
        <Box flex="none">
          <Label>Durée</Label>
          <Num fontSize="24px" fontWeight="700" role="timer" aria-label="Durée de la séance">
            {formatClock(workoutDurationSeconds(workout, now.toISOString()))}
          </Num>
        </Box>
        <Box minW="0" textAlign="right" aria-live="polite">
          {!timer && (
            <>
              <Label>Repos</Label>
              <Box fontSize="14px" color="rf.muted" lineHeight="1.4">
                Démarre après une série validée
              </Box>
            </>
          )}
          {timer && remaining > 0 && (
            <>
              <Label truncate maxW="210px" ml="auto">
                Repos · {timer.label}
              </Label>
              <Num fontSize="34px" fontWeight="700" color="rf.accent" lineHeight="1.1" role="timer" aria-label="Repos restant">
                {formatRest(remaining)}
              </Num>
            </>
          )}
          {timer && remaining === 0 && (
            <>
              <Label>Repos terminé</Label>
              <Box fontSize="20px" fontWeight="700" color="rf.accent" lineHeight="1.3">
                C'est reparti
              </Box>
            </>
          )}
        </Box>
      </Flex>
      <Box h="6px" borderRadius="3px" bg="rf.control" overflow="hidden">
        <Box h="100%" w={`${timer ? Math.round(remainingRestRatio(timer, nowMs) * 100) : 0}%`} bg="rf.accent" borderRadius="3px" />
      </Box>
      <Flex gap="2">
        <AppButton variant="ghost" small disabled={!timer} onClick={() => run(() => useCases.adjustRestTimer(-15))}>
          −15 s
        </AppButton>
        <AppButton variant="ghost" small disabled={!timer} onClick={() => run(() => useCases.adjustRestTimer(15))}>
          +15 s
        </AppButton>
        <AppButton variant="ghost" small disabled={!timer} onClick={() => run(() => useCases.skipRest())}>
          Passer
        </AppButton>
      </Flex>
    </Stack>
  );
}
