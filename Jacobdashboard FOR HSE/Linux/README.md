# Linux Scripts

Run these from the project root.

## First-time setup

```bash
./Linux/setup-linux.sh
```

This creates `Linux/.venv-linux/`, installs the Python backend packages, and installs the React frontend packages.

Scanned/image-only PDFs also need Ubuntu OCR packages:

```bash
sudo apt-get update && sudo apt-get install -y tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa
```

## Live dashboard

```bash
./Linux/start-live-dashboard.sh
```

This starts:

- Backend: `http://127.0.0.1:8124`
- Frontend: `http://127.0.0.1:5173`

Press `Ctrl+C` in the terminal to stop services started by this script.

## Desktop app

```bash
./Linux/start-desktop-dashboard.sh
```

This runs the Python desktop launcher in `App Files/launch_dashboard.py`.

## App launcher

```bash
./Linux/install-desktop-launcher.sh
```

This adds a Linux app-menu entry and a desktop shortcut that run the dashboard through the Linux environment.

## Import PDFs

```bash
./Linux/install-import-pdf-launcher.sh
```

This adds an `Import PDF` launcher for Linux. You can also run the importer directly:

```bash
./cert_tracker/Import\ PDF.sh "path/to/file.pdf"
```
