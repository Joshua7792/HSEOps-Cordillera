#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$ROOT_DIR/App Files"

# All Python dependencies are installed system-wide (pip3 install --break-system-packages)
# No venv required on this machine.
cd "$APP_DIR"
python3 launch_dashboard.py
