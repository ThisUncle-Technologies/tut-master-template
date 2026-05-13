'use strict';

/**
 * Stage 2 — Normalize raw tender records.
 *
 * Usage:
 *   node tools/ingestion/normalize-tender-records.js [--input=path] [--dry-run]
 *
 * Reads the most-recent raw file from data/ingestion/raw/ unless --input is given.
 * Output: data/ingestion/normalized/YYYY-MM-DDTHHMMSS-normalized.json
 *
 * Each output record represents one company with all its tenders aggregated.
 */

const fs   = require('fs');
const path = require('path');

const { slugify }       = require('../utils/slug.js');
const { inferIndustry } = require('../utils/infer-industry.js');

const ROOT         = path.resolve(__dirname, '..', '..');
const RAW_DIR      = path.join(ROOT, 'data', 'ingestion', 'raw');
const NORM_DIR     = path.join(ROOT, 'data', 'ingestion', 'normalized');
const LOG_DIR      = path.join(ROOT, 'data', 'ingestion', 'logs');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { input: null, dryRun: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--input=')) args.input  = a.split('=').slice(1).join('=');
    if (a === '--dry-run')        args.dryRun  = true;
  }
  return args;
}

// ---------------------------------------------------------------------------
// Find most-recent raw file
// ---------------------------------------------------------------------------
function latestRawFile() {
  if (!fs.existsSync(RAW_DIR)) return null;
  const files = fs.readdirSync(RAW_DIR)
    .filter(f => f.endsWith('-raw.json'))
    .sort()
    .reverse();
  return files.length ? path.join(RAW_DIR, files[0]) : null;
}

// ---------------------------------------------------------------------------
// Name normalisation
// ---------------------------------------------------------------------------

// Title-case a company name. Preserves common Tanzanian short words lowercase.
const LOWER_WORDS = new Set(['and', 'of', 'for', 'the', 'a', 'an', 'in', 'on', 'at', 'by', '&']);
// Common suffixes to keep uppercase
const UPPER_WORDS = new Set(['ltd', 'llc', 'co', 'plc', 'lp', 'tz', 'ngo', 'cbo']);

function titleCaseName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, '') // strip non-ASCII for safety
    .split(/\s+/)
    .map((word, i) => {
      if (!word) return word;
      // Strip trailing period/comma for comparison
      const base = word.replace(/[.,]$/, '');
      if (UPPER_WORDS.has(base)) return word.toUpperCase();
      if (i > 0 && LOWER_WORDS.has(base)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

// Tries to parse various date formats into YYYY-MM-DD. Returns null if unknown.
function parseDate(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // Already ISO: 2024-03-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // DD Month YYYY e.g. "15 March 2024" or "15-March-2024"
  const months = {
    january:1, february:2, march:3, april:4, may:5, june:6,
    july:7, august:8, september:9, october:10, november:11, december:12,
    jan:1, feb:2, mar:3, apr:4, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
  };
  const dmstr = s.match(/^(\d{1,2})[\s\-]([a-z]+)[\s\-](\d{4})$/i);
  if (dmstr) {
    const m = months[dmstr[2].toLowerCase()];
    if (m) return `${dmstr[3]}-${String(m).padStart(2,'0')}-${dmstr[1].padStart(2,'0')}`;
  }

  // Month DD, YYYY
  const mds = s.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (mds) {
    const m = months[mds[1].toLowerCase()];
    if (m) return `${mds[3]}-${String(m).padStart(2,'0')}-${mds[2].padStart(2,'0')}`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Award value parsing
// ---------------------------------------------------------------------------

// Returns numeric value in TZS, or null.
// Input examples: "TZS 1,200,000", "1200000", "TSh 4.5M", "USD 50,000"
const USD_TO_TZS = 2600; // approximate — used only for rough scoring
const KES_TO_TZS = 19;

function parseAwardValue(raw) {
  if (!raw) return null;
  let s = raw.trim().replace(/,/g, '').replace(/\s+/g, ' ').toUpperCase();

  let multiplier = 1;
  let currency = 'TZS';

  if (s.includes('USD') || s.includes('US$') || s.includes('$')) {
    currency = 'USD'; multiplier = USD_TO_TZS;
  } else if (s.includes('KES') || s.includes('KSH')) {
    currency = 'KES'; multiplier = KES_TO_TZS;
  }

  // Handle shorthand like 4.5M, 2B
  s = s.replace(/[A-Z$\s]/g, '');
  let m = 1;
  if (s.endsWith('M')) { m = 1_000_000; s = s.slice(0, -1); }
  else if (s.endsWith('B')) { m = 1_000_000_000; s = s.slice(0, -1); }
  else if (s.endsWith('K')) { m = 1_000; s = s.slice(0, -1); }

  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return Math.round(n * m * multiplier);
}

// ---------------------------------------------------------------------------
// Slug generation — strip common legal suffixes before slugifying
// ---------------------------------------------------------------------------
const LEGAL_SUFFIXES = [
  ' limited', ' ltd', ' co ltd', ' co. ltd', ' company limited',
  ' (t) ltd', '(t) limited', ' plc', ' llc', ' lp', ' inc', ' corp',
  ' incorporated', ' & co', ' and co',
];

function companySlugs(name) {
  const lower = name.toLowerCase().trim();
  let stripped = lower;
  for (const suf of LEGAL_SUFFIXES) {
    if (stripped.endsWith(suf.trim())) {
      stripped = stripped.slice(0, stripped.length - suf.trim().length).trim();
      break;
    }
  }
  return {
    slug:         slugify(lower),
    strippedSlug: slugify(stripped),
  };
}

// ---------------------------------------------------------------------------
// Aggregate raw records into per-company objects
// ---------------------------------------------------------------------------
function aggregate(records) {
  const bySlug = new Map();

  for (const rec of records) {
    const normName = titleCaseName(rec.rawCompanyName);
    if (!normName) continue;

    const { slug, strippedSlug } = companySlugs(normName);

    if (!bySlug.has(slug)) {
      bySlug.set(slug, {
        slug,
        strippedSlug,
        companyName:  normName,
        rawNames:     new Set(),
        tenders:      [],
        scrapedAt:    rec.scrapedAt,
        sources:      new Set(),
      });
    }

    const company = bySlug.get(slug);
    company.rawNames.add(rec.rawCompanyName);

    const awardDate  = parseDate(rec.rawAwardDate);
    const awardValue = parseAwardValue(rec.rawAwardValue);

    company.tenders.push({
      scrapeId:       rec.scrapeId,
      title:          rec.rawTenderTitle  || '',
      procuringEntity:rec.rawProcuringEntity || '',
      awardDate,
      awardValue,
      rawAwardDate:   rec.rawAwardDate  || '',
      rawAwardValue:  rec.rawAwardValue || '',
      category:       rec.rawCategory   || '',
    });

    if (rec.sourceUrl) company.sources.add(rec.sourceUrl);
  }

  // Convert Sets and compute aggregate fields
  const results = [];
  for (const c of bySlug.values()) {
    const tenderCount  = c.tenders.length;
    const totalValue   = c.tenders.reduce((sum, t) => sum + (t.awardValue || 0), 0);
    const latestDate   = c.tenders
      .map(t => t.awardDate)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;

    // Build a pseudo-lead for industry inference
    const pseudoLead = {
      name:     c.companyName,
      industry: null,
      services: [],
      notes:    c.tenders.map(t => t.title + ' ' + t.category).join(' '),
    };

    results.push({
      slug:          c.slug,
      strippedSlug:  c.strippedSlug,
      companyName:   c.companyName,
      rawNames:      Array.from(c.rawNames),
      industry:      inferIndustry(pseudoLead),
      tenderCount,
      totalAwardValue: totalValue,
      latestAwardDate: latestDate,
      tenders:       c.tenders,
      sources:       Array.from(c.sources),
      scrapedAt:     c.scrapedAt,
      normalizedAt:  new Date().toISOString(),
    });
  }

  // Sort by tender count desc, then name asc
  results.sort((a, b) => b.tenderCount - a.tenderCount || a.companyName.localeCompare(b.companyName));
  return results;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
function timestampFilename() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-normalized.json';
}

function writeLog(entry) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, 'normalizer.log');
  fs.appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);

  const inputFile = args.input ? path.resolve(args.input) : latestRawFile();
  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error('[normalizer] No raw file found. Run nest-scraper.js first, or specify --input=path');
    process.exit(1);
  }

  console.log('[normalizer] Reading:', inputFile);
  const raw = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  console.log('[normalizer]', raw.length, 'raw records');

  const companies = aggregate(raw);
  console.log('[normalizer] Aggregated into', companies.length, 'companies');

  if (args.dryRun) {
    console.log('[dry-run] Would write', companies.length, 'companies. Sample:');
    console.log(JSON.stringify(companies.slice(0, 2), null, 2));
    return;
  }

  if (!fs.existsSync(NORM_DIR)) fs.mkdirSync(NORM_DIR, { recursive: true });
  const outFile = path.join(NORM_DIR, timestampFilename());
  fs.writeFileSync(outFile, JSON.stringify(companies, null, 2) + '\n', 'utf8');
  console.log('[normalizer] Wrote', companies.length, 'companies →', outFile);
  writeLog({ event: 'complete', inputFile, count: companies.length, outFile });
}

main().catch(err => {
  console.error('[normalizer] Fatal:', err.message);
  process.exit(1);
});
