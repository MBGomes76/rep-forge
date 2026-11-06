import { Box, chakra, type BoxProps, type HTMLChakraProps } from '@chakra-ui/react';
import { forwardRef, type ReactNode } from 'react';

/**
 * Briques visuelles partagées, fidèles à la maquette. Zones tactiles >= 44 px.
 */

export function Card(props: BoxProps) {
  return <Box bg="rf.card" borderWidth="1px" borderColor="rf.border" borderRadius="card" p="4" {...props} />;
}

/** Petit libellé en capitales (« PROGRAMME ACTIF »). */
export function Label(props: BoxProps) {
  return (
    <Box fontSize="12px" color="rf.muted" fontWeight="600" letterSpacing="0.05em" textTransform="uppercase" {...props} />
  );
}

/** Chiffres en Space Grotesk, à chasse fixe pour éviter que le chrono « danse ». */
export function Num(props: HTMLChakraProps<'span'>) {
  return <chakra.span fontFamily="numeric" fontVariantNumeric="tabular-nums" {...props} />;
}

/**
 * - primary : l'action principale de l'écran (vert plein) ;
 * - secondary : action importante mais pas principale (contour vert) ;
 * - ghost : action discrète ;
 * - danger : suppression (rouge).
 */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_COLORS: Record<ButtonVariant, { bg: string; color: string; borderColor: string }> = {
  primary: { bg: 'rf.accent', color: 'rf.onAccent', borderColor: 'rf.accent' },
  secondary: { bg: 'rf.doneBg', color: 'rf.accent', borderColor: 'rf.doneBorder' },
  ghost: { bg: 'rf.control', color: 'rf.text', borderColor: 'rf.controlBorder' },
  danger: { bg: 'rf.danger', color: 'rf.onDanger', borderColor: 'rf.danger' },
};

interface AppButtonProps extends HTMLChakraProps<'button'> {
  variant?: ButtonVariant;
  small?: boolean;
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(function AppButton(
  { variant = 'primary', small = false, ...props },
  ref,
) {
  return (
    <chakra.button
      ref={ref}
      type="button"
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap="2"
      w="100%"
      minH={small ? '44px' : '52px'}
      px={small ? '3' : '4.5'}
      borderRadius={small ? 'control' : 'button'}
      fontWeight="700"
      fontSize={small ? '14px' : '16px'}
      cursor="pointer"
      borderWidth="1px"
      {...BUTTON_COLORS[variant]}
      _active={{ transform: 'scale(0.98)' }}
      _disabled={{ opacity: 0.4, cursor: 'default', transform: 'none' }}
      {...props}
    />
  );
});

interface IconButtonProps extends HTMLChakraProps<'button'> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, children, ...props }: IconButtonProps) {
  return (
    <chakra.button
      type="button"
      aria-label={label}
      title={label}
      flex="none"
      w="44px"
      h="44px"
      borderRadius="control"
      bg="rf.control"
      borderWidth="1px"
      borderColor="rf.controlBorder"
      color="rf.text"
      display="flex"
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      _active={{ transform: 'scale(0.95)' }}
      _disabled={{ opacity: 0.4, cursor: 'default' }}
      {...props}
    >
      {children}
    </chakra.button>
  );
}

interface ChipProps extends HTMLChakraProps<'button'> {
  active?: boolean;
}

export function Chip({ active = false, ...props }: ChipProps) {
  return (
    <chakra.button
      type="button"
      aria-pressed={active}
      flex="none"
      h="44px"
      px="4"
      borderRadius="full"
      borderWidth="1px"
      borderColor={active ? 'rf.accent' : 'rf.controlBorder'}
      bg={active ? 'rf.accent' : 'rf.card'}
      color={active ? 'rf.onAccent' : 'rf.soft'}
      fontSize="14px"
      fontWeight="600"
      cursor="pointer"
      {...props}
    />
  );
}

/** Rangée défilante horizontalement (puces, calendrier). */
export function ScrollRow(props: BoxProps) {
  return <Box display="flex" gap="2" overflowX="auto" pb="0.5" css={{ scrollbarWidth: 'none' }} {...props} />;
}

/** Texte d'aide secondaire sous un bloc. */
export function Hint(props: BoxProps) {
  return <Box fontSize="13px" color="rf.muted" lineHeight="1.45" {...props} />;
}
