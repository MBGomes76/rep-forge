import { useSyncExternalStore } from 'react';
import { pwa, type PwaState } from '../../infrastructure/pwa';

/** État du service worker et de l'installation, mis à jour en direct. */
export function usePwa(): PwaState {
  return useSyncExternalStore(pwa.subscribe, pwa.getState, pwa.getState);
}
