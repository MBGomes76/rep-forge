# 0005 — Une séance démarrée est un instantané

**Contexte.** Le programme peut être modifié à tout moment, y compris pendant une séance, ou sur un autre appareil. Les séances passées et en cours ne doivent jamais changer pour autant.

**Décision.**

- `startWorkout` **copie** dans la séance tout ce qu'elle affiche : nom de la séance, objectifs, repos, ainsi que le nom, le type de saisie et la convention de charge de chaque exercice. La séance ne garde du programme que des identifiants (`programId`, `stepId`, `exerciseId`).
- Une séance terminée n'est plus modifiable par le domaine.
- La performance précédente se calcule à partir de l'historique (dernière séance terminée contenant le même `exerciseId`), elle n'est pas stockée dans la séance.
- Terminer une séance ne fait avancer le cycle que si l'étape courante est toujours celle de la séance (`completeStepAfterWorkout`) : on n'avance jamais deux fois pour une même séance.

**Règles du récapitulatif.**

- Meilleure série : la plus lourde, puis le plus de répétitions. Pour l'assistance, la moins assistée. Pour la durée, la plus longue.
- Volume = somme de charge × répétitions des **exercices à charge** uniquement. Le lest, l'assistance et la durée en sont exclus, car on ne connaît pas le poids du corps. La charge est comptée telle que saisie, selon la convention de l'exercice.

**Conséquences.** Un peu de duplication de données (le nom d'un exercice est recopié dans chaque séance), au profit d'un historique fiable et d'une synchronisation simple : une séance est un document autonome.
