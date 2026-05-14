---
tags: [decision, adr, database]
created: 2026-05-14
related: [[db-schema]], [[adr-002-dataclass-contract]]
---

# ADR-001: SQLite Over Excel as Live Data Store

## Status
Accepted — implemented in Phase 1 & 2.

## Context

The original dashboard read from `Contractor Certifications Tracker.xlsx` via openpyxl on every request (`WorkbookCache` with `_get_workbook()`). This approach had several problems:

- **No write path** — there was no safe way to add/edit workers, contractors, or cert entries from the UI
- **Concurrency risk** — file locks when Excel is open
- **No history** — no record of when data changed or who imported it
- **PDF import was awkward** — `import_pdf.py` wrote back to the .xlsx, which is fragile

## Decision

Replace the live Excel read with SQLite + SQLAlchemy. Key points:

1. **Excel is used once** — as the migration source. `migration.py` calls `excel_reader.read_workbook()` exactly once to seed the DB, then the .xlsx is retired.
2. **SQLite is local-first** — aligns with the personal/desktop nature of the app. No server dependency.
3. **SQLAlchemy 2.0 ORM** — typed models, relationships, proper constraint enforcement.
4. **Alembic migrations** — schema can evolve safely; `render_as_batch=True` handles SQLite's ALTER TABLE limitations.
5. **URL stability** — `excel.py` routes keep identical URLs and JSON shapes; only the data source changes.

## Consequences

- **Pro:** Full CRUD is now possible (Phase 3)
- **Pro:** PDF imports create auditable `ImportBatch` records
- **Pro:** All requests are fast (local SQLite, no file I/O overhead)
- **Con:** An initial migration step is required (auto-runs on first startup)
- **Con:** The .xlsx file can no longer be edited directly to update data (it's now read-only legacy)
