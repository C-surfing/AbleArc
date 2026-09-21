#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
LOG_FILE="/tmp/ablearc-web.log"
PID_FILE="/tmp/ablearc-web.pid"

if curl -fsS http://127.0.0.1:3000 >/dev/null 2>&1; then
  echo "[AbleArc] Web is already running on port 3000."
  exit 0
fi

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(cat "$PID_FILE" || true)"
  if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "[AbleArc] Existing Web process is still starting (PID $old_pid)."
    exit 0
  fi
  rm -f "$PID_FILE"
fi

echo "[AbleArc] Starting Web on 0.0.0.0:3000..."
(
  cd "$ROOT/apps/workspace"
  nohup npm run dev -- --hostname 0.0.0.0 --port 3000 >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
)

for _ in $(seq 1 90); do
  if curl -fsS http://127.0.0.1:3000 >/dev/null 2>&1; then
    echo "[AbleArc] Web is ready: http://localhost:3000"
    exit 0
  fi
  sleep 1
done

echo "[AbleArc] Web did not become ready. Recent log:"
tail -n 80 "$LOG_FILE" || true
exit 1
