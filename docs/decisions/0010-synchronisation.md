# 0010 — Synchronisation : état courant, versions, conflits explicites

**Contexte.** L'application doit rester utilisable sans réseau, se synchroniser au retour du réseau, ne jamais créer de doublon et ne jamais écraser une modification en silence (CLAUDE.md). L'API stocke des documents versionnés (ADR 0007).

**Décision.**

- **On envoie l'état courant, pas un journal d'opérations.**
  - Chaque document local a un état de synchronisation : la version du serveur sur laquelle il est basé, un indicateur « à envoyer » et un compteur de modifications locales.
  - Les dépôts Dexie le mettent à jour dans la même transaction que l'écriture : les cas d'utilisation ne savent rien de la synchronisation.
  - Dix séries validées hors ligne donnent un seul envoi de la séance.
- **Envoi, puis réception.**
  - Envoi : `PUT` avec `baseVersion`. Si le document a changé pendant l'envoi (compteur différent), il reste « à envoyer », basé sur la nouvelle version.
  - Réception : `GET ?after=révision`, ressource par ressource, par pages.
- **Décision à la réception** : fonction pure du domaine (`decidePull`), testée.
  - Rien de modifié localement : on applique la version du serveur.
  - Déjà connu : on ignore.
  - Modifié des deux côtés avec le même contenu : on retient la version, sans conflit. C'est le cas des repos réglés automatiquement sur deux appareils, un calcul déterministe.
  - Sinon : **conflit**.
- **Conflit** : mis de côté avec la version du serveur, sans bloquer le reste. L'utilisateur choisit :
  - « garder la mienne » : renvoyée, basée sur la version du serveur ;
  - « garder l'autre » : appliquée sur l'appareil.
- **Première connexion d'un appareil** :
  1. réception du compte ;
  2. les données déjà présentes sur l'appareil deviennent « à envoyer » ;
  3. les programmes modèles ne sont créés que si le compte n'en a aucun ;
  4. envoi.

  Un deuxième appareil ne crée donc pas de doublons.
- **Déclenchement** : au démarrage, au retour du réseau, au retour au premier plan, 2 s après une modification (pour regrouper les saisies), et toutes les minutes.
- **Ce qui est synchronisé** : programmes, séances (y compris en cours, série par série), jours de repos, programme actif. Le minuteur de repos reste propre à l'appareil.

**Alternative écartée.** *Le plus récent gagne.* C'est simple, mais une modification serait perdue sans que personne ne le sache, ce qui est contraire à la règle du projet.

**Conséquences.** Les modifications faites en rafale sur un même document (frappe dans un nom) sont protégées par des transactions de lecture-modification-écriture. Les tests de synchronisation simulent deux appareils sur un faux serveur qui suit les règles de l'API.
