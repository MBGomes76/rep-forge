# 0002 — Domaine en TypeScript pur, sans framework ni build

**Contexte.** Les règles métier (cycle, calendrier, instantané de séance, performance précédente, récapitulatif) sont le cœur du projet. Elles doivent être testables vite et isolément, et ne pas dépendre de React, de Dexie ni de l'API.

**Décision.**

- `packages/domain` ne contient que des **types et des fonctions pures** : mêmes entrées, même résultat, aucune mutation, aucun accès réseau, stockage ou horloge.
- Les données sont des objets immuables (`readonly`), modélisés par des **unions discriminées** (`{ kind: 'workout' } | { kind: 'rest' }`), plutôt que des classes : elles se sérialisent sans conversion vers IndexedDB et JSON.
- Ce qui varie (aujourd'hui, l'instant présent, la génération d'identifiants) est **passé en paramètre**. Les tests sont donc déterministes.
- Une violation de règle lève une `DomainError` au message en français.
- **Pas d'étape de build** : le package expose ses sources `.ts`, compilées par Vite côté front. `tsc --noEmit` sert de vérification de types.
- Tests avec **Vitest**, placés à côté du code (`cycle.ts` / `cycle.test.ts`).

**Conséquences.** Les cas d'utilisation du front (étape 2) orchestrent : lire l'état (Dexie), appeler le domaine, écrire le résultat. Le domaine ne sait pas où vivent les données.
