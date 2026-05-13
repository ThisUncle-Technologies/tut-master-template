'use strict';

/**
 * CLI orchestrator for the NeST lead ingestion pipeline.
 *
 * Stages:
 *   1. scrape      — nest-scraper.js
 *   2. normalize   — normalize-tender-records.js
 *   3. dedupe      — dedupe-companies.js
 *   4. enrich      — discover-digital-presence.js
 *   5. qualify     — qualify-leads.js
 *   6. import      — import-qualified-to-dashboard.js
 *
 * Usage:
 *   node tools/ingestion/run-ingestion-pipeline.js [stages] [flags]
 *
 * Stage selection:
 *   --from=scrape        start from this stage (default: scrape)
 *   --to=import          stop after this stage (default: import)
 *   --only=normalize     run only this one stage
 *
 * Pass-through flags (forwarded to each stage that accepts them):
 *   --dry-run            do not write any files (forwarded to all stages)
 *   --max-pages=N        scraper: stop after N pages
 *   --delay-ms=N         scraper: delay between requests
 *   --from-html=path     scraper: parse from saved HTML
 *   --from-csv=path      scraper: parse from CSV
 *   --enrich=path        enricher: CSV or JSON enrichment file
 *   --auto               enricher: auto-probe websites
 *   --min-score=N        qualifier: minimum score threshold (default 25)
 *   --sales-rep=Name     importer: assign sales rep (default Victor)
 *   --input=path         override input file for any stage
 *
 * Examples:
 *   Run the full pipeline (live scrape to import):
 *     node tools/ingestion/run-ingestion-pipeline.js
 *
 *   Start from a saved HTML file, skip scraping:
 *     node tools/ingestion/run-ingestion-pipeline.js --from=scrape --from-html=saved.html
 *
 *   Re-run from normalize onwards (after manual enrichment CSV):
 *     node tools/ingestion/run-ingestion-pipeline.js --from=normalize --enrich=enrichment.csv
 *
 *   Dry-run qualify + import only:
 *     node tools/ingestion/run-ingestion-pipeline.js --from=qualify --dry-run
 */

const { spawnSync } = require('child_process');
const path = require('path');

const STAGES = ['scrape', 'normalize', 'dedupe', 'enrich', 'qualify', 'import'];

const STAGE_SCRIPTS = {
  scrape:    'tools/ingestion/nest-scraper.js',
  normalize: 'tools/ingestion/normalize-tender-records.js',
  dedupe:    'tools/ingestion/dedupe-companies.js',
  enrich:    'tools/ingestion/discover-digital-presence.js',
  qualify:   'tools/ingestion/qualify-leads.js',
  import:    'tools/ingestion/import-qualified-to-dashboard.js',
};

// Flags accepted by each stage (forwarded only if they apply)
const STAGE_FLAGS = {
  scrape:    ['--max-pages', '--delay-ms', '--from-html', '--from-csv', '--dry-run'],
  normalize: ['--input', '--dry-run'],
  dedupe:    ['--input', '--dry-run'],
  enrich:    ['--input', '--enrich', '--auto', '--dry-run'],
  qualify:   ['--input', '--min-score', '--dry-run'],
  import:    ['--input', '--sales-rep', '--dry-run'],
};

const ROOT = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const raw = argv.slice(2);
  const result = {
    from:     'scrape',
    to:       'import',
    only:     null,
    flags:    {},     // key → value (or true for boolean flags)
    rawFlags: [],     // original strings for pass-through
  };

  for (const a of raw) {
    if (a.startsWith('--from='))  { result.from  = a.split('=')[1]; continue; }
    if (a.startsWith('--to='))    { result.to    = a.split('=')[1]; continue; }
    if (a.startsWith('--only='))  { result.only  = a.split('=')[1]; continue; }
    result.rawFlags.push(a);
  }

  if (result.only) {
    if (!STAGES.includes(result.only)) {
      console.error('Unknown stage:', result.only, '— must be one of:', STAGES.join(', '));
      process.exit(1);
    }
    result.from = result.only;
    result.to   = result.only;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Filter flags for a given stage
// ---------------------------------------------------------------------------
function flagsForStage(stage, rawFlags) {
  const accepted = STAGE_FLAGS[stage] || [];
  return rawFlags.filter(f => {
    const key = f.startsWith('--') ? f.split('=')[0] : f;
    return accepted.some(a => key === a || f === a);
  });
}

// ---------------------------------------------------------------------------
// Run a stage
// ---------------------------------------------------------------------------
function runStage(stageName, extraFlags) {
  const scriptPath = path.join(ROOT, STAGE_SCRIPTS[stageName]);
  const stageFlags = flagsForStage(stageName, extraFlags);

  console.log('\n' + '─'.repeat(60));
  console.log('[pipeline] Stage:', stageName.toUpperCase());
  console.log('[pipeline] Script:', STAGE_SCRIPTS[stageName]);
  if (stageFlags.length) console.log('[pipeline] Flags:', stageFlags.join(' '));
  console.log('─'.repeat(60));

  const result = spawnSync(process.execPath, [scriptPath, ...stageFlags], {
    stdio: 'inherit',
    cwd:   ROOT,
  });

  if (result.error) {
    console.error('[pipeline] Failed to spawn stage', stageName + ':', result.error.message);
    return false;
  }
  if (result.status !== 0) {
    console.error('[pipeline] Stage', stageName, 'exited with code', result.status);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const args = parseArgs(process.argv);

  const fromIdx = STAGES.indexOf(args.from);
  const toIdx   = STAGES.indexOf(args.to);

  if (fromIdx < 0) { console.error('Unknown --from stage:', args.from); process.exit(1); }
  if (toIdx   < 0) { console.error('Unknown --to stage:',   args.to);   process.exit(1); }
  if (fromIdx > toIdx) { console.error('--from must come before --to'); process.exit(1); }

  const stagesToRun = STAGES.slice(fromIdx, toIdx + 1);

  console.log('[pipeline] NeST Lead Ingestion Pipeline');
  console.log('[pipeline] Stages to run:', stagesToRun.join(' → '));
  if (args.rawFlags.includes('--dry-run')) console.log('[pipeline] DRY RUN — no files will be written');

  for (const stage of stagesToRun) {
    const ok = runStage(stage, args.rawFlags);
    if (!ok) {
      console.error('\n[pipeline] ABORTED at stage:', stage);
      process.exit(1);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('[pipeline] All stages complete.');
  if (stagesToRun.includes('import') && !args.rawFlags.includes('--dry-run')) {
    console.log('[pipeline] New leads are in leads/imported-*.json with status: "new".');
    console.log('[pipeline] Open the dashboard, review each lead, then click Run Pipeline to generate configs.');
  }
  console.log('═'.repeat(60));
}

main();
