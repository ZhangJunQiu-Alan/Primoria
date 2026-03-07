#!/bin/bash
# Load .env
set -a
source "$(dirname "$0")/.env"
set +a

APP=${1:-builder}

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
      --dart-define=SUPABASE_URL=$SUPABASE_URL \
      --dart-define=SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
      "${gemini_args[@]}"
    ;;
  viewer)
    cd "$(dirname "$0")/Viewer"
    flutter run -d chrome \
      --dart-define=SUPABASE_URL=$SUPABASE_URL \
      --dart-define=SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
      "${gemini_args[@]}"
    ;;
  *)
    echo "Usage: ./run.sh [builder|viewer]"
    ;;
esac
