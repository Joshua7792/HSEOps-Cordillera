---
tags: [reference, pdf, anejo-3, import]
created: 2026-05-14
related: [[api-routes]], [[db-schema]]
---

# Anejo 3 — Puerto Rican Construction Certification Format

## What is Anejo 3?

"Anejo 3" is the official Puerto Rican construction industry certification form used to document worker training and certifications. HSE managers collect these PDFs from contractors. The dashboard's PDF import feature parses this format to extract cert completion data.

## Parser Location

`cert_tracker/scripts/import_pdf.py`

The parser uses `pdfplumber` to extract text from the PDF and match worker names + cert completion dates.

## Key Functions in import_pdf.py

| Function | Purpose |
|----------|---------|
| `normalize(name)` | Normalize worker name for matching (uppercase, strip accents) |
| `normalize_company(name)` | Normalize contractor/company name |
| `normalize_compact(name)` | Compact normalization for dedup |
| Date parsing logic | Extracts completion dates from various date formats found in PDFs |

## Phase 3 Adapter Strategy

The parser logic is kept 100% unchanged. A new function is added to replace the openpyxl write path:

```python
def write_to_db(parsed_data: dict, db: Session) -> models.ImportBatch:
    # Uses normalize/normalize_company from the existing script
    # Upserts workers and cert_entries into SQLite
    # Creates ImportBatch(batch_type='pdf_import') record
    # On parse failure: batch.status='failed', db.rollback()
```

## Import Flow

```
POST /api/import/pdf
  └── UploadFile (multipart)
       └── pdfplumber.open(tmp_file)
            └── import_pdf parsing logic (unchanged)
                 └── write_to_db() adapter
                      └── SQLAlchemy upserts
                           └── ImportBatch returned as JSON
```

## Source Field

Cert entries created via PDF import have `source = 'pdf_import'` in the `cert_entries` table. The heatmap tooltip shows this badge so managers can tell which certs came from PDFs vs. the original Excel migration (`source = 'excel_migration'`).
