---
tags: [architecture, stack]
created: 2026-05-14
related: [[db-schema]], [[api-routes]]
---

# Stack Overview

## Backend

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI 0.115 |
| ORM | SQLAlchemy 2.0 (Mapped / mapped_column style) |
| Migrations | Alembic (render_as_batch=True for SQLite ALTER support) |
| Database | SQLite — `cert_tracker/cordillera.db` |
| Data parsing | openpyxl (Excel source), pdfplumber (Anejo 3 PDFs) |
| Runtime | Python 3.x, uvicorn[standard] |

**Dev port:** `8124`

**DB path resolution:** `database.py` is at `App Files/backend/app/database.py` → `parents[3]` = `jacobdashboard/` → `cert_tracker/cordillera.db`

## Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Routing | react-router-dom v6 |
| Charts | recharts |
| Icons | lucide-react |
| i18n | i18next |
| State | DashboardContext (useState → upgrading to react-query Phase 5) |

**Dev port:** `5173` (Vite dev server)

**Planned additions (Phase 4):** Tailwind CSS v3, Radix UI, Framer Motion 11, @tanstack/react-query, sonner, react-dropzone, clsx, tailwind-merge

## Desktop Mode

| Component | Technology |
|-----------|-----------|
| Wrapper | pywebview 5.2 |
| Packager | PyInstaller 6.11 |
| Qt backend | PyQt5 + PyQtWebEngine |

**Launch:** `python "App Files/launch_dashboard.py"` — spawns uvicorn on 8124, opens fullscreen pywebview window.

## CORS Config

Allowed origins (dev): `http://localhost:5173`, `http://127.0.0.1:5173`

## Key File Paths

```
jacobdashboard/
├── App Files/
│   ├── backend/
│   │   ├── alembic.ini
│   │   ├── requirements.txt
│   │   └── app/
│   │       ├── main.py          ← FastAPI app, startup event, migrate endpoints
│   │       ├── models.py        ← SQLAlchemy ORM (5 tables)
│   │       ├── database.py      ← engine, SessionLocal, get_db()
│   │       ├── api/
│   │       │   ├── excel.py     ← dashboard routes (same URLs as before)
│   │       │   ├── crud.py      ← TODO Phase 3
│   │       │   └── import_api.py← TODO Phase 3
│   │       └── services/
│   │           ├── excel_reader.py  ← original Excel parser + all dataclasses
│   │           ├── db_reader.py     ← SQLite → same dataclass output
│   │           └── migration.py     ← one-time Excel → SQLite import
│   └── frontend/
│       └── src/
│           ├── types.ts         ← TypeScript mirror of Python dataclasses
│           ├── context/DashboardContext.tsx
│           └── pages/           ← 6 existing pages
├── cert_tracker/
│   ├── cordillera.db            ← live SQLite DB
│   ├── Contractor Certifications Tracker.xlsx  ← migration source (retire after)
│   └── scripts/import_pdf.py   ← Anejo 3 parser
└── docs/superpowers/specs/2026-05-13-cordillera-db-redesign.md
```
