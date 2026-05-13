'use strict';

/**
 * Stage 1 — Scrape awarded tenders from NeST (nest.go.tz/awarded-tenders).
 *
 * Modes:
 *   node tools/ingestion/nest-scraper.js               — live HTTP fetch
 *   node tools/ingestion/nest-scraper.js --from-html=path.html
 *   node tools/ingestion/nest-scraper.js --from-csv=path.csv
 *
 * Flags:
 *   --max-pages=N      stop after N pages (default: 50)
 *   --delay-ms=N       delay between page requests, ms (default: 2000)
 *   --dry-run          parse and print; do not write output file
 *
 * Output: data/ingestion/raw/YYYY-MM-DDTHHMMSS-raw.json
 */

const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT     = path.resolve(__dirname, '..', '..');
const RAW_DIR  = path.join(ROOT, 'data', 'ingestion', 'raw');
const LOG_DIR  = path.join(ROOT, 'data', 'ingestion', 'logs');

const NEST_BASE    = 'https://nest.go.tz';
const NEST_PATH    = '/awarded-tenders';
const USER_AGENT   = 'Mozilla/5.0 (compatible; TUT-ingestion/1.0)';

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { maxPages: 50, delayMs: 2000, dryRun: false, fromHtml: null, fromCsv: null };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--max-pages='))  args.maxPages  = parseInt(a.split('=')[1], 10) || 50;
    if (a.startsWith('--delay-ms='))   args.delayMs   = parseInt(a.split('=')[1], 10) || 2000;
    if (a === '--dry-run')             args.dryRun    = true;
    if (a.startsWith('--from-html='))  args.fromHtml  = a.split('=').slice(1).join('=');
    if (a.startsWith('--from-csv='))   args.fromCsv   = a.split('=').slice(1).join('=');
  }
  return args;
}

// ---------------------------------------------------------------------------
// HTTP fetch (no npm)
// ---------------------------------------------------------------------------
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout: ' + url)); });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// HTML table parser (no DOM — regex over known NeST table structure)
// ---------------------------------------------------------------------------

// Returns true when the page appears JS-rendered (empty tbody or no table)
function isJsRendered(html) {
  // If there's no <table at all, or the tbody has no <tr> rows, it's JS-rendered
  if (!/<table/i.test(html)) return true;
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return true;
  return !/<tr[\s>]/i.test(tbodyMatch[1]);
}

// Extract text content from a single HTML tag's inner content
function innerText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g,    ' ')
    .trim();
}

// Parse all <tr> rows from the first <tbody> found
function parseTableRows(html) {
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return [];

  const tbody = tbodyMatch[1];
  const rows = [];
  const rowRe = /<tr[\s>]([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(tbody)) !== null) {
    const cells = [];
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
      cells.push(innerText(cellMatch[1]));
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

// NeST awarded tenders table columns (positional, 0-indexed):
// The actual column order may vary — we try two common layouts and pick the one
// that yields non-empty company names.
const COLUMN_LAYOUTS = [
  // Layout A: No#, Company, Tender Title, Procuring Entity, Category, Award Date, Award Value
  { company: 1, title: 2, entity: 3, category: 4, date: 5, value: 6 },
  // Layout B: No#, Tender Title, Company, Procuring Entity, Award Date, Award Value, Category
  { company: 2, title: 1, entity: 3, category: 6, date: 4, value: 5 },
  // Layout C: Company, Tender Title, Procuring Entity, Award Date, Award Value
  { company: 0, title: 1, entity: 2, category: -1, date: 3, value: 4 },
];

function detectLayout(rows) {
  // Try each layout; pick the one that makes the first data row company non-empty
  if (rows.length === 0) return COLUMN_LAYOUTS[0];
  for (const layout of COLUMN_LAYOUTS) {
    const sample = rows[0];
    if (layout.company < sample.length && sample[layout.company].trim().length > 1) {
      return layout;
    }
  }
  return COLUMN_LAYOUTS[0];
}

function rowsToRecords(rows, sourceUrl, scrapedAt) {
  if (rows.length === 0) return [];
  const layout = detectLayout(rows);
  const records = [];
  let counter = 1;

  for (const row of rows) {
    if (row.length < 3) continue;
    const company = layout.company >= 0 && layout.company < row.length ? row[layout.company] : '';
    if (!company || /^(no\.?|s\/n|#|\d{1,3})$/i.test(company.trim())) continue;

    // Build timestamp prefix for scrapeId
    const tsPrefix = scrapedAt.replace(/[-:T.Z]/g, '').slice(0, 14);
    records.push({
      scrapeId:           `nest-${tsPrefix}-${String(counter).padStart(4, '0')}`,
      rawCompanyName:     company,
      rawTenderTitle:     layout.title   >= 0 && layout.title   < row.length ? row[layout.title]   : '',
      rawProcuringEntity: layout.entity  >= 0 && layout.entity  < row.length ? row[layout.entity]  : '',
      rawAwardDate:       layout.date    >= 0 && layout.date    < row.length ? row[layout.date]    : '',
      rawAwardValue:      layout.value   >= 0 && layout.value   < row.length ? row[layout.value]   : '',
      rawCategory:        layout.category >= 0 && layout.category < row.length ? row[layout.category] : '',
      sourceUrl,
      scrapedAt,
    });
    counter++;
  }
  return records;
}

// ---------------------------------------------------------------------------
// Pagination — find next page URL
// ---------------------------------------------------------------------------
function findNextPageUrl(html, currentUrl) {
  // Look for rel="next" link or a "Next" anchor with a page parameter
  const relNext = html.match(/<a[^>]+rel=["']next["'][^>]*href=["']([^"']+)["']/i);
  if (relNext) return resolveUrl(relNext[1], currentUrl);

  // NeST pagination typically uses ?page=N or similar
  const nextBtn = html.match(/<a[^>]+href=["']([^"']*[?&]page=(\d+)[^"']*)["'][^>]*>\s*(?:Next|›|»)/i);
  if (nextBtn) return resolveUrl(nextBtn[1], currentUrl);

  return null;
}

function resolveUrl(href, base) {
  if (href.startsWith('http')) return href;
  if (href.startsWith('/')) {
    const u = new URL(base);
    return u.origin + href;
  }
  return base.replace(/\/[^/]*$/, '/') + href;
}

// ---------------------------------------------------------------------------
// CSV import mode
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const lines = text.split('\n').map(l => l.trimEnd());
  if (lines.length < 2) return [];

  // Parse header to determine column positions
  const header = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const COL = {
    company: findCol(header, ['company', 'contractor', 'company_name', 'companyname', 'rawcompanyname']),
    title:   findCol(header, ['tender_title', 'title', 'tendertitle', 'description', 'rawtendertitle']),
    entity:  findCol(header, ['procuring_entity', 'procuringentity', 'entity', 'rawprocuringentity', 'client']),
    date:    findCol(header, ['award_date', 'awarddate', 'date', 'rawawarddate']),
    value:   findCol(header, ['award_value', 'awardvalue', 'value', 'amount', 'rawawardvalue']),
    category:findCol(header, ['category', 'rawcategory', 'type']),
  };

  if (COL.company < 0) {
    throw new Error('CSV must have a company/contractor column. Header found: ' + header.join(', '));
  }

  const scrapedAt = new Date().toISOString();
  const tsPrefix  = scrapedAt.replace(/[-:T.Z]/g, '').slice(0, 14);
  const records   = [];
  let counter = 1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = splitCsvLine(line);
    const company = COL.company >= 0 ? (cells[COL.company] || '').trim() : '';
    if (!company) continue;

    records.push({
      scrapeId:           `csv-${tsPrefix}-${String(counter).padStart(4, '0')}`,
      rawCompanyName:     company,
      rawTenderTitle:     COL.title    >= 0 ? (cells[COL.title]    || '').trim() : '',
      rawProcuringEntity: COL.entity   >= 0 ? (cells[COL.entity]   || '').trim() : '',
      rawAwardDate:       COL.date     >= 0 ? (cells[COL.date]     || '').trim() : '',
      rawAwardValue:      COL.value    >= 0 ? (cells[COL.value]    || '').trim() : '',
      rawCategory:        COL.category >= 0 ? (cells[COL.category] || '').trim() : '',
      sourceUrl:          'csv-import',
      scrapedAt,
    });
    counter++;
  }
  return records;
}

function findCol(header, candidates) {
  for (const c of candidates) {
    const idx = header.indexOf(c);
    if (idx >= 0) return idx;
  }
  return -1;
}

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

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
function timestampFilename() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-raw.json';
}

function writeOutput(records, dryRun) {
  if (dryRun) {
    console.log('[dry-run] Would write', records.length, 'records. Sample:');
    console.log(JSON.stringify(records.slice(0, 2), null, 2));
    return null;
  }
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });
  const outFile = path.join(RAW_DIR, timestampFilename());
  fs.writeFileSync(outFile, JSON.stringify(records, null, 2) + '\n', 'utf8');
  return outFile;
}

function writeLog(entry) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, 'scraper.log');
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
  fs.appendFileSync(logFile, line, 'utf8');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);
  let records = [];

  // -- CSV import mode
  if (args.fromCsv) {
    const csvPath = path.resolve(args.fromCsv);
    if (!fs.existsSync(csvPath)) { console.error('CSV file not found:', csvPath); process.exit(1); }
    console.log('[scraper] Importing from CSV:', csvPath);
    const text = fs.readFileSync(csvPath, 'utf8');
    records = parseCsv(text);
    console.log('[scraper] Parsed', records.length, 'records from CSV');

  // -- HTML file mode
  } else if (args.fromHtml) {
    const htmlPath = path.resolve(args.fromHtml);
    if (!fs.existsSync(htmlPath)) { console.error('HTML file not found:', htmlPath); process.exit(1); }
    console.log('[scraper] Importing from HTML file:', htmlPath);
    const html = fs.readFileSync(htmlPath, 'utf8');
    const scrapedAt = new Date().toISOString();

    if (isJsRendered(html)) {
      console.error('[scraper] ERROR: HTML file appears to have an empty table. The page may require saving with "full page" (Ctrl+S in browser) to capture JS-rendered content.');
      process.exit(1);
    }

    const rows = parseTableRows(html);
    records = rowsToRecords(rows, 'file://' + htmlPath, scrapedAt);
    console.log('[scraper] Parsed', records.length, 'records from HTML file');

  // -- Live HTTP mode
  } else {
    console.log('[scraper] Fetching live from NeST...');
    let url = NEST_BASE + NEST_PATH;
    let pageNum = 1;

    while (url && pageNum <= args.maxPages) {
      console.log('[scraper] Page', pageNum, ':', url);
      let html;
      try {
        html = await fetchPage(url);
      } catch (err) {
        console.error('[scraper] Fetch error on page', pageNum, ':', err.message);
        writeLog({ event: 'fetch_error', page: pageNum, url, error: err.message });
        break;
      }

      if (isJsRendered(html)) {
        console.error('\n[scraper] ERROR: NeST page uses JavaScript rendering — the table cannot be scraped via HTTP fetch.');
        console.error('[scraper] To proceed:');
        console.error('  1. Open https://nest.go.tz/awarded-tenders in your browser');
        console.error('  2. Wait for the table to load fully');
        console.error('  3. Save the page as HTML (File → Save Page As → Web Page, HTML only)');
        console.error('  4. Re-run with: node tools/ingestion/nest-scraper.js --from-html=path/to/saved.html');
        console.error('  OR export the table to CSV and use: --from-csv=path/to/file.csv\n');
        writeLog({ event: 'js_render_detected', url });
        process.exit(2);
      }

      const scrapedAt = new Date().toISOString();
      const rows   = parseTableRows(html);
      const batch  = rowsToRecords(rows, url, scrapedAt);
      records.push(...batch);
      console.log('[scraper]   → ', batch.length, 'records on this page (total so far:', records.length + ')');

      if (batch.length === 0) {
        console.log('[scraper] Empty page — stopping pagination');
        break;
      }

      url = findNextPageUrl(html, url);
      if (url && pageNum < args.maxPages) {
        await sleep(args.delayMs);
      }
      pageNum++;
    }

    if (pageNum > args.maxPages) {
      console.log('[scraper] Reached --max-pages limit of', args.maxPages);
    }
  }

  if (records.length === 0) {
    console.warn('[scraper] WARNING: No records collected. Output file not written.');
    writeLog({ event: 'no_records' });
    process.exit(0);
  }

  const outFile = writeOutput(records, args.dryRun);
  if (outFile) {
    console.log('[scraper] Wrote', records.length, 'records →', outFile);
    writeLog({ event: 'complete', count: records.length, outFile });
  }
}

main().catch(err => {
  console.error('[scraper] Fatal:', err.message);
  process.exit(1);
});
