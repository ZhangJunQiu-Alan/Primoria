#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$BUILDER_DIR/.." && pwd)"

cd "$BUILDER_DIR"

# Auto-load root .env if present.
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

PORT="${WEB_PORT:-3000}"

cmd=(
  flutter run
  -d chrome
  --web-port "$PORT"
)

# Keep these optional; if unset, Builder falls back to compile-time defaults.
[[ -n "${SUPABASE_URL:-}" ]] && cmd+=(--dart-define="SUPABASE_URL=${SUPABASE_URL}")
[[ -n "${SUPABASE_ANON_KEY:-}" ]] && cmd+=(--dart-define="SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}")

echo "Running Builder on http://127.0.0.1:${PORT}"
echo "Working directory: ${BUILDER_DIR}"
echo "Project root: ${ROOT_DIR}"

exec "${cmd[@]}"
