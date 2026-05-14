---
tags: [decision, adr, backend]
created: 2026-05-14
related: [[adr-001-sqlite-over-excel]], [[api-routes]]
---

# ADR-002: db_reader Reuses excel_reader Dataclasses

## Status
Accepted — implemented in Phase 1.

## Context

`excel_reader.py` defines Python dataclasses (`ParsedWorkbook`, `Worker`, `Contractor`, `Cert`, `CertStatus`, `ActionItem`, `HeatmapRow`, `HeatmapPayload`, `CertDemand`, `KPIs`) that the existing `excel.py` routes serialize to JSON. The frontend TypeScript types in `types.ts` mirror these exactly. Any change to the dataclass shapes would break the frontend.

When building `db_reader.py` to replace the Excel data source, there were two options:

1. **Option A:** Define new dataclasses in `db_reader.py` that happen to match the shapes
2. **Option B:** Import and reuse the existing dataclasses from `excel_reader.py` directly

## Decision

Option B — import from `excel_reader.py`.

```python
from .excel_reader import (
    ParsedWorkbook, Worker, Contractor, Cert, CertStatus,
    ActionItem, HeatmapRow, HeatmapPayload, CertDemand, KPIs,
    _aggregate_worker_counts, _aggregate_contractor_counts,
    _build_action_list, _build_heatmap, _build_cert_demand,
    _compute_kpis, _classify,
    RENEWAL_RED_DAYS, RENEWAL_YELLOW_DAYS,
)
```

The private aggregation helpers (`_classify`, `_aggregate_*`, `_build_*`, `_compute_kpis`) are also imported and reused — only the data source (SQLite rows vs. openpyxl cells) changes, not the aggregation logic.

## Consequences

- **Pro:** Zero frontend changes — `types.ts` stays identical
- **Pro:** Aggregation logic is only maintained in one place
- **Pro:** Any future change to `excel_reader.py` dataclasses automatically applies to both read paths
- **Con:** `db_reader.py` is coupled to `excel_reader.py` — if excel_reader is ever removed, db_reader must be updated
- **Con:** The leading underscores on helper functions signal "private" — we're intentionally crossing that boundary (acceptable since they're in the same package)
