import { useEffect, useState } from 'react';
import { useApp } from '../app-context';

/** Instant courant (horloge de l'application), rafraîchi toutes les `intervalMs`. */
export function useNow(intervalMs = 1000): Date {
  const { deps } = useApp();
  const [now, setNow] = useState(() => deps.clock.now());
  useEffect(() => {
    const id = setInterval(() => setNow(deps.clock.now()), intervalMs);
    return () => clearInterval(id);
  }, [deps, intervalMs]);
  return now;
}
