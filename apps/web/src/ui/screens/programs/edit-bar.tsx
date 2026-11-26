import { Box, Flex } from '@chakra-ui/react';
import { useState } from 'react';
import { useApp } from '../../app-context';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { BottomNav } from '../../components/screen';
import { useAction } from '../../components/toaster';
import { AppButton } from '../../components/ui';

/**
 * Pied des écrans d'édition d'un programme : tant que le brouillon n'est pas
 * enregistré, une barre propose « Annuler » ou « Enregistrer » au-dessus de la
 * navigation. Le brouillon survit si l'on quitte l'écran : rien n'est perdu.
 */
export function ProgramEditFooter({ programId, dirty }: { programId: string; dirty: boolean }) {
  const { useCases } = useApp();
  const run = useAction();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  return (
    <>
      {dirty && (
        <Flex
          role="region"
          aria-label="Modifications non enregistrées"
          flex="none"
          align="center"
          gap="2"
          px="4"
          py="2.5"
          bg="rf.surface"
          borderTopWidth="1px"
          borderColor="rf.amberBorder"
        >
          <Box flex="1" minW="0" fontSize="13px" fontWeight="600" color="rf.amber">
            Modifications non enregistrées
          </Box>
          <AppButton variant="ghost" small w="auto" onClick={() => setConfirmingDiscard(true)}>
            Annuler
          </AppButton>
          <AppButton small w="auto" onClick={() => run(() => useCases.saveProgramEdits(programId), 'Programme enregistré')}>
            Enregistrer
          </AppButton>
        </Flex>
      )}
      <BottomNav />
      <ConfirmDialog
        open={confirmingDiscard}
        title="Annuler les modifications ?"
        description="Le programme revient à sa dernière version enregistrée."
        confirmLabel="Tout annuler"
        cancelLabel="Continuer"
        onCancel={() => setConfirmingDiscard(false)}
        onConfirm={() => {
          setConfirmingDiscard(false);
          void run(() => useCases.discardProgramEdits(programId), 'Modifications annulées');
        }}
      />
    </>
  );
}
