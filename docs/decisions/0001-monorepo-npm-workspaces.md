# 0001 — Monorepo avec npm workspaces

**Contexte.** Le projet comporte un front React, une API Symfony et des règles métier TypeScript partagées par le front (et testées seules).

**Décision.** Un seul dépôt :

```
apps/web/         React + TypeScript + Chakra UI
apps/api/         Symfony (géré par Composer, hors workspaces npm)
packages/domain/  règles métier TypeScript pures
docs/decisions/   ces ADR
```

Les packages JavaScript sont reliés par les **npm workspaces** (npm est déjà installé ; pnpm aurait apporté peu pour trois packages).

**Conséquences.** Un `npm install` à la racine suffit ; `npm test` lance les tests de tous les packages. Le front importe le domaine par son nom (`@repforge/domain`).

**API Symfony (ajout).** `apps/api` est un projet Composer autonome, hors des workspaces npm. Les deux technologies ne partagent pas de code. On a choisi de garder un seul dépôt plutôt que deux, parce que la synchronisation (étape 4) fera évoluer le contrat d'API des deux côtés en même temps : un seul commit reste cohérent. Si besoin, `git subtree split` permettra de séparer l'API plus tard, sans perdre son historique.
