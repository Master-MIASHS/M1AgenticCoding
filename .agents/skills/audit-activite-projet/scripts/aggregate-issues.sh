#!/usr/bin/env bash
# aggregate-issues.sh — issues groupées par créateur (PRs exclues).
# Usage: aggregate-issues.sh [owner/repo] [--limit N]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: aggregate-issues.sh [owner/repo] [--limit N]"
  echo "  Nombre d'issues (PRs exclues) par créateur."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
parse_repo_args "$@"
gh api "repos/$OWNER/$REPO/issues?state=all&per_page=$LIMIT" \
  --jq '[.[] | select(.pull_request == null) | .user.login] | group_by(.) | map({user: .[0], count: length})'
