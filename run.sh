#!/bin/bash
# Load .env
set -a
source "$(dirname "$0")/.env"
set +a

APP=${1:-builder}

case $APP in
  builder)
    cd "$(dirname "$0")/Builder"
    flutter run -d chrome \
      --dart-define=SUPABASE_URL=$SUPABASE_URL \
      --dart-define=SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
    ;;
  viewer)
    cd "$(dirname "$0")/Viewer"
    flutter run -d chrome \
      --dart-define=SUPABASE_URL=$SUPABASE_URL \
      --dart-define=SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
    ;;
  *)
    echo "Usage: ./run.sh [builder|viewer]"
    ;;
esac
