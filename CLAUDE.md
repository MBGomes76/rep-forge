# RepForge

Application web de suivi de musculation (carnet d'entraînement) pour moi et quelques amis. Mobile first (usage principal : téléphone, à la salle), accessible depuis plusieurs appareils, installable en PWA, utilisable hors ligne.

Le projet doit aussi être présentable dans mon portfolio : code lisible, choix techniques expliqués (dans `docs/decisions/`), tests pertinents sur les règles métier importantes.

Langue de l'interface et des messages : français. Code, noms de types et de fonctions : anglais.

## Façon de travailler

- Avancer par étapes concrètes et testables, une à la fois. Pas de fonctionnalité hors MVP.
- Je veux comprendre ce qui est fait : expliquer brièvement les choix d'architecture importants, rester bref sur le reste.
- Signaler tout point bloquant ou toute ambiguïté avant de coder dessus.
- Petits commits, messages clairs. Les tests de domaine passent avant chaque commit.

## Stack

- Frontend : React, TypeScript, Chakra UI, clean architecture proportionnée au projet.
- Backend : Symfony, API REST, clean architecture.
- Base de données : PostgreSQL.
- Stockage local : IndexedDB via Dexie, synchronisé avec l'API.
- PWA installable.
- Séparer clairement : interface, règles métier (domaine), cas d'utilisation, accès aux données.

## Maquette de référence

Une maquette interactive du parcours principal existe (artifact privé, mobile 390×844) : https://claude.ai/artifact/Pq1RQY3HXedxLSmbrSprPm . Elle fait foi pour le parcours et les libellés. Elle couvre : accueil (calendrier Jours/Cycle, report), séance (saisie, repos, chrono), récapitulatif, programmes (création, séance, catalogue), historique, profil (état de synchro simulé).

## Règles métier (décisions prises)

### Programmes et cycle
- Un programme est un cycle de durée libre (3, 5, 6, 9 jours ou plus) composé d'étapes : « entraînement » ou « repos ».
- Le cycle n'est PAS lié aux jours de la semaine. Une absence ne fait pas avancer le programme.
- Terminer un entraînement fait passer à l'étape suivante. Un repos n'est pas validé : il est accompli automatiquement une fois sa journée passée. À la fin, le cycle recommence à la première étape.
- Chaque séance se personnalise : nom, exercices, ordre, nombre de séries, répétitions attendues, temps de repos.
- Objectif de répétitions : soit une plage (défaut : 3 séries de 8 à 12), soit un objectif fixe. Valeurs par défaut modifiables.

### Calendrier et report
- Le calendrier est une projection du cycle sur les jours réels, à raison d'une étape par jour, à partir d'une « date prévue de l'étape courante » (`anchor`). Jour d >= anchor : étape `(cursor + (d - anchor)) mod n`.
- `anchor` effectif = max(anchor stocké, aujourd'hui) : un jour manqué ne fait pas avancer le cycle, l'étape est simplement prévue aujourd'hui.
- « Reporter au lendemain » : `anchor += 1`, ce qui décale tout le cycle d'un jour. Reports répétables.
- « Avancer » (à la place de « Démarrer » quand aucune séance n'est prévue aujourd'hui) : étape reportée ou prévue plus tard → `anchor = aujourd'hui` ; repos du jour → sauté, `cursor` avance et `anchor = aujourd'hui` (même si l'étape suivante est un repos).
- Terminer une séance : `cursor` avance et `anchor = aujourd'hui + 1`. Repos dont la date est passée : accompli, `cursor` avance et `anchor += 1`.
- Choix de stockage : une date prévue pour l'étape courante, plutôt qu'une liste de reports (plus simple à synchroniser sans conflit).
- Les jours passés du calendrier viennent de l'historique (séance faite, repos accompli).

### Catalogue d'exercices
- Exercices classiques : poids du corps, barres, haltères, machines, poulies.
- Recherche par nom (insensible aux accents), filtres par groupe musculaire et par matériel.
- Types de saisie selon l'exercice : charge, lest, assistance, répétitions, durée.
- Chaque exercice précise sa convention de charge (ex. « poids par haltère », « poids total, barre incluse », « lest ajouté, hors poids du corps »).

### Pendant l'entraînement
- Saisie et validation de chaque série : poids, répétitions, RIR facultatif.
- Sous chaque série, afficher la performance précédente : « Préc. : 60 kg × 10 reps · RIR 2 ».
- Distinguer clairement : objectif prévu, performance précédente, résultat du jour.
- Chrono de durée d'entraînement + timer de repos qui démarre automatiquement à la validation d'une série. Repos ajustable (±15 s) ou ignorable.
- Corriger une série validée, ajouter une série.
- Valider une série sans rien saisir reprend les valeurs de la dernière fois.
- Sauvegarde progressive. On retrouve un entraînement commencé via « Reprendre l'entraînement ».
- Historique daté des entraînements et des performances par exercice.
- IMPORTANT : une séance démarrée est un instantané. Modifier le programme ne modifie jamais ni les entraînements passés ni les objectifs d'un entraînement déjà commencé.

### Comptes et hors ligne
- Comptes individuels sur invitation uniquement (moi et mes amis au départ). Programmes et historiques privés par défaut.
- Saisie possible sans connexion, synchronisation au retour du réseau.
- État de sauvegarde et de synchronisation toujours visible.
- Pas de doublons : chaque série/séance a un identifiant unique généré côté client (idempotence des envois).
- Conflits entre appareils : gérés explicitement, jamais d'écrasement silencieux. L'utilisateur choisit la version à garder.

## Design

- Mobile first, lisible et utilisable rapidement entre deux séries.
- Palette : fond bleu nuit `#0B1426`, cartes bleu ardoise `#15213A` (bordures `#22345A`), accent vert menthe `#5EEAB4`, texte clair `#E8EEF8`, texte secondaire `#9DB0CC`, ambre `#F5C26B` (hors ligne / report), bleu clair `#8FB4FF` (objectif prévu).
- Polices : Inter (texte), Space Grotesk (chiffres).
- Zones tactiles >= 44 px, saisie numérique facile (`inputmode`), navigation principale en bas, chrono et repos toujours consultables pendant l'entraînement.
- Pas d'emoji dans l'interface, icônes en SVG.

## Hors périmètre du MVP (plus tard)

Statistiques avancées, graphiques, fonctionnalités sociales, suggestions automatiques de progression.

## Plan par étapes (proposé)

1. Domaine TypeScript pur, sans framework, avec tests : cycle (avancer, boucler), calendrier et report, instantané de séance, performance précédente, volume et récap, plages de répétitions.
2. Front React : écrans de la maquette branchés sur le domaine, données locales (Dexie), séance complète utilisable hors ligne.
3. Backend Symfony + PostgreSQL : API REST, comptes sur invitation, clean architecture.
4. Synchronisation : file d'envoi, idempotence, détection et résolution de conflits.
5. PWA : installable, cache hors ligne.

## Structure suggérée

```
rep-forge/
  apps/
    web/          # React + TypeScript + Chakra UI
    api/          # Symfony
  packages/
    domain/       # règles métier TypeScript pures (testées)
  docs/
    decisions/    # choix techniques expliqués (ADR courts)
  CLAUDE.md
```

Cette structure est une proposition : la valider ou l'ajuster avant de créer les dossiers.
