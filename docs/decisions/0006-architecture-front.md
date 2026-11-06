# 0006 — Architecture du front : couches, Dexie et lectures réactives

**Contexte.** Le front doit fonctionner entièrement hors ligne (IndexedDB), puis se synchroniser avec l'API à l'étape 4, sans réécrire les écrans.

**Décision.** Quatre dossiers, avec des dépendances orientées vers le domaine :

```
apps/web/src/
  ui/              écrans et composants React          → application, domaine
  application/     cas d'utilisation + ports            → domaine
  infrastructure/  Dexie, catalogue (implémente les ports)
  app/             assemblage (composition.ts), thème, routes
```

- **Ports** (`application/ports.ts`) : interfaces des dépôts, horloge, générateur d'identifiants, transaction. Les cas d'utilisation ne connaissent pas Dexie.
- **Cas d'utilisation** (`application/use-cases.ts`) : lire, appliquer le domaine, enregistrer. Les écritures liées sont atomiques : terminer une séance et faire avancer le cycle se font dans une même transaction.
- **Écritures** : l'interface appelle uniquement des cas d'utilisation. Une `DomainError` est affichée telle quelle (message en français).
- **Lectures** : des hooks `useLiveQuery` (dexie-react-hooks) appellent les dépôts. L'écran se met à jour seul après chaque écriture. C'est un raccourci assumé (les lectures passent par les dépôts mais dépendent de la réactivité de Dexie) : il évite un store global, et une synchronisation qui écrit dans IndexedDB mettra aussi l'écran à jour.
- **Identifiants** : `crypto.randomUUID()` sur l'appareil, pour des envois idempotents.
- **Minuteur de repos** : stocké comme heure de fin dans IndexedDB, il survit à un rechargement ou à une mise en veille.
- **Saisie en cours** (valeurs tapées mais pas encore validées) : gardée dans l'état du composant seulement. La sauvegarde progressive se fait à la validation de chaque série, comme l'indique la maquette.

**Tests.** Les cas d'utilisation sont testés avec une vraie base Dexie en mémoire (`fake-indexeddb`) et une horloge pilotée.
