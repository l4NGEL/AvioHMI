#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
java -cp "out;lib/postgresql.jar" avio.app.TelemetryServerApp
