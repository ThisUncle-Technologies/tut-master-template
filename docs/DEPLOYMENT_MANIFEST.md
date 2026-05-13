# Project 10x — Deployment Manifest

This document defines exactly what is deployed to Netlify and what is kept private. Review this before every deployment.

---

## What Netlify publicly exposes

When `public-demo/` is deployed to `demo.thisuncle.co.tz`, the following URLs become publicly reachable:

| Public URL | Source file | Notes |
|---|---|---|
| `demo.thisuncle.co.tz/{slug}` | `public-demo/companies/{slug}.json` | Published companies only |
| `demo.thisuncle.co.tz/{slug}?mode=screenshot` | same | Screenshot mode, animations disabled |
| `demo.thisuncle.co.tz/` | `public-demo/index.html` | Falls back to DEFAULT_SLUG |
| `demo.thisuncle.co.tz/companies/{slug}.json` | `public-demo/companies/{slug}.json` | Raw JSON directly fetchable |
| `demo.thisuncle.co.tz/css/style.css` | `public-demo/css/style.css` | Renderer stylesheet |
| `demo.thisuncle.co.tz/js/main.js` | `public-demo/js/main.js` | Renderer logic |
| `demo.thisuncle.co.tz/assets/*` | `public-demo/assets/**` | Images, icons |

### Important: company JSON is publicly readable

Anyone who knows `demo.thisuncle.co.tz/companies/{slug}.json` can read the full company config JSON, including phone numbers, WhatsApp numbers, and all copy. This is intentional — it is the data the demo page renders. Do not put private data in published company configs.

---

## Contents of public-demo/ (what gets deployed)

```
public-demo/
├── _redirects                    # SPA routing: /* /index.html 200
├── index.html                    # Demo renderer shell
├── css/
│   └── style.css                 # Renderer styles
├── js/
│   └── main.js                   # Renderer logic (slug routing, config fetching, DOM rendering)
├── assets/
│   └── images/                   # Static images referenced by the renderer
├── companies/
│   └── {slug}.json               # Published company configs ONLY
└── data/
    └── company.schema.json       # Schema reference (optional, if present)
```

Only `status: "published"` company configs are copied. Draft and archived configs are excluded.

---

## What is NOT deployed

Everything below stays on the operator's machine only. None of it appears in `public-demo/`.

| Excluded path | Why excluded |
|---|---|
| `dashboard/` | Internal admin tool. Contains API server, lead management UI, config editor. Not for public. |
| `dashboard/data/dashboard-state.json` | Technical pipeline state (new/generated/published status per lead). Internal only. |
| `dashboard/data/pilot-state.json` | Real-world sales tracking: outreach sent, replies, interest, won/lost. Confidential. |
| `dashboard/data/outreach-log.json` | Log of every WhatsApp sent. Confidential. |
| `dashboard/data/activity-log.json` | Operator activity log. Internal only. |
| `tools/` | Generation pipeline, ingestion scripts, deployment scripts. Operator tooling only. |
| `generated/configs/` | Draft company configs awaiting review. Not published. |
| `generated/outreach/` | Outreach scripts and WhatsApp messages. Confidential. |
| `data/ingestion/` | Raw NeST tender data, normalized records, qualified/rejected leads. Private lead data. |
| `leads/` | Lead enrichment data. Contains phone numbers, contact research. Private. |
| `data/company.config.js` | Config generation templates. Internal tooling. |
| `test-acceptance.js` | Acceptance test suite. Internal. |
| `test-results.json` | Test output. Internal. |
| `docs/` | Operational guides (PILOT_GUIDE, PILOT_RESULTS, etc.). Internal. |
| `vercel.json` | Alternate deployment config. Not used on Netlify. |
| `.env` files | Environment variables. Never deployed. |
| `*.local.*` files | Local overrides. Never deployed. |
| `node_modules/` | Dependencies. Never deployed. |
| `package.json` / `package-lock.json` | Dependency manifest. Internal. |

---

## Deployment workflow

### Full deployment sequence

```bash
# 1. Build public-demo/
node tools/deployment/prepare-netlify-demo.js

# 2. Audit for sensitive files
node tools/deployment/audit-public-demo.js

# 3. Deploy (one of the following)
#    Option A: Push to git — Netlify auto-deploys from public-demo/
#    Option B: Drag public-demo/ folder to Netlify deploy UI
```

### Netlify site settings (one-time setup)

- **Publish directory**: `public-demo`
- **Build command**: `node tools/deployment/prepare-netlify-demo.js`
  - Or leave blank and run the script manually before each deploy
- **Custom domain**: `demo.thisuncle.co.tz`
  - Add CNAME in DNS: `demo.thisuncle.co.tz → [your-site].netlify.app`

### Dry run (preview without writing files)

```bash
node tools/deployment/prepare-netlify-demo.js --dry-run
```

---

## Pre-deployment checklist

Before every deployment, confirm:

- [ ] `node tools/deployment/prepare-netlify-demo.js` ran without errors
- [ ] `node tools/deployment/audit-public-demo.js` exits with AUDIT PASSED
- [ ] `public-demo/companies/` contains only published configs
- [ ] No draft configs (`status: "draft"`) in `public-demo/companies/`
- [ ] No archived configs (`status: "archived"`) in `public-demo/companies/`
- [ ] No private JSON files (pilot-state, outreach-log, dashboard-state) in `public-demo/`
- [ ] Netlify publish directory is set to `public-demo` (not root)
- [ ] `_redirects` is present inside `public-demo/`

---

## Publishing and removing a company demo

### To publish a company

1. In the dashboard, open the lead and click **Publish Demo**.
2. Run `node tools/deployment/prepare-netlify-demo.js` to rebuild `public-demo/`.
3. Run `node tools/deployment/audit-public-demo.js` to verify.
4. Deploy (push to git or drag-and-drop).

### To remove a company from the live site

1. In the dashboard, change the company's status to `archived` or `draft`.
2. Run `node tools/deployment/prepare-netlify-demo.js` to rebuild `public-demo/`.
   - The archived/draft config will be excluded automatically.
3. Deploy.

The company's URL will return the fallback page (DEFAULT_SLUG) or a 404 depending on how main.js handles missing slugs.

---

## What a visitor sees

When someone opens `demo.thisuncle.co.tz/karibu-builders-ltd`:

1. Netlify serves `public-demo/index.html` (SPA redirect via `_redirects`).
2. The browser runs `js/main.js`.
3. `main.js` reads the URL path (`karibu-builders-ltd`), fetches `/companies/karibu-builders-ltd.json`.
4. The config is rendered into the page: hero, about, services, contact sections.
5. No server-side code runs. No database. No API. Pure static.

When someone opens an unknown slug (e.g. `/nonexistent`):
- `main.js` attempts to fetch `/companies/nonexistent.json`.
- If the fetch fails, `main.js` falls back to `DEFAULT_SLUG` (`karimjee-builders`).
- The visitor sees the karimjee-builders demo, not a 404.

Screenshot mode: `?mode=screenshot` adds `screenshot-mode` class before first paint, disabling animations. Useful for generating preview images.

---

## Security considerations

- No user data is collected. No forms. No tracking.
- No server-side code. Zero attack surface beyond static file serving.
- Company configs contain only publicly-intended business information.
- Pilot state, outreach logs, and lead enrichment data never leave the operator's machine.
- All sensitive state files (`pilot-state.json`, `outreach-log.json`, `dashboard-state.json`) are in `dashboard/data/` which is never included in `public-demo/`.
