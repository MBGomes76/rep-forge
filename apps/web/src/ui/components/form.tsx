import { Box, chakra, Flex, Stack } from '@chakra-ui/react';
import { useEffect, useId, useState } from 'react';
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
 * Valeur locale d'un champ enregistré à chaque frappe. Lié directement à
 * IndexedDB, l'aller-retour asynchrone ferait sauter le curseur pendant la
 * saisie : le champ garde donc sa propre valeur. Il reprend celle venue
 * d'ailleurs (modifications annulées, synchronisation) quand il n'a pas le focus.
 */
function useEditableText(value: string, onSave: (value: string) => void) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value);
  }, [value, focused]);
  return {
    value: text,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: (e: { target: { value: string } }) => {
      setText(e.target.value);
      onSave(e.target.value);
    },
  };
}

/** Champ texte d'une ligne, enregistré à chaque frappe. */
export function NameField({ label, value, onSave }: { label: string; value: string; onSave: (value: string) => void }) {
  const id = useId();
  const field = useEditableText(value, onSave);
  return (
    <Stack gap="1.5">
      <Label as="label" {...{ htmlFor: id }}>
        {label}
      </Label>
      <chakra.input id={id} autoComplete="off" {...field} {...textInputStyle} />
    </Stack>
  );
}

/** Texte libre sur plusieurs lignes (description), enregistré à chaque frappe. */
export function NotesField({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onSave: (value: string) => void;
}) {
  const id = useId();
  const field = useEditableText(value, onSave);
  return (
    <Stack gap="1.5">
      <Label as="label" {...{ htmlFor: id }}>
        {label}
      </Label>
      <chakra.textarea
        id={id}
        rows={3}
        placeholder={placeholder}
        {...field}
        {...textInputStyle}
        h="auto"
        minH="80px"
        py="2.5"
        lineHeight="1.45"
        resize="vertical"
        _placeholder={{ color: 'rf.muted' }}
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

/** Bouton − / + sans cadre : seule l'icône est visible, la zone tactile garde 44 px. */
const bareButton = {
  bg: 'transparent',
  borderWidth: '0',
  color: 'rf.accent',
  _hover: { bg: 'rf.control' },
  _disabled: { color: 'rf.muted', opacity: 0.35, cursor: 'default', bg: 'transparent' },
} as const;

/** Réglage par boutons − / + (plus rapide au pouce qu'un clavier). */
export function Stepper({ label, value, onDecrement, onIncrement, canDecrement = true, canIncrement = true }: StepperProps) {
  return (
    <Flex align="center" justify="space-between" gap="2">
      <Box fontSize="15px" color="rf.soft">
        {label}
      </Box>
      <Flex align="center">
        <IconButton label={`Diminuer : ${label}`} onClick={onDecrement} disabled={!canDecrement} {...bareButton}>
          <MinusIcon size={20} />
        </IconButton>
        <Num minW="52px" textAlign="center" fontSize="18px" fontWeight="700" aria-live="polite">
          {value}
        </Num>
        <IconButton label={`Augmenter : ${label}`} onClick={onIncrement} disabled={!canIncrement} {...bareButton}>
          <PlusIcon size={20} />
        </IconButton>
      </Flex>
    </Flex>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly { readonly value: T; readonly label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Choix exclusif compact (« Plage | Fixe »), aligné comme une ligne de réglage. */
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <Flex align="center" justify="space-between" gap="2">
      <Box fontSize="15px" color="rf.soft">
        {label}
      </Box>
      <Flex role="group" aria-label={label} p="3px" gap="3px" bg="rf.surface" borderRadius="control" borderWidth="1px" borderColor="rf.border">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <chakra.button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => !active && onChange(option.value)}
              minW="68px"
              h="38px"
              px="3"
              borderRadius="10px"
              fontSize="14px"
              fontWeight="600"
              cursor="pointer"
              bg={active ? 'rf.control' : 'transparent'}
              color={active ? 'rf.accent' : 'rf.muted'}
            >
              {option.label}
            </chakra.button>
          );
        })}
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
