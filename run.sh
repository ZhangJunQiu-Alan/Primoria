#!/bin/bash
# Load .env if present
if [ -f "$(dirname "$0")/.env" ]; then
  set -a
  source "$(dirname "$0")/.env"
  set +a
fi

APP=${1:-builder}
WEB_PORT=${WEB_PORT:-3000}

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
    cd "$(dirname "$0")/Builder"
    flutter run -d chrome \
      --web-port "$WEB_PORT" \
      "${supabase_args[@]}" \
      "${gemini_args[@]}"
    ;;
  viewer)
    cd "$(dirname "$0")/Viewer"
    flutter run -d chrome \
      --web-port "$WEB_PORT" \
      "${supabase_args[@]}" \
      "${gemini_args[@]}"
    ;;
  *)
    echo "Usage: ./run.sh [builder|viewer]"
    ;;
esac
