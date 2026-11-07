# Mettre RepForge en ligne

Un serveur Linux avec Docker, un nom de domaine, et c'est tout : l'app, l'API, la base et les sauvegardes tournent dans Docker Compose (`deploy/`). Les choix sont expliqués dans l'ADR 0013.

```
https://repforge.duckdns.org
        │
   Caddy / FrankenPHP     HTTPS automatique (Let's Encrypt)
     /        → l'app (PWA)
     /api/... → Symfony
        │
   PostgreSQL 18          rôles admin / user, sauvegarde chaque nuit
```

## 1. Un serveur

N'importe quel VPS Linux fait l'affaire : 2 Go de mémoire suffisent (Hetzner CX22, OVH VPS, Scaleway…). On choisit Debian ou Ubuntu.

Une fois connecté en SSH :

```bash
# Docker et son plugin Compose
curl -fsSL https://get.docker.com | sh

# Pare-feu : SSH, HTTP (pour le certificat), HTTPS
apt install -y ufw
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable

# Mises à jour de sécurité automatiques du système
apt install -y unattended-upgrades
```

## 2. Un nom de domaine gratuit (DuckDNS)

1. Se connecter sur [duckdns.org](https://www.duckdns.org) (avec un compte GitHub par exemple).
2. Créer un sous-domaine, par exemple `repforge`, ce qui donne `repforge.duckdns.org`.
3. Mettre l'adresse IP du serveur dans le champ « current ip », puis « update ip ».

L'adresse IP d'un VPS ne change pas : pas besoin du script de mise à jour proposé par DuckDNS. Pour passer plus tard à un vrai domaine, il suffit de changer `DOMAIN` dans `deploy/.env` et de relancer `deploy.sh`.

## 3. Première installation

```bash
git clone https://github.com/MBGomes76/rep-forge.git
cd rep-forge/deploy
cp .env.example .env
nano .env    # remplir DOMAIN et les secrets (voir ci-dessous)
./deploy.sh
```

Pour générer chaque secret, à copier dans `.env` (`APP_SECRET` et les trois mots de passe) :

```bash
openssl rand -hex 24
```

Au premier lancement :
- PostgreSQL crée la base et les deux rôles (`deploy/initdb/01-roles.sh`) ;
- les migrations créent les tables ;
- Caddy obtient le certificat HTTPS, ce qui prend quelques secondes.

L'app répond alors sur `https://<DOMAIN>`.

## 4. S'inviter, puis inviter ses amis

```bash
cd rep-forge/deploy
docker compose exec app php bin/console app:invite toi@example.com
```

La commande affiche un lien à usage unique, valable 7 jours.

## 5. Publier une nouvelle version

Avant de pousser sur `master`, sur ton PC : `npm run typecheck && npm test && npm run test:api`.

Puis sur le serveur :

```bash
cd rep-forge && ./deploy/deploy.sh
```

Le script :
1. récupère le code ;
2. construit la nouvelle image, pendant que l'ancienne version tourne encore ;
3. applique les migrations ;
4. remplace l'application.

Les sessions sont conservées, personne n'est déconnecté. Sur les téléphones, le bandeau « Nouvelle version disponible » apparaît dans l'heure, ou à la prochaine ouverture.

## 6. Sauvegardes

Le service `backup` fait une copie de la base chaque nuit dans `deploy/backups/` et garde 14 jours. Une sauvegarde qui reste sur le même serveur ne protège pas d'une panne du serveur : il faut en copier régulièrement une ailleurs, par exemple sur ton PC.

```bash
scp root@<IP>:rep-forge/deploy/backups/repforge-AAAA-MM-JJ.dump .
```

Pour restaurer une sauvegarde (cela remplace les données actuelles) :

```bash
cd rep-forge/deploy
docker compose stop app
docker compose exec -T db pg_restore -U postgres -d repforge --clean --if-exists < backups/repforge-AAAA-MM-JJ.dump
docker compose start app
```

## Commandes utiles

```bash
docker compose ps                  # état des services
docker compose logs -f app         # journaux de l'app (Ctrl+C pour quitter)
docker compose exec db psql -U repforge_admin repforge    # console SQL
```
