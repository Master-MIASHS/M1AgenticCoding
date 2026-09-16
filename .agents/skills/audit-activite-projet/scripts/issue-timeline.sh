#!/usr/bin/env bash
# issue-timeline.sh — timeline d'une issue (assigned, mentioned, subscribed, ...).
# Usage: issue-timeline.sh [owner/repo] --number N [--login LOGIN]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: issue-timeline.sh [owner/repo] --number N [--login LOGIN]"
  echo "  Événements de la timeline d'une issue. --login optionnel = tous les acteurs."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
parse_repo_args "$@"
if [[ -z "$NUMBER" ]]; then
  echo "ERREUR: --number N (numéro de l'issue) est requis" >&2
  usage
  exit 1
fi
gh api "repos/$OWNER/$REPO/issues/$NUMBER/timeline?per_page=$LIMIT" \
  --jq ".[] | $(login_jq_filter '(.actor.login // "")') | {event, created_at}"
