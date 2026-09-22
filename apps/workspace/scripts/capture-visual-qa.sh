#!/usr/bin/env bash
set -euo pipefail

export ABLEARC_VISUAL_QA=1
HOST="127.0.0.1"
PORT="3000"
BASE_URL="http://${HOST}:${PORT}"
OUTPUT_DIR="test-results/visual-qa"
LOG_FILE="/tmp/ablearc-visual-qa-next.log"

mkdir -p "${OUTPUT_DIR}"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "Installing Chromium for visual QA..."
npx --yes playwright@1.55.0 install --with-deps chromium

echo "Starting AbleArc production visual QA server..."
npm run start -- --hostname "${HOST}" --port "${PORT}" >"${LOG_FILE}" 2>&1 &
SERVER_PID=$!

ready=0
for _ in $(seq 1 90); do
  if curl -fsS "${BASE_URL}/visual-qa/entry" >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "${ready}" != "1" ]]; then
  echo "Visual QA server did not become ready."
  cat "${LOG_FILE}" || true
  exit 1
fi

surfaces=(
  entry
  today
  focus
  focus-support
  focus-scaffold
  focus-zh
  focus-pending
  focus-error
  focus-readonly
  paper
  reflection
  profile
  settings
  close
  workspace
  workspace-map
)

viewports=(
  "1440,900:desktop"
  "1280,800:compact"
  "390,844:mobile"
)

for viewport in "${viewports[@]}"; do
  size="${viewport%%:*}"
  label="${viewport##*:}"
  for surface in "${surfaces[@]}"; do
    target="${OUTPUT_DIR}/${label}--${surface}.png"
    echo "Capturing ${label} / ${surface}"
    npx --yes playwright@1.55.0 screenshot \
      --browser chromium \
      --full-page \
      --viewport-size="${size}" \
      --wait-for-timeout 350 \
      "${BASE_URL}/visual-qa/${surface}" \
      "${target}"
  done
done

cp "${LOG_FILE}" "${OUTPUT_DIR}/next-server.log"
echo "Captured visual QA artifacts in ${OUTPUT_DIR}"
