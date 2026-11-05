# 0004 — Planification par « date prévue de l'étape courante »

**Contexte.** Le cycle n'est pas lié aux jours de la semaine. L'utilisateur peut manquer un jour, reporter une étape (plusieurs fois), ou faire une séance en avance. Le calendrier doit refléter tout cela, sur plusieurs appareils.

**Décision.** L'état d'avancement tient en deux valeurs : `cursor` (index de l'étape courante) et `anchor` (sa date prévue).

- Projection : un jour `d >= anchor` affiche l'étape `(cursor + (d − anchor)) mod n`.
- `anchor` effectif = `max(anchor, aujourd'hui)` : un jour manqué ne fait pas avancer le cycle.
- Reporter : `anchor = anchor effectif + 1`. Ramener à aujourd'hui : `anchor = aujourd'hui`.
- Terminer une étape : `cursor + 1 (mod n)` et `anchor = aujourd'hui + 1`.
- Les jours passés viennent de l'historique, pas de la projection.

**Alternative écartée.** Stocker la liste des reports : à recalculer à chaque affichage, et deux appareils hors ligne produiraient deux listes à fusionner. Ici, un conflit porte sur une seule valeur, facile à présenter à l'utilisateur.

**Détail.** Quand une étape est supprimée ou déplacée, `cursor` suit l'identifiant de l'étape courante pour ne pas sauter d'étape par accident.
