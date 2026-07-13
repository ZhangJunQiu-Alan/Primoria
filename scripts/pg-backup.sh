#!/usr/bin/env bash
# Daily encrypted off-site Postgres backup. Target: RPO 24h / RTO 4h.
set -euo pipefail
umask 077

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$REPO_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_DIR/.env"
  set +a
fi

: "${COS_ENDPOINT_URL:?COS_ENDPOINT_URL is required}"
: "${COS_REGION:?COS_REGION is required}"
: "${COS_BUCKET:?COS_BUCKET is required}"
: "${COS_ACCESS_KEY_ID:?COS_ACCESS_KEY_ID is required}"
: "${COS_SECRET_ACCESS_KEY:?COS_SECRET_ACCESS_KEY is required}"

BACKUP_DIR="${PRIMORIA_BACKUP_DIR:-/var/backups/primoria}"
KEEP_DAYS="${PRIMORIA_BACKUP_KEEP_DAYS:-14}"
COS_PREFIX="${COS_PREFIX:-primoria/postgres}"
COS_SSE="${COS_SSE:-AES256}"
AWS_CLI_IMAGE="${PRIMORIA_AWS_CLI_IMAGE:-amazon/aws-cli:2.27.49}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/primoria-$STAMP.dump"
CHECKSUM="$OUT.sha256"
TMP="$OUT.tmp"
REMOTE_CHECKSUM="$OUT.remote.sha256"
REMOTE_KEY="$COS_PREFIX/$(basename "$OUT")"

aws_cli() {
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="$COS_ACCESS_KEY_ID" \
    -e AWS_SECRET_ACCESS_KEY="$COS_SECRET_ACCESS_KEY" \
    -e AWS_DEFAULT_REGION="$COS_REGION" \
    -v "$BACKUP_DIR:/backups:ro" \
    "$AWS_CLI_IMAGE" --endpoint-url "$COS_ENDPOINT_URL" "$@"
}

mkdir -p "$BACKUP_DIR"
trap 'rm -f "$TMP" "$REMOTE_CHECKSUM"' EXIT
docker compose -f "$REPO_DIR/docker-compose.prod.yml" --project-directory "$REPO_DIR" \
  exec -T postgres pg_dump -U primoria_migrator -d primoria --format=custom --no-owner --no-privileges > "$TMP"
test -s "$TMP"
mv "$TMP" "$OUT"
sha256sum "$OUT" | sed "s|$OUT|$(basename "$OUT")|" > "$CHECKSUM"

aws_cli s3 cp "/backups/$(basename "$OUT")" "s3://$COS_BUCKET/$REMOTE_KEY" --sse "$COS_SSE" --only-show-errors
aws_cli s3 cp "/backups/$(basename "$CHECKSUM")" "s3://$COS_BUCKET/$REMOTE_KEY.sha256" --sse "$COS_SSE" --only-show-errors
aws_cli s3 cp "s3://$COS_BUCKET/$REMOTE_KEY.sha256" - --only-show-errors > "$REMOTE_CHECKSUM"
cmp -s "$CHECKSUM" "$REMOTE_CHECKSUM"

find "$BACKUP_DIR" -name 'primoria-*.dump' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'primoria-*.dump.sha256' -mtime +"$KEEP_DAYS" -delete
printf '{"status":"ok","backup":"%s","remote":"s3://%s/%s","rpoHours":24}\n' \
  "$OUT" "$COS_BUCKET" "$REMOTE_KEY"
