#!/usr/bin/env bash
# rate-limit.sh — rate limit GitHub restant.
# Usage: rate-limit.sh
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

usage() {
  echo "Usage: rate-limit.sh"
  echo "  Rate limit restant (core, search, graphql). À vérifier avant une boucle longue."
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi
require_gh
gh api rate_limit --jq '.resources | {core: {limit, remaining}, search: {limit, remaining}, graphql: {limit, remaining}}'
