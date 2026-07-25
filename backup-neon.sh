#!/usr/bin/env bash

# Arrêter le script en cas d'erreur
set -e

# Charger DATABASE_URL depuis le .env
if [ -f .env ]; then
  DATABASE_URL=$(grep -v '^#' .env | grep 'DATABASE_URL' | cut -d '=' -f2- | tr -d '"' | tr -d "'")
else
  echo "❌ Fichier .env introuvable."
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL introuvable dans le fichier .env."
  exit 1
fi

# 🔧 Nettoyage de l'URL pour pg_dump :
# Supprime pool_timeout, pgbouncer, etc., qui font tout planter dans pg_dump
CLEAN_URL=$(echo "$DATABASE_URL" | sed -E 's/([?&])pool_timeout=[^&]*&?/\1/g' | sed -E 's/([?&])pgbouncer=[^&]*&?/\1/g' | sed -E 's/[?&]$//')

# Créer le dossier backups s'il n'existe pas
mkdir -p backups

# Nom du fichier horodaté
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="backups/neon_backup_${TIMESTAMP}.sql"

echo "⏳ Connexion à Neon et sauvegarde..."

# Exécution du dump
pg_dump "$CLEAN_URL" --clean --if-exists --no-owner --no-acl > "$BACKUP_FILE"

echo "✅ Sauvegarde réussie !"
echo "📁 Fichier généré : $BACKUP_FILE"
