import { Box, chakra, Flex, Stack } from '@chakra-ui/react';
import { useId, type ReactNode } from 'react';
import { textInputStyle } from '../../components/form';
import { Label } from '../../components/ui';

/** Écrans hors compte (connexion, invitation) : pas de navigation, le formulaire au centre. */
export function AuthShell({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <Flex direction="column" minH="100dvh" maxW="480px" mx="auto" px="4" pt="calc(48px + env(safe-area-inset-top))" pb="8" bg="rf.bg">
      <Box fontFamily="numeric" fontSize="15px" fontWeight="700" color="rf.accent" letterSpacing="0.02em">
        RepForge
      </Box>
      <Box as="h1" fontSize="28px" fontWeight="700" letterSpacing="-0.01em" mt="2">
        {title}
      </Box>
      <Box fontSize="15px" color="rf.soft" lineHeight="1.5" mt="2" mb="6">
        {intro}
      </Box>
      {children}
    </Flex>
  );
}

interface FieldProps {
  label: string;
  type: 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  readOnly?: boolean;
  hint?: string;
}

export function AuthField({ label, type, value, onChange, autoComplete, readOnly, hint }: FieldProps) {
  const id = useId();
  return (
    <Stack gap="1.5">
      <Label as="label" {...{ htmlFor: id }}>
        {label}
      </Label>
      <chakra.input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        readOnly={readOnly}
        required
        {...textInputStyle}
        color={readOnly ? 'rf.muted' : 'rf.text'}
      />
      {hint && (
        <Box fontSize="13px" color="rf.muted">
          {hint}
        </Box>
      )}
    </Stack>
  );
}

/** Message d'erreur sous le formulaire, annoncé aux lecteurs d'écran. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Box role="alert" fontSize="14px" fontWeight="600" color="rf.danger" bg="rf.dangerBg" borderWidth="1px" borderColor="rf.dangerBorder" borderRadius="control" px="3.5" py="2.5">
      {message}
    </Box>
  );
}
