#!/bin/sh
# Met en ligne la dernière version de master. À lancer sur le serveur : ./deploy/deploy.sh
#
# Ordre choisi pour ne jamais faire tourner le nouveau code sur l'ancien schéma :
# 1. récupérer le code et construire la nouvelle image (l'ancienne version tourne toujours) ;
# 2. appliquer les migrations avec la nouvelle image (rôle admin) ;
# 3. remplacer l'application.
set -eu
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "deploy/.env manquant : copier .env.example et le remplir (voir docs/deploiement.md)." >&2
  exit 1
fi

echo "==> Récupération du code"
git pull --ff-only

echo "==> Construction de l'image"
docker compose build app

echo "==> Base de données"
docker compose up -d --wait db

echo "==> Migrations"
docker compose run --rm --no-deps app php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

echo "==> Mise en ligne"
docker compose up -d --remove-orphans
docker image prune -f > /dev/null

docker compose ps
echo "==> Version en ligne : https://$(grep '^DOMAIN=' .env | cut -d= -f2)"
