# @repforge/domain

Règles métier de RepForge en TypeScript pur : aucune dépendance runtime, aucun accès à l'horloge, au stockage ou au réseau. Voir [ADR 0002](../../docs/decisions/0002-domaine-typescript-pur.md).

| Module | Rôle |
| --- | --- |
| `shared/local-date` | Jours calendaires `YYYY-MM-DD` sans fuseau |
| `catalog/exercise` | Exercices et types de saisie (charge, lest, assistance, durée) |
| `program/` | Programmes, étapes, objectifs de répétitions, cycle |
| `schedule/` | Date prévue, report, projection du calendrier |
| `workout/` | Séance instantanée, séries, performance précédente, récapitulatif, libellés |

```sh
npm test            # Vitest
npm run typecheck   # tsc --noEmit
```
