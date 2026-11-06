import { Box, chakra, Flex, Stack } from '@chakra-ui/react';
import { useId, useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon, PlusIcon } from './icons';
import { IconButton, Label, Num } from './ui';

export const textInputStyle = {
  h: '48px',
  w: '100%',
  borderRadius: 'control',
  borderWidth: '1px',
  borderColor: 'rf.controlBorder',
  bg: 'rf.surface',
  color: 'rf.text',
  fontSize: '16px',
  px: '3.5',
} as const;

/**
 * Champ texte enregistré à chaque frappe. Il garde sa propre valeur locale :
 * lié directement à IndexedDB, l'aller-retour asynchrone ferait sauter le
 * curseur pendant la saisie.
 */
export function NameField({ label, value, onSave }: { label: string; value: string; onSave: (value: string) => void }) {
  const id = useId();
  const [text, setText] = useState(value);
  return (
    <Stack gap="1.5">
      <Label as="label" {...{ htmlFor: id }}>
        {label}
      </Label>
      <chakra.input
        id={id}
        value={text}
        autoComplete="off"
        onChange={(e) => {
          setText(e.target.value);
          onSave(e.target.value);
        }}
        {...textInputStyle}
      />
    </Stack>
  );
}

interface StepperProps {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement?: boolean;
  canIncrement?: boolean;
}

/** Réglage par boutons − / + (plus rapide au pouce qu'un clavier). */
export function Stepper({ label, value, onDecrement, onIncrement, canDecrement = true, canIncrement = true }: StepperProps) {
  return (
    <Flex align="center" justify="space-between" gap="2">
      <Box fontSize="15px" color="rf.soft">
        {label}
      </Box>
      <Flex align="center" gap="2">
        <IconButton label={`Diminuer : ${label}`} onClick={onDecrement} disabled={!canDecrement}>
          <MinusIcon size={20} />
        </IconButton>
        <Num minW="56px" textAlign="center" fontSize="18px" fontWeight="700" aria-live="polite">
          {value}
        </Num>
        <IconButton label={`Augmenter : ${label}`} onClick={onIncrement} disabled={!canIncrement}>
          <PlusIcon size={20} />
        </IconButton>
      </Flex>
    </Flex>
  );
}

interface MoveButtonsProps {
  /** Ce qui est déplacé, pour les lecteurs d'écran (« Push », « Squat (barre) »). */
  itemLabel: string;
  index: number;
  count: number;
  onMove: (toIndex: number) => void;
}

/** Monter / descendre un élément d'une liste ordonnée. Boutons désactivés aux extrémités. */
export function MoveButtons({ itemLabel, index, count, onMove }: MoveButtonsProps) {
  return (
    <>
      <IconButton label={`Monter ${itemLabel}`} disabled={index === 0} onClick={() => onMove(index - 1)}>
        <ArrowUpIcon size={20} />
      </IconButton>
      <IconButton label={`Descendre ${itemLabel}`} disabled={index === count - 1} onClick={() => onMove(index + 1)}>
        <ArrowDownIcon size={20} />
      </IconButton>
    </>
  );
}
