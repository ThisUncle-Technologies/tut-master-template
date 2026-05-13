# Pipeline Flow — Project 10x

Two independent pipelines. Neither triggers the other automatically.

---

## Pipeline A — NeST Lead Ingestion (Sub-project 4)

Converts raw awarded-tender data from nest.go.tz into qualified leads in the dashboard.

```
nest.go.tz
    │
    ▼ node tools/ingestion/nest-scraper.js
data/ingestion/raw/YYYY-MM-DDTHHMMSS-raw.json
    │   (raw records: one row per tender award)
    ▼ node tools/ingestion/normalize-tender-records.js
data/ingestion/normalized/*-normalized.json
    │   (title-cased names, ISO dates, TZS values, industry inferred, tenders aggregated per company)
    ▼ node tools/ingestion/dedupe-companies.js
data/ingestion/normalized/*-deduped.json
    │   (exact + stripped-slug merges applied; fuzzy pairs flagged for manual review)
    │   ──► data/ingestion/logs/deduped-*-review.json  (REVIEW_NEEDED pairs — human action required)
    ▼ node tools/ingestion/discover-digital-presence.js  [--enrich=csv] [--auto]
data/ingestion/normalized/*-enriched.json
    │   (website, social media, phone, email merged from enrichment CSV or auto-probe)
    ▼ node tools/ingestion/qualify-leads.js
data/ingestion/qualified/*-qualified.json
data/ingestion/rejected/*-rejected.json
    │   (scored 0–100; qualified if score ≥ 25)
    ▼ node tools/ingestion/import-qualified-to-dashboard.js
leads/imported-YYYY-MM-DD.json          ← new lead records (status: "new")
dashboard/data/dashboard-state.json     ← entries added with status: "new"
```

**Orchestrator:** `node tools/ingestion/run-ingestion-pipeline.js [--from=stage] [--to=stage]`

After import: human reviews leads in the dashboard, then manually triggers Pipeline B.

---

## Pipeline B — Config Generation & Analysis (Sub-project 2)

Generates a demo config for one lead. Triggered per-lead from the dashboard or CLI.

```
leads/*.json  (one lead record)
    │
    ▼ tools/generate-company-config.js
    │   → calls tools/website-quality-analyzer.js  (live HTTP analysis of lead's website)
    │   → calls tools/utils/infer-industry.js       (keyword-based industry detection)
    │   → calls tools/utils/checksum.js             (FNV-1a config fingerprint)
generated/configs/{slug}.json    ← DRAFT config (status: "draft")
    │
    ▼ tools/outreach-script-generator.js
generated/outreach/{slug}-outreach.json   ← EN + SW outreach scripts
    │
    ▼ [human review in dashboard]
    │   Edit fields in Config Editor (#/config/:slug)
    │   Click Save Draft to persist edits
    │
    ▼ POST /api/publish/:slug  (dashboard server)
companies/{slug}.json            ← PUBLISHED config (status: "published")
                                    (what index.html?company=slug serves)
```

**CLI trigger (all leads):** `node tools/run-pipeline.js`
**Dashboard trigger (one lead):** Run Pipeline button on lead detail page

---

## Data ownership

| Directory | Owner | Notes |
|-----------|-------|-------|
| `data/ingestion/` | Pipeline A | Intermediate files; safe to delete and re-run |
| `leads/` | Both | Source of truth for lead identity; never auto-deleted |
| `generated/configs/` | Pipeline B | Editable drafts; re-running overwrites auto-generated fields |
| `generated/outreach/` | Pipeline B | Re-generated on each pipeline run |
| `companies/` | Dashboard (publish) | Published configs served to the demo template; never auto-overwritten |
| `dashboard/data/` | Dashboard | State and activity log; do not edit manually in production |

---

## Status lifecycle

```
new  ──► [Run Pipeline] ──► generated ──► reviewed ──► published ──► contacted ──► replied ──► won
                                                                                              ──► lost
                                                                                    ──► archived
```

- `new` — imported from NeST ingestion, no config generated yet
- `generated` — Pipeline B ran; config exists in `generated/configs/`
- `reviewed` — sales rep has checked the config
- `published` — config copied to `companies/`; demo is live
- `contacted` — outreach sent
- `replied` — prospect responded
- `won` / `lost` — deal closed
- `archived` — removed from active pipeline
