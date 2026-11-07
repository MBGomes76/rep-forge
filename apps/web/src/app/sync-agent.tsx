import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useApp } from '../ui/app-context';

/** Délai après une modification : regroupe les saisies rapprochées en un seul envoi. */
const AFTER_CHANGE_MS = 2000;
const PERIODIC_MS = 60_000;

/**
 * Déclenche la synchronisation : au démarrage, au retour du réseau, quand
 * l'app revient au premier plan, peu après chaque modification, et toutes les
 * minutes (pour recevoir ce qui vient des autres appareils).
 */
export function SyncAgent() {
  const { sync, deps } = useApp();
  // Nombre de documents à envoyer : change à chaque modification locale.
  const pendingChanges = useLiveQuery(async () => (await deps.syncStore.pending()).length, [deps]);

  useEffect(() => {
    const run = () => void sync.synchronize();
    const whenVisible = () => document.visibilityState === 'visible' && run();
    run();
    const timer = setInterval(run, PERIODIC_MS);
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', whenVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', whenVisible);
    };
  }, [sync]);

  useEffect(() => {
    if (!pendingChanges) return;
    const timer = setTimeout(() => void sync.synchronize(), AFTER_CHANGE_MS);
    return () => clearTimeout(timer);
  }, [sync, pendingChanges]);

  return null;
}
