'use strict';

/**
 * Prepares the public-demo/ directory for Netlify deployment.
 *
 * Copies ONLY the public demo renderer and published company configs.
 * Never copies dashboard, tools, pilot data, ingestion data, or draft configs.
 *
 * Usage:
 *   node tools/deployment/prepare-netlify-demo.js
 *   node tools/deployment/prepare-netlify-demo.js --dry-run
 */

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const ROOT      = path.resolve(__dirname, '../..');
const OUT       = path.join(ROOT, 'public-demo');
const COMPANIES = path.join(ROOT, 'companies');

// Files and directories to copy from root into public-demo/
const RENDERER_ASSETS = [
  { src: 'index.html',        dest: 'index.html' },
  { src: 'css',               dest: 'css' },
  { src: 'js/main.js',        dest: 'js/main.js' },
  { src: 'assets',            dest: 'assets' },
];

const OPTIONAL_ASSETS = [
  { src: 'data/company.schema.json', dest: 'data/company.schema.json' },
];

// ─── helpers ────────────────────────────────────────────────────────────────

function copyItem(srcPath, destPath) {
  if (DRY_RUN) { console.log(`  [dry-run] copy: ${path.relative(ROOT, srcPath)} → ${path.relative(ROOT, destPath)}`); return; }
  const stat = fs.statSync(srcPath);
  if (stat.isDirectory()) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.cpSync(srcPath, destPath, { recursive: true });
  } else {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
  }
}

// ─── main ───────────────────────────────────────────────────────────────────

if (DRY_RUN) console.log('--- DRY RUN (no files written) ---\n');

// 1. Clean output directory
if (fs.existsSync(OUT)) {
  if (DRY_RUN) {
    console.log('[dry-run] rm -rf public-demo/');
  } else {
    fs.rmSync(OUT, { recursive: true });
  }
}
if (!DRY_RUN) fs.mkdirSync(OUT, { recursive: true });

// 2. Copy required renderer assets
let staticCopied  = 0;
let staticSkipped = 0;

for (const { src, dest } of RENDERER_ASSETS) {
  const srcPath  = path.join(ROOT, src);
  const destPath = path.join(OUT, dest);
  if (!fs.existsSync(srcPath)) {
    console.warn(`  SKIP (not found): ${src}`);
    staticSkipped++;
    continue;
  }
  copyItem(srcPath, destPath);
  staticCopied++;
}

// 3. Copy optional assets
for (const { src, dest } of OPTIONAL_ASSETS) {
  const srcPath  = path.join(ROOT, src);
  const destPath = path.join(OUT, dest);
  if (fs.existsSync(srcPath)) {
    copyItem(srcPath, destPath);
    staticCopied++;
  }
}

// 4. Copy only published company configs
const companiesOut = path.join(OUT, 'companies');
if (!DRY_RUN) fs.mkdirSync(companiesOut, { recursive: true });

const companyFiles   = fs.readdirSync(COMPANIES).filter(f => f.endsWith('.json'));
let publishedCount   = 0;
let excludedCount    = 0;
const excludedDetail = [];

for (const file of companyFiles) {
  const srcPath = path.join(COMPANIES, file);
  let config;
  try {
    config = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  } catch (e) {
    console.warn(`  SKIP (parse error): companies/${file}`);
    excludedCount++;
    excludedDetail.push({ file, reason: 'parse error' });
    continue;
  }

  if (config.status !== 'published') {
    excludedCount++;
    excludedDetail.push({ file, reason: `status="${config.status}"` });
    continue;
  }

  copyItem(srcPath, path.join(companiesOut, file));
  publishedCount++;
}

// 5. Write _redirects for Netlify SPA routing
const redirectsContent = '/* /index.html 200\n';
if (DRY_RUN) {
  console.log('[dry-run] write: public-demo/_redirects');
} else {
  fs.writeFileSync(path.join(OUT, '_redirects'), redirectsContent);
}

// ─── summary ────────────────────────────────────────────────────────────────

console.log('\n--- Deployment Summary ---');
console.log(`Output directory  : public-demo/`);
console.log(`Static assets     : ${staticCopied} item(s) copied, ${staticSkipped} skipped`);
console.log(`Companies         : ${publishedCount} published / ${excludedCount} excluded`);

if (excludedDetail.length > 0) {
  console.log('Excluded:');
  for (const e of excludedDetail) console.log(`  - companies/${e.file}  (${e.reason})`);
}

console.log('SPA redirect      : _redirects written (/* /index.html 200)');

if (DRY_RUN) {
  console.log('\n[dry-run] No files were written.');
} else {
  console.log('\npublic-demo/ is ready for Netlify deployment.');
  console.log('Next: node tools/deployment/audit-public-demo.js');
}
