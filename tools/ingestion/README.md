# NeST Lead Ingestion Pipeline

Turns raw awarded-tender data from [NeST](https://nest.go.tz) into qualified leads in the dashboard.

---

## Quick start

```bash
# Full pipeline (live HTTP scrape → dashboard import)
node tools/ingestion/run-ingestion-pipeline.js

# Full pipeline from a saved HTML file
node tools/ingestion/run-ingestion-pipeline.js --from-html=saved.html

# From normalize onwards, with a manual enrichment CSV
node tools/ingestion/run-ingestion-pipeline.js --from=normalize --enrich=my-enrichment.csv

# Dry-run the full pipeline (no files written)
node tools/ingestion/run-ingestion-pipeline.js --dry-run
```

After a successful import, open the dashboard (`node dashboard/server.js`), review each lead at `status: new`, then click **Run Pipeline** to generate configs.

---

## Stages

| Stage | Script | Input | Output |
|-------|--------|-------|--------|
| 1 scrape    | `nest-scraper.js`                  | NeST live / HTML / CSV         | `data/ingestion/raw/*.json`        |
| 2 normalize | `normalize-tender-records.js`      | raw file                        | `data/ingestion/normalized/*-normalized.json` |
| 3 dedupe    | `dedupe-companies.js`              | normalized file                 | `data/ingestion/normalized/*-deduped.json`    |
| 4 enrich    | `discover-digital-presence.js`     | deduped file + enrichment CSV   | `data/ingestion/normalized/*-enriched.json`   |
| 5 qualify   | `qualify-leads.js`                 | enriched/deduped file           | `data/ingestion/qualified/*.json` + `rejected/*.json` |
| 6 import    | `import-qualified-to-dashboard.js` | qualified file                  | `leads/imported-YYYY-MM-DD.json` + dashboard state |

Each stage reads the most-recently-modified file from the previous stage's output directory. Pass `--input=path` to override.

---

## Scraper modes

The NeST site may use JavaScript rendering. If the live fetch returns an empty table, the scraper will detect this and print instructions:

```
[scraper] ERROR: NeST page uses JavaScript rendering — the table cannot be scraped via HTTP fetch.
[scraper] To proceed:
  1. Open https://nest.go.tz/awarded-tenders in your browser
  2. Wait for the table to load fully
  3. Save the page as HTML (File → Save Page As → Web Page, HTML only)
  4. Re-run with: node tools/ingestion/nest-scraper.js --from-html=path/to/saved.html
  OR export the table to CSV and use: --from-csv=path/to/file.csv
```

---

## Enrichment CSV

Manual digital-presence data. Matched by `slug` first, then `companyName`. Invalid URLs are rejected with a warning (never silently accepted).

**14 columns (order matters):**

```
slug, companyName, website, facebook, instagram, linkedin, tiktok, googleMaps, phone, whatsapp, email, location, notes, confidence
```

- `slug` — dashboard slug (preferred for matching)
- `companyName` — fall back if slug is blank
- `confidence` — 0.0–1.0; scores ≥ 0.8 earn +5 lead score
- `notes` — appended to the lead's notes field verbatim
- Missing columns may be left blank; do not invent values

---

## Lead scoring (0–100)

| Signal | Points |
|--------|--------|
| Phone present | +10 |
| WhatsApp present | +20 |
| Email present | +10 |
| Tender count 1–3 | +10 |
| Tender count 4–10 | +20 |
| Tender count 11+ | +30 |
| Total value > 100M TZS | +10 |
| Total value > 1B TZS | +20 |
| Known industry | +10 |
| 1 social platform | +5 |
| 2+ social platforms | +10 |
| Weak/no website | +10 |
| Confidence ≥ 0.8 | +5 |

Default threshold: `--min-score=25`. Adjust with `--min-score=N`.

---

## Deduplication rules

- **Pass 1** — exact slug match → auto-merge (tenders combined)
- **Pass 2** — slugs match after stripping legal suffixes (Ltd, Co, Limited…) → auto-merge
- **Pass 3** — edit distance ≤ 2 on slugs → flagged as `REVIEW_NEEDED` in `data/ingestion/logs/deduped-*-review.json`; never auto-merged

Always review the `REVIEW_NEEDED` file before running qualify/import.

---

## Dashboard integration

Imported leads appear in the dashboard with `status: "new"`. The Sub-project 2 generation pipeline is **not** run automatically. The intended workflow:

1. Review each lead in the dashboard (`#/leads`)
2. Click **Run Pipeline** on a lead to generate its config
3. Edit the config in the Config Editor (`#/config/:slug`)
4. Publish when ready (`#/lead/:slug` → Publish Demo)

---

## Logs

All stages write append-only logs to `data/ingestion/logs/`:

| File | Contents |
|------|----------|
| `scraper.log` | Fetch events, JS-render detections, output filenames |
| `normalizer.log` | Input/output file names, record counts |
| `dedupe.log` | Merge counts, review file paths |
| `enrichment.log` | Enrichment match counts, output filenames |
| `qualify.log` | Qualified/rejected counts, threshold used |
| `import.log` | Import counts, duplicates skipped |
