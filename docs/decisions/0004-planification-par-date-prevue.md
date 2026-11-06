# 0004 — Planification par « date prévue de l'étape courante »

**Contexte.** Le cycle n'est pas lié aux jours de la semaine. L'utilisateur peut manquer un jour, reporter une étape (plusieurs fois), ou faire une séance en avance. Le calendrier doit refléter tout cela, sur plusieurs appareils.

**Décision.** L'état d'avancement tient en deux valeurs : `cursor` (index de l'étape courante) et `anchor` (sa date prévue).

- Projection : un jour `d >= anchor` affiche l'étape `(cursor + (d − anchor)) mod n`.
- `anchor` effectif = `max(anchor, aujourd'hui)` : un jour manqué ne fait pas avancer le cycle.
- Reporter : `anchor = anchor effectif + 1`. Ramener à aujourd'hui : `anchor = aujourd'hui`.
- Terminer une séance : `cursor + 1 (mod n)` et `anchor = aujourd'hui + 1`.
- Les jours passés viennent de l'historique, pas de la projection.

**Alternative écartée.** Stocker la liste des reports : à recalculer à chaque affichage, et deux appareils hors ligne produiraient deux listes à fusionner. Ici, un conflit porte sur une seule valeur, facile à présenter à l'utilisateur.

**Détail.** Quand une étape est supprimée ou déplacée, `cursor` suit l'identifiant de l'étape courante pour ne pas sauter d'étape par accident.

**Repos accomplis automatiquement** (révision). Un repos n'a rien à « valider » : une fois sa journée passée, il compte comme fait. Tant que l'étape courante est un repos dont la date (`anchor` stocké) est passée : il entre dans l'historique à cette date, `cursor + 1`, `anchor + 1`. On s'arrête à la première séance, qui attend l'utilisateur. Le calcul ne dépend que du programme et de la date : deux appareils hors ligne produisent le même résultat (et la même entrée d'historique, à identifiant déterministe), donc aucun conflit. Activer un programme laissé de côté ramène son `anchor` à aujourd'hui, pour ne pas inventer des repos pendant la pause.

**Avancer** (révision). Inverse du report, proposé quand aucune séance n'est prévue aujourd'hui, à la place de « Démarrer » :
- l'étape courante est prévue plus tard (reportée, ou demain après une séance) : `anchor = aujourd'hui` ;
- l'étape du jour est un repos : il est sauté (il ne compte pas comme fait), `cursor + 1` et `anchor = aujourd'hui`, que l'étape suivante soit une séance ou un autre repos.

Toutes les étapes suivantes arrivent un jour plus tôt. « Ramener à aujourd'hui » est absorbé par ce bouton.
