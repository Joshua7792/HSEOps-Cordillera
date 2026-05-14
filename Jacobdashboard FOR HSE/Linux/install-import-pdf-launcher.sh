#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
CERT_DIR="$ROOT_DIR/cert_tracker"
IMPORT_SCRIPT="$CERT_DIR/Import PDF.sh"
ICON="$SCRIPT_DIR/icons/import-pdf.png"
LAUNCHER="$HOME/.local/share/applications/jacob-import-pdf.desktop"
DESKTOP_COPY="$HOME/Desktop/Import PDF.desktop"

mkdir -p "$(dirname "$LAUNCHER")"

cat >"$LAUNCHER" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Import PDF
Comment=Import certification PDFs into the Contractor Certifications Tracker
Exec="$IMPORT_SCRIPT" %F
Path=$CERT_DIR
Icon=$ICON
Terminal=true
MimeType=application/pdf;
Categories=Office;
StartupNotify=true
DESKTOP

chmod +x "$LAUNCHER"

if [ -d "$HOME/Desktop" ]; then
  cp "$LAUNCHER" "$DESKTOP_COPY"
  chmod +x "$DESKTOP_COPY"
  gio set "$DESKTOP_COPY" metadata::trusted true >/dev/null 2>&1 || true
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
fi

printf 'Installed Import PDF launcher:\n'
printf '  %s\n' "$LAUNCHER"
if [ -f "$DESKTOP_COPY" ]; then
  printf 'Desktop shortcut:\n'
  printf '  %s\n' "$DESKTOP_COPY"
fi
printf '\nYou can use it from the app menu, the desktop, or a PDF file Open With menu.\n'
printf 'If the desktop shortcut is blocked, right-click it and choose Allow Launching.\n'
