#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ICON="$SCRIPT_DIR/icons/dashboard.png"
LAUNCHER="$HOME/.local/share/applications/jacob-workforce-dashboard.desktop"
DESKTOP_COPY="$HOME/Desktop/Jacob Workforce Dashboard.desktop"

mkdir -p "$(dirname "$LAUNCHER")"

cat >"$LAUNCHER" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Jacob Workforce Dashboard
Comment=Open the Jacob Workforce Dashboard desktop app
Exec=$SCRIPT_DIR/start-desktop-dashboard.sh
Path=$ROOT_DIR
Icon=$ICON
Terminal=false
Categories=Office;Development;
StartupNotify=true
DESKTOP

chmod +x "$LAUNCHER"

if [ -d "$HOME/Desktop" ]; then
  cp "$LAUNCHER" "$DESKTOP_COPY"
  chmod +x "$DESKTOP_COPY"
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
fi

printf 'Installed app launcher:\n'
printf '  %s\n' "$LAUNCHER"
if [ -f "$DESKTOP_COPY" ]; then
  printf 'Desktop shortcut:\n'
  printf '  %s\n' "$DESKTOP_COPY"
fi
printf '\nIf the desktop shortcut is blocked, right-click it and choose Allow Launching.\n'
