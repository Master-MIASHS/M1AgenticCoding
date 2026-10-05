#!/usr/bin/env bash
# aggregate-issue-comments.sh — commentaires d'issues comptés par auteur.
# Usage: aggregate-issue-comments.sh [owner/repo] [--limit N]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: aggregate-issue-comments.sh [owner/repo] [--limit N]"
  echo "  Boucle sur toutes les issues (PRs exclues) et compte les commentaires par auteur."
  echo "  Repo par défaut: détecté depuis git remote origin. Vérifier rate-limit.sh avant si beaucoup d'issues."
}

require_gh
parse_repo_args "$@"
list=$(gh api "repos/$OWNER/$REPO/issues?state=all&per_page=$LIMIT" --jq '.[] | select(.pull_request == null) | .number')
for n in $list; do
  gh api "repos/$OWNER/$REPO/issues/$n/comments?per_page=100" --jq '.[].user.login' 2>/dev/null \
    || echo "(échec sur l'issue $n)" >&2
done | sort | uniq -c | sort -rn
