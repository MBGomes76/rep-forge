import {
  ConflictError,
  RemoteError,
  type Account,
  type Collection,
  type RemoteApi,
  type RemoteDocument,
} from '../application/remote';

/**
 * Faux serveur en mémoire, fidèle aux règles de l'API Symfony (versions,
 * conflits, envois rejoués, révisions). Permet de tester la synchronisation
 * sans réseau, et de simuler plusieurs appareils sur un même « serveur ».
 */
export class FakeServer {
  readonly accounts = new Map<string, { account: Account; password: string }>();
  readonly invitations = new Map<string, string>();
  private readonly documents = new Map<string, RemoteDocument & { owner: string; collection: Collection }>();
  private revision = 0;

  addAccount(email: string, password = 'phrase-de-passe-solide'): Account {
    const account = { id: `user-${this.accounts.size + 1}`, email };
    this.accounts.set(email, { account, password });
    return account;
  }

  /** Documents d'un compte, pour vérifier ce que le serveur a reçu. */
  stored(owner: Account, collection: Collection): RemoteDocument[] {
    return [...this.documents.values()].filter((d) => d.owner === owner.id && d.collection === collection);
  }

  /** Un appareil : sa propre session, le même serveur. */
  device(): FakeDevice {
    return new FakeDevice(this);
  }

  /** @internal */
  write(owner: string, collection: Collection, id: string, baseVersion: number, data: unknown): RemoteDocument {
    const key = `${owner}/${collection}/${id}`;
    const current = this.documents.get(key);
    if (current && current.data !== null && JSON.stringify(sortKeys(current.data)) === JSON.stringify(sortKeys(data))) {
      return publicView(current);
    }
    if (!current && baseVersion !== 0) throw new RemoteError('Ce document est inconnu du serveur.', 'rejected');
    if (current && current.version !== baseVersion) throw new ConflictError(publicView(current));
    if (current?.data && data && formatOf(data) < formatOf(current.data)) {
      throw new RemoteError('Une version plus récente de l’application a modifié ce document : mets l’application à jour.', 'outdated');
    }
    const next = {
      owner,
      collection,
      id,
      version: (current?.version ?? 0) + 1,
      revision: ++this.revision,
      deleted: data === null,
      updatedAt: new Date().toISOString(),
      data,
    };
    this.documents.set(key, next);
    return publicView(next);
  }

  /** @internal */
  find(owner: string, collection: Collection, id: string) {
    return this.documents.get(`${owner}/${collection}/${id}`);
  }

  /** @internal */
  changes(owner: string, collection: Collection, after: number): RemoteDocument[] {
    return [...this.documents.values()]
      .filter((d) => d.owner === owner && d.collection === collection && d.revision > after)
      .sort((a, b) => a.revision - b.revision)
      .map(publicView);
  }
}

export class FakeDevice implements RemoteApi {
  /** Simule une coupure réseau. */
  offline = false;
  private session: Account | undefined;

  constructor(private readonly server: FakeServer) {}

  /** Simule l'expiration de la session côté serveur. */
  expireSession(): void {
    this.session = undefined;
  }

  private reach(): void {
    if (this.offline) throw new RemoteError('Pas de connexion au serveur.', 'network');
  }

  private owner(): string {
    this.reach();
    if (!this.session) throw new RemoteError('Ta session a expiré. Reconnecte-toi.', 'unauthorized');
    return this.session.id;
  }

  async login(email: string, password: string): Promise<Account> {
    this.reach();
    const entry = this.server.accounts.get(email.toLowerCase());
    if (!entry || entry.password !== password) throw new RemoteError('E-mail ou mot de passe incorrect.', 'rejected');
    this.session = entry.account;
    return entry.account;
  }

  async logout(): Promise<void> {
    this.reach();
    this.session = undefined;
  }

  async getInvitation(token: string): Promise<{ email: string }> {
    this.reach();
    const email = this.server.invitations.get(token);
    if (!email) throw new RemoteError('Ce lien d’invitation n’est plus valable.', 'rejected');
    return { email };
  }

  async acceptInvitation(token: string, password: string): Promise<Account> {
    const { email } = await this.getInvitation(token);
    if (password.length < 10) throw new RemoteError('Le mot de passe doit contenir au moins 10 caractères.', 'rejected');
    this.server.invitations.delete(token);
    const account = this.server.addAccount(email, password);
    this.session = account;
    return account;
  }

  async changes(collection: Collection, after: number) {
    const items = this.server.changes(this.owner(), collection, after);
    return { items: items.slice(0, 2), hasMore: items.length > 2 }; // petites pages : la pagination est testée
  }

  async put(collection: Collection, id: string, baseVersion: number, data: unknown): Promise<RemoteDocument> {
    return this.server.write(this.owner(), collection, id, baseVersion, data);
  }

  async remove(collection: Collection, id: string, baseVersion: number): Promise<RemoteDocument> {
    const owner = this.owner();
    const current = this.server.find(owner, collection, id);
    if (!current) throw new RemoteError('Document introuvable.', 'rejected');
    if (current.deleted) return publicView(current);
    return this.server.write(owner, collection, id, baseVersion, null);
  }
}

function publicView({ id, version, revision, deleted, updatedAt, data }: RemoteDocument): RemoteDocument {
  return { id, version, revision, deleted, updatedAt, data: structuredCloneJson(data) };
}

function structuredCloneJson(value: unknown): unknown {
  return value === null || value === undefined ? null : JSON.parse(JSON.stringify(value));
}

function formatOf(data: unknown): number {
  const format = (data as { format?: unknown }).format;
  return typeof format === 'number' ? format : 1;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]));
  }
  return value;
}
