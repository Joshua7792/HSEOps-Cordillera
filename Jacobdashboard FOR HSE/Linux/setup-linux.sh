#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$ROOT_DIR/App Files"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
CERT_DIR="$ROOT_DIR/cert_tracker"
VENV_DIR="$SCRIPT_DIR/.venv-linux"

step() {
  printf '\n==> %s\n' "$1"
}

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

step "Checking Linux requirements"
need_command python3
need_command npm

python_version="$(python3 --version 2>&1)"
case "$python_version" in
  "Python 3.12."*) ;;
  *)
    printf 'Expected Python 3.12, found: %s\n' "$python_version" >&2
    printf 'Install Python 3.12, then rerun this script.\n' >&2
    exit 1
    ;;
esac

step "Creating Linux Python environment"
if [ ! -x "$VENV_DIR/bin/python" ]; then
  python3 -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install -r "$BACKEND_DIR/requirements.txt"
"$VENV_DIR/bin/python" -m pip install -r "$CERT_DIR/requirements.txt"

if ! command -v tesseract >/dev/null 2>&1; then
  printf '\n[!] Scanned PDF OCR needs the Ubuntu tesseract packages.\n' >&2
  printf '    Run this once in a terminal:\n' >&2
  printf '    sudo apt-get update && sudo apt-get install -y tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa\n' >&2
fi

step "Installing frontend packages"
cd "$FRONTEND_DIR"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

step "Linux setup complete"
printf 'Live dashboard: %s\n' "$ROOT_DIR/Linux/start-live-dashboard.sh"
printf 'Desktop app:    %s\n' "$ROOT_DIR/Linux/start-desktop-dashboard.sh"
