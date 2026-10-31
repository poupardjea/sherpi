#!/usr/bin/env bash
# Sauvegarde de la base, une fois par nuit (cron : voir README). Garde 14 jours.
set -euo pipefail
cd "$(dirname "$0")"

DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$DIR"

FILE="$DIR/app-$(date +%F).sql.gz"
docker compose exec -T db pg_dump -U app -d app --clean --if-exists | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
find "$DIR" -name 'app-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

# Copie hors du serveur (à activer une fois rclone configuré, voir README) :
# rclone copy "$FILE" sauvegardes:conseiller-cadeau/

echo "$(date -Is) sauvegarde OK : $FILE ($(du -h "$FILE" | cut -f1))"
