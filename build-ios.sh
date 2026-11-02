#!/usr/bin/env bash
set -euo pipefail

# EAS needs an interactive Apple login (password + 2FA) on the first run.
# Run this in a real terminal, not as a background process.
PROFILE="${1:-preview}"

cd "$(dirname "$0")/pierrot-ios"

echo "Pierrot EAS iOS build"
echo "Project: @merkurov/pierrot-ios"
echo "Profile: ${PROFILE}"
echo

exec npx eas-cli@latest build --platform ios --profile "${PROFILE}"
