#!/bin/sh
set -eu

: "${POSTGRES_RUNTIME_PASSWORD:?POSTGRES_RUNTIME_PASSWORD is required}"

psql --set=ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=runtime_password="$POSTGRES_RUNTIME_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE primoria_runtime LOGIN PASSWORD %L', :'runtime_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'primoria_runtime')\gexec
SELECT format('ALTER ROLE primoria_runtime PASSWORD %L', :'runtime_password')\gexec
ALTER ROLE primoria_runtime NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT CONNECT ON DATABASE primoria TO primoria_runtime;
SQL
