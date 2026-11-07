#!/bin/sh
# Premier démarrage de PostgreSQL uniquement (base vide) : les deux rôles de l'ADR 0008.
# - repforge_admin : propriétaire de la base, utilisé par les migrations ;
# - repforge_user  : l'application, lecture et écriture des données seulement.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
CREATE ROLE repforge_admin LOGIN PASSWORD '$DB_ADMIN_PASSWORD';
CREATE ROLE repforge_user LOGIN PASSWORD '$DB_USER_PASSWORD';
CREATE DATABASE repforge OWNER repforge_admin;
SQL

# Droits accordés automatiquement à l'application sur chaque table créée par les migrations.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname repforge <<SQL
ALTER DEFAULT PRIVILEGES FOR ROLE repforge_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO repforge_user;
ALTER DEFAULT PRIVILEGES FOR ROLE repforge_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO repforge_user;
SQL
