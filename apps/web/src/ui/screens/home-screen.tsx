import { Box, Flex, Stack } from '@chakra-ui/react';
import {
  addDays,
  advanceTargetIndex,
  completedSets,
  currentStep,
  effectiveAnchor,
  formatTarget,
  fromDate,
  isPlannedToday,
  nextStep,
  projectCalendar,
  summarizeWorkout,
  workoutDurationSeconds,
  type CalendarDay,
  type CalendarHistoryEntry,
  type LocalDate,
  type Program,
  type Workout,
} from '@repforge/domain';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../app-context';
import { PlayIcon } from '../components/icons';
import { Screen } from '../components/screen';
import { useAction } from '../components/toaster';
import { AppButton, Card, Chip, Hint, Label, Num, ScrollRow } from '../components/ui';
import { dayOfMonth, formatClock, formatMinutes, formatVolume, plannedWhen, plural, relativeDay, weekdayShort } from '../format';
import { useActiveProgram, useCalendarHistory, useFinishedWorkouts, useWorkoutInProgress } from '../hooks/use-data';
import { useNow } from '../hooks/use-now';

export function HomeScreen() {
  const program = useActiveProgram();
  const inProgress = useWorkoutInProgress();
  const history = useCalendarHistory();
  const finished = useFinishedWorkouts();
  const today = fromDate(useNow(60_000));

  if (program === undefined || inProgress === undefined || history === undefined || finished === undefined) {
    return <Screen title="RepForge">{null}</Screen>;
  }

  return (
    <Screen title="RepForge">
      <Stack gap="4">
        {program ? (
          <>
            <ProgramHeader program={program} />
            <CycleView program={program} today={today} history={history} />
            {inProgress ? <InProgressCard workout={inProgress} /> : <NextStepCard program={program} today={today} />}
          </>
        ) : (
          <Card>Aucun programme actif. Crée-en un dans l’onglet Programmes.</Card>
        )}
        {finished[0] && <LastWorkoutCard workout={finished[0]} today={today} />}
      </Stack>
    </Screen>
  );
}

function ProgramHeader({ program }: { program: Program }) {
  const { steps, schedule } = program;
  return (
    <Box>
      <Label>Programme actif</Label>
      <Box fontSize="20px" fontWeight="700" mt="0.5">
        {program.name || 'Sans nom'}
      </Box>
      <Box fontSize="14px" color="rf.muted" mt="0.5">
        {steps.length ? `Étape ${schedule.cursor + 1} sur ${steps.length}` : 'Aucune étape'}
      </Box>
    </Box>
  );
}

// --- Calendrier : Jours / Cycle ---------------------------------------------

function CycleView({ program, today, history }: { program: Program; today: LocalDate; history: CalendarHistoryEntry[] }) {
  const [mode, setMode] = useState<'days' | 'cycle'>('days');
  return (
    <Stack gap="2">
      <Flex gap="2">
        <Chip active={mode === 'days'} onClick={() => setMode('days')}>
          Jours
        </Chip>
        <Chip active={mode === 'cycle'} onClick={() => setMode('cycle')}>
          Cycle
        </Chip>
      </Flex>
      {mode === 'days' ? (
        <>
          <ScrollRow role="list" aria-label="Calendrier des prochains jours">
            {projectCalendar({ program, today, from: addDays(today, -2), to: addDays(today, 12), history }).map((day) => (
              <DayCell key={day.date} day={day} />
            ))}
          </ScrollRow>
          <Hint>Les jours suivent la semaine, le cycle non. Si tu reportes, toutes les étapes suivantes sont décalées d'un jour.</Hint>
        </>
      ) : (
        <>
          <ScrollRow role="list" aria-label="Étapes du cycle">
            {program.steps.map((step, i) => {
              const current = i === program.schedule.cursor;
              return (
                <Stack
                  key={step.id}
                  role="listitem"
                  aria-current={current ? 'step' : undefined}
                  flex="none"
                  minW="86px"
                  gap="1"
                  borderRadius="button"
                  px="3"
                  py="2.5"
                  bg={current ? 'rf.doneBg' : 'rf.card'}
                  borderWidth="1px"
                  borderStyle={step.kind === 'rest' ? 'dashed' : 'solid'}
                  borderColor={current ? 'rf.accent' : 'rf.border'}
                  color={current ? 'rf.text' : 'rf.muted'}
                >
                  <Num fontSize="12px" fontWeight="700">
                    {i + 1}
                  </Num>
                  <Box fontSize="13px" fontWeight="600">
                    {step.name}
                  </Box>
                </Stack>
              );
            })}
          </ScrollRow>
          <Hint>Le cycle avance quand tu valides une étape, pas selon les jours de la semaine.</Hint>
        </>
      )}
    </Stack>
  );
}

function DayCell({ day }: { day: CalendarDay }) {
  const { status } = day;
  let label = '–';
  let bg = 'rf.card';
  let borderColor = 'rf.border';
  let borderStyle = 'solid';
  let color = 'rf.muted';
  let numberColor = 'rf.text';

  switch (status.kind) {
    case 'done':
      label = status.entries.map((e) => e.name).join(' + ');
      bg = '#12203A';
      numberColor = 'rf.muted';
      if (status.entries.every((e) => e.kind === 'rest')) borderStyle = 'dashed';
      break;
    case 'nothing':
      numberColor = 'rf.muted';
      break;
    case 'postponed':
      label = 'Reporté';
      borderStyle = 'dashed';
      borderColor = 'rf.amberBorder';
      color = 'rf.amber';
      numberColor = 'rf.amber';
      break;
    case 'planned':
      label = status.step.name;
      if (status.step.kind === 'rest') borderStyle = 'dashed';
      else {
        bg = 'rf.doneBg';
        borderColor = 'rf.doneBorder';
        color = 'rf.accent';
      }
      break;
    case 'empty':
      break;
  }
  if (day.isToday) borderColor = 'rf.accent';

  return (
    <Stack
      role="listitem"
      aria-label={`${weekdayShort(day.date)} ${dayOfMonth(day.date)}${day.isToday ? ', aujourd’hui' : ''} : ${label === '–' ? 'rien' : label}`}
      flex="none"
      w="68px"
      align="center"
      gap="1"
      borderRadius="button"
      px="1.5"
      py="2.5"
      bg={bg}
      borderWidth="1px"
      borderStyle={borderStyle}
      borderColor={borderColor}
      boxShadow={day.isToday ? '0 0 0 1px {colors.rf.accent}' : undefined}
      color={color}
    >
      <Box fontSize="11px" fontWeight="600" textTransform="uppercase" letterSpacing="0.04em">
        {weekdayShort(day.date)}
      </Box>
      <Num fontSize="20px" fontWeight="700" color={numberColor}>
        {dayOfMonth(day.date)}
      </Num>
      <Flex fontSize="12px" fontWeight="600" textAlign="center" lineHeight="1.2" minH="30px" align="center" maxW="100%" wordBreak="break-word">
        {label}
      </Flex>
    </Stack>
  );
}

// --- Carte principale ---------------------------------------------------------

function InProgressCard({ workout }: { workout: Workout }) {
  const navigate = useNavigate();
  const now = useNow(1000);
  const done = workout.exercises.reduce((n, e) => n + completedSets(e).length, 0);
  const total = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  return (
    <Card borderColor="rf.accent">
      <Stack gap="3">
        <Label color="rf.accent">Entraînement en cours</Label>
        <Box fontSize="24px" fontWeight="700">
          {workout.name}
        </Box>
        <Num fontSize="15px" color="rf.muted">
          {done}/{total} séries · {formatClock(workoutDurationSeconds(workout, now.toISOString()))}
        </Num>
        <AppButton onClick={() => navigate('/seance')}>Reprendre l'entraînement</AppButton>
      </Stack>
    </Card>
  );
}

function NextStepCard({ program, today }: { program: Program; today: LocalDate }) {
  const { useCases } = useApp();
  const run = useAction();
  const navigate = useNavigate();
  const step = currentStep(program);

  if (!step) {
    return (
      <Card>
        <Stack gap="3">
          <Box fontSize="18px" fontWeight="700">
            Ce programme est vide
          </Box>
          <Box fontSize="15px" color="rf.soft">
            Ajoute des entraînements et des repos pour composer ton cycle.
          </Box>
          <AppButton onClick={() => navigate(`/programmes/${program.id}`)}>Modifier le programme</AppButton>
        </Stack>
      </Card>
    );
  }

  const anchor = effectiveAnchor(program.schedule, today);
  const plannedToday = isPlannedToday(program, today);
  const when = plannedWhen(anchor, today);

  // Rien de prévu aujourd'hui (repos, ou séance reportée) : on propose d'avancer l'étape suivante.
  const targetIndex = advanceTargetIndex(program, today);
  const target = targetIndex === undefined ? undefined : program.steps[targetIndex];
  const targetName = target?.kind === 'rest' ? 'le repos' : target?.name;
  const advanceButton = target && (
    <AppButton
      variant={target.kind === 'workout' ? 'primary' : 'ghost'}
      small={target.kind === 'rest'}
      onClick={() => run(() => useCases.advanceActive(), `Avancé à aujourd’hui : ${target.name} · le cycle arrive un jour plus tôt`)}
    >
      Avancer {targetName} à aujourd’hui
    </AppButton>
  );

  if (step.kind === 'rest') {
    const next = nextStep(program);
    return (
      <Card>
        <Stack gap="3">
          <Label>Prévu {when}</Label>
          <Box fontSize="24px" fontWeight="700">
            {step.name}
          </Box>
          <Box fontSize="15px" color="rf.soft" lineHeight="1.45">
            Récupère. Le repos compte tout seul : le lendemain, place à {next?.name}.
          </Box>
          {advanceButton}
        </Stack>
      </Card>
    );
  }

  const start = async () => {
    const workout = await run(() => useCases.startWorkout());
    if (workout) navigate('/seance');
  };

  return (
    <Card>
      <Stack gap="3.5">
        <Label>Prévue {when}</Label>
        <Box fontSize="26px" fontWeight="700" letterSpacing="-0.01em">
          {step.name}
        </Box>
        <Stack gap="2">
          {step.exercises.length === 0 && (
            <Box fontSize="15px" color="rf.soft">
              Aucun exercice dans cette séance.
            </Box>
          )}
          {step.exercises.map((planned) => (
            <PlannedLine key={planned.id} exerciseId={planned.exerciseId} meta={`${planned.sets} × ${formatTarget(planned.target)}`} />
          ))}
        </Stack>
        {plannedToday ? (
          <AppButton disabled={step.exercises.length === 0} onClick={start}>
            <PlayIcon size={18} />
            Démarrer l'entraînement
          </AppButton>
        ) : (
          advanceButton
        )}
        <AppButton
          variant="ghost"
          small
          onClick={() => run(() => useCases.postponeActive(), `Reporté · ${step.name} prévue ${plannedWhen(addDays(anchor, 1), today)}`)}
        >
          {plannedToday ? 'Reporter au lendemain' : 'Reporter encore d’un jour'}
        </AppButton>
      </Stack>
    </Card>
  );
}

function PlannedLine({ exerciseId, meta }: { exerciseId: string; meta: string }) {
  const { deps } = useApp();
  const name = deps.catalog.all().find((e) => e.id === exerciseId)?.name ?? exerciseId;
  return (
    <Flex justify="space-between" gap="3" fontSize="15px">
      <Box>{name}</Box>
      <Num flex="none" color="rf.muted">
        {meta}
      </Num>
    </Flex>
  );
}

function LastWorkoutCard({ workout, today }: { workout: Workout; today: LocalDate }) {
  const recap = summarizeWorkout(workout, [], workout.finishedAt!);
  return (
    <Card>
      <Stack gap="1.5">
        <Label>Dernier entraînement</Label>
        <Flex justify="space-between" align="baseline" gap="3">
          <Box fontSize="18px" fontWeight="700">
            {workout.name}
          </Box>
          <Box fontSize="13px" color="rf.muted">
            {relativeDay(fromDate(new Date(workout.finishedAt!)), today)}
          </Box>
        </Flex>
        <Num fontSize="14px" color="rf.muted">
          {formatMinutes(recap.durationSeconds)} · {plural(recap.completedSets, 'série')} · {formatVolume(recap.volumeKg)}
        </Num>
      </Stack>
    </Card>
  );
}
