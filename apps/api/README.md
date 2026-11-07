# RepForge — API

API REST Symfony 7.4 (PHP 8.4) et PostgreSQL. Elle gère les comptes sur invitation et la sauvegarde des données synchronisées.

## Architecture

```
src/
  Domain/          règles métier, PHP pur (Account, Sync)
  Application/     cas d'utilisation + ports (interfaces)
  Infrastructure/  Doctrine (mapping XML), sécurité Symfony, console
  UI/Http/         contrôleurs REST, erreurs JSON
```

Les choix sont expliqués dans `docs/decisions/` (0007 à 0009).

## Installation

1. Créer les deux rôles PostgreSQL et la base, avec l'utilisateur `postgres` :

   ```sql
   CREATE ROLE repforge_admin LOGIN PASSWORD '…' CREATEDB;
   CREATE ROLE repforge_user LOGIN PASSWORD '…';
   CREATE DATABASE repforge OWNER repforge_admin;
   ```

   Puis, connecté en `repforge_admin` sur la base `repforge` :

   ```sql
   ALTER DEFAULT PRIVILEGES FOR ROLE repforge_admin IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO repforge_user;
   ALTER DEFAULT PRIVILEGES FOR ROLE repforge_admin IN SCHEMA public
     GRANT USAGE, SELECT ON SEQUENCES TO repforge_user;
   ```

2. Mettre `DATABASE_URL` (repforge_user) et `DATABASE_ADMIN_URL` (repforge_admin) dans `.env.local`, et les mêmes dans `.env.test.local`.

3. Lancer :

   ```bash
   composer install
   php bin/console doctrine:migrations:migrate
   composer db:test:reset   # base de test, mêmes droits
   composer test
   symfony serve            # http://127.0.0.1:8000
   ```

## Inviter quelqu'un

```bash
php bin/console app:invite ami@example.com
```

La commande affiche un lien à usage unique, valable 7 jours.

## Points d'entrée

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| GET | `/api/invitations/{token}` | Adresse invitée, si le lien est valable |
| POST | `/api/invitations/{token}/accept` | `{"password"}` : crée le compte et connecte |
| POST | `/api/login` | `{"email", "password"}` |
| POST | `/api/logout` | |
| GET | `/api/me` | Compte connecté |
| GET | `/api/{collection}?after=N` | Documents modifiés après la révision N (`items`, `hasMore`) |
| GET | `/api/{collection}/{id}` | Un document |
| PUT | `/api/{collection}/{id}` | `{"baseVersion", "data"}` : création (`baseVersion` 0) ou modification ; 409 en cas de conflit |
| DELETE | `/api/{collection}/{id}?baseVersion=N` | Suppression (une trace reste) |

`collection` : `programs`, `workouts`, `rest-days` ou `settings`. Les envois se font en JSON uniquement. Les erreurs ont la forme `{"error": "message en français"}`.
