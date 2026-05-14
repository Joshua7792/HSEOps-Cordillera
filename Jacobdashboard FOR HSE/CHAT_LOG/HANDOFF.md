# Project Handoff

Last updated: May 14, 2026

Authoritative status snapshot for the next coding session.

---

## Current Goal — DONE ✓

All 7 phases are complete. The dashboard is a fully redesigned, dark-theme "HSE Command Center" backed by SQLite.

---

## Repo Layout

```text
jacobdashboard/
├─ App Files/
│  ├─ launch_dashboard.py
│  ├─ build_desktop.py
│  ├─ JacobWorkforceDashboard.spec
│  ├─ backend/
│  │  ├─ alembic.ini
│  │  ├─ requirements.txt           ← sqlalchemy, alembic, python-multipart, pdfplumber
│  │  ├─ alembic/
│  │  │  ├─ env.py
│  │  │  ├─ script.py.mako
│  │  │  └─ versions/001_initial_schema.py
│  │  └─ app/
│  │     ├─ main.py                 ← startup: alembic + migration; registers all routers
│  │     ├─ models.py               ← SQLAlchemy ORM (5 tables)
│  │     ├─ database.py             ← engine, SessionLocal, get_db()
│  │     ├─ api/
│  │     │  ├─ excel.py             ← /api/excel/* using db_reader
│  │     │  ├─ crud.py              ← ✓ Phase 3: PUT/DELETE workers, contractors, certs, cert_entries
│  │     │  └─ import_api.py        ← ✓ Phase 3: POST /api/import/pdf, GET history/batch
│  │     └─ services/
│  │        ├─ excel_reader.py      ← unchanged (used by migration.py)
│  │        ├─ db_reader.py         ← SQLite → dataclass output
│  │        ├─ migration.py         ← one-time Excel → SQLite import
│  │        └─ workbook_sync.py     ← DELETED
│  └─ frontend/
│     ├─ tailwind.config.js         ← ✓ Phase 4: design tokens
│     ├─ postcss.config.js
│     └─ src/
│        ├─ App.tsx                 ← QueryClientProvider + CommandPalette + routes
│        ├─ App.css                 ← dark overrides for legacy heatmap CSS
│        ├─ index.css               ← Tailwind directives + CSS vars
│        ├─ lib/cn.ts               ← twMerge(clsx(...))
│        ├─ api.ts                  ← all CRUD + import fetch calls
│        ├─ types.ts                ← ImportBatch type added
│        ├─ components/
│        │  ├─ ShellLayout.tsx      ← ✓ Phase 4: dark sidebar, amber accent
│        │  ├─ KPIStrip.tsx         ← ✓ Phase 4: AnimatedCounter + ComplianceRing
│        │  ├─ PageShell.tsx        ← ✓ Phase 4: Tailwind loading/error/header
│        │  ├─ AnimatedCounter.tsx  ← ✓ Phase 4: framer-motion animate()
│        │  ├─ ComplianceRing.tsx   ← ✓ Phase 4: SVG arc gauge
│        │  ├─ CommandPalette.tsx   ← ✓ Phase 6: Cmd/Ctrl+K Radix Dialog palette
│        │  └─ StatusPill.tsx       ← unchanged
│        ├─ pages/
│        │  ├─ OverviewPage.tsx     ← ✓ Phase 5: full Tailwind redesign
│        │  ├─ WorkersPage.tsx      ← ✓ Phase 5: Tailwind table + ComplianceRing
│        │  ├─ ContractorsPage.tsx  ← ✓ Phase 5: Tailwind card grid
│        │  ├─ ActionsPage.tsx      ← ✓ Phase 5: Tailwind table + chips
│        │  ├─ HeatmapPage.tsx      ← ✓ Phase 5: outer Tailwind, inner grid CSS kept
│        │  ├─ CertificationsPage.tsx ← ✓ Phase 5: Tailwind tables
│        │  ├─ ImportPage.tsx       ← ✓ Phase 6: react-dropzone + history
│        │  └─ SettingsPage.tsx     ← ✓ Phase 6: DB info + migration controls
│        └─ context/
│           ├─ DashboardContext.tsx
│           └─ ThemeContext.tsx
├─ cert_tracker/
│  ├─ Contractor Certifications Tracker.xlsx
│  ├─ cordillera.db                ← live SQLite (46 workers, 3 contractors, 30 certs, 408 entries)
│  └─ scripts/
│     ├─ import_pdf.py             ← Anejo 3 PDF parser (unchanged)
│     └─ ...
├─ notes/                          ← Obsidian vault (11 notes, open jacobdashboard/ in Obsidian)
├─ .gitignore                      ← ✓ Phase 7
└─ CHAT_LOG/
   └─ HANDOFF.md                   ← you are here
```

---

## How to Run

```bash
# Backend
cd "App Files/backend"
pip install -r requirements.txt
uvicorn app.main:app --port 8124
# Startup auto-runs alembic + migration check

# Frontend (dev)
cd "App Files/frontend"
npm install
npm run dev       # http://localhost:5173

# Frontend (prod build)
npm run build     # → dist/ (zero TS errors confirmed)
```

**Key API endpoints:**
```
GET  /api/excel/dashboard       → full dashboard JSON
GET  /api/health
GET  /api/migrate/status
POST /api/migrate/from-excel
PUT  /api/workers/{id}
DELETE /api/workers/{id}
POST /api/contractors
PUT  /api/contractors/{id}
DELETE /api/contractors/{id}
POST /api/certs
PUT  /api/certs/{id}
DELETE /api/certs/{id}
PUT  /api/cert-entries/{id}
DELETE /api/cert-entries/{id}
POST /api/import/pdf            → multipart UploadFile
GET  /api/import/history
GET  /api/import/{id}
```

---

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Backend: SQLite DB layer | ✓ Done |
| 2 | Backend: Excel → SQLite migration | ✓ Done |
| 3 | Backend: CRUD + PDF import API | ✓ Done |
| 4 | Frontend: Design system (Tailwind/Radix/Framer) | ✓ Done |
| 5 | Frontend: 6 pages redesigned with Tailwind | ✓ Done |
| 6 | Frontend: ImportPage, SettingsPage, CommandPalette | ✓ Done |
| 7 | Polish: .gitignore, empty DB state, HANDOFF sync | ✓ Done |

---

## Architecture Notes

**Status logic (cert renewal = 1-year anniversary of completion date):**
- GREEN: >60 days remaining
- YELLOW: 31–60 days remaining
- ORANGE: ≤30 days (urgent)
- RED: past anniversary (overdue)
- BLANK: no date

**Dataclass contract:** `db_reader.py` imports aggregation helpers from `excel_reader.py` (private `_classify`, `_aggregate_*`, etc.) so the frontend JSON shape is identical to the old Excel-based API. No frontend breaking changes.

**PDF adapter pattern:** `import_api.py` calls `extract_pdf_data()` directly (not `import_pdf()` which writes to Excel), then `write_to_db()` writes to SQLAlchemy. 100% of parsing logic preserved.

**HeatmapPage:** The inner grid layout uses CSS variables (`--cert-count`) and grid-area rules in `App.css`. Only the outer `<section>` card is Tailwind — the `excel-heatmap-*` classes are kept as-is.

**CommandPalette:** Cmd/Ctrl+K opens a Radix Dialog with fuzzy search over nav pages, workers, and contractors. Arrow keys navigate, Enter selects, Escape closes.

---

## Known Issues

1. **Semgrep hook** fires on every Write/Edit with "No SEMGREP_APP_TOKEN". Files write correctly. To silence: disable the Semgrep plugin in Claude Code Settings → Extensions/Plugins.
2. **Bundle size warning:** Recharts + Framer Motion push the main chunk to ~944 kB (286 kB gzip). Performance is fine for a local app; could be code-split if needed.
3. **No caching in db_reader:** `get_dashboard()` queries SQLite on every request. Fine for 46 workers (~10ms), no action needed.
