'use strict';

/**
 * Stage 3 — Deduplicate companies from normalized records.
 *
 * Usage:
 *   node tools/ingestion/dedupe-companies.js [--input=path] [--dry-run]
 *
 * Three-pass strategy (conservative — never auto-merge uncertain matches):
 *   Pass 1: Exact slug match           → auto-merge, combine tenders
 *   Pass 2: Exact strippedSlug match   → auto-merge (e.g. "karibu-builders" matches "karibu-builders-ltd")
 *   Pass 3: Edit distance ≤ 2 on slug  → log as REVIEW_NEEDED, never auto-merge
 *
 * Output: data/ingestion/normalized/YYYY-MM-DDTHHMMSS-deduped.json
 *         data/ingestion/logs/deduped-YYYY-MM-DDTHHMMSS-review.json (REVIEW_NEEDED cases)
 */

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..', '..');
const NORM_DIR  = path.join(ROOT, 'data', 'ingestion', 'normalized');
const LOG_DIR   = path.join(ROOT, 'data', 'ingestion', 'logs');

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
// Find most-recent normalized file (not already a deduped file)
// ---------------------------------------------------------------------------
function latestNormalizedFile() {
  if (!fs.existsSync(NORM_DIR)) return null;
  const files = fs.readdirSync(NORM_DIR)
    .filter(f => f.endsWith('-normalized.json'))
    .sort()
    .reverse();
  return files.length ? path.join(NORM_DIR, files[0]) : null;
}

// ---------------------------------------------------------------------------
// Edit distance (Levenshtein)
// ---------------------------------------------------------------------------
function editDistance(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev.splice(0, prev.length, ...curr);
  }
  return prev[b.length];
}

// ---------------------------------------------------------------------------
// Merge two company records (winner keeps its slug/name; loser's data merged in)
// ---------------------------------------------------------------------------
function mergeInto(winner, loser) {
  // Combine raw names
  const allRawNames = new Set([...winner.rawNames, ...loser.rawNames]);
  winner.rawNames = Array.from(allRawNames);

  // Merge tenders (de-duplicate by scrapeId)
  const seenScrapeIds = new Set(winner.tenders.map(t => t.scrapeId));
  for (const t of loser.tenders) {
    if (!seenScrapeIds.has(t.scrapeId)) {
      winner.tenders.push(t);
      seenScrapeIds.add(t.scrapeId);
    }
  }

  // Recompute aggregate fields
  winner.tenderCount    = winner.tenders.length;
  winner.totalAwardValue = winner.tenders.reduce((s, t) => s + (t.awardValue || 0), 0);
  winner.latestAwardDate = winner.tenders
    .map(t => t.awardDate)
    .filter(Boolean)
    .sort()
    .reverse()[0] || null;

  // Merge sources
  const allSources = new Set([...winner.sources, ...loser.sources]);
  winner.sources = Array.from(allSources);

  winner.mergedFrom = winner.mergedFrom || [];
  winner.mergedFrom.push({ slug: loser.slug, companyName: loser.companyName });

  return winner;
}

// ---------------------------------------------------------------------------
// Deduplicate
// ---------------------------------------------------------------------------
function deduplicate(companies) {
  const reviewNeeded = [];

  // --- Pass 1: exact slug ---
  const bySlug = new Map();
  for (const c of companies) {
    if (bySlug.has(c.slug)) {
      const winner = bySlug.get(c.slug);
      mergeInto(winner, c);
      console.log('[dedupe] Pass 1 auto-merge:', c.slug, '← (duplicate slug)');
    } else {
      bySlug.set(c.slug, { ...c, tenders: [...c.tenders], rawNames: [...c.rawNames], sources: [...c.sources] });
    }
  }

  let result = Array.from(bySlug.values());

  // --- Pass 2: strippedSlug ---
  const byStripped = new Map();
  const pass2Merged = new Set();

  for (const c of result) {
    const key = c.strippedSlug || c.slug;
    if (byStripped.has(key)) {
      // Prefer the record with more tenders as the winner
      const existing = byStripped.get(key);
      let winner, loser;
      if (existing.tenderCount >= c.tenderCount) {
        winner = existing; loser = c;
      } else {
        winner = c; loser = existing;
        byStripped.set(key, c);
      }
      mergeInto(winner, loser);
      pass2Merged.add(loser.slug);
      console.log('[dedupe] Pass 2 auto-merge:', loser.slug, '→', winner.slug, '(stripped slug match)');
    } else {
      byStripped.set(key, c);
    }
  }

  result = result.filter(c => !pass2Merged.has(c.slug));

  // --- Pass 3: fuzzy (edit distance ≤ 2) — flag only, never merge ---
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const dist = editDistance(result[i].slug, result[j].slug);
      if (dist <= 2) {
        reviewNeeded.push({
          reason:    'edit_distance_' + dist,
          companies: [
            { slug: result[i].slug, name: result[i].companyName, tenders: result[i].tenderCount },
            { slug: result[j].slug, name: result[j].companyName, tenders: result[j].tenderCount },
          ],
        });
        console.log('[dedupe] Pass 3 REVIEW_NEEDED:', result[i].slug, 'vs', result[j].slug, '(distance:', dist + ')');
      }
    }
  }

  // Tag each result record with dedupe provenance
  for (const c of result) {
    c.dedupedAt = new Date().toISOString();
  }

  return { result, reviewNeeded };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
function timestampTag() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function writeLog(entry) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, 'dedupe.log');
  fs.appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);

  const inputFile = args.input ? path.resolve(args.input) : latestNormalizedFile();
  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error('[dedupe] No normalized file found. Run normalize-tender-records.js first, or specify --input=path');
    process.exit(1);
  }

  console.log('[dedupe] Reading:', inputFile);
  const companies = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  console.log('[dedupe]', companies.length, 'companies before dedup');

  const { result, reviewNeeded } = deduplicate(companies);
  const merged = companies.length - result.length;
  console.log('[dedupe]', result.length, 'companies after dedup (' + merged + ' merged)');
  if (reviewNeeded.length > 0) {
    console.log('[dedupe] REVIEW_NEEDED:', reviewNeeded.length, 'potential duplicate pairs — see review file');
  }

  if (args.dryRun) {
    console.log('[dry-run] Would write', result.length, 'companies. Sample:');
    console.log(JSON.stringify(result.slice(0, 2), null, 2));
    if (reviewNeeded.length > 0) {
      console.log('[dry-run] Review pairs:');
      console.log(JSON.stringify(reviewNeeded, null, 2));
    }
    return;
  }

  if (!fs.existsSync(NORM_DIR)) fs.mkdirSync(NORM_DIR, { recursive: true });

  const ts        = timestampTag();
  const outFile   = path.join(NORM_DIR,   ts + '-deduped.json');
  const revFile   = reviewNeeded.length > 0 ? path.join(LOG_DIR, 'deduped-' + ts + '-review.json') : null;

  fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log('[dedupe] Wrote', result.length, 'companies →', outFile);

  if (revFile) {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.writeFileSync(revFile, JSON.stringify(reviewNeeded, null, 2) + '\n', 'utf8');
    console.log('[dedupe] Review file →', revFile);
    console.log('[dedupe] ACTION REQUIRED: Inspect the review file and manually merge or confirm these pairs are distinct companies.');
  }

  writeLog({ event: 'complete', inputFile, beforeCount: companies.length, afterCount: result.length, merged, reviewCount: reviewNeeded.length, outFile });
}

main().catch(err => {
  console.error('[dedupe] Fatal:', err.message);
  process.exit(1);
});
