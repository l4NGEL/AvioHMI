#!/usr/bin/env bash
# Builds the Cockpit MFD Linux desktop target inside a Linux container, since
# Flutter can't cross-compile the Linux target from Windows/macOS hosts.
# Output: build/linux/x64/release/bundle/cockpit_mfd (+ data/, lib/).
set -euo pipefail
cd "$(dirname "$0")"

MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd):/app" -w /app ghcr.io/cirruslabs/flutter:stable bash -c "
  apt-get update -qq && apt-get install -y -qq clang cmake ninja-build pkg-config libgtk-3-dev liblzma-dev &&
  flutter config --enable-linux-desktop &&
  flutter pub get &&
  flutter build linux --release
"
