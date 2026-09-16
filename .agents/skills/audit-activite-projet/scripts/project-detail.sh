#!/usr/bin/env bash
# project-detail.sh — détail des items des projets (GraphQL ProjectV2: assignees, colonnes, champs).
# Usage: project-detail.sh [owner]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: project-detail.sh [owner]"
  echo "  Détail GraphQL des items de projets: valeurs de champs, assignees d'issues, PRs."
  echo "  Owner par défaut: celui du repo courant (git remote origin)."
}

require_gh
parse_owner_args "$@"
gh api graphql \
  -f login="$OWNER" \
  -f query='query($login: String!) { user(login: $login) { projectsV2(first: 10) { nodes { number title items(first: 100) { nodes { ... on ProjectV2Item { fieldValues(first: 10) { nodes { ... on ProjectV2ItemFieldSingleSelectValue { name } ... on ProjectV2ItemFieldUserValue { users(first: 10) { nodes { login } } } ... on ProjectV2ItemFieldTextValue { text } } } content { ... on Issue { number title assignees(first: 20) { nodes { login } } } ... on PullRequest { number title } } } } } } } } }'
