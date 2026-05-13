# Generation Tools — Developer Guide

**Last updated:** 2026-05-12
**Maintained by:** ThisUncle Technologies

This document explains how to use the Sub-project 2 generation tools: the config generator, website analyzer, outreach script generator, and the pipeline orchestrator that ties them together.

---

## Overview

The generation tools are Node.js scripts that convert raw lead data into:

1. A valid `companies/{slug}.json` config ready for the demo template
2. A website quality classification for the lead's existing site
3. Personalised WhatsApp messages and voice note scripts for outreach

They run from the command line. No build step, no server, no API keys required.

---

## Prerequisites

- Node.js 16 or later
- No npm install needed — all tools use built-in Node.js modules only

---

## Quick Start

Run the full pipeline against all sample leads:

```bash
node tools/run-pipeline.js
```

This will:
- Analyze each lead's website (or detect NO_WEBSITE)
- Generate a company config for each lead → `generated/configs/`
- Generate outreach scripts for each lead → `generated/outreach/`

To skip website HTTP checks (offline / testing):

```bash
node tools/run-pipeline.js --no-web
```

To run against a different leads file:

```bash
node tools/run-pipeline.js leads/my-leads.json
```

---

## Folder Structure

```
tools/
  run-pipeline.js              ← orchestrator (run this)
  generate-company-config.js   ← config generator
  website-quality-analyzer.js  ← website scorer
  outreach-script-generator.js ← script generator
  utils/
    slug.js           ← slugify(name)
    checksum.js       ← fnv1a hash
    defaults.js       ← brand colours per industry
    infer-industry.js ← keyword → industry mapping
    validation.js     ← config validator (Node port of main.js)
    copy.js           ← all per-industry template copy

leads/
  sample-leads.json     ← 4 example leads (edit or replace)

generated/
  configs/              ← output configs (git-ignore or review before use)
  outreach/             ← output outreach records
```

---

## Input Format — Lead Record

Each lead is a flat JSON object. Only `name` is required. Everything else is optional and defaults gracefully.

```json
{
  "leadId":        "lead-001",
  "name":          "Karibu Builders Ltd",
  "tagline":       "",
  "phone":         "+255 754 123 456",
  "whatsapp":      "255754123456",
  "email":         "info@karibubuilders.co.tz",
  "address":       "Mbezi Beach, Dar es Salaam, Tanzania",
  "website":       null,
  "industry":      "construction",
  "services":      ["civil works", "renovations", "tiling"],
  "location":      "Dar es Salaam",
  "locale":        "en-TZ",
  "yearFounded":   2015,
  "socialMedia":   {
    "facebook":  "https://facebook.com/karibubuilders",
    "instagram": "",
    "linkedin":  "",
    "twitter":   ""
  },
  "salesRep":      "Victor",
  "outreachStatus":"pending",
  "source":        "nest-awarded-tenders",
  "notes":         "Active on Facebook. No website found."
}
```

### Field reference

| Field | Required | Notes |
|-------|----------|-------|
| `name` | **Yes** | Company name. Used to derive the slug. |
| `leadId` | No | Your CRM reference ID. Stored in `internal.leadId`. |
| `phone` | No | Written verbatim into `contact.phone`. Not validated. |
| `whatsapp` | No | Digits only (e.g. `255754123456`). Used for all WhatsApp CTAs. |
| `email` | No | Written verbatim into `contact.email`. |
| `address` | No | Written verbatim into `contact.address`. |
| `website` | No | Set to `null` or `""` if no website. Used for quality analysis. |
| `industry` | No | If omitted, inferred from name + services. |
| `services` | No | Array of service descriptions. Used for industry inference. |
| `locale` | No | `"en-TZ"` (default) or `"sw-TZ"`. Affects outreach script language priority. |
| `yearFounded` | No | Stored in notes but not rendered in the demo. |
| `socialMedia` | No | Object with `facebook`, `instagram`, `linkedin`, `twitter`, `youtube`. |
| `salesRep` | No | Stored in `internal.salesRep` and used in outreach scripts. |
| `outreachStatus` | No | Stored in `internal.outreachStatus`. Default: `"pending"`. |
| `source` | No | Stored in `internal.source`. Default: `"leads-pipeline"`. |
| `notes` | No | Used only for industry inference, not rendered. |

---

## Output — Company Config

Each lead produces a `generated/configs/{slug}.json` file that is a valid Sub-project 1 config.

**What is always generated:**
- `brand` — name, tagline, colours (from industry defaults)
- `hero` — headline, subheadline, badges, CTAs
- `about` — heading, two body paragraphs
- `services` — 6 cards (from industry template library)
- `stats` — 4 stats (conservative floor values)
- `whyUs` — 6 points (from industry template library)
- `cta` — heading, subheading, button label
- `contact` — phone, whatsapp, email, address (verbatim from lead)
- `social` — social links (verbatim from lead)
- `internal` — leadId, salesRep, generatedBy, outreachStatus

**What is always empty/disabled:**
- `projects` — `{ visible: false, items: [] }` — must be filled by human editor
- `gallery` — `{ visible: false, items: [] }` — must be filled by human editor
- `testimonials` — `{ visible: false, items: [] }` — NEVER auto-generated
- `about.director` — always `null` — listed in `lockedFields`

**Status is always `"draft"`** — configs must be manually promoted to `"published"`.

---

## Output — Outreach Record

Each lead produces a `generated/outreach/{slug}-outreach.json` file containing:

```json
{
  "leadId": "lead-001",
  "name": "Karibu Builders Ltd",
  "slug": "karibu-builders-ltd",
  "websiteAudit": {
    "classification": "NO_WEBSITE",
    "score": 0,
    "redesignRecommended": true,
    "weaknesses": ["no website URL provided"],
    "strengths": [],
    "suggestedPitchAngle": "no-website"
  },
  "outreachScript": {
    "classification": "NO_WEBSITE",
    "suggestedPitchAngle": "no-website",
    "en": {
      "whatsappMessage": "...",
      "voiceNoteScript": "...",
      "followUpMessage": "..."
    },
    "sw": {
      "whatsappMessage": "...",
      "voiceNoteScript": "...",
      "followUpMessage": "..."
    },
    "primary": "en"
  },
  "generatedAt": "2026-05-12T..."
}
```

---

## Website Quality Analyzer

### What it checks

| Signal | Points |
|--------|--------|
| HTTPS | +10 |
| Reachable (2xx/3xx) | +10 |
| `<meta name="viewport">` | +15 |
| WhatsApp link in body | +10 |
| Contact info (phone/email pattern) | +10 |
| Has `<h1>` tag | +5 |
| Open Graph tags | +5 |
| Page loads under 3s | +5 |
| Has CTA buttons | +5 |
| Copyright year < 2022 | −5 |
| Copyright year < 2018 | −15 |
| Table-based layout (>3 tables) | −15 |
| Missing `<h1>` | −5 |
| Loads in 6s+ | −10 |

### Score → Classification

| Score | Classification |
|-------|---------------|
| URL is null/empty | `NO_WEBSITE` |
| Unreachable | `BROKEN_WEBSITE` |
| < 45 | `OUTDATED_WEBSITE` |
| ≥ 45 | `MODERN_WEBSITE` |

### Run standalone

```bash
node tools/website-quality-analyzer.js http://example.com
```

### Limitations

- Does not use a headless browser — JavaScript-rendered content is not evaluated
- Redirect chains deeper than 3 hops are not followed
- Pages larger than 200 KB are truncated before scoring
- Cannot detect all forms of mobile-unfriendliness
- Score is a heuristic, not a professional audit

---

## Config Generator

### Run standalone

```bash
# Generate from a file containing an array of leads
node tools/generate-company-config.js leads/sample-leads.json

# Generate from a JSON string
node tools/generate-company-config.js '{"name":"Acme Ltd","whatsapp":"255700000000"}'
```

### Industry inference

If `industry` is not set in the lead record, the generator scans `name + services + notes` for keywords:

| Industry | Sample keywords |
|----------|----------------|
| `construction` | builder, civil, renovati, tiling, plumbing, ujenzi |
| `logistics` | freight, transport, clearance, warehouse, usafirishaji |
| `consultancy` | consult, advisory, M&E, monitoring, policy |
| `healthcare` | hospital, clinic, medical, afya, dental |
| `education` | school, college, academy, training, shule |
| `trading` | trading, wholesale, import, hardware, biashara |
| `engineering` | engineer, electrical, ICT, structural |
| `corporate` | group, holding, investment, finance |
| `general` | (fallback if nothing matches) |

First keyword match wins.

### Brand colours per industry

| Industry | Accent |
|----------|--------|
| construction | `#C9431B` (terracotta) |
| logistics | `#1B5E8C` (ocean blue) |
| consultancy | `#2D5A27` (forest green) |
| healthcare | `#1A6B52` (teal green) |
| education | `#2A3D8C` (indigo blue) |
| trading | `#8C5A1A` (amber) |
| engineering | `#3D3D3D` (charcoal) |
| corporate | `#1A2A5E` (navy) |
| general | `#C9431B` (terracotta) |

### Adding a new industry

1. Add keywords to `tools/utils/infer-industry.js` under a new key
2. Add brand colours to `tools/utils/defaults.js` under the same key
3. Add a full copy block to `tools/utils/copy.js` — use the `general` block as a starting template
4. The generator will automatically use the new industry for any lead that matches its keywords

---

## Outreach Scripts

### Four pitch angles

The script content changes completely based on the website classification:

| Classification | Pitch angle | Opening line |
|---------------|-------------|-------------|
| `NO_WEBSITE` | Built you a demo | "I noticed you don't have a company website yet…" |
| `BROKEN_WEBSITE` | Fixed your site | "I tried to open your website but it wasn't loading…" |
| `OUTDATED_WEBSITE` | Modernised your site | "I came across your current website and built a modern version…" |
| `MODERN_WEBSITE` | Upgrade offer | "Your current website is solid — I built a demo showing what a premium upgrade could look like…" |

### Script formats

- **whatsappMessage** — ≤ 300 characters. Plain text. No markdown. Sent directly.
- **voiceNoteScript** — ≈ 130 words / 45–60 seconds at normal speech pace. Read aloud by the sales rep.
- **followUpMessage** — Short day-3 re-engagement message if there is no reply.

Both English (`en`) and Swahili (`sw`) versions are always generated. `primary` field tells you which to use first based on the lead's locale.

### Run standalone

```bash
node tools/outreach-script-generator.js leads/lead.json audit-result.json karibu-builders
```

---

## Safety Rules

These rules are enforced in the code, not just documented here.

1. **Never invent directors.** `about.director` is always `null` in generated configs. It is in `lockedFields`. A human must add this manually after verification.

2. **Never invent testimonials.** The `testimonials` section is always `{ visible: false, items: [] }`. A human must add these after client approval.

3. **Never invent projects.** The `projects` section is always `{ visible: false, items: [] }`. A human must add real project history.

4. **Never invent phone numbers.** Contact fields come verbatim from the lead record. If the lead record has no phone, the field is empty.

5. **Never invent awards, certifications, or registrations.** The WhyUs copy says "registered" only in generic terms (e.g. "Fully registered with TRA") — not claiming specific certificate numbers.

6. **Stats are conservative.** Auto-generated stats use floor values from the industry template (e.g. "8+ years", "50+ projects"). They are intentionally low so they cannot be false claims.

7. **Status is always `"draft"`.** Generated configs are never published automatically. A human must review and set `"status": "published"`.

8. **The demo is never presented as the company's official website.** The draft banner makes this clear. The outreach scripts say "demo" explicitly.

---

## What Is Still Manual

After running the pipeline, a human editor should review each config and:

- [ ] Add real project history to `projects` section
- [ ] Add real gallery images to `gallery` section
- [ ] Add the director or key person to `about.director` (if desired)
- [ ] Add verified testimonials to `testimonials` section
- [ ] Upload company images to `assets/images/` and update image paths
- [ ] Review and adjust all copy (especially tagline and about body)
- [ ] Verify contact details are correct
- [ ] Set `status: "published"` when the demo is ready to share
- [ ] Update `internal.outreachStatus` after sending

---

## What Will Move to the Dashboard (Sub-project 3)

- A web UI to view all leads and their pipeline status
- One-click pipeline runs from the browser
- Screenshot capture and OG image generation
- Deployment status tracking (is the demo live?)
- WhatsApp message sending log
- Analytics: which demos are being viewed
