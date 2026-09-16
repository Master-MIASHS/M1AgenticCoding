#!/usr/bin/env bash
# pulls.sh — pull requests du repo (state=all).
# Usage: pulls.sh [owner/repo] [--login LOGIN] [--limit N]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: pulls.sh [owner/repo] [--login LOGIN] [--limit N]"
  echo "  PRs du repo (ouvertes, mergées, fermées). Sans --login: toutes les PRs."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
parse_repo_args "$@"
gh api "repos/$OWNER/$REPO/pulls?state=all&per_page=$LIMIT" \
  --jq ".[] | $(login_jq_filter '.user.login') | {number, title, state, head: .head.ref, created_at, merged_at}"
