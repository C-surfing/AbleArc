#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT/apps/workspace"

echo "[AbleArc] Installing Web dependencies..."
npm install --no-audit --no-fund

echo "[AbleArc] Verifying local learning runtime..."
cd "$ROOT"
python tools/learning.py doctor

echo "[AbleArc] Codespace setup complete."
