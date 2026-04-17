#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

declare -a ALL_FUNCTIONS=()
while IFS= read -r function_dir; do
  function_name="$(basename "$function_dir")"
  if [[ "$function_name" != "_shared" ]]; then
    ALL_FUNCTIONS+=("$function_name")
  fi
done < <(find supabase/functions -mindepth 1 -maxdepth 1 -type d | sort)

selected_functions_text=""
deploy_all=0

if [[ "$#" -eq 0 ]]; then
  deploy_all=1
fi

for changed_path in "$@"; do
  case "$changed_path" in
    supabase/config.toml|supabase/functions/_shared/*)
      deploy_all=1
      ;;
    supabase/functions/*/*)
      function_name="${changed_path#supabase/functions/}"
      function_name="${function_name%%/*}"
      if [[ "$function_name" != "_shared" ]]; then
        selected_functions_text+="${function_name}"$'\n'
      fi
      ;;
  esac
done

declare -a FUNCTIONS_TO_DEPLOY=()
if [[ "$deploy_all" -eq 1 ]]; then
  FUNCTIONS_TO_DEPLOY=("${ALL_FUNCTIONS[@]}")
else
  while IFS= read -r function_name; do
    if [[ -z "$function_name" ]]; then
      continue
    fi
    FUNCTIONS_TO_DEPLOY+=("$function_name")
  done < <(printf '%s' "$selected_functions_text" | sort -u)
fi

if [[ "${#FUNCTIONS_TO_DEPLOY[@]}" -eq 0 ]]; then
  echo "No Supabase Edge Functions selected for deployment."
  exit 0
fi

echo "Deploying Supabase Edge Functions: ${FUNCTIONS_TO_DEPLOY[*]}"

for function_name in "${FUNCTIONS_TO_DEPLOY[@]}"; do
  declare -a deploy_args=("functions" "deploy" "$function_name")
  case "$function_name" in
    ai-generate-course-json|viewer-ai-quiz-from-docs)
      deploy_args+=("--no-verify-jwt")
      ;;
  esac

  if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
    deploy_args+=("--project-ref" "$SUPABASE_PROJECT_REF")
  fi

  echo "-> supabase ${deploy_args[*]}"
  supabase "${deploy_args[@]}"
done
