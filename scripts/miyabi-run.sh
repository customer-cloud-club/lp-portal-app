#!/usr/bin/env bash
# Wrapper to run `npx miyabi` with thinking enabled and sane defaults.
# Usage: ./scripts/miyabi-run.sh [miyabi args...]

set -euo pipefail

# If ANTHROPIC_API_KEY isn't in the environment, try to load from .env
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -f .env ]; then
  export $(grep -E '^ANTHROPIC_API_KEY=' .env | xargs || true)
fi

# Ensure thinking-related env flags are set so Anthropic/Miyabi enable thinking
export THINKING="true"
export ANTHROPIC_ENABLE_THINKING="true"

# Forward all args to npx miyabi
if [ $# -eq 0 ]; then
  echo "Usage: $0 <miyabi-args...>"
  exit 2
fi

exec ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" npx miyabi "$@"
