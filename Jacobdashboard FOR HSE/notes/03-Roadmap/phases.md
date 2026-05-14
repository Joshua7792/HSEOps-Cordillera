---
tags: [roadmap, phases]
created: 2026-05-14
related: [[current-sprint]], [[2026-05-14-handoff]]
---

# Project Phases

## Status Key
- ✓ **Done**
- 🔄 **In Progress**
- ⬜ **Todo**

---

## Phase 1 — Backend: Database Layer ✓

Replace Excel as data source with SQLite via SQLAlchemy + Alembic.

**Deliverables:**
- `models.py` — 5-table SQLAlchemy ORM
- `database.py` — engine, SessionLocal, get_db()
- `alembic/` — migrations with `render_as_batch=True`
- `db_reader.py` — SQLite → same dataclass output as excel_reader
- Updated `excel.py` — routes now use db_reader + Depends(get_db)
- Updated `main.py` — startup runs alembic + migration check
- Deleted `workbook_sync.py`

---

## Phase 2 — Backend: One-Time Migration ✓

Import existing Excel data into SQLite.

**Deliverables:**
- `migration.py` — idempotent Excel → SQLite import
- Verified: 3 contractors, 46 workers, 30 certs, 408 entries, 74.3% compliance

---

## Phase 3 — Backend: CRUD + Import API ✓

Add mutating endpoints and PDF import pipeline.

**Deliverables:**
- `crud.py` — PUT/DELETE for workers, contractors, certs, cert_entries + POST for contractors/certs
- `import_api.py` — POST /api/import/pdf, GET /api/import/history, GET /api/import/{id}
- PDF adapter: `write_to_db()` function wrapping `import_pdf.py` parsing
- Register new routers in `main.py`

---

## Phase 4 — Frontend: Design System ✓

Install new libraries and establish the "HSE Command Center" dark UI foundation.

**Deliverables:**
- npm install: Tailwind v3, Radix UI, Framer Motion 11, react-query, sonner, react-dropzone
- `tailwind.config.js`, `postcss.config.js`, `src/index.css`
- `src/lib/cn.ts` utility
- New `ShellLayout.tsx` (dark sidebar, amber accent)
- Updated `App.tsx` with QueryClientProvider + new routes

---

## Phase 5 — Frontend: Existing Pages Redesigned ✓

Apply new design system to all 6 pages.

**Pages:** Overview, Workers, Contractors, Actions, Heatmap, Certifications

**Done:** All 6 pages fully Tailwind. WorkersPage adds ComplianceRing per row. ContractorsPage uses left-border accent by compliance tier. ActionsPage + CertificationsPage have chip filters and paginated tables. HeatmapPage keeps inner `excel-heatmap-*` CSS grid intact.

---

## Phase 6 — Frontend: New Pages ✓

Add 3 new screens.

**Deliverables:**
- `ImportPage.tsx` ✓ — drag-and-drop PDF, upload queue, history table
- `SettingsPage.tsx` ✓ — DB info, migration controls
- `CommandPalette.tsx` ✓ — Cmd/Ctrl+K global search (Radix Dialog, workers + contractors + nav)

---

## Phase 7 — Polish & Edge Cases ✓

Final cleanup before ship.

**Checklist:**
- [x] `.gitignore` — cordillera.db, alembic pyc, .superpowers/ excluded
- [x] Empty DB state: routes return empty lists (guarded in db_reader + pages)
- [x] Corrupt PDF: batch.status='failed', db.rollback(), still returns batch
- [ ] Disable Semgrep plugin — user must do this manually: Claude Code → Settings → Extensions/Plugins (no SEMGREP_APP_TOKEN)
- [ ] Delete `cert_tracker/Contractor Certifications Tracker Demo.xlsx` (optional cleanup)
- [x] HANDOFF.md synced
