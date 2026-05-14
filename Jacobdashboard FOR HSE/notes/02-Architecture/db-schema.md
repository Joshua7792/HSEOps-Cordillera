---
tags: [architecture, database, schema]
created: 2026-05-14
related: [[stack]], [[adr-001-sqlite-over-excel]]
---

# Database Schema

**File:** `cert_tracker/cordillera.db`
**ORM:** `App Files/backend/app/models.py`

---

## Tables

### contractors

| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, autoincrement |
| name | String(200) | NOT NULL, UNIQUE |
| primary_contact | String(200) | nullable |
| specialty | String(200) | nullable |
| notes | Text | nullable |

### workers

| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, autoincrement |
| name | String(200) | NOT NULL |
| contractor_id | Integer | FK → contractors.id, ON DELETE SET NULL |
| job_title | String(200) | nullable |
| status | String(50) | nullable |
| employee_code | String(100) | nullable |
| hire_date | Date | nullable |
| email | String(200) | nullable |
| phone | String(50) | nullable |
| notes | Text | nullable |

**UNIQUE:** `(name, contractor_id)`

### certs

| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, autoincrement |
| name | String(300) | NOT NULL, UNIQUE |
| category | String(100) | nullable |
| validity_years | Integer | nullable (default 1) |
| notes | Text | nullable |

### cert_entries

| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, autoincrement |
| worker_id | Integer | FK → workers.id, ON DELETE CASCADE |
| cert_id | Integer | FK → certs.id, ON DELETE CASCADE |
| completed_on | Date | nullable |
| source | String(100) | nullable (e.g., 'excel_migration', 'pdf_import') |
| import_batch_id | Integer | FK → import_batches.id, ON DELETE SET NULL |

**UNIQUE:** `(worker_id, cert_id)`

### import_batches

| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, autoincrement |
| filename | String(500) | nullable |
| batch_type | String(50) | NOT NULL ('excel_migration' or 'pdf_import') |
| imported_at | DateTime | NOT NULL, default=utcnow |
| status | String(20) | NOT NULL ('pending' / 'success' / 'failed') |
| warnings | JSON | nullable |
| records_added | Integer | default 0 |
| records_updated | Integer | default 0 |
| records_skipped | Integer | default 0 |
| acknowledged_at | DateTime | nullable |

---

## Relationships

```
contractors ──< workers ──< cert_entries >── certs
                                │
                         import_batches
```

- Worker → Contractor: many-to-one, SET NULL on contractor delete
- CertEntry → Worker: many-to-one, CASCADE delete
- CertEntry → Cert: many-to-one, CASCADE delete
- CertEntry → ImportBatch: many-to-one, SET NULL on batch delete

---

## Status Logic

Cert expiry = `completed_on + 1 year` (365 days)

| Status | Days remaining to anniversary | Color |
|--------|-------------------------------|-------|
| GREEN | > 60 days | `#22c55e` |
| YELLOW | 31 – 60 days | `#eab308` |
| RED | ≤ 30 days (or past) | `#ef4444` |
| BLANK | No completed_on date | — |

Constants in `excel_reader.py`:
- `RENEWAL_RED_DAYS = 30`
- `RENEWAL_YELLOW_DAYS = 60`

---

## Current Data (as of 2026-05-13 migration)

| Table | Count |
|-------|-------|
| contractors | 3 |
| workers | 46 |
| certs | 30 |
| cert_entries | 408 |
| Overall compliance | 74.3% |
| Action items | 105 |
