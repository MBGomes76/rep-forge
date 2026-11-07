import { createToaster, Portal, Toast, Toaster as ChakraToaster } from '@chakra-ui/react';
import { DomainError } from '@repforge/domain';
import { useCallback } from 'react';
import { RemoteError } from '../../application/remote';

/** Messages brefs (« Séance enregistrée », erreurs de saisie), au-dessus de la barre du bas. */
export const toaster = createToaster({ placement: 'bottom', max: 2, offsets: { top: '16px', bottom: '96px', left: '16px', right: '16px' } });

export function notify(message: string, type: 'info' | 'error' = 'info'): void {
  toaster.create({ description: message, type, duration: 2400 });
}

export function Toaster() {
  return (
    <Portal>
      <ChakraToaster toaster={toaster}>
        {(toast) => (
          <Toast.Root
            role="status"
            bg="rf.control"
            color="rf.text"
            borderWidth="1px"
            borderColor={toast.type === 'error' ? 'rf.amber' : 'rf.accent'}
            borderRadius="button"
            px="4"
            py="3"
            w="calc(100vw - 32px)"
            maxW="448px"
          >
            <Toast.Description fontSize="14px" fontWeight="600" textAlign="center" w="100%">
              {toast.description}
            </Toast.Description>
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
}

/**
 * Enveloppe une action : une règle métier violée (DomainError) ou un refus du
 * serveur (RemoteError) s'affiche à l'utilisateur ; une autre erreur est un bug,
 * elle est signalée et relancée.
 */
export function useAction() {
  return useCallback(async <T,>(action: () => Promise<T>, success?: string): Promise<T | undefined> => {
    try {
      const result = await action();
      if (success) notify(success);
      return result;
    } catch (error) {
      if (error instanceof DomainError || error instanceof RemoteError) {
        notify(error.message, 'error');
        return undefined;
      }
      notify('Une erreur inattendue est survenue.', 'error');
      throw error;
    }
  }, []);
}
