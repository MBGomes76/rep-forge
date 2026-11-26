# 0014 — Modifier un programme : un brouillon, puis « Enregistrer »

**Contexte.** Jusqu'ici, chaque modification d'un programme (nom, étape, réglage d'un exercice) était enregistrée tout de suite, puis synchronisée. On voulait pouvoir revenir en arrière (« Annuler »), et ne rien envoyer au serveur tant que les modifications ne sont pas terminées.

**Décision.** Les modifications vont dans un **brouillon**, propre à l'appareil.

- **Stockage.**
  - Une table IndexedDB à part, `programDrafts`, qui n'est **jamais synchronisée**.
  - Le brouillon est créé à la première modification, en copiant le programme enregistré.
  - Les écrans d'édition affichent le brouillon s'il existe, sinon le programme.
- **« Enregistrer »** recopie le brouillon dans le programme, puis le supprime : il n'y a donc **qu'un seul envoi au serveur**, quel que soit le nombre de modifications.
- **« Annuler »** supprime le brouillon, après confirmation.
- **Le brouillon survit** si l'on quitte l'écran ou si l'app se ferme : rien n'est perdu, il n'y a pas d'avertissement à afficher. La liste des programmes le signale (« Non enregistré »).
- **La position dans le cycle n'appartient pas au brouillon.** Pendant l'édition, le programme enregistré peut avancer : séance terminée, repos accompli, synchronisation d'un autre appareil. À l'enregistrement (`applyProgramEdits`, dans le domaine) :
  - le contenu vient du brouillon ;
  - la position vient du programme enregistré ;
  - l'étape courante est retrouvée par son identifiant.

**Alternatives écartées.**

- *Garder le brouillon en mémoire (état React)* : il serait perdu si l'app se ferme ou si le téléphone la décharge, ce qui arrive souvent avec une PWA.
- *Enregistrer tout de suite et ajouter un « Annuler » qui restaure l'ancienne version* : chaque modification partirait quand même au serveur. Et une restauration pourrait écraser une avancée du cycle survenue entre-temps.

**Conséquences.**

- Une séance démarrée utilise toujours le programme **enregistré**, jamais un brouillon en cours.
- Activer, dupliquer ou supprimer un programme agit sur la version enregistrée. Supprimer un programme supprime aussi son brouillon.
- La déconnexion efface les brouillons, comme toutes les données de l'appareil.
