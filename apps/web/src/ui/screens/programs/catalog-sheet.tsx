import { Box, chakra, Flex, Heading, Stack } from '@chakra-ui/react';
import { searchExercises, type Equipment, type Exercise, type MuscleGroup } from '@repforge/domain';
import { useState } from 'react';
import { useApp } from '../../app-context';
import { textInputStyle } from '../../components/form';
import { CloseIcon, PlusIcon } from '../../components/icons';
import { Chip, IconButton, ScrollRow } from '../../components/ui';
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from '../../format';

const muscleGroups = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[];
const equipments = Object.keys(EQUIPMENT_LABELS) as Equipment[];

/** Catalogue plein écran : recherche (sans accents) et filtres par muscle et matériel. */
export function CatalogSheet({ onPick, onClose }: { onPick: (exercise: Exercise) => void; onClose: () => void }) {
  const { deps } = useApp();
  const [query, setQuery] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const results = searchExercises(deps.catalog.all(), { query, muscleGroup, equipment });

  return (
    <Flex
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-title"
      position="fixed"
      inset="0"
      zIndex="overlay"
      bg="rf.bg"
      direction="column"
      maxW="480px"
      mx="auto"
    >
      <Flex flex="none" align="center" gap="2.5" px="4" pt="calc(14px + env(safe-area-inset-top))" pb="2.5">
        <Heading as="h2" id="catalog-title" flex="1" fontSize="22px" fontWeight="700">
          Catalogue
        </Heading>
        <IconButton label="Fermer le catalogue" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Flex>

      <Stack flex="none" px="4" gap="2.5">
        <chakra.input
          type="search"
          aria-label="Rechercher un exercice"
          placeholder="Rechercher un exercice"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          {...textInputStyle}
        />
        <ScrollRow role="group" aria-label="Groupe musculaire">
          <Chip active={muscleGroup === null} onClick={() => setMuscleGroup(null)}>
            Tous
          </Chip>
          {muscleGroups.map((m) => (
            <Chip key={m} active={muscleGroup === m} onClick={() => setMuscleGroup(m)}>
              {MUSCLE_GROUP_LABELS[m]}
            </Chip>
          ))}
        </ScrollRow>
        <ScrollRow role="group" aria-label="Matériel">
          <Chip active={equipment === null} onClick={() => setEquipment(null)}>
            Tous
          </Chip>
          {equipments.map((e) => (
            <Chip key={e} active={equipment === e} onClick={() => setEquipment(e)}>
              {EQUIPMENT_LABELS[e]}
            </Chip>
          ))}
        </ScrollRow>
      </Stack>

      <Stack flex="1" minH="0" overflowY="auto" px="4" pt="3" pb="6" gap="2">
        {results.length === 0 && (
          <Box fontSize="15px" color="rf.muted" px="1" py="3">
            Aucun exercice ne correspond à ces filtres.
          </Box>
        )}
        {results.map((exercise) => (
          <chakra.button
            key={exercise.id}
            type="button"
            onClick={() => onPick(exercise)}
            aria-label={`Ajouter ${exercise.name}`}
            w="100%"
            minH="64px"
            borderRadius="button"
            bg="rf.card"
            borderWidth="1px"
            borderColor="rf.border"
            display="flex"
            alignItems="center"
            gap="3"
            px="3.5"
            py="2.5"
            textAlign="left"
            color="rf.text"
            cursor="pointer"
          >
            <Box flex="1" minW="0">
              <Box fontSize="16px" fontWeight="600">
                {exercise.name}
              </Box>
              <Box fontSize="13px" color="rf.muted" mt="0.5">
                {MUSCLE_GROUP_LABELS[exercise.muscleGroup]} · {EQUIPMENT_LABELS[exercise.equipment]}
              </Box>
              <Box fontSize="12px" color="rf.planned" mt="0.5">
                {exercise.loadConvention}
              </Box>
            </Box>
            <Box color="rf.accent">
              <PlusIcon />
            </Box>
          </chakra.button>
        ))}
      </Stack>
    </Flex>
  );
}
