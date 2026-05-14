# Cordillera Control — Database Redesign & UI Overhaul
**Date:** 2026-05-13  
**Status:** Approved for implementation  
**Scope:** `jacobdashboard/App Files/` + `jacobdashboard/cert_tracker/`

---

## 1. Goal

Replace the Excel workbook as the application's data store with a SQLite database managed by SQLAlchemy. Surface a PDF import UI inside the app so the complete workflow — import Anejo 3 PDFs, review warnings, edit records, monitor compliance — happens in one place without touching Excel, the terminal, or a .bat/.sh script.

Simultaneously deliver a ground-up UI redesign: a dark command-center aesthetic with live animated data, a warning system, CRUD modals on every record type, and a dedicated Import page with drag-and-drop.

---

## 2. Constraints

- **Linux/ and Windows/ launch scripts are untouched.** They still call uvicorn the same way. The backend just connects to SQLite instead of reading .xlsx.
- **The existing API response shapes do not change.** The frontend TypeScript types (`types.ts`) remain valid. No breaking changes to `/api/excel/*` endpoints — same URLs, same JSON.
- **`import_pdf.py` parsing logic is preserved exactly.** The Spanish-locale date parsing, name normalization, fuzzy contractor matching, and Anejo 3 field extraction do not change. Only the output target changes: SQLite instead of openpyxl writes.
- **Single user, single machine.** SQLite file lives at `jacobdashboard/cert_tracker/cordillera.db`. No authentication, no multi-tenancy.
- **One-time migration on first launch.** The real workbook (`Contractor Certifications Tracker.xlsx`) is read once, all data written to SQLite, then the app never touches the .xlsx again.
- **Demo workbook is deleted.** `Contractor Certifications Tracker Demo.xlsx` is removed.

---

## 3. Database Schema

### 3.1 SQLAlchemy Models (`App Files/backend/app/models.py`)

```python
class Contractor(Base):
    __tablename__ = "contractors"
    id: int (PK, autoincrement)
    name: str (unique, not null)
    primary_contact: str | None
    specialty: str | None
    notes: str | None
    created_at: datetime (default utcnow)
    updated_at: datetime (onupdate utcnow)

class Worker(Base):
    __tablename__ = "workers"
    id: int (PK, autoincrement)
    name: str (not null)
    contractor_id: int (FK → contractors.id, SET NULL on delete)
    job_title: str | None
    status: str (default 'active')  # active | inactive | onboarding
    employee_code: str | None
    hire_date: date | None
    email: str | None
    phone: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    # UNIQUE(name, contractor_id)

class Cert(Base):
    __tablename__ = "certs"
    id: int (PK, autoincrement)
    name: str (unique, not null)
    category: str (default 'Uncategorized')
    validity_years: int (default 1)
    notes: str | None

class CertEntry(Base):
    __tablename__ = "cert_entries"
    id: int (PK, autoincrement)
    worker_id: int (FK → workers.id, CASCADE delete)
    cert_id: int (FK → certs.id, CASCADE delete)
    completed_on: date (not null)
    source: str (default 'manual')  # pdf_import | manual | excel_migration
    import_batch_id: int | None (FK → import_batches.id, SET NULL)
    created_at: datetime
    updated_at: datetime
    # UNIQUE(worker_id, cert_id) — one entry per worker+cert pair

class ImportBatch(Base):
    __tablename__ = "import_batches"
    id: int (PK, autoincrement)
    filename: str
    batch_type: str (default 'pdf_import')  # pdf_import | excel_migration
    imported_at: datetime
    status: str  # success | partial | failed
    warnings: JSON  # list[str]
    records_added: int (default 0)
    records_updated: int (default 0)
    records_skipped: int (default 0)
    acknowledged_at: datetime | None  # set when user reviews warnings
```

### 3.2 Database file location
`jacobdashboard/cert_tracker/cordillera.db`

The `excel.py` router already resolves paths relative to its own location (`parents[4]/cert_tracker`). The DB file goes in the same directory.

### 3.3 Migrations
Alembic is used for schema versioning. `alembic.ini` and `alembic/` live in `App Files/backend/`. `main.py` calls `alembic.command.upgrade(cfg, "head")` programmatically at startup — this creates the DB on a fresh machine and applies any future schema changes. The launch scripts are not modified.

---

## 4. Backend Changes

### 4.1 Files added
| File | Purpose |
|------|---------|
| `backend/app/models.py` | SQLAlchemy ORM models |
| `backend/app/database.py` | Engine, SessionLocal, Base, `get_db()` dependency |
| `backend/app/services/db_reader.py` | New primary reader. Reads from SQLite, returns identical `ParsedWorkbook`-equivalent data structures so API routes need no changes |
| `backend/app/services/migration.py` | One-time Excel → SQLite importer. Calls `excel_reader.read_workbook()` directly (kept as-is), writes all records to DB |
| `backend/app/api/crud.py` | CRUD endpoints for workers, contractors, certs, cert_entries |
| `backend/app/api/import_api.py` | `POST /api/import/pdf` — receives file upload, calls adapted import_pdf logic, returns batch summary |
| `backend/alembic/` | Alembic migration directory |
| `backend/alembic.ini` | Alembic config pointing at `cordillera.db` |

### 4.2 Files modified
| File | Change |
|------|--------|
| `backend/app/api/excel.py` | Swap `excel_reader.WorkbookCache` for `db_reader` queries. Same routes, same response shapes. Remove `workbook_sync` import. |
| `backend/app/main.py` | Add `crud` and `import_api` routers. Call `alembic upgrade head` + migration check on startup. |
| `backend/requirements.txt` | Add: `sqlalchemy>=2.0`, `alembic`, `python-multipart` (for file upload). Keep `openpyxl` for migration. |

### 4.3 Files removed
| File | Reason |
|------|--------|
| `backend/app/services/workbook_sync.py` | No longer needed — DB handles structure |
| `cert_tracker/Contractor Certifications Tracker Demo.xlsx` | Explicitly dropped per user instruction |

### 4.4 cert_tracker/scripts/import_pdf.py
The parser's extraction logic is preserved 100%. A new adapter function `write_to_db(parsed_data, session) -> BatchResult` is added at the bottom of the file (or in `import_api.py`). The `.bat`/`.sh` wrappers that called this script directly still work — they now write to SQLite instead of .xlsx.

---

## 5. API Endpoints

### 5.1 Existing endpoints (unchanged URL, same JSON shape)
```
GET  /api/excel/dashboard       — full payload (reads DB now)
GET  /api/excel/contractors     — contractor list
GET  /api/excel/workers         — worker list
GET  /api/excel/workers/{name}  — single worker by name
GET  /api/excel/certifications  — cert catalog
GET  /api/excel/health          — DB path + record counts
POST /api/excel/refresh         — no-op (data always fresh); returns current KPIs
```

### 5.2 New CRUD endpoints
```
PUT    /api/workers/{id}          — edit worker fields
DELETE /api/workers/{id}          — soft-delete (status → inactive) or hard delete
POST   /api/contractors           — create contractor
PUT    /api/contractors/{id}      — edit contractor fields
DELETE /api/contractors/{id}      — delete (blocked if has active workers)
POST   /api/certs                 — create cert type
PUT    /api/certs/{id}            — edit cert name/category/validity
DELETE /api/certs/{id}            — delete cert (removes all CertEntries for it)
PUT    /api/cert-entries/{id}     — fix a specific date, change source
DELETE /api/cert-entries/{id}     — remove one cert entry
```

### 5.3 Import endpoints
```
POST /api/import/pdf              — multipart upload, returns ImportBatch JSON
GET  /api/import/history          — list of ImportBatch records, newest first
GET  /api/import/{batch_id}       — single batch with full warning list
```

### 5.4 Migration endpoint
```
GET  /api/migrate/status          — { migrated: bool, record_counts: {...} }
POST /api/migrate/from-excel      — trigger one-time migration (idempotent)
```

---

## 6. One-Time Migration Flow

1. On app startup (`main.py`), after Alembic runs:
   - Check `ImportBatch` for any record with `batch_type = 'excel_migration'`
   - If none exists AND the real `.xlsx` file exists → run migration automatically
   - If already migrated → skip silently (idempotent)
2. `migration.py` reads the workbook with `openpyxl` (same logic as current `excel_reader.py`)
3. Writes all Contractors, Workers, Certs, and CertEntries to SQLite with `source='excel_migration'`
4. Creates one `ImportBatch` record flagged as the migration batch
5. Any parse issues are stored in the batch's `warnings` JSON field and surfaced on the Import page

---

## 7. Frontend — UI Design System

### 7.1 Philosophy: HSE Command Center
This is not a general-purpose dashboard — it's a safety compliance control room. The design reflects that:
- **Dark-first** — deep navy/slate background, not black. Easier on eyes in site office lighting.
- **Status-driven color** — the accent tint across the app shifts subtly based on overall compliance: green-tinted when healthy, amber when warnings exist, red-tinted when urgent items are unaddressed.
- **Density over decoration** — no wasted whitespace. Every pixel of screen space shows data.
- **Immediate feedback** — every action (import, edit, delete) produces a toast and the data updates in place without a page reload.
- **Keyboard-first navigation** — Cmd/Ctrl+K opens a command palette for jumping between pages, searching workers/contractors, and triggering imports.

### 7.2 New dependencies (npm)
```json
"@radix-ui/react-dialog": "^1.1",
"@radix-ui/react-dropdown-menu": "^2.1",
"@radix-ui/react-tooltip": "^1.1",
"@radix-ui/react-progress": "^1.1",
"@radix-ui/react-alert-dialog": "^1.1",
"@radix-ui/react-tabs": "^1.1",
"@radix-ui/react-select": "^2.1",
"framer-motion": "^11",
"sonner": "^1.5",
"react-dropzone": "^14",
"@tanstack/react-query": "^5",
"clsx": "^2",
"tailwind-merge": "^2"
```
Tailwind CSS replaces the existing `.css` files entirely.

### 7.3 Design tokens
```css
--bg-base:     #0d1117   /* page background — GitHub dark, not pure black */
--bg-surface:  #161b22   /* card background */
--bg-surface2: #21262d   /* elevated card / modal */
--bg-border:   #30363d   /* borders, dividers */
--accent:      #f59e0b   /* Cordillera amber — safety color */
--accent-dim:  #92400e
--text-primary: #e6edf3
--text-secondary: #8b949e
--status-green:  #22c55e
--status-yellow: #eab308
--status-orange: #f97316
--status-red:    #ef4444
--status-blank:  #334155
```

### 7.4 Shell layout
```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px, collapsible to 60px icon-only)             │
│  ┌──────┐  Logo + "Cordillera Control"                      │
│  │ Icon │  [⌘K] Search workers, certs, contractors          │
│  │ Nav  │  ─────────────────────────────                    │
│  │ Items│  📊 Overview                                       │
│  │      │  🚨 Action Center  [badge: urgent count]          │
│  │      │  🏢 Contractors                                    │
│  │      │  👷 Workforce                                      │
│  │      │  🎓 Cert Coverage                                  │
│  │      │  🗺  Heatmap                                       │
│  │      │  ─────────────────────────────                     │
│  │      │  📂 Import PDF  [badge: warning count]            │
│  │      │  ─────────────────────────────                     │
│  │      │  ⚙️  Settings                                      │
│  └──────┘                                                    │
│  CONTENT AREA (fills remainder)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Page header: eyebrow + title + actions              │   │
│  │ Content with smooth Framer Motion page transitions  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 7.5 KPI Strip (Overview)
Four animated cards. Numbers count up on load via Framer Motion. Each card has:
- Large number with animation
- Subtitle line
- Mini sparkline or circular progress ring
- Color tint matching status (red card = red-tinted background, not just text color)

### 7.6 Compliance ring (Overview hero)
A large circular SVG gauge (not a pie chart) showing overall compliance percentage. The ring animates from 0 to the value on load. The number inside pulses gently if there are urgent items.

### 7.7 Heatmap improvements
- Cell size adapts to number of certs (fewer certs = bigger cells, more readable dates)
- Hovering a cell expands it with a mini card: cert name, completed date, days remaining, source badge (PDF/Manual/Migration)
- Sticky both the row header column AND the cert header row (currently only row header is sticky)
- Smooth color transition animation when data changes

### 7.8 Action Center improvements
- Each row has a "Quick fix" button that opens an inline edit for that specific cert date
- Urgency indicator: overdue rows pulse with a subtle red glow
- Bulk selection + bulk export to clipboard/CSV for sending renewal reminders

### 7.9 Workers page improvements
- Worker cards show an avatar circle with initials + compliance ring
- Expanding a worker slides down their cert grid (Framer Motion)
- Each cert entry in the expanded view has a pencil icon → opens EditCertEntryModal
- Worker status badge is clickable → inline toggle (active/inactive/onboarding)

### 7.10 Import page (new — `/import`)
```
┌──────────────────────────────────────────────────────────┐
│  IMPORT PDF                                              │
│  Drop one or more Anejo 3 PDFs to import                 │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │   📂  Drop PDFs here or click to browse            │  │
│  │                                                    │  │
│  │   Accepts: Anejo 3 certification PDFs             │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  PROCESSING QUEUE  (appears when files are dropped)      │
│  ┌──────────────────────────────────────┐               │
│  │ 📄 Anejo3_Acme_May2026.pdf          │               │
│  │ ████████████░░░░ 68% parsing...     │               │
│  │ ✅ 12 records added, 3 updated       │               │
│  │ ⚠️  2 warnings — click to review    │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  IMPORT HISTORY                                          │
│  [table: date | filename | added | updated | warnings]  │
└──────────────────────────────────────────────────────────┘
```

### 7.11 Warning system
- Warning count badge on the Import nav item
- Clicking a warning opens a slide-over panel (not a modal) with all pending warnings
- Each warning has a "Resolve" button that opens the relevant edit form
- Warnings marked as acknowledged disappear from the badge count

### 7.12 Command palette (Cmd/Ctrl+K)
Global keyboard shortcut. Shows:
- Recent pages
- Worker search (type a name → jump to their row on Workers page)
- Contractor search
- "Import PDF" shortcut
- "Go to settings"

### 7.13 Toast notifications (sonner)
Every data mutation produces a toast:
- Import success: "✅ Imported Anejo3_Acme.pdf — 15 records added"
- Edit saved: "✅ Worker updated"
- Error: "❌ File could not be parsed — see warnings"
- All toasts have an undo action where applicable

---

## 8. Files Summary

### Backend — new files
```
App Files/backend/app/models.py
App Files/backend/app/database.py
App Files/backend/app/services/db_reader.py
App Files/backend/app/services/migration.py
App Files/backend/app/api/crud.py
App Files/backend/app/api/import_api.py
App Files/backend/alembic.ini
App Files/backend/alembic/env.py
App Files/backend/alembic/versions/001_initial_schema.py
```

### Backend — modified
```
App Files/backend/app/api/excel.py
App Files/backend/app/main.py
App Files/backend/requirements.txt
```

### Backend — removed / retired
```
App Files/backend/app/services/workbook_sync.py     ← deleted (no longer needed)
cert_tracker/Contractor Certifications Tracker Demo.xlsx  ← deleted per user instruction
```
Note: `excel_reader.py` is NOT deleted. It is kept as-is and called by `migration.py`
to read the existing workbook on first run. After migration completes it is unused
but retained for reference.

### Backend requirements.txt — additions
```
sqlalchemy>=2.0
alembic
python-multipart        # multipart file uploads
pdfplumber              # moved from cert_tracker/requirements.txt to here
```

### Frontend — new files
```
App Files/frontend/src/pages/ImportPage.tsx
App Files/frontend/src/pages/SettingsPage.tsx
App Files/frontend/src/components/CommandPalette.tsx
App Files/frontend/src/components/EditWorkerModal.tsx
App Files/frontend/src/components/EditContractorModal.tsx
App Files/frontend/src/components/EditCertModal.tsx
App Files/frontend/src/components/EditCertEntryModal.tsx
App Files/frontend/src/components/SlideOver.tsx
App Files/frontend/src/components/ComplianceRing.tsx
App Files/frontend/src/components/AnimatedCounter.tsx
App Files/frontend/src/components/WarningBadge.tsx
App Files/frontend/src/components/ImportDropzone.tsx
App Files/frontend/src/components/ToastProvider.tsx
App Files/frontend/tailwind.config.js
App Files/frontend/postcss.config.js
```

### Frontend — modified
```
App Files/frontend/src/App.tsx           (new routes + query client + command palette)
App Files/frontend/src/api.ts            (CRUD + import endpoints)
App Files/frontend/src/types.ts          (editable record types + ImportBatch)
App Files/frontend/src/index.css         (design tokens, Tailwind base)
App Files/frontend/src/App.css           (remove, replaced by Tailwind)
App Files/frontend/src/components/ShellLayout.tsx   (new sidebar design)
App Files/frontend/src/components/KPIStrip.tsx       (animated counters + rings)
App Files/frontend/src/components/RefreshBar.tsx     (becomes "last updated" indicator)
App Files/frontend/src/context/DashboardContext.tsx  (swap to react-query)
App Files/frontend/src/pages/OverviewPage.tsx        (compliance ring, new layout)
App Files/frontend/src/pages/WorkersPage.tsx         (edit modals, avatar cards)
App Files/frontend/src/pages/ContractorsPage.tsx     (edit modals, add button)
App Files/frontend/src/pages/HeatmapPage.tsx         (sticky headers, hover cards)
App Files/frontend/src/pages/ActionsPage.tsx         (quick-fix inline edit)
App Files/frontend/src/pages/CertificationsPage.tsx  (add/edit cert types)
App Files/frontend/package.json
```

---

## 9. Implementation Phases

### Phase 1 — Database layer (backend)
Set up SQLAlchemy, Alembic, models, `database.py`, `db_reader.py`. Wire into `excel.py` routes. All existing API endpoints return identical data from SQLite.

### Phase 2 — Migration
`migration.py`: read real .xlsx, write all records to SQLite. Auto-runs on first startup. Delete demo .xlsx.

### Phase 3 — CRUD + Import API
`crud.py` and `import_api.py` endpoints. Adapt `import_pdf.py` to write to DB.

### Phase 4 — Frontend design system
Install Tailwind, Radix UI, Framer Motion, react-query, sonner, react-dropzone. Replace CSS files with design tokens. Rebuild ShellLayout sidebar.

### Phase 5 — Existing pages modernized
Apply new design system to all 6 existing pages. Add edit modals, compliance rings, animated counters.

### Phase 6 — New pages
Import page, Settings page, Command palette, Warning slide-over.

### Phase 7 — Polish + edge cases
- Handle workbook-open-in-Excel gracefully (migration) 
- Handle duplicate worker names across contractors
- Handle malformed PDFs (parser error → partial batch, warning logged)
- Handle empty database state (first-run before migration)
- Fix Semgrep hook (remove or configure `SEMGREP_APP_TOKEN`)
- Update `.gitignore` for `cordillera.db`, `alembic/versions/*.pyc`, `.superpowers/`

---

## 10. Edge Cases Covered

| Scenario | Handling |
|----------|---------|
| PDF has a worker not in DB | Created automatically, flagged in warnings |
| PDF has a contractor not in DB | Created automatically, fuzzy-matched if close |
| PDF has an older date for an existing cert | Skipped, newer date preserved |
| PDF cannot be parsed (corrupt/wrong format) | Batch status = failed, error in warnings, no partial writes |
| Worker appears in two PDFs with different contractor names | Fuzzy match + warning to user to confirm |
| DB file missing on launch | Alembic creates it fresh; migration triggers if .xlsx present |
| Migration runs twice | Idempotent: checks for existing `excel_migration` batch first |
| Deleting a contractor with active workers | Blocked by API (409 Conflict), must reassign workers first |
| Cert entry date manually corrected | `source` field updated to `manual`, preserves original import_batch_id for audit |
| Very large PDF (100+ workers) | Streamed processing, progress reported per-batch |
