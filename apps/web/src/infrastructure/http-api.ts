import {
  ConflictError,
  RemoteError,
  type Account,
  type ChangesPage,
  type Collection,
  type RemoteApi,
  type RemoteDocument,
} from '../application/remote';

/**
 * Client HTTP de l'API. Même origine que l'application (proxy Vite en
 * développement) : le cookie de session part tout seul, aucun jeton à gérer.
 */
export function httpApi(baseUrl = '/api'): RemoteApi {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new RemoteError('Pas de connexion au serveur.', 'network');
    }

    if (response.status === 204) return undefined as T;
    const payload = (await response.json().catch(() => ({}))) as { error?: string; current?: RemoteDocument };
    if (response.ok) return payload as T;

    if (response.status === 409 && payload.current) throw new ConflictError(payload.current);
    if (response.status === 426) throw new RemoteError(payload.error ?? 'Mets l’application à jour.', 'outdated');
    if (response.status === 401 && path !== '/login') throw new RemoteError('Ta session a expiré. Reconnecte-toi.', 'unauthorized');
    if (response.status >= 500 || (response.status === 404 && !payload.error)) {
      throw new RemoteError('Le serveur ne répond pas correctement. Réessaie plus tard.', 'network');
    }
    throw new RemoteError(payload.error ?? 'Requête refusée par le serveur.', 'rejected');
  }

  const enc = encodeURIComponent;
  return {
    login: (email, password) => call<Account>('POST', '/login', { email, password }),
    logout: () => call<void>('POST', '/logout', {}),
    getInvitation: (token) => call<{ email: string }>('GET', `/invitations/${enc(token)}`),
    acceptInvitation: (token, password) => call<Account>('POST', `/invitations/${enc(token)}/accept`, { password }),
    changes: (collection: Collection, after) => call<ChangesPage>('GET', `/${collection}?after=${after}`),
    put: (collection, id, baseVersion, data) => call<RemoteDocument>('PUT', `/${collection}/${enc(id)}`, { baseVersion, data }),
    remove: (collection, id, baseVersion) => call<RemoteDocument>('DELETE', `/${collection}/${enc(id)}?baseVersion=${baseVersion}`),
  };
}
