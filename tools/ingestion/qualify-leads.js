'use strict';

/**
 * Stage 5 — Score and qualify companies as leads.
 *
 * Usage:
 *   node tools/ingestion/qualify-leads.js [--input=path] [--min-score=N] [--dry-run]
 *
 * Scoring (0–100):
 *   Phone present              +10
 *   WhatsApp present           +20
 *   Email present              +10
 *   Tender count  1–3          +10   4–10  +20   11+  +30
 *   Total value   > 100M TZS   +10   > 1B  +20
 *   Industry fit  (known)      +10
 *   Social presence any        +5    2+    +10
 *   Website weak (need us)     +10   (OUTDATED/BROKEN/NO_WEBSITE/SOCIAL_ONLY)
 *   Confidence ≥ 0.8           +5
 *
 * Qualified if score ≥ minScore (default 25).
 * Companies with website analysis failures (BROKEN) are still qualified
 * because a broken website is a sales signal.
 *
 * Output:
 *   data/ingestion/qualified/YYYY-MM-DDTHHMMSS-qualified.json
 *   data/ingestion/rejected/YYYY-MM-DDTHHMMSS-rejected.json
 */

const fs   = require('fs');
const path = require('path');

const { analyzeWebsite } = require('../website-quality-analyzer.js');

const ROOT      = path.resolve(__dirname, '..', '..');
const NORM_DIR  = path.join(ROOT, 'data', 'ingestion', 'normalized');
const QUAL_DIR  = path.join(ROOT, 'data', 'ingestion', 'qualified');
const REJ_DIR   = path.join(ROOT, 'data', 'ingestion', 'rejected');
const LOG_DIR   = path.join(ROOT, 'data', 'ingestion', 'logs');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { input: null, minScore: 25, dryRun: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--input='))     args.input    = a.split('=').slice(1).join('=');
    if (a.startsWith('--min-score=')) args.minScore = parseInt(a.split('=')[1], 10) || 25;
    if (a === '--dry-run')            args.dryRun   = true;
  }
  return args;
}

// ---------------------------------------------------------------------------
// Find most-recent enriched file; fall back to deduped
// ---------------------------------------------------------------------------
function latestEnrichedOrDeduped() {
  if (!fs.existsSync(NORM_DIR)) return null;
  const files = fs.readdirSync(NORM_DIR)
    .filter(f => f.endsWith('-enriched.json') || f.endsWith('-deduped.json'))
    .sort()
    .reverse();
  return files.length ? path.join(NORM_DIR, files[0]) : null;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
const WEAK_CLASSIFICATIONS = new Set(['NO_WEBSITE', 'SOCIAL_ONLY', 'OUTDATED_WEBSITE', 'BROKEN_WEBSITE']);
const KNOWN_INDUSTRIES = new Set([
  'construction', 'logistics', 'consultancy', 'healthcare',
  'education', 'trading', 'engineering', 'corporate',
]);

function scoreCompany(company, websiteResult) {
  let score = 0;
  const signals = [];

  // Contact signals
  if (company.phone)    { score += 10; signals.push('phone(+10)'); }
  if (company.whatsapp) { score += 20; signals.push('whatsapp(+20)'); }
  if (company.email)    { score += 10; signals.push('email(+10)'); }

  // Tender volume
  const tc = company.tenderCount || 0;
  if (tc >= 11)       { score += 30; signals.push('tenders>=11(+30)'); }
  else if (tc >= 4)   { score += 20; signals.push('tenders4-10(+20)'); }
  else if (tc >= 1)   { score += 10; signals.push('tenders1-3(+10)'); }

  // Award value
  const tv = company.totalAwardValue || 0;
  if (tv > 1_000_000_000)    { score += 20; signals.push('value>1B(+20)'); }
  else if (tv > 100_000_000) { score += 10; signals.push('value>100M(+10)'); }

  // Industry fit
  if (KNOWN_INDUSTRIES.has(company.industry)) {
    score += 10; signals.push('industry(' + company.industry + ')(+10)');
  }

  // Social presence
  const sm = company.socialMedia || {};
  const socialCount = ['facebook','instagram','linkedin','tiktok','twitter'].filter(k => sm[k]).length;
  if (socialCount >= 2)      { score += 10; signals.push('social2+(+10)'); }
  else if (socialCount >= 1) { score += 5;  signals.push('social1(+5)'); }

  // Website weakness (good signal — they need us)
  const cls = websiteResult ? websiteResult.classification : (company.website ? null : 'NO_WEBSITE');
  if (cls && WEAK_CLASSIFICATIONS.has(cls)) {
    score += 10; signals.push('weak_website(' + cls + ')(+10)');
  }

  // Data confidence
  if ((company.confidence || 0) >= 0.8) { score += 5; signals.push('confidence(+5)'); }

  return { score: Math.min(score, 100), signals };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);

  const inputFile = args.input ? path.resolve(args.input) : latestEnrichedOrDeduped();
  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error('[qualify] No enriched/deduped file found. Run previous stages first, or specify --input=path');
    process.exit(1);
  }

  console.log('[qualify] Reading:', inputFile);
  const companies = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  console.log('[qualify]', companies.length, 'companies to evaluate');
  console.log('[qualify] Min score:', args.minScore);

  const qualifiedList = [];
  const rejectedList  = [];

  for (const company of companies) {
    process.stdout.write('[qualify] Evaluating: ' + company.companyName + ' ... ');

    // Run website analysis if URL present
    let websiteResult = null;
    if (company.website) {
      try {
        websiteResult = await analyzeWebsite(company.website);
      } catch (err) {
        // Treat analysis failure as BROKEN (still a lead signal)
        websiteResult = { classification: 'BROKEN_WEBSITE', score: 0, error: err.message };
      }
    } else {
      websiteResult = { classification: 'NO_WEBSITE', score: 0 };
    }

    const { score, signals } = scoreCompany(company, websiteResult);
    const classification = websiteResult.classification || 'NO_WEBSITE';

    const enriched = {
      ...company,
      leadScore:      score,
      leadSignals:    signals,
      classification,
      websiteScore:   websiteResult.score || 0,
      qualifiedAt:    new Date().toISOString(),
    };

    if (score >= args.minScore) {
      qualifiedList.push(enriched);
      console.log('QUALIFIED (score:', score + ')');
    } else {
      enriched.rejectionReason = 'score below threshold (' + score + ' < ' + args.minScore + ')';
      rejectedList.push(enriched);
      console.log('REJECTED (score:', score + ')');
    }
  }

  console.log('[qualify] Qualified:', qualifiedList.length, '| Rejected:', rejectedList.length);

  if (args.dryRun) {
    console.log('[dry-run] Would write', qualifiedList.length, 'qualified, sample:');
    console.log(JSON.stringify(qualifiedList.slice(0, 1), null, 2));
    return;
  }

  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

  if (!fs.existsSync(QUAL_DIR)) fs.mkdirSync(QUAL_DIR, { recursive: true });
  if (!fs.existsSync(REJ_DIR))  fs.mkdirSync(REJ_DIR,  { recursive: true });

  const qualFile = path.join(QUAL_DIR, ts + '-qualified.json');
  const rejFile  = path.join(REJ_DIR,  ts + '-rejected.json');

  fs.writeFileSync(qualFile, JSON.stringify(qualifiedList, null, 2) + '\n', 'utf8');
  fs.writeFileSync(rejFile,  JSON.stringify(rejectedList,  null, 2) + '\n', 'utf8');

  console.log('[qualify] Qualified →', qualFile);
  console.log('[qualify] Rejected  →', rejFile);

  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, 'qualify.log');
  fs.appendFileSync(logFile, JSON.stringify({
    ts: new Date().toISOString(),
    event: 'complete', inputFile,
    qualified: qualifiedList.length,
    rejected:  rejectedList.length,
    minScore: args.minScore,
    qualFile, rejFile,
  }) + '\n', 'utf8');
}

main().catch(err => {
  console.error('[qualify] Fatal:', err.message);
  process.exit(1);
});
