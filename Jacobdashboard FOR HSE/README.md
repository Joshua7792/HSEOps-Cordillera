# Jacob Dashboard

This repo keeps the dashboard app source shared, while launch/setup scripts are split by operating system.

## Folder layout

- `App Files/` - shared Python backend, React frontend, desktop launcher, and packaging files.
- `Windows/` - Windows setup and launch scripts.
- `Linux/` - Linux setup and launch scripts.
- `cert_tracker/` - workbook and certification tracker utilities.

## Windows

Use the scripts in `Windows/`:

```powershell
Windows\Setup-NewComputer.ps1
Windows\Start-LiveDashboard.ps1
```

The Windows Python environment lives at:

```text
Windows/.venv-windows/
```

## Linux

Use the scripts in `Linux/`:

```bash
./Linux/setup-linux.sh
./Linux/start-live-dashboard.sh
./Linux/start-desktop-dashboard.sh
```

The Linux Python environment lives at:

```text
Linux/.venv-linux/
```

The live dashboard opens at `http://127.0.0.1:5173/`.

## Import PDFs

- Windows: drag PDFs onto `cert_tracker/Import PDF.bat`.
- Linux: run `./Linux/install-import-pdf-launcher.sh`, then use the `Import PDF` launcher, or run `./cert_tracker/Import\ PDF.sh "path/to/file.pdf"`.
