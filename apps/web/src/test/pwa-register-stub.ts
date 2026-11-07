/** Remplace `virtual:pwa-register` dans les tests : pas de service worker sous jsdom. */
export function registerSW(): (reload?: boolean) => Promise<void> {
  return async () => undefined;
}
