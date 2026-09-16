#!/usr/bin/env bash
# introspect.sh — introspection du schéma GraphQL (en cas d'erreur undefinedType/undefinedField).
# Usage: introspect.sh [TYPE]
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: introspect.sh [TYPE]"
  echo "  Types possibles de TYPE dans le schéma GraphQL. Défaut: ProjectV2ItemFieldValue."
}

require_gh
TYPE="ProjectV2ItemFieldValue"
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --type) TYPE="${2:?--type: valeur requise}"; shift 2 ;;
    --type=*) TYPE="${1#*=}"; shift ;;
    -*) echo "ERREUR: option inconnue: $1" >&2; usage; exit 1 ;;
    *) TYPE="$1"; shift ;;
  esac
done
gh api graphql -f query="query { __type(name: \"$TYPE\") { possibleTypes { name } } }"
