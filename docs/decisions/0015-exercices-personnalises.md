# 0015 — Exercices personnalisés

**Contexte.** Le catalogue fourni avec l'app ne couvrira jamais toutes les machines de toutes les salles. Des bases d'exercices publiques existent (wger, free-exercise-db, ExerciseDB), mais il leur manque ce qui pilote la saisie dans RepForge : le type de saisie (charge, lest, assistance, durée) et la convention de charge. Elles ne sont pas non plus en français, et les interroger en direct casserait le fonctionnement hors ligne.

**Décision.** L'utilisateur crée ses propres exercices, depuis le catalogue.

- **Une donnée synchronisée comme les autres** : nouvelle collection `exercises` côté app, et type de document `exercise` côté API. Le serveur vérifie la forme minimale : nom, groupe, matériel, saisie, convention, `archived`. Aucune migration : le type de document est une simple colonne texte.
- **Le type de saisie est fixé à la création.** Le changer rendrait illisibles les performances déjà enregistrées (des kilos lus comme des secondes). Tout le reste se modifie.
- **Archiver plutôt que supprimer.** Un exercice archivé disparaît du catalogue, mais reste connu de l'app : les programmes qui l'utilisent continuent de démarrer des séances. L'historique, lui, ne dépend pas du catalogue, puisque les séances sont des instantanés (ADR 0005).
- **Convention de charge proposée, modifiable** : l'app suggère un texte selon la saisie et le matériel (`suggestLoadConvention`, dans le domaine), que l'on peut réécrire.
- **Ordre de synchronisation** : les exercices passent avant les programmes, pour qu'un programme reçu sur un autre appareil trouve ses exercices.

**Alternatives écartées.**

- *Importer une base publique entière* : des centaines d'entrées à compléter à la main (saisie, convention, traduction). Une sélection pourra être importée plus tard, depuis free-exercise-db (domaine public).
- *Suppression réelle* : il faudrait l'interdire tant qu'un programme utilise l'exercice, ce qui est moins pratique pour un gain nul.

**Conséquences.**

- Retrouver un exercice d'après son identifiant consulte le catalogue de l'app et les exercices personnalisés, archivés compris.
- Une ancienne version de l'app ne connaît pas la collection `exercises` : elle ne la synchronise pas, sans rien casser. Un exercice personnalisé y apparaît sous son identifiant tant que l'app n'est pas mise à jour.
