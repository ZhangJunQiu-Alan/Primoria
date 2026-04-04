#!/bin/bash
# Load .env if present
if [ -f "$(dirname "$0")/.env" ]; then
  set -a
  source "$(dirname "$0")/.env"
  set +a
fi

APP=${1:-viewer}
WEB_PORT=${WEB_PORT:-3000}
ROOT_DIR="$(dirname "$0")"

if [[ -z "${VITE_SUPABASE_URL:-}" && -n "${SUPABASE_URL:-}" ]]; then
  export VITE_SUPABASE_URL="$SUPABASE_URL"
fi

if [[ -z "${VITE_SUPABASE_ANON_KEY:-}" && -n "${SUPABASE_ANON_KEY:-}" ]]; then
  export VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
fi

case $APP in
  viewer)
    cd "$ROOT_DIR"
    pnpm --filter @primoria/viewer-react exec vite --host 0.0.0.0 --port "$WEB_PORT"
    ;;
  *)
    echo "Usage: ./run.sh [viewer]"
    ;;
esac
