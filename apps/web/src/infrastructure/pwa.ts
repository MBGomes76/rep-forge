import { registerSW } from 'virtual:pwa-register';

/**
 * Service worker et installation, exposés au reste de l'app comme un petit état
 * observable (lu par `useSyncExternalStore`).
 *
 * Cycle de vie d'une version :
 * 1. Première visite : le service worker télécharge l'application en arrière-plan
 *    → `offlineReady` : elle s'ouvrira désormais sans réseau.
 * 2. Nouvelle version publiée : le navigateur la télécharge, mais l'ancienne reste
 *    active → `needRefresh`. L'utilisateur choisit quand recharger (jamais en
 *    pleine série).
 */

export interface PwaState {
  readonly offlineReady: boolean;
  readonly needRefresh: boolean;
  /** Le navigateur propose l'installation (Chrome, Edge, Android). */
  readonly canInstall: boolean;
  /** L'app tourne déjà installée, dans sa propre fenêtre. */
  readonly installed: boolean;
}

/** Événement non standard de Chrome : permet d'afficher notre propre bouton « Installer ». */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CHECK_FOR_UPDATE_MS = 60 * 60 * 1000;

let state: PwaState = {
  offlineReady: false,
  needRefresh: false,
  canInstall: false,
  installed: typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches === true,
};
const listeners = new Set<() => void>();
let installPrompt: BeforeInstallPromptEvent | undefined;
let updateServiceWorker: ((reload?: boolean) => Promise<void>) | undefined;

function set(patch: Partial<PwaState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export const pwa = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState: (): PwaState => state,

  /** À appeler une fois au démarrage (navigateur uniquement, pas dans les tests). */
  start(): void {
    if (!('serviceWorker' in navigator)) return;
    updateServiceWorker = registerSW({
      onOfflineReady: () => set({ offlineReady: true }),
      onNeedRefresh: () => set({ needRefresh: true }),
      // L'app peut rester ouverte des jours : on vérifie s'il existe une nouvelle version toutes les heures.
      onRegisteredSW: (_url, registration) => {
        if (registration) setInterval(() => void registration.update(), CHECK_FOR_UPDATE_MS);
      },
    });
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault(); // pas de bandeau du navigateur : on propose l'installation dans le Profil
      installPrompt = event as BeforeInstallPromptEvent;
      set({ canInstall: true });
    });
    window.addEventListener('appinstalled', () => {
      installPrompt = undefined;
      set({ canInstall: false, installed: true });
    });
  },

  /** Active la nouvelle version et recharge l'app. */
  async update(): Promise<void> {
    await updateServiceWorker?.(true);
  },

  /** Ouvre la fenêtre d'installation du navigateur. */
  async install(): Promise<void> {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    installPrompt = undefined;
    set({ canInstall: false, installed: outcome === 'accepted' || state.installed });
  },

  dismissOfflineReady: () => set({ offlineReady: false }),
};

/** iPhone / iPad : pas de bouton d'installation, il faut passer par le menu Partager de Safari. */
export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
