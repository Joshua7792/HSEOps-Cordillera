---
tags: [vault-index, home]
created: 2026-05-14
---

# Cordillera Control — Vault Home

HSE certification tracker dashboard for Cordillera construction site.
Open this vault directly in Obsidian from `jacobdashboard/`.

---

## Quick Links

| Section | Note |
|---------|------|
| Latest handoff | [[2026-05-14-handoff]] |
| Phase tracker | [[phases]] |
| Current sprint | [[current-sprint]] |
| DB schema | [[db-schema]] |
| API routes | [[api-routes]] |
| Stack overview | [[stack]] |

---

## Architecture

- [[stack]] — Backend + frontend + desktop mode
- [[db-schema]] — 5-table SQLite schema (contractors, workers, certs, cert_entries, import_batches)
- [[api-routes]] — All FastAPI endpoints with request/response shapes

## Decisions

- [[adr-001-sqlite-over-excel]] — Why SQLite replaced the Excel workbook
- [[adr-002-dataclass-contract]] — Why db_reader reuses excel_reader dataclasses

## Roadmap

- [[phases]] — All 7 phases with status (✓ / 🔄 / ⬜)

## Active Work

- [[current-sprint]] — Phase 3: CRUD endpoints + PDF import API

## References

- [[anejo-3-format]] — Puerto Rican Anejo 3 certification PDF format

---

## Vault Layout

```
jacobdashboard/
├── .obsidian/          ← Obsidian config (this vault)
├── notes/              ← All vault notes live here
│   ├── 00-Brain/       ← Index + session logs
│   ├── 01-Handoffs/    ← Session handoff notes
│   ├── 02-Architecture/← Stack, DB schema, API routes
│   ├── 03-Roadmap/     ← Phase tracker
│   ├── 04-Decisions/   ← Architecture decision records (ADRs)
│   ├── 05-Prompts/     ← Reusable Claude prompts
│   ├── 06-Dashboard/   ← Page-by-page UI notes
│   ├── 07-Tasks/       ← Current sprint + to-dos
│   ├── 08-References/  ← PDF formats, cert categories, links
│   └── 99-Assets/      ← Images and attachments
├── App Files/          ← Backend (FastAPI) + Frontend (React/Vite)
├── cert_tracker/       ← cordillera.db + source .xlsx + import scripts
├── CHAT_LOG/           ← Session handoff markdown (canonical source)
└── docs/               ← Approved specs
```
