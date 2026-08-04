#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
# Optional local secrets (OpenSky OAuth2 client credentials, etc.) — gitignored, not required.
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi
java -cp "out;lib/postgresql.jar" avio.app.TelemetryServerApp
