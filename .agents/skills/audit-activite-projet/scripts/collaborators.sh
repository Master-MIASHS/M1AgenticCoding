#!/usr/bin/env bash
# collaborators.sh — logins des collaborateurs du repo.
# Usage: collaborators.sh [owner/repo] [--limit N]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: collaborators.sh [owner/repo] [--limit N]"
  echo "  Logins des collaborateurs (population pour l'audit global)."
  echo "  Repo par défaut: détecté depuis git remote origin."
}

require_gh
parse_repo_args "$@"
gh api "repos/$OWNER/$REPO/collaborators?per_page=$LIMIT" --jq '.[].login'
