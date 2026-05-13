# Project 10x — System Overview

**Last updated:** 2026-05-12
**Maintained by:** ThisUncle Technologies

This document explains the entire Project 10x platform in plain language.
It is written for developers, future AI agents, and anyone who needs to understand how the system works.

---

## 1. Project Vision

### What is Project 10x?

Project 10x is an AI-powered website generation and sales outreach platform built by ThisUncle Technologies for the Tanzanian market.

The core idea is simple: Tanzania has thousands of businesses that win government tenders but have no professional website. We find those businesses using NeST (the national tender awards database), generate a custom demo website for each one, and send them a WhatsApp message with the link.

When a prospect clicks the link and sees a beautiful, professional website with their real company name, real services, and real project history — they are far more likely to become a paying client than if we just sent a text pitch.

### What problem does it solve?

Most website agencies in Tanzania pitch cold. The prospect has never seen what their website would look like, so they say "send a proposal" or just ignore it. Project 10x eliminates that friction by showing the product before asking for money.

### How does the business model work?

1. We find companies that have just been awarded government tenders (they have money and credibility)
2. We check if they have a weak website or no website
3. We generate a custom demo website for them in minutes
4. We send a WhatsApp message with the demo link
5. If they reply and convert, we charge for the full website build
6. The demo site becomes their real site with minimal additional work

---

## 2. System Overview

Here is the full workflow the platform is being built to support:

```
NeST awarded tenders
  → AI lead qualification (does this company need a website?)
  → Social/web enrichment (find their real name, services, contacts, images)
  → Website quality analysis (rate their existing site: outdated / broken / none)
  → Company config generation (AI creates a JSON file describing their website)
  → Demo site rendering (the template reads the JSON and shows the website)
  → Deployment (the demo goes live at demo.thisuncle.co.tz/company-slug)
  → Outreach script generation (AI writes a WhatsApp message and voice note script)
  → CRM/dashboard tracking (we track who saw the demo and who responded)
```

**Current status:**
- The template rendering engine is complete (Sub-project 1 done).
- The config generation, website analysis, and outreach tools are complete (Sub-project 2 done).
- The local lead dashboard is complete (Sub-project 3 done).
- The NeST lead ingestion pipeline is complete (Sub-project 4 done).
- Screenshot automation and cloud deployment pipeline are planned (Sub-project 5).

---

## 3. Folder Structure

```
tut-master-template/
│
├── index.html          The single HTML page. Rarely needs editing.
│                       It is the shell — all content comes from the config.
│
├── companies/          All company configs live here as JSON files.
│   ├── karimjee-builders.json    Sample: construction company
│   ├── simba-logistics.json      Sample: logistics company
│   └── kilimanjaro-advisory.json Sample: consultancy firm
│
├── data/
│   └── company.schema.json   The rules for what a valid config looks like.
│                              Used to validate AI-generated configs before rendering.
│
├── js/
│   └── main.js        The entire rendering engine. Loads config, renders site, runs animations.
│
├── css/
│   └── style.css      All styles. CSS variables control brand colors.
│
├── assets/
│   └── images/        Company images go here (hero, about, projects, gallery, director).
│
├── vercel.json         Tells Vercel to route all URLs to index.html.
├── netlify.toml        Same thing for Netlify.
│
├── tools/              Node.js tools (Sub-projects 2 + 4).
│   ├── run-pipeline.js             Sub-project 2 orchestrator: lead → config + audit + outreach
│   ├── generate-company-config.js  Converts a lead record into a companies/*.json file
│   ├── website-quality-analyzer.js Fetches a URL and classifies it
│   ├── outreach-script-generator.js Generates WhatsApp + voice note scripts
│   ├── utils/
│   │   ├── slug.js         Slugify company name
│   │   ├── checksum.js     FNV-1a hash (same algorithm as main.js)
│   │   ├── defaults.js     Brand colour tokens per industry
│   │   ├── infer-industry.js Keyword → industry mapping
│   │   ├── validation.js   validateConfig() ported to Node
│   │   └── copy.js         All per-industry copy templates
│   └── ingestion/          Sub-project 4: NeST lead ingestion pipeline
│       ├── run-ingestion-pipeline.js  CLI orchestrator for all 6 stages
│       ├── nest-scraper.js            Stage 1: scrape NeST / import HTML / import CSV
│       ├── normalize-tender-records.js Stage 2: clean, date-parse, aggregate per company
│       ├── dedupe-companies.js         Stage 3: 3-pass deduplication
│       ├── discover-digital-presence.js Stage 4: enrich with CSV + auto-probe
│       ├── qualify-leads.js            Stage 5: score 0–100, split qualified/rejected
│       ├── import-qualified-to-dashboard.js Stage 6: write leads/ + update dashboard state
│       └── README.md                  Pipeline guide and enrichment CSV schema
│
├── leads/
│   ├── sample-leads.json        4 example raw lead records
│   └── imported-YYYY-MM-DD.json Leads imported from NeST ingestion (created at runtime)
│
├── data/
│   ├── company.schema.json      Config validation schema
│   └── ingestion/               NeST pipeline intermediate files (created at runtime)
│       ├── raw/                 Stage 1: raw tender records
│       ├── normalized/          Stages 2–4: normalized, deduped, enriched companies
│       ├── qualified/           Stage 5: leads that passed scoring
│       ├── rejected/            Stage 5: leads that did not qualify
│       └── logs/                Append-only logs for each stage
│
├── generated/              Output folder (created at runtime by Pipeline B)
│   ├── configs/            Draft company JSON configs (editable, not live)
│   └── outreach/           Generated outreach records (audit + scripts)
│
├── dashboard/              Local lead dashboard (Sub-project 3)
│   ├── server.js           Node http server, port 3001 — run with: node dashboard/server.js
│   ├── index.html          SPA shell
│   ├── css/dashboard.css   Dark operational theme
│   ├── js/dashboard.js     SPA logic: router, views, API client
│   ├── data/
│   │   ├── dashboard-state.json  Lead lifecycle state (keyed by slug)
│   │   └── activity-log.json     Append-only action log (capped at 500)
│   └── README.md           Dashboard dev guide
│
└── docs/
    ├── SYSTEM_OVERVIEW.md  This file.
    ├── GENERATION_TOOLS.md How to use the generation tools.
    ├── PIPELINE_FLOW.md    Full data-flow diagram: ingestion → generation → publishing.
    └── DASHBOARD.md        (see dashboard/README.md)
```

### Why this structure?

- **`companies/`** at root level means fetch URLs are clean: `/companies/abc-contractors.json`
- **`data/`** holds engine files (the schema), not client data
- **No `node_modules/`** — this project intentionally has no build step
- **One `index.html`** — the same file renders every company. The URL slug determines which config to load.

---

## 4. Config System

### What is a company config?

A company config is a JSON file that contains everything about a company: their name, colors, services, projects, contact details, and more. The rendering engine reads this file and builds the entire website from it.

Example filename: `companies/abc-contractors.json`

### How does the rendering engine use it?

When someone visits `demo.thisuncle.co.tz/abc-contractors`, the engine:

1. Reads `abc-contractors` from the URL
2. Fetches `/companies/abc-contractors.json`
3. Migrates the config to the current schema version
4. Fills in any missing fields with safe defaults
5. Validates the config and logs warnings for any issues
6. Injects the brand colors into CSS variables
7. Renders every section of the page with the company's content
8. Starts animations and interactions

### The `visible/items` pattern

Array sections (services, projects, stats, why-us, gallery, testimonials) use this shape:

```json
"services": {
  "visible": true,
  "items": [
    { "icon": "ri-building-2-line", "title": "Civil Construction", "body": "..." }
  ]
}
```

- `visible: false` hides the entire section, regardless of content
- `items: []` with `visible: true` also hides the section automatically
- This makes it easy for AI generators to hide sections they have no data for

### How does locale work?

Set `"locale": "en-TZ"` or `"locale": "sw-TZ"` in the config. This changes UI chrome strings:
- WhatsApp greeting messages
- Form button labels
- Form placeholders
- "Chat on WhatsApp" link text

Company content (service descriptions, project titles, etc.) does NOT change with locale.
It is written in whatever language the AI generator used.

### How does status work?

```json
"status": "published"  → renders normally
"status": "draft"      → renders with a yellow preview banner at the top
"status": "archived"   → shows an archived screen, no company content visible
```

This prevents accidentally sharing unfinished demos.

### Internal metadata

The `internal` block stores CRM data that is never shown to website visitors:

```json
"internal": {
  "leadId": "lead_00231",
  "salesRep": "judysen",
  "outreachStatus": "pending",
  "generatedBy": "claude-generator-v1",
  "source": "nest-awarded-tenders"
}
```

Future dashboard and CRM systems read this. The renderer ignores it completely.

---

## 5. Config Lifecycle (Rendering)

This is the exact sequence that runs every time someone visits a demo URL:

```
1. URL arrives: demo.thisuncle.co.tz/abc-contractors
   → Vercel/Netlify rewrites to index.html

2. index.html loads
   → Inline script checks ?mode=screenshot
   → If screenshot mode: adds class to <html> element immediately (for CSS)
   → Preloader starts (unless screenshot mode)

3. main.js runs
   → Reads slug from URL path (/abc-contractors → "abc-contractors")
   → Falls back to ?company= query param (for local dev)
   → Falls back to default slug if neither exists

4. Fetch: /companies/abc-contractors.json
   → If 404 or network error → show "Demo Not Found" screen, stop
   → If invalid JSON → show "Demo Unavailable" screen, stop

5. migrateConfig(raw)
   → Checks configVersion
   → Transforms old config shapes to current shape (e.g. flat arrays → {visible, items})
   → Returns updated config

6. normalizeConfig(config)
   → Fills every missing field with a safe default
   → Ensures no field can ever be null/undefined when renderers read it
   → Returns complete config

7. validateConfig(config)
   → Checks required fields exist
   → Logs console.warn for each issue
   → Never throws — rendering always continues

8. Status check
   → "archived" → show archived screen, stop rendering
   → "draft" → inject preview banner, continue rendering
   → "published" → continue rendering normally

9. applyMeta(config)
   → Injects title, description, OG tags, Twitter Card tags, canonical URL into <head>
   → This must run before rendering so link previews (WhatsApp shares) work correctly

10. renderAll(config)
    → Renders every section: hero, about, services, projects, stats, why-us,
      gallery, testimonials, CTA, contact, footer
    → All config strings are sanitized before DOM insertion
    → Missing images trigger graceful fallbacks (gradient backgrounds, hidden elements)

11. initContactForm(config)
    → Attaches WhatsApp form submit handler
    → Updates form labels with locale strings

12. trackEvent('page_loaded')
    → Fires analytics event (no-op unless window.__TUT_TRACK is defined)

13. If NOT screenshot mode:
    → initLenis() — smooth scroll
    → initCursor() — custom cursor
    → initHeader() — scroll state, mobile nav
    → initRevealAnimations() — GSAP scroll reveals
    → initMagneticButtons() — push effect on CTAs
    → initStatsCounter() — animated number count-up
    → initSwiper() — testimonials carousel
    → initLightbox() — gallery zoom
    → initHeroEntrance() — hero title animation

14. If screenshot mode:
    → All [data-reveal] elements made instantly visible
    → Stats show final values immediately
    → Swiper initialized but no autoplay
    → All animations disabled via CSS
    → Page is fully rendered and stable for screenshot capture
```

---

## 6. Screenshot Mode

### What is it?

Screenshot mode is a special rendering mode where all animations are disabled and the page is rendered instantly in its final stable state. It is designed for automated screenshot tools (Puppeteer, Playwright) that capture images of the page.

### Why does it exist?

Two reasons:

1. **OG images**: When you share a demo link on WhatsApp, WhatsApp shows a preview card with an image. That image should show the full rendered website. Screenshot mode makes it easy to automate this capture.

2. **Dashboard thumbnails**: The future lead dashboard will show a small thumbnail of each demo site. Screenshot mode makes it fast to generate those thumbnails.

### How to activate it?

Add `?mode=screenshot` to any demo URL:

```
demo.thisuncle.co.tz/abc-contractors?mode=screenshot
```

### What gets disabled?

- Preloader
- Lenis smooth scroll
- Custom cursor
- Magnetic button effects
- Film grain animation
- Hero ticker animation
- All GSAP reveal animations
- Swiper autoplay

### What stays active?

- Full content rendering (all sections)
- All styles and colors
- Images (loaded normally)
- Layout (fully expanded)

---

## 7. Security Rules

### Why security matters here

The company configs are generated by AI. That means the text fields (service descriptions, company names, project titles) could contain anything — including HTML tags, JavaScript, or malicious content.

If we insert AI-generated text directly into the DOM using `innerHTML`, an attacker who manipulates the config could inject scripts into every demo site.

### How we protect against this

**Rule 1: Use `textContent` for simple text**

When inserting text into an element, use `textContent` instead of `innerHTML`. `textContent` treats everything as plain text — HTML tags are displayed as text, not executed.

**Rule 2: Use `sanitizeText()` inside innerHTML template literals**

When we build HTML strings using template literals, every config value is passed through `sanitizeText()` first. This function escapes `<`, `>`, `&`, `"`, and `'` characters.

```js
// Safe:
element.innerHTML = `<p class="card__title">${sanitizeText(config.title)}</p>`;

// Unsafe (never do this):
element.innerHTML = `<p class="card__title">${config.title}</p>`;
```

**Rule 3: Use `sanitizeUrl()` for all URLs**

URLs from the config (social links, map embed URLs, image paths) go through `sanitizeUrl()` before being used as `href` or `src` attributes. This function rejects any URL that isn't HTTP/HTTPS, relative, `mailto:`, or `tel:`.

**Rule 4: Use event listeners for image errors**

Instead of inline `onerror="..."` attributes that could be manipulated, image error handling uses JavaScript event listeners attached after the HTML is rendered.

---

## 8. Analytics System

### How it works

The analytics system uses a single function: `trackEvent(name, data)`.

Every time something important happens (page load, WhatsApp click, form submit, gallery open), `trackEvent` is called with a standardized payload:

```js
{
  event:     "whatsapp_click",
  slug:      "abc-contractors",
  timestamp: "2026-05-12T14:30:00Z",
  locale:    "en-TZ",
  status:    "published",
  meta:      { /* any extra data */ }
}
```

### What gets tracked by default

- `page_loaded` — every visit
- `whatsapp_click` — any WhatsApp button
- `phone_click` — phone number click
- `cta_click` — hero and CTA banner buttons
- `gallery_open` — gallery item click
- `form_submit` — contact form submission
- `config_invalid` — config failed to load
- `render_error` — unexpected rendering error

### How to connect a real analytics service

No analytics vendor is baked in. To add tracking, define `window.__TUT_TRACK` before main.js loads:

```html
<script>
  window.__TUT_TRACK = function(payload) {
    // Send to Google Analytics, Plausible, or your own backend
    console.log('[Analytics]', payload);
  };
</script>
```

If `window.__TUT_TRACK` is not defined, tracking does nothing. The template also dispatches a `tut:track` CustomEvent on `document`, which any listener can consume.

---

## 9. Deployment Model

### How demo URLs work

Every company gets a unique URL slug:
```
demo.thisuncle.co.tz/abc-contractors
demo.thisuncle.co.tz/simba-logistics
demo.thisuncle.co.tz/kilimanjaro-advisory
```

There is only one HTML file (`index.html`). Vercel/Netlify rewrite rules send all paths to it. The URL slug is read by JavaScript to determine which company config to load.

### How to add a new company demo

1. Create `companies/new-company-slug.json` with valid config data
2. Deploy (or Vercel auto-deploys on git push)
3. The URL `demo.thisuncle.co.tz/new-company-slug` is immediately live

No code changes needed. No redeploy of the template needed (Vercel serves new files on next request).

### Vercel rewrite rule

```json
{ "rewrites": [{ "source": "/:slug", "destination": "/index.html" }] }
```

### Netlify redirect rule

```toml
[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200
```

### Local development

Open a local server (VS Code Live Server, `npx serve .`, Python's `http.server`, etc.) and use:
```
http://localhost:PORT/?company=karimjee-builders
```

The `?company=` query param is the local dev override. On production, the URL path takes over.

---

## 10. Future Planned Systems

These systems are not yet built. They are planned for Phase 2B–2F.

### NeST Lead Ingestion Pipeline ✓ BUILT
`tools/ingestion/` — 6-stage pipeline: scrape NeST awarded tenders (HTTP/HTML/CSV) → normalize company names and tender data → deduplicate (3-pass conservative strategy) → enrich with manual CSV or auto-probe → score and qualify (0–100 lead score, threshold 25) → import qualified leads to dashboard with `status: "new"`. Orchestrated via `run-ingestion-pipeline.js`. See `tools/ingestion/README.md` and `docs/PIPELINE_FLOW.md`.

### AI Enrichment Agent
Takes a company name and searches for additional information: website URL, social media links, phone numbers, images, services. Currently replaced by the manual enrichment CSV in the ingestion pipeline.

### Website Quality Analyzer ✓ BUILT
`tools/website-quality-analyzer.js` — Fetches a URL and classifies it: `NO_WEBSITE`, `OUTDATED_WEBSITE`, `MODERN_WEBSITE`, or `BROKEN_WEBSITE`. Uses heuristic HTML scoring (viewport meta, HTTPS, WhatsApp links, copyright year, etc.). Outputs a score, weakness list, and suggested pitch angle. No Puppeteer or Lighthouse required.

### Config Generator ✓ BUILT
`tools/generate-company-config.js` — Converts a raw lead record into a valid `companies/{slug}.json`. Uses per-industry copy templates, conservative stat defaults, and safe placeholder rules. Never invents directors, testimonials, or project history. Always outputs `status: "draft"`.

### Outreach Script Generator ✓ BUILT
`tools/outreach-script-generator.js` — Generates WhatsApp message, voice note script, and follow-up message keyed on the website classification. Produces both English and Swahili versions. Tone is human, consultative, and Tanzanian business-appropriate.

### Lead Dashboard ✓ BUILT
`dashboard/server.js` — Local Node http server (port 3001, zero npm dependencies). Views: Leads List, Lead Detail, Config Editor (fields form + raw JSON), Outreach Panel. Features: pipeline runner, publish flow (`generated/configs/` → `companies/`), status tracking, health indicators, copy buttons, activity logging. Start with `node dashboard/server.js`.

### Deployment Automation
Automates the creation of `companies/*.json` files and deployment to Vercel via API, reducing demo creation to a single button click.

---

## 11. Technical Decisions

### Why Vanilla JavaScript (no framework)?

The target clients deploy on shared hosting, Vercel free tier, or Netlify free tier. A build step (webpack, Vite, etc.) would add complexity that serves no purpose for this use case. The template is sent as a folder and opens in a browser — it must work anywhere without installation.

### Why no npm / no build tools?

Same reason. Also: AI agents that generate configs should not need to understand a build pipeline. The simpler the system, the easier it is to automate.

### Why config-driven rendering?

The same HTML/CSS/JS renders hundreds of different companies. Swapping a config file produces a completely different website. This is the only architecture that scales to mass demo generation.

### Why JSON configs (not JS)?

AI generators naturally output JSON. JSON has strict syntax that can be validated against a schema. It cannot contain executable code, which makes it safe to parse from untrusted sources. JS configs were used in the prototype phase but replaced for automation readiness.

### Why flat config structure?

Deeply nested structures are harder for AI to generate consistently. A flat structure with one level of nesting (the `visible/items` pattern) is easy to produce, easy to validate, and easy to diff when detecting manual edits.

### Why the `visible/items` pattern?

Having `visible: false` lets an AI generator say "I have no data for this section" explicitly, rather than leaving an empty array. It also lets a human editor hide a section without deleting its content (useful for archived companies or work-in-progress configs).

### Why screenshot mode?

Automated screenshot capture (for OG images and dashboard thumbnails) breaks on animated pages — the screenshot fires before animations complete. A dedicated rendering mode that disables all animations guarantees a stable, fully-rendered capture every time.

### Why hand-rolled validation (no `ajv`)?

Loading `ajv` from CDN would add another external dependency. The validation needs are modest: check required fields exist, check types, log warnings. A 40-line hand-rolled validator does this with zero dependencies and runs in any environment.

---

## 12. Current Limitations

This is an honest list of known weaknesses and future scaling concerns.

### Missing features (planned)
- No image hosting — all images must be local or on a CDN you control
- No slug uniqueness enforcement — two companies with similar names require manual slug management
- No real-time config updates — changing a deployed config requires a new file + redeploy
- No backend — the `internal` metadata block is stored in the config file, not a database

### Technical debt
- The contact form is WhatsApp-only; no email delivery fallback
- Locale support only covers UI chrome strings; full Swahili company content depends on the config generator
- No `prefers-reduced-motion` media query support (accessibility gap)
- The `checksum` field exists in the schema but nothing generates or verifies it yet

### Scaling concerns
- All company configs are public (anyone who knows the slug can read the JSON)
- No authentication on demo URLs — draft demos are only hidden by the UI banner, not by access control
- Vercel free tier has limits on file count and bandwidth; large-scale deployment may require a paid plan or CDN

### Future migration risks
- If the config schema changes significantly in a future version, `migrateConfig()` must be updated
- Image assets are stored locally in `assets/images/`; moving to a CDN will require updating all config paths

---

## 13. Changelog

### 2026-05-12 — Sub-project 4: NeST Lead Ingestion System
**Subsystem:** Lead ingestion pipeline
**What changed:**
- Added `tools/ingestion/nest-scraper.js` — Stage 1. Scrapes awarded tenders from nest.go.tz via HTTP fetch, saved HTML, or CSV import. Rate-limited at 2s/page. Detects JS-rendered pages and prints human-readable recovery instructions. Output: `data/ingestion/raw/*.json`.
- Added `tools/ingestion/normalize-tender-records.js` — Stage 2. Title-cases company names, parses ISO dates (8 format variants), converts award values to numeric TZS (handles USD/KES and M/B/K shorthands), infers industry via `infer-industry.js`, slugifies via `slug.js`, aggregates all tenders per company. Output: `data/ingestion/normalized/*-normalized.json`.
- Added `tools/ingestion/dedupe-companies.js` — Stage 3. Three-pass deduplication: (1) exact slug → auto-merge, (2) slugs match after stripping legal suffixes (Ltd/Co/Limited…) → auto-merge, (3) edit distance ≤ 2 → flagged REVIEW_NEEDED in log file, never auto-merged. Conservative by design.
- Added `tools/ingestion/discover-digital-presence.js` — Stage 4. Applies manual enrichment from a 14-column CSV (`slug, companyName, website, facebook, instagram, linkedin, tiktok, googleMaps, phone, whatsapp, email, location, notes, confidence`). Matches by slug first, companyName fallback. Validates all URLs; rejects invalid ones with a warning, never silently accepts. Optional `--auto` mode probes URL patterns (HEAD only; never scrapes social networks).
- Added `tools/ingestion/qualify-leads.js` — Stage 5. Calls `analyzeWebsite()` for URL-bearing leads. Scores each company 0–100 on: phone/WhatsApp/email presence, tender count, award value, industry fit, social presence, website weakness, data confidence. Splits output into `qualified/` (score ≥ 25) and `rejected/` directories.
- Added `tools/ingestion/import-qualified-to-dashboard.js` — Stage 6. Converts qualified companies to `sample-leads.json` schema. Checks for duplicates against all existing `leads/*.json` files. Writes `leads/imported-YYYY-MM-DD.json`. Updates `dashboard-state.json` with `status: "new"`. Does NOT run the Sub-project 2 generation pipeline — that is a separate, manual step.
- Added `tools/ingestion/run-ingestion-pipeline.js` — CLI orchestrator. `--from=stage --to=stage --only=stage` for partial runs. Forwards flags to each stage.
- Added `tools/ingestion/README.md` — full pipeline guide.
- Added `docs/PIPELINE_FLOW.md` — data-flow diagram for both pipelines.
- Updated `dashboard/server.js` `/api/sync` — now handles leads without generated configs (imported `status: "new"` leads). Uses `lead.slug` if present; falls back to `slugify(name)`. Leads with no config file get `status` from the lead record (defaults to `"new"`).
- Created `data/ingestion/` directory structure: `raw/`, `normalized/`, `qualified/`, `rejected/`, `logs/`.

**Why it changed:**
Sub-projects 1–3 built the rendering, generation, and dashboard infrastructure. Sub-project 4 closes the loop from prospect discovery to dashboard entry. The ingestion pipeline is intentionally separated from the generation pipeline: human review happens between import and config generation.

**Status lifecycle extended:**
`new` (imported, no config) → `generated` → `reviewed` → `published` → `contacted` → `replied` → `won`/`lost`/`archived`

**Impact:**
Running `node tools/ingestion/run-ingestion-pipeline.js` now takes NeST tender data all the way to qualified leads in the dashboard, ready for manual review and demo generation.

---

### 2026-05-12 — Sub-project 3: Acceptance Testing
**Subsystem:** Lead Dashboard test suite
**What changed:**
- Added `test-acceptance.js` — 83-test automated acceptance suite. Covers: server boot, pipeline execution, config editor (save/persist), publish flow (`generated/configs/` → `companies/`), outreach panel content, state + notes updates, activity log, 12 failure/error cases, demo template config states (published/draft/archived/screenshot mode), and Swahili copy quality spot-checks.
- Fixed Bug: API route regexes were `[a-z0-9-]+` — invalid slug formats (uppercase, underscores) silently fell through to 404 instead of 400. Changed routes to `[^\/]+` so all path segments hit the handler; `validSlug()` guard returns 400 for malformed slugs.

**Test results:** 83/83 passing, 0 failures, 0 regressions.

**Impact:** Sub-project 3 is fully acceptance-tested and production-ready for local use.

---

### 2026-05-12 — Sub-project 3: Lead Dashboard
**Subsystem:** Local sales operating system
**What changed:**
- Added `dashboard/server.js` — raw Node http server (port 3001, zero npm). Route table with 13 API endpoints. Serves static files from `dashboard/` with path-traversal protection. Requires Sub-project 2 tools directly (no child processes).
- Added `dashboard/index.html` — SPA shell with header, #app mount, toast, confirm modal
- Added `dashboard/css/dashboard.css` — dark operational theme (bg #0D1117, surface #161B22, accent #58A6FF). Status badges, classification badges, health bars, tabs, forms, JSON editor, confirm overlay.
- Added `dashboard/js/dashboard.js` — hash-based SPA. Views: Leads List, Lead Detail, Config Editor (key fields form + raw JSON tab), Outreach Panel (EN/SW tabs with copy buttons). Features: pipeline runner, status controls, publish flow, sync, toast notifications, confirm dialog.
- Added `dashboard/data/dashboard-state.json` — lead lifecycle state, keyed by slug (new → generated → reviewed → published → contacted → replied → won/lost/archived)
- Added `dashboard/data/activity-log.json` — append-only log, capped at 500 entries
- Added `dashboard/README.md` — API reference, completeness scoring table, limitations

**Publishing flow implemented:**
1. User edits draft config in Config Editor
2. Server saves to `generated/configs/{slug}.json`
3. User clicks Publish → server validates → copies to `companies/{slug}.json`
4. Status set to `"published"`, `publishedAt` timestamp added, `dashboard-state.json` updated

**Why it changed:**
Sub-projects 1 and 2 build the raw materials (template + generation tools). Sub-project 3 makes them usable day-to-day without touching the command line. The dashboard is the sales rep's interface to the entire pipeline.

**Impact:**
Running `node dashboard/server.js` starts a fully functional local dashboard at http://localhost:3001. No npm install required.

---

### 2026-05-12 — Sub-project 2: Generation & Analysis Tools
**Subsystem:** Config generation, website analysis, outreach scripting
**What changed:**
- Added `tools/generate-company-config.js` — converts raw lead records into valid `companies/*.json` configs
- Added `tools/website-quality-analyzer.js` — heuristic HTTP-based scorer; classifies `NO_WEBSITE`, `BROKEN_WEBSITE`, `OUTDATED_WEBSITE`, `MODERN_WEBSITE`
- Added `tools/outreach-script-generator.js` — generates WhatsApp messages, voice note scripts, follow-up messages in English and Swahili, keyed on website classification
- Added `tools/run-pipeline.js` — CLI orchestrator: takes a leads file, runs all three tools per lead, writes output to `generated/`
- Added `tools/utils/` — shared Node utilities: `slug.js`, `checksum.js`, `defaults.js`, `infer-industry.js`, `validation.js`, `copy.js`
- Added `leads/sample-leads.json` — 4 realistic sample leads covering all four classification scenarios
- Added `docs/GENERATION_TOOLS.md` — complete developer guide for the generation tools
- Industry support: construction, logistics, consultancy, healthcare, education, trading, engineering, corporate, general
- Safety rules enforced in code: no invented directors, testimonials, projects, phone numbers, or certifications; all configs output as `draft`

**Why it changed:**
Sub-project 1 built the rendering engine. Sub-project 2 builds the tools that produce the configs the engine renders. This completes the core automation loop: lead → config → demo site → outreach.

**Impact:**
Running `node tools/run-pipeline.js` now produces a complete demo config and outreach package for any raw lead in under 10 seconds (network-bound by website check).

---

### 2026-05-12 — Sub-project 1: Config System Infrastructure
**Subsystem:** Config system, rendering engine, deployment architecture
**What changed:**
- Company configs moved from `.js` files (`data/company.config.js`) to `.json` files (`companies/*.json`)
- Config loading changed from synchronous global (`const COMPANY = {...}`) to async `fetch()`
- Added migration pipeline: `migrateConfig()` transforms old config shapes to current
- Added normalization: `normalizeConfig()` fills missing fields with safe defaults
- Added validation: `validateConfig()` warns on issues, never blocks rendering
- Array sections wrapped in `{ visible, items }` pattern
- Added `configVersion`, `status`, `locale`, `lockedFields`, `internal` root fields
- Added `brand.industry` for fallback gradients
- Added `applyMeta()` for full OG/Twitter Card head injection
- Added screenshot mode (`?mode=screenshot`) for automated capture
- Added draft/archived status handling with distinct UI states
- Added `sanitizeText()` and `sanitizeUrl()` for safe AI-generated content rendering
- Added `trackEvent()` analytics hook system
- Added locale system (`en-TZ` / `sw-TZ`) with `t()` helper and en-TZ fallback
- Added `HERO_GRADIENTS` industry fallbacks for missing hero images
- Added `renderErrorState()` for not-found, invalid-config, and archived states
- Added `vercel.json` and `netlify.toml` for path-based routing
- Added `data/company.schema.json` (JSON Schema draft-07)
- Added `docs/SYSTEM_OVERVIEW.md` (this document)

**Why it changed:**
AI generation requires JSON (not JS), schema validation, async loading, and safe rendering.
The template was evolving from a static demo into a scalable generation platform.

**Impact:**
All three sample configs converted to JSON in `companies/`. The old `data/company.config.js` is now unused and can be deleted. The `index.html` no longer loads a config script — configs are fetched at runtime.
