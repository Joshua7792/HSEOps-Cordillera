---
tags: [architecture, api]
created: 2026-05-14
related: [[stack]], [[db-schema]]
---

# API Routes

All routes served by FastAPI on port `8124`.

---

## Dashboard Routes (`/api/excel/*`)

Defined in `App Files/backend/app/api/excel.py`. URLs and JSON shapes are frozen — no frontend changes allowed.

| Method | Path | Service | Description |
|--------|------|---------|-------------|
| GET | `/api/excel/health` | `db_reader.get_health(db)` | DB path, record counts, migration status |
| GET | `/api/excel/dashboard` | `db_reader.get_dashboard(db)` | Full landing-page payload |
| GET | `/api/excel/contractors` | `db_reader.get_dashboard(db)` | Contractor rollups |
| GET | `/api/excel/workers` | `db_reader.get_dashboard(db)` | All workers + cert statuses |
| GET | `/api/excel/workers/{name}` | `db_reader.get_dashboard(db)` | Single worker by name |
| GET | `/api/excel/certifications` | `db_reader.get_dashboard(db)` | Cert catalog |
| POST | `/api/excel/refresh` | `db_reader.get_kpis(db)` | No-op; returns current KPIs |

**Dashboard JSON shape** (required keys):
`kpis`, `action_list`, `workers`, `contractors`, `heatmap`, `cert_demand`, `today`, `issues`, `workbook`

---

## CRUD Routes (`/api/*`)

Defined in `App Files/backend/app/api/crud.py` — **Phase 3, not yet implemented**.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/contractors` | Create contractor |
| PUT | `/api/contractors/{id}` | Update contractor |
| DELETE | `/api/contractors/{id}` | Delete (409 if has active workers) |
| PUT | `/api/workers/{id}` | Update worker |
| DELETE | `/api/workers/{id}` | Delete worker |
| POST | `/api/certs` | Create cert type |
| PUT | `/api/certs/{id}` | Update cert type |
| DELETE | `/api/certs/{id}` | Delete cert type |
| PUT | `/api/cert-entries/{id}` | Update cert entry (e.g., date) |
| DELETE | `/api/cert-entries/{id}` | Delete cert entry |

**Error codes:** 404 for not found, 409 for FK constraint violations.

---

## Import Routes (`/api/import/*`)

Defined in `App Files/backend/app/api/import_api.py` — **Phase 3, not yet implemented**.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/import/pdf` | Multipart upload → parse Anejo 3 → write DB → return ImportBatch |
| GET | `/api/import/history` | List ImportBatch records newest first |
| GET | `/api/import/{id}` | Single batch with full warnings list |

---

## Utility Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | `{"status": "ok"}` |
| GET | `/api` | API root message |
| GET | `/api/migrate/status` | `{"migrated": bool, "record_counts": {...}}` |
| POST | `/api/migrate/from-excel` | Manual re-run of Excel migration |
