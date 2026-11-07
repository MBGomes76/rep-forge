# 0007 — API : architecture en couches et documents versionnés

**Contexte.** L'application fonctionne hors ligne : les règles métier (cycle, report, instantané de séance…) s'exécutent sur l'appareil (domaine TypeScript, ADR 0002). Le serveur sert à sauvegarder les données et à les partager entre les appareils d'un même compte. Il doit garantir ce que l'appareil ne peut pas garantir seul : la confidentialité entre comptes, l'absence de doublons malgré les renvois, et la détection des modifications concurrentes (CLAUDE.md : jamais d'écrasement silencieux).

**Décision.**

1. **Couches**, comme côté front :
   - `Domain` : PHP pur, sans Symfony ni Doctrine. Contient les comptes, les invitations et les documents, avec leurs règles.
   - `Application` : un cas d'utilisation par classe, et des ports (interfaces) pour l'horloge, les identifiants, le hachage et les transactions.
   - `Infrastructure` : Doctrine, avec un mapping XML pour que le domaine n'ait aucun attribut Doctrine. Contient aussi la sécurité Symfony et la console.
   - `UI/Http` : contrôleurs REST et erreurs JSON.
2. **Le serveur stocke des documents, pas un modèle relationnel détaillé.**
   - Un programme, une séance, un jour de repos ou un réglage est un `Document`.
   - Sa clé est (compte, type, identifiant), et son contenu est stocké en `jsonb`, tel que l'appareil l'a construit.
   - Le serveur vérifie la forme minimale de chaque type (champs requis, identifiant cohérent), sans réappliquer les règles métier.
3. **Versionnement.** Chaque document porte deux compteurs :
   - `version`, propre au document : l'appareil indique sur quelle version il s'est basé (`baseVersion`). Si le serveur l'a dépassée, il répond **409** avec sa version, et l'utilisateur choisira à l'étape 4.
   - `revision`, global et croissant (séquence PostgreSQL) : `GET /api/programs?after=N` renvoie ce qui a changé depuis la dernière synchronisation, par pages.
4. **Idempotence.**
   - L'identifiant vient de l'appareil.
   - Renvoyer le même contenu ne change rien : la comparaison ignore l'ordre des clés, que `jsonb` modifie. L'envoi est répondu 200, sans nouvelle version.
   - Une suppression laisse une trace (`data = null`), pour que les autres appareils l'apprennent.
5. **Concurrence.** Un verrou PostgreSQL par document (`pg_advisory_xact_lock`), le temps de la transaction. Il couvre aussi la création : un envoi et sa répétition simultanée ne créent pas deux lignes.

**Alternatives écartées.**

- *Tables relationnelles (étapes, exercices, séries…).* Le serveur devrait recopier les règles et le format du front, à faire évoluer à chaque changement. La granularité des conflits serait aussi plus fine que ce que l'utilisateur peut arbitrer : on choisit « ma version du programme ou l'autre », pas champ par champ.
- *Horodatage plutôt que révision.* Les horloges des appareils divergent, et deux écritures peuvent tomber dans la même milliseconde. Un compteur du serveur n'a aucun de ces deux défauts.

**Conséquences.** Le contrat est le même pour toutes les ressources (`programs`, `workouts`, `rest-days`, `settings`). Statistiques et recherche côté serveur restent possibles plus tard, grâce aux requêtes `jsonb`.
