'use strict';

/**
 * Stage 4 — Enrich companies with digital presence data.
 *
 * Usage:
 *   node tools/ingestion/discover-digital-presence.js [--input=path] [--enrich=path.csv|path.json]
 *                                                      [--auto] [--dry-run]
 *
 * --enrich  Path to enrichment CSV or JSON file (14-column CSV schema below).
 *           Matched by slug first, then by companyName (case-insensitive).
 *
 * --auto    Probe common URL patterns for companies without a website:
 *             {slug}.co.tz, {slug}.com, {slug}.or.tz, www.{slug}.co.tz
 *           HEAD request only; marks as FOUND or NOT_FOUND.
 *           NEVER scrapes social networks.
 *
 * Enrichment CSV columns (14, order matters):
 *   slug, companyName, website, facebook, instagram, linkedin,
 *   tiktok, googleMaps, phone, whatsapp, email, location, notes, confidence
 *
 * Output: data/ingestion/normalized/YYYY-MM-DDTHHMMSS-enriched.json
 */

const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');

const ROOT     = path.resolve(__dirname, '..', '..');
const NORM_DIR = path.join(ROOT, 'data', 'ingestion', 'normalized');
const LOG_DIR  = path.join(ROOT, 'data', 'ingestion', 'logs');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { input: null, enrich: null, auto: false, dryRun: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--input='))  args.input  = a.split('=').slice(1).join('=');
    if (a.startsWith('--enrich=')) args.enrich = a.split('=').slice(1).join('=');
    if (a === '--auto')             args.auto   = true;
    if (a === '--dry-run')          args.dryRun = true;
  }
  return args;
}

// ---------------------------------------------------------------------------
// Find most-recent deduped file
// ---------------------------------------------------------------------------
function latestDedupedFile() {
  if (!fs.existsSync(NORM_DIR)) return null;
  const files = fs.readdirSync(NORM_DIR)
    .filter(f => f.endsWith('-deduped.json'))
    .sort()
    .reverse();
  return files.length ? path.join(NORM_DIR, files[0]) : null;
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------
function isValidUrl(raw) {
  if (!raw || typeof raw !== 'string') return false;
  const s = raw.trim();
  if (!s) return false;
  try {
    const u = new URL(s.startsWith('http') ? s : 'https://' + s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function normalizeUrl(raw) {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();
  if (!s.startsWith('http')) return 'https://' + s;
  return s;
}

// Validates and returns { url, valid, warning }
function validateUrl(raw, fieldName) {
  if (!raw || !raw.trim()) return { url: null, valid: true, warning: null };
  const candidate = normalizeUrl(raw);
  if (!isValidUrl(candidate)) {
    return { url: null, valid: false, warning: `Invalid URL for ${fieldName}: "${raw}" — rejected` };
  }
  return { url: candidate, valid: true, warning: null };
}

// ---------------------------------------------------------------------------
// CSV parser (14-column enrichment schema)
// ---------------------------------------------------------------------------
const ENRICH_COLUMNS = [
  'slug', 'companyName', 'website', 'facebook', 'instagram', 'linkedin',
  'tiktok', 'googleMaps', 'phone', 'whatsapp', 'email', 'location', 'notes', 'confidence',
];

function splitCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      cells.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function parseEnrichmentCsv(text) {
  const lines = text.split('\n').map(l => l.trimEnd());
  if (lines.length < 2) return [];

  // Accept either the canonical 14-column header or a headerless file (positional)
  const firstLine = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const hasHeader = firstLine.includes('slug') || firstLine.includes('companyname');
  const startRow  = hasHeader ? 1 : 0;

  const records = [];
  const warnings = [];

  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = splitCsvLine(line);

    // Map positionally against ENRICH_COLUMNS
    const row = {};
    ENRICH_COLUMNS.forEach((col, idx) => { row[col] = (cells[idx] || '').trim(); });

    if (!row.slug && !row.companyName) continue;

    // Validate URL fields
    const urlFields = ['website', 'facebook', 'instagram', 'linkedin', 'tiktok', 'googleMaps'];
    for (const field of urlFields) {
      if (row[field]) {
        const { url, valid, warning } = validateUrl(row[field], field);
        if (!valid) {
          warnings.push({ row: i + 1, field, raw: row[field], message: warning });
          console.warn('[enrich] WARNING row', i + 1, ':', warning);
          row[field] = '';
        } else {
          row[field] = url || '';
        }
      }
    }

    row.confidence = parseFloat(row.confidence) || 0;
    records.push(row);
  }

  if (warnings.length > 0) {
    console.warn('[enrich]', warnings.length, 'URL validation warning(s) — invalid URLs were rejected, not silently accepted');
  }

  return records;
}

function parseEnrichmentJson(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error('Enrichment JSON must be an array of objects');
  }
  return data;
}

// ---------------------------------------------------------------------------
// Build a lookup map from enrichment records
// ---------------------------------------------------------------------------
function buildEnrichmentMap(enrichRecords) {
  const bySlug     = new Map();
  const byNameLow  = new Map();

  for (const r of enrichRecords) {
    if (r.slug)        bySlug.set(r.slug.trim(),                        r);
    if (r.companyName) byNameLow.set(r.companyName.trim().toLowerCase(), r);
  }
  return { bySlug, byNameLow };
}

function findEnrichment(company, { bySlug, byNameLow }) {
  return bySlug.get(company.slug) || byNameLow.get(company.companyName.toLowerCase()) || null;
}

// ---------------------------------------------------------------------------
// Apply enrichment record to a company object
// ---------------------------------------------------------------------------
function applyEnrichment(company, enrich) {
  const updated = { ...company };

  // Only set if company doesn't already have a value
  const setIfMissing = (key, val) => { if (!updated[key] && val) updated[key] = val; };
  const setAlways    = (key, val) => { if (val !== undefined && val !== '') updated[key] = val; };

  // Contact info — enrichment wins for missing values
  setIfMissing('phone',    enrich.phone    || null);
  setIfMissing('whatsapp', enrich.whatsapp || null);
  setIfMissing('email',    enrich.email    || null);
  setIfMissing('location', enrich.location || null);

  // Website — enrichment always wins (manual lookup is more reliable than auto-probe)
  if (enrich.website) setAlways('website', enrich.website);

  // Social media — merge into object
  updated.socialMedia = updated.socialMedia || {};
  if (enrich.facebook)   updated.socialMedia.facebook   = enrich.facebook;
  if (enrich.instagram)  updated.socialMedia.instagram  = enrich.instagram;
  if (enrich.linkedin)   updated.socialMedia.linkedin   = enrich.linkedin;
  if (enrich.tiktok)     updated.socialMedia.tiktok     = enrich.tiktok;
  if (enrich.googleMaps) updated.socialMedia.googleMaps = enrich.googleMaps;

  // Notes — append enrichment notes (preserve original)
  if (enrich.notes) {
    updated.enrichNotes = enrich.notes;
  }

  // Confidence
  if (enrich.confidence > 0) updated.confidence = enrich.confidence;

  updated.enrichedAt = new Date().toISOString();
  updated.enrichSource = 'manual';
  return updated;
}

// ---------------------------------------------------------------------------
// Auto-probe: HEAD request to guess website (--auto mode)
// ---------------------------------------------------------------------------
function headRequest(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD', headers: { 'User-Agent': 'TUT-ingestion/1.0' } }, (res) => {
      resolve({ url, status: res.statusCode });
    });
    req.on('error', () => resolve({ url, status: null }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ url, status: null }); });
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function autoProbeWebsite(company) {
  if (company.website) return company; // already has one

  const slug = company.slug.replace(/-/g, '');
  const patterns = [
    `https://www.${company.slug}.co.tz`,
    `https://${company.slug}.co.tz`,
    `https://www.${slug}.co.tz`,
    `https://${company.slug}.com`,
    `https://www.${company.slug}.com`,
    `https://${company.slug}.or.tz`,
  ];

  for (const url of patterns) {
    const result = await headRequest(url);
    if (result.status && result.status < 400) {
      console.log('[enrich] Auto-probe found:', url, '(HTTP', result.status + ')');
      return { ...company, website: url, enrichedAt: new Date().toISOString(), enrichSource: 'auto-probe' };
    }
    await sleep(500);
  }
  return company;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
function timestampFilename() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-enriched.json';
}

function writeLog(entry) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, 'enrichment.log');
  fs.appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);

  const inputFile = args.input ? path.resolve(args.input) : latestDedupedFile();
  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error('[enrich] No deduped file found. Run dedupe-companies.js first, or specify --input=path');
    process.exit(1);
  }

  console.log('[enrich] Reading:', inputFile);
  let companies = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  console.log('[enrich]', companies.length, 'companies');

  // --- Apply CSV/JSON enrichment
  let enrichedCount = 0;
  if (args.enrich) {
    const enrichPath = path.resolve(args.enrich);
    if (!fs.existsSync(enrichPath)) {
      console.error('[enrich] Enrichment file not found:', enrichPath);
      process.exit(1);
    }
    const text = fs.readFileSync(enrichPath, 'utf8');
    const enrichRecords = enrichPath.endsWith('.json') ? parseEnrichmentJson(text) : parseEnrichmentCsv(text);
    console.log('[enrich] Loaded', enrichRecords.length, 'enrichment records from', path.basename(enrichPath));

    const lookup = buildEnrichmentMap(enrichRecords);
    companies = companies.map(c => {
      const e = findEnrichment(c, lookup);
      if (e) { enrichedCount++; return applyEnrichment(c, e); }
      return c;
    });
    console.log('[enrich] Applied enrichment to', enrichedCount, 'companies');
  }

  // --- Auto-probe
  if (args.auto) {
    console.log('[enrich] Auto-probing websites (HEAD requests, 500ms delay each pattern)...');
    const withoutWebsite = companies.filter(c => !c.website);
    console.log('[enrich]', withoutWebsite.length, 'companies without website to probe');

    for (let i = 0; i < companies.length; i++) {
      if (!companies[i].website) {
        companies[i] = await autoProbeWebsite(companies[i]);
      }
    }
  }

  if (!args.enrich && !args.auto) {
    console.log('[enrich] No --enrich file and no --auto flag. Pass-through only (no changes made).');
    console.log('[enrich] Tip: create an enrichment CSV and run with --enrich=path/to/enrichment.csv');
  }

  if (args.dryRun) {
    console.log('[dry-run] Would write', companies.length, 'companies. Sample:');
    console.log(JSON.stringify(companies.slice(0, 2), null, 2));
    return;
  }

  if (!fs.existsSync(NORM_DIR)) fs.mkdirSync(NORM_DIR, { recursive: true });
  const outFile = path.join(NORM_DIR, timestampFilename());
  fs.writeFileSync(outFile, JSON.stringify(companies, null, 2) + '\n', 'utf8');
  console.log('[enrich] Wrote', companies.length, 'companies →', outFile);
  writeLog({ event: 'complete', inputFile, count: companies.length, enrichedCount, outFile });
}

main().catch(err => {
  console.error('[enrich] Fatal:', err.message);
  process.exit(1);
});
