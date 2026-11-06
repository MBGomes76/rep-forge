import { Dialog, Flex, Portal } from '@chakra-ui/react';
import { AppButton } from './ui';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation avant une action irréversible. */
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onCancel()} role="alertdialog" placement="center">
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.700" />
        <Dialog.Positioner px="4">
          <Dialog.Content bg="rf.card" color="rf.text" borderWidth="1px" borderColor="rf.border" borderRadius="card" maxW="400px">
            <Dialog.Header pb="2">
              <Dialog.Title fontSize="18px" fontWeight="700">
                {title}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body fontSize="15px" color="rf.soft" lineHeight="1.45">
              {description}
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap="2" w="100%">
                <AppButton variant="ghost" small onClick={onCancel}>
                  Annuler
                </AppButton>
                <AppButton small bg="rf.amber" color="rf.onAccent" onClick={onConfirm}>
                  {confirmLabel}
                </AppButton>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
