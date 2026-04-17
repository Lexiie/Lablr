#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
BASE_URL="${TEST_BASE_URL:-http://127.0.0.1:3000}"
DEV_PORT="$(node -e 'const u=new URL(process.argv[1]); console.log(u.port || (u.protocol === "https:" ? "443" : "80"));' "$BASE_URL")"

cleanup() {
  if [ -n "${DEV_PID:-}" ] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

cd "$ROOT_DIR"

pnpm dev --hostname 0.0.0.0 --port "$DEV_PORT" > testsprite_tests/dev-server.log 2>&1 &
DEV_PID=$!

echo "Waiting for dev server at $BASE_URL ..."
ATTEMPT=0
until curl -sSf "$BASE_URL/" >/dev/null 2>&1; do
  ATTEMPT=$((ATTEMPT + 1))
  if [ "$ATTEMPT" -ge 90 ]; then
    echo "Dev server failed to become ready in time."
    exit 1
  fi
  sleep 1
done

echo "Dev server ready. Running TestSprite suite..."
node testsprite_tests/run_testsuite.mjs

