#!/usr/bin/env bash
# ci-runs.sh — runs CI (GitHub Actions) du repo.
# Usage: ci-runs.sh [owner/repo] [--login LOGIN] [--limit N]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: ci-runs.sh [owner/repo] [--login LOGIN] [--limit N]"
  echo "  Runs CI du repo. Sans --login: tous les runs (filtre sur .actor.login)."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
parse_repo_args "$@"
gh api "repos/$OWNER/$REPO/actions/runs?per_page=$LIMIT" \
  --jq ".workflow_runs[] | $(login_jq_filter '.actor.login') | {event, status, conclusion, head: .head_sha[0:7], created_at}"
