#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$ROOT_DIR/App Files"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
VENV_PYTHON="$SCRIPT_DIR/.venv-linux/bin/python"
SETUP_SCRIPT="$SCRIPT_DIR/setup-linux.sh"
LIVE_URL="http://127.0.0.1:5173/"
LOG_DIR="$SCRIPT_DIR/logs"
BACKEND_LOG="$LOG_DIR/backend-dev.log"
BACKEND_ERR="$LOG_DIR/backend-dev.err.log"
FRONTEND_LOG="$LOG_DIR/frontend-dev.log"
FRONTEND_ERR="$LOG_DIR/frontend-dev.err.log"

port_listening() {
  "$VENV_PYTHON" - "$1" <<'PY'
import socket
import sys

port = int(sys.argv[1])
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sock.settimeout(0.3)
    raise SystemExit(0 if sock.connect_ex(("127.0.0.1", port)) == 0 else 1)
PY
}

ensure_dependencies() {
  if [ ! -x "$VENV_PYTHON" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    "$SETUP_SCRIPT"
  fi
}

open_browser() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$LIVE_URL" >/dev/null 2>&1 || true
  fi
}

backend_pid=""
frontend_pid=""

kill_process_tree() {
  local pid="$1"
  local child

  if ! kill -0 "$pid" >/dev/null 2>&1; then
    return
  fi

  while read -r child; do
    if [ -n "$child" ]; then
      kill_process_tree "$child"
    fi
  done < <(pgrep -P "$pid" 2>/dev/null || true)

  kill "$pid" >/dev/null 2>&1 || true
}

cleanup() {
  if [ -n "$frontend_pid" ]; then
    kill_process_tree "$frontend_pid"
  fi
  if [ -n "$backend_pid" ]; then
    kill_process_tree "$backend_pid"
  fi
}
trap cleanup EXIT INT TERM

ensure_dependencies
mkdir -p "$LOG_DIR"

printf '\nStarting live dashboard workflow...\n\n'

if port_listening 8124; then
  printf 'Backend is already running on http://127.0.0.1:8124\n'
else
  cd "$BACKEND_DIR"
  "$VENV_PYTHON" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8124 >"$BACKEND_LOG" 2>"$BACKEND_ERR" &
  backend_pid="$!"
  printf 'Backend live reload started on http://127.0.0.1:8124\n'
fi

if port_listening 5173; then
  printf 'Frontend is already running on %s\n' "$LIVE_URL"
else
  cd "$FRONTEND_DIR"
  npm run dev -- --host 127.0.0.1 >"$FRONTEND_LOG" 2>"$FRONTEND_ERR" &
  frontend_pid="$!"
  printf 'Frontend hot reload started on %s\n' "$LIVE_URL"
fi

sleep 2
open_browser

printf '\nUse the browser at %s while editing the app.\n' "$LIVE_URL"
printf 'Logs:\n'
printf '  %s\n' "$BACKEND_LOG"
printf '  %s\n' "$FRONTEND_LOG"
printf '\nPress Ctrl+C in this terminal to stop services started by this script.\n'

wait
