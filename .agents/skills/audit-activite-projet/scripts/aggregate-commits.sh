#!/usr/bin/env bash
# aggregate-commits.sh — commits groupés par auteur.
# Usage: aggregate-commits.sh [owner/repo] [--limit N]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: aggregate-commits.sh [owner/repo] [--limit N]"
  echo "  Nombre de commits par auteur. Les auteurs non liés à un compte sortent sous leur email."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
parse_repo_args "$@"
gh api "repos/$OWNER/$REPO/commits?per_page=$LIMIT" \
  --jq '[.[] | (.author.login // ("non-lié: " + .commit.author.email))] | group_by(.) | map({user: .[0], count: length})'
