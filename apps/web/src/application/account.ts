import type { Dependencies } from './ports';
import type { Account } from './remote';
import type { Sync } from './sync';
import type { UseCases } from './use-cases';

/**
 * Connexion, invitation et déconnexion. Le compte est retenu sur l'appareil :
 * l'application reste utilisable hors ligne pendant toute la durée de la session.
 */
export function createAccountUseCases(deps: Dependencies, useCases: UseCases, sync: Sync) {
  const { remote, settings, clearLocalData } = deps;

  /**
   * Après une connexion réussie : on récupère les données du compte, puis on
   * envoie ce que l'appareil contenait déjà. Les programmes modèles ne sont
   * créés que si le compte n'en a aucun (pas de doublons sur un 2e appareil).
   * Le compte est enregistré en dernier : l'accueil n'apparaît qu'une fois prêt.
   */
  async function signedIn(account: Account): Promise<Account> {
    await sync.firstSync(() => useCases.ensureInitialData());
    await settings.setAccount(account);
    return account;
  }

  return {
    getAccount: () => settings.getAccount(),

    getInvitation: (token: string) => remote.getInvitation(token),

    async login(email: string, password: string): Promise<Account> {
      return signedIn(await remote.login(email.trim(), password));
    },

    async acceptInvitation(token: string, password: string): Promise<Account> {
      return signedIn(await remote.acceptInvitation(token, password));
    },

    /** Ferme la session et efface tout ce que l'appareil contient. */
    async logout(): Promise<void> {
      // Sans réseau, la session serveur expirera d'elle-même : on efface quand même l'appareil.
      await remote.logout().catch(() => undefined);
      await clearLocalData();
    },
  };
}

export type AccountUseCases = ReturnType<typeof createAccountUseCases>;
