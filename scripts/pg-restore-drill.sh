#!/usr/bin/env bash
# Weekly restore proof in an isolated, disposable PostgreSQL container.
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

COS_PREFIX="${COS_PREFIX:-primoria/postgres}"
AWS_CLI_IMAGE="${PRIMORIA_AWS_CLI_IMAGE:-amazon/aws-cli:2.27.49}"
WORK_DIR="$(mktemp -d)"
CONTAINER="primoria-restore-drill-$$"
VOLUME="$CONTAINER-data"
PASSWORD="restore-drill-$RANDOM-$RANDOM"
STARTED_AT="$(date +%s)"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker volume rm "$VOLUME" >/dev/null 2>&1 || true
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

aws_cli() {
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="$COS_ACCESS_KEY_ID" \
    -e AWS_SECRET_ACCESS_KEY="$COS_SECRET_ACCESS_KEY" \
    -e AWS_DEFAULT_REGION="$COS_REGION" \
    -v "$WORK_DIR:/restore" \
    "$AWS_CLI_IMAGE" --endpoint-url "$COS_ENDPOINT_URL" "$@"
}

KEY="$(aws_cli s3api list-objects-v2 --bucket "$COS_BUCKET" --prefix "$COS_PREFIX/" \
  --query "reverse(sort_by(Contents[?ends_with(Key, '.dump')], &LastModified))[0].Key" --output text)"
[[ -n "$KEY" && "$KEY" != "None" ]] || { echo '{"status":"failed","reason":"no_remote_backup"}'; exit 1; }

FILE="$(basename "$KEY")"
aws_cli s3 cp "s3://$COS_BUCKET/$KEY" "/restore/$FILE" --only-show-errors
aws_cli s3 cp "s3://$COS_BUCKET/$KEY.sha256" "/restore/$FILE.sha256" --only-show-errors
(cd "$WORK_DIR" && sha256sum -c "$FILE.sha256")

docker volume create "$VOLUME" >/dev/null
docker run -d --name "$CONTAINER" --network none -e POSTGRES_PASSWORD="$PASSWORD" \
  -e POSTGRES_DB=primoria_restore -v "$VOLUME:/var/lib/postgresql/data" pgvector/pgvector:pg16 >/dev/null
for _ in $(seq 1 60); do
  docker exec -e PGPASSWORD="$PASSWORD" "$CONTAINER" pg_isready -U postgres -d primoria_restore >/dev/null 2>&1 && break
  sleep 1
done
docker exec -e PGPASSWORD="$PASSWORD" "$CONTAINER" pg_isready -U postgres -d primoria_restore >/dev/null
docker cp "$WORK_DIR/$FILE" "$CONTAINER:/tmp/restore.dump"
docker exec -e PGPASSWORD="$PASSWORD" "$CONTAINER" pg_restore -U postgres -d primoria_restore \
  --no-owner --no-privileges --exit-on-error /tmp/restore.dump

PUBLIC_TABLES=(users courses lessons learning_events lesson_generation_jobs learning_progress_jobs extractor_jobs worker_heartbeats)
AGENT_TABLES=(runs events checkpoints checkpoint_blobs checkpoint_writes checkpoint_migrations)
for table in "${PUBLIC_TABLES[@]}"; do
  docker exec -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -U postgres -d primoria_restore \
    -v ON_ERROR_STOP=1 -Atc "select count(*) from public.$table" >/dev/null
done
for table in "${AGENT_TABLES[@]}"; do
  docker exec -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -U postgres -d primoria_restore \
    -v ON_ERROR_STOP=1 -Atc "select count(*) from agent_runtime.$table" >/dev/null
done

docker exec -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -U postgres -d primoria_restore \
  -v ON_ERROR_STOP=1 -Atc "
    do \$\$ begin
      if exists (
        select 1 from agent_runtime.events event
        left join agent_runtime.runs run on run.id = event.run_id
        where run.id is null
      ) then raise exception 'orphaned agent event'; end if;
      if exists (
        select 1 from agent_runtime.runs
        where status not in ('queued', 'running', 'completed', 'failed', 'cancelled')
           or attempts < 0 or max_attempts <= 0
      ) then raise exception 'invalid agent run state'; end if;
    end \$\$;
    select id, owner_id, status from agent_runtime.runs order by created_at desc limit 1;
  " >/dev/null

printf '{"status":"ok","backup":"s3://%s/%s","tablesChecked":%d,"relationsChecked":2,"durationSeconds":%d,"rtoHours":4}\n' \
  "$COS_BUCKET" "$KEY" "$(( ${#PUBLIC_TABLES[@]} + ${#AGENT_TABLES[@]} ))" "$(( $(date +%s) - STARTED_AT ))"
