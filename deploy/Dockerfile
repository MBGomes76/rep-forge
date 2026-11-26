# syntax=docker/dockerfile:1
#
# Image de production unique : l'app React (fichiers statiques) et l'API Symfony,
# servies par FrankenPHP (le serveur web Caddy, avec PHP intégré). HTTPS automatique.
# Construite depuis la racine du dépôt : docker compose -f deploy/compose.yaml build

# --- 1. Front : build de la PWA ----------------------------------------------------
FROM node:24-alpine AS web
WORKDIR /src
# Dépendances d'abord : cette couche reste en cache tant que les package.json ne changent pas.
COPY package.json package-lock.json ./
COPY packages/domain/package.json packages/domain/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY packages packages
COPY apps/web apps/web
# Vérification des types puis build (voir apps/web/package.json).
RUN npm run build -w @repforge/web

# --- 2. API : Symfony en production ----------------------------------------------------
FROM dunglas/frankenphp:1-php8.4 AS app
# zip : Composer télécharge les dépendances sous forme d'archives .zip.
RUN install-php-extensions pdo_pgsql opcache intl zip
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY deploy/php.ini $PHP_INI_DIR/conf.d/zz-repforge.ini

ENV APP_ENV=prod \
    APP_DEBUG=0 \
    COMPOSER_ALLOW_SUPERUSER=1
WORKDIR /app

COPY apps/api/composer.json apps/api/composer.lock apps/api/symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-progress
COPY apps/api/ ./
RUN composer dump-autoload --no-dev --classmap-authoritative \
 && composer run-script --no-dev post-install-cmd \
 && mkdir -p var/sessions

# La PWA construite à l'étape 1, servie par Caddy (voir Caddyfile).
COPY --from=web /src/apps/web/dist /srv/web
COPY deploy/Caddyfile /etc/frankenphp/Caddyfile
