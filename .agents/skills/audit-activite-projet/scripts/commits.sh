#!/usr/bin/env bash
# commits.sh — commits du repo côté GitHub (auteur lié à un compte).
# Usage: commits.sh [owner/repo] [--login LOGIN] [--limit N]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: commits.sh [owner/repo] [--login LOGIN] [--limit N]"
  echo "  Commits du repo côté GitHub. Sans --login: tous les commits."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
parse_repo_args "$@"
gh api "repos/$OWNER/$REPO/commits?per_page=$LIMIT" \
  --jq ".[] | $(login_jq_filter '.author.login') | {sha: .sha[0:7], date: .commit.author.date, msg: .commit.message}"
