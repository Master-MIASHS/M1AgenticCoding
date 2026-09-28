#!/usr/bin/env bash
# pr-comments.sh — commentaires de revue d'une PR.
# Usage: pr-comments.sh [owner/repo] --number N [--login LOGIN]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: pr-comments.sh [owner/repo] --number N [--login LOGIN]"
  echo "  Commentaires de revue (code review) d'une PR. --login optionnel = tous."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
parse_repo_args "$@"
if [[ -z "$NUMBER" ]]; then
  echo "ERREUR: --number N (numéro de la PR) est requis" >&2
  usage
  exit 1
fi
gh api "repos/$OWNER/$REPO/pulls/$NUMBER/comments?per_page=$LIMIT" \
  --jq ".[] | $(login_jq_filter '.user.login') | {date: .created_at, body: .body[0:200]}"
