#!/usr/bin/env bash
# issue-comments.sh — commentaires d'une issue.
# Usage: issue-comments.sh [owner/repo] --number N [--login LOGIN]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: issue-comments.sh [owner/repo] --number N [--login LOGIN]"
  echo "  Commentaires d'une issue. --login optionnel = tous."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
parse_repo_args "$@"
if [[ -z "$NUMBER" ]]; then
  echo "ERREUR: --number N (numéro de l'issue) est requis" >&2
  usage
  exit 1
fi
gh api "repos/$OWNER/$REPO/issues/$NUMBER/comments?per_page=$LIMIT" \
  --jq ".[] | $(login_jq_filter '.user.login') | {date: .created_at, body: .body[0:200]}"
