# 0013 — Déploiement : Docker Compose sur un serveur, FrankenPHP

**Contexte.** Une PWA exige HTTPS (ADR 0012). Le cookie de session suppose que l'app et l'API soient sur la même origine (ADR 0009). L'hébergeur n'est pas encore choisi, et le budget doit rester minimal : l'app sert à quelques amis.

**Décision.**

- **Une image unique**, construite en deux étapes (`deploy/Dockerfile`).
  - Node construit la PWA.
  - FrankenPHP (Caddy avec PHP intégré) sert à la fois les fichiers de l'app et l'API Symfony, sur le même domaine.
- **HTTPS automatique** : Caddy obtient et renouvelle les certificats Let's Encrypt. Ils sont gardés dans un volume, pour ne pas être redemandés à chaque déploiement.
- **Docker Compose** (`deploy/compose.yaml`), qui fonctionne sur n'importe quel serveur Linux avec Docker :
  - `app` ;
  - `db` : PostgreSQL 18, non exposé à l'extérieur ;
  - `backup` : `pg_dump` chaque nuit, 14 jours conservés.
- **Les mêmes rôles qu'en développement** (ADR 0008). Le super-utilisateur PostgreSQL ne sert qu'à les créer au premier démarrage.
- **En-têtes de cache pensés pour la PWA.**
  - `index.html`, `sw.js` et le manifeste sont toujours revalidés : c'est par eux qu'une nouvelle version est découverte.
  - Les fichiers à empreinte (`/assets/*`) sont gardés un an.
- **Mise en ligne manuelle** (`deploy/deploy.sh`) : construire, migrer (rôle admin), puis remplacer. Le nouveau code ne tourne jamais sur l'ancien schéma. Les sessions survivent aux déploiements (volume).
- **Les secrets** sont dans `deploy/.env` sur le serveur, jamais commités.

**Alternatives écartées.**

- *Hébergement « PaaS » géré* : plus cher (15 à 25 €/mois avec PostgreSQL), et les rôles PostgreSQL séparés n'y sont pas toujours possibles.
- *Front sur un hébergeur statique, API ailleurs* : deux domaines, donc des cookies tiers et une configuration CORS. On perdrait la simplicité de la même origine.
- *Nginx + PHP-FPM* : deux processus à configurer, plus HTTPS à gérer à part. FrankenPHP fait tout, et c'est le serveur recommandé par Symfony.

**Conséquences.**

- Changer d'hébergeur, c'est relancer `deploy.sh` sur un autre serveur, puis restaurer une sauvegarde.
- L'automatisation (GitHub Actions) pourra reprendre le même script plus tard.
- Il reste de l'administration système (mises à jour, copie des sauvegardes hors du serveur), décrite dans `docs/deploiement.md`.
