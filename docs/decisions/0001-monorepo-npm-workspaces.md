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
