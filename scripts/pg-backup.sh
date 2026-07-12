#!/usr/bin/env bash
# Daily Postgres backup for the production compose stack.
#
# Install (as the deploy user, adjust the repo path):
#   crontab -e
#   30 4 * * * /srv/primoria/scripts/pg-backup.sh >> /var/log/primoria-backup.log 2>&1
#
# Restore a dump into the running postgres container:
#   gunzip -c /var/backups/primoria/primoria-<stamp>.sql.gz \
#     | docker compose -f docker-compose.prod.yml exec -T postgres psql -U primoria_app -d primoria
set -euo pipefail
umask 077

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${PRIMORIA_BACKUP_DIR:-/var/backups/primoria}"
KEEP_DAYS="${PRIMORIA_BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/primoria-$STAMP.sql.gz"
TMP="$OUT.tmp"

mkdir -p "$BACKUP_DIR"
trap 'rm -f "$TMP"' EXIT
docker compose -f "$REPO_DIR/docker-compose.prod.yml" --project-directory "$REPO_DIR" \
  exec -T postgres pg_dump -U primoria_app -d primoria | gzip > "$TMP"
test -s "$TMP"
mv "$TMP" "$OUT"
trap - EXIT
find "$BACKUP_DIR" -name 'primoria-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "backup written: $OUT"
