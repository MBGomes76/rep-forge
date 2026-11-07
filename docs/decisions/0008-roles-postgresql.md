# 0008 — Deux rôles PostgreSQL : moindre privilège

**Contexte.** L'API n'a besoin que de lire et d'écrire des données. Seules les migrations modifient la structure de la base.

**Décision.**

- `repforge_admin` est propriétaire de la base et du schéma. Il n'est utilisé que par les migrations Doctrine, via la variable `DATABASE_ADMIN_URL` et le gestionnaire d'entités `admin`.
- `repforge_user` est le rôle de l'application (variable `DATABASE_URL`). Il a seulement `SELECT, INSERT, UPDATE, DELETE` sur les tables, et `USAGE` sur les séquences. Ces droits lui sont accordés automatiquement pour chaque nouvelle table (`ALTER DEFAULT PRIVILEGES`).
- La base de test est recréée avec les mêmes droits (`composer db:test:reset`).
- Un test vérifie que la connexion de l'application ne peut pas supprimer une table.

**Conséquences.** Une faille dans l'API, par exemple une injection SQL, ne peut pas détruire ni modifier le schéma. Les mots de passe ne sont jamais commités : ils sont dans `.env.local` et `.env.test.local`.
