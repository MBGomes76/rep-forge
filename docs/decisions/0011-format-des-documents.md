# 0011 — Numéro de format des documents

**Contexte.** Les documents stockés en `jsonb` (ADR 0007) survivent aux versions de l'application : un programme créé aujourd'hui sera relu par l'app de l'an prochain. Sans précaution, un changement de modèle (une note par série, des supersets…) casserait la lecture des anciens documents. Une ancienne version de l'app, sur le téléphone d'un ami qui n'a pas mis à jour, pourrait aussi effacer des champs qu'elle ne connaît pas.

**Décision.**

- **Un format par document.**
  - Chaque document envoyé porte un champ `format`. `DOCUMENT_FORMAT` vaut aujourd'hui 1.
  - Un document sans ce champ, créé avant son introduction, est du format 1.
- **Mise à niveau à la lecture, dans le domaine.**
  - `fromStoredDocument` applique les fonctions de passage une étape à la fois (1 → 2 → 3…), puis retire le champ.
  - Pour changer de format : incrémenter `DOCUMENT_FORMAT` et ajouter la fonction de passage, avec son test.
- **Document trop récent pour l'app.**
  - La synchronisation s'arrête sur cette ressource et le badge affiche « Mise à jour ».
  - Rien n'est appliqué ni sauté : le document sera relu après la mise à jour.
- **Le serveur refuse qu'un format plus ancien remplace un format plus récent** (426, « mets l'application à jour »). C'est le seul endroit où les deux versions sont visibles ensemble. La modification reste en attente sur l'appareil, rien n'est perdu.

**Alternative écartée.** *Migrer les documents en base par un script SQL à chaque changement de format.* Il faudrait le faire en même temps que la mise à jour de toutes les apps installées, ce qui est impossible avec des téléphones hors ligne. La mise à niveau à la lecture fonctionne quel que soit l'ordre des mises à jour.

**Conséquences.** Les données locales (IndexedDB) évoluent, elles, avec les versions Dexie (`db.version(n).upgrade(...)`), au premier lancement de la nouvelle app.
