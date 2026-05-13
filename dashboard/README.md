# TUT Lead Dashboard

Local sales operating system for managing demo leads through their lifecycle.

## Start the server

```bash
node dashboard/server.js
```

Open **http://localhost:3001** in your browser.

---

## Views

| URL | Description |
|-----|-------------|
| `#/leads` | All leads with status, website classification, and completeness |
| `#/lead/:slug` | Lead detail — audit results, status controls, publish action |
| `#/config/:slug` | Config editor — Key Fields form or Raw JSON tab |
| `#/outreach/:slug` | Outreach scripts — EN and SW with copy buttons |

---

## Publishing flow

1. Edit the draft config in **Config Editor** (`#/config/:slug`)
2. Click **Save Draft** to persist to `generated/configs/{slug}.json`
3. Click **Save & Publish** (or go to Lead Detail and click **Publish Demo**)
4. Server validates the config — fails if required fields are missing
5. Server copies `generated/configs/{slug}.json` → `companies/{slug}.json`
6. Status set to `"published"`, `publishedAt` timestamp added
7. `dashboard-state.json` updated

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leads` | All leads with completeness score |
| GET | `/api/activity` | Activity log (last 500 entries) |
| GET | `/api/configs` | List draft configs |
| GET | `/api/configs/:slug` | Read draft config |
| PUT | `/api/configs/:slug` | Save draft config |
| GET | `/api/companies` | List published configs |
| GET | `/api/state/:slug` | Read lead state |
| PUT | `/api/state/:slug` | Update lead status/outreachStatus/notes |
| GET | `/api/outreach/:slug` | Read outreach record |
| POST | `/api/publish/:slug` | Validate and publish draft → companies/ |
| POST | `/api/pipeline/:slug` | Re-run pipeline for one lead |
| POST | `/api/pipeline` | Re-run pipeline for all leads |
| POST | `/api/sync` | Discover new leads from leads/ + generated/configs/ |

---

## State persistence

- **`dashboard/data/dashboard-state.json`** — lead lifecycle status, keyed by slug
- **`dashboard/data/activity-log.json`** — append-only activity log, capped at 500 entries
- **`generated/configs/{slug}.json`** — working draft configs (source of truth for editing)
- **`companies/{slug}.json`** — published configs (what the demo template serves)

---

## Completeness score (0–100)

| Field | Points |
|-------|--------|
| `contact.phone` present | 10 |
| `contact.whatsapp` present | 20 |
| `contact.email` present | 10 |
| `contact.address` present | 10 |
| `about.director` present | 10 |
| Non-placeholder `about.image` | 5 |
| Non-placeholder `hero.bgImage` | 5 |
| `projects.items` non-empty | 10 |
| `gallery.items` non-empty | 10 |
| `testimonials.items` non-empty | 10 |

---

## Running acceptance tests

```bash
node test-acceptance.js
```

Runs 83 automated tests covering: server boot, pipeline, config editor, publish flow, outreach panel, state/notes persistence, activity log, failure cases, demo template config states, and copy quality spot-checks. All tests must pass before marking a release ready.

The test script resets `dashboard-state.json` and `activity-log.json` to a clean baseline before running. Do not run it against a production state file.

---

## Limitations

- No authentication — local use only (bound to 127.0.0.1)
- No real-time updates — refresh or navigate to see latest state
- Pipeline re-run overwrites auto-generated fields; manually edited content may be lost
- Website analysis is heuristic — not a professional audit
- API routes reject malformed slugs (non-lowercase, non-alphanumeric-hyphen) with 400
