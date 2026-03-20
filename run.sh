#!/bin/bash
# Load .env if present
if [ -f "$(dirname "$0")/.env" ]; then
  set -a
  source "$(dirname "$0")/.env"
  set +a
fi

APP=${1:-builder}
WEB_PORT=${WEB_PORT:-3000}
ROOT_DIR="$(dirname "$0")"

if [[ -z "${VITE_SUPABASE_URL:-}" && -n "${SUPABASE_URL:-}" ]]; then
  export VITE_SUPABASE_URL="$SUPABASE_URL"
fi

if [[ -z "${VITE_SUPABASE_ANON_KEY:-}" && -n "${SUPABASE_ANON_KEY:-}" ]]; then
  export VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
fi

supabase_args=()
if [[ -n "${SUPABASE_URL:-}" ]]; then
  supabase_args+=(--dart-define=SUPABASE_URL="$SUPABASE_URL")
fi
if [[ -n "${SUPABASE_ANON_KEY:-}" ]]; then
  supabase_args+=(--dart-define=SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY")
fi

gemini_args=()
if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  gemini_args+=(--dart-define=GEMINI_API_KEY="$GEMINI_API_KEY")
fi
if [[ -n "${GEMINI_MODEL:-}" ]]; then
  gemini_args+=(--dart-define=GEMINI_MODEL="$GEMINI_MODEL")
fi

case $APP in
  builder)
    cd "$ROOT_DIR"
    pnpm --filter @primoria/builder dev -- --host 0.0.0.0 --port "$WEB_PORT"
    ;;
  viewer)
    cd "$ROOT_DIR/Viewer"
    flutter run -d chrome \
      --web-port "$WEB_PORT" \
      "${supabase_args[@]}" \
      "${gemini_args[@]}"
    ;;
  *)
    echo "Usage: ./run.sh [builder|viewer]"
    ;;
esac
