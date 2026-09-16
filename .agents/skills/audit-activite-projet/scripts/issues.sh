#!/usr/bin/env bash
# issues.sh — issues du repo (les PRs sont exclues).
# Usage: issues.sh [owner/repo] [--login LOGIN] [--limit N]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: issues.sh [owner/repo] [--login LOGIN] [--limit N]"
  echo "  Issues du repo (state=all), PRs exclues (filtre .pull_request == null)."
  echo "  Sans --login: toutes les issues."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
parse_repo_args "$@"
gh api "repos/$OWNER/$REPO/issues?state=all&per_page=$LIMIT" \
  --jq ".[] | select(.pull_request == null) | $(login_jq_filter '.user.login') | {number, title, state, created_at}"
