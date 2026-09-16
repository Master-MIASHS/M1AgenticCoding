#!/usr/bin/env bash
# aggregate-pulls.sh — PRs groupées par créateur.
# Usage: aggregate-pulls.sh [owner/repo] [--limit N]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: aggregate-pulls.sh [owner/repo] [--limit N]"
  echo "  Nombre de PRs (state=all) par créateur."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
parse_repo_args "$@"
gh api "repos/$OWNER/$REPO/pulls?state=all&per_page=$LIMIT" \
  --jq '[.[].user.login] | group_by(.) | map({user: .[0], count: length})'
