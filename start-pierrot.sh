#!/usr/bin/env bash
set -euo pipefail

# Always start Expo from the app directory that contains package.json.
cd "$(dirname "$0")/pierrot-ios"

echo "Starting Pierrot Expo server from: $(pwd)"
echo "Open the printed tunnel URL in Expo Go on the iPad."
echo

exec npx expo start --tunnel ngrok
