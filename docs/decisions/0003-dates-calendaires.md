# 0003 — Dates calendaires `LocalDate` sans fuseau

**Contexte.** Le calendrier raisonne en jours (« l'étape est prévue demain »). Les `Date` JavaScript représentent un instant, avec un fuseau : un jour mal calculé autour du passage à l'heure d'été décalerait tout le cycle.

**Décision.** Un type `LocalDate` : une chaîne `YYYY-MM-DD` « marquée » pour le compilateur. Quelques fonctions pures (`addDays`, `diffDays`, `maxDate`…) calculent en UTC en interne. Pas de librairie de dates.

« Aujourd'hui » est fourni par l'appelant (`fromDate(new Date())` côté interface), jamais lu dans le domaine.

**Conséquences.** Format directement stockable et comparable (l'ordre ISO est l'ordre chronologique). Les instants précis (début d'une séance) restent des chaînes ISO 8601 complètes, distinctes des jours.
