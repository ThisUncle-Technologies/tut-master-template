'use strict';

/**
 * Audits public-demo/ before Netlify deployment.
 *
 * Scans every file in public-demo/ and:
 *   1. Prints the full file manifest.
 *   2. Fails if any file matches a forbidden pattern.
 *   3. Fails if any company config has status !== "published".
 *
 * Usage:
 *   node tools/deployment/audit-public-demo.js
 *
 * Exit codes:
 *   0  — audit passed
 *   1  — forbidden file or non-published company found
 *   2  — public-demo/ does not exist
 */

const fs   = require('fs');
const path = require('path');

const PUBLIC_DEMO = path.resolve(__dirname, '../../public-demo');

// Relative paths (using forward slashes) that must never appear in public-demo/
const FORBIDDEN_PATTERNS = [
  /dashboard/i,
  /\/tools\//i,
  /ingestion/i,
  /pilot[-_]state/i,
  /outreach[-_]log/i,
  /activity[-_]log/i,
  /outreach[-_]script/i,
  /^generated\//i,
  /\/raw\//i,
  /^leads\//i,
  /^test/i,
  /acceptance/i,
  /\.env($|\.)/i,
  /\.local\./i,
  /server\.js/i,
  /package(?:-lock)?\.json/i,
  /node_modules/i,
  /dashboard[-_]state/i,
  /pilot[-_]state/i,
];

// ─── helpers ────────────────────────────────────────────────────────────────

function scanDir(dir, rootDir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDir(fullPath, rootDir));
    } else {
      results.push(path.relative(rootDir, fullPath).replace(/\\/g, '/'));
    }
  }
  return results.sort();
}

// ─── main ───────────────────────────────────────────────────────────────────

if (!fs.existsSync(PUBLIC_DEMO)) {
  console.error('ERROR: public-demo/ does not exist.');
  console.error('       Run "node tools/deployment/prepare-netlify-demo.js" first.');
  process.exit(2);
}

const files = scanDir(PUBLIC_DEMO, PUBLIC_DEMO);

console.log(`\n--- public-demo/ manifest (${files.length} file(s)) ---`);
for (const f of files) console.log(`  ${f}`);

// Check for forbidden paths
const violations = [];
for (const f of files) {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(f)) {
      violations.push({ file: f, matched: pattern.toString() });
      break;
    }
  }
}

// Check that all company configs are published
const companyViolations = [];
const companiesDir = path.join(PUBLIC_DEMO, 'companies');
if (fs.existsSync(companiesDir)) {
  const companyFiles = fs.readdirSync(companiesDir).filter(f => f.endsWith('.json'));
  for (const f of companyFiles) {
    let config;
    try {
      config = JSON.parse(fs.readFileSync(path.join(companiesDir, f), 'utf8'));
    } catch (e) {
      companyViolations.push({ file: `companies/${f}`, reason: 'JSON parse error' });
      continue;
    }
    if (config.status !== 'published') {
      companyViolations.push({ file: `companies/${f}`, reason: `status="${config.status}" (must be "published")` });
    }
  }
  console.log(`\nCompanies: ${companyFiles.length} file(s)`);
}

// Check _redirects exists
const redirectsExists = fs.existsSync(path.join(PUBLIC_DEMO, '_redirects'));
console.log(`_redirects:       ${redirectsExists ? 'present' : 'MISSING'}`);
if (!redirectsExists) violations.push({ file: '_redirects', matched: 'required file is missing' });

// Report
console.log('');

const allViolations = [...violations, ...companyViolations];

if (allViolations.length > 0) {
  console.error(`AUDIT FAILED — ${allViolations.length} issue(s) found:`);
  for (const v of violations) {
    console.error(`  FORBIDDEN: ${v.file}`);
    console.error(`    matched: ${v.matched}`);
  }
  for (const v of companyViolations) {
    console.error(`  NON-PUBLISHED: ${v.file}`);
    console.error(`    reason: ${v.reason}`);
  }
  process.exit(1);
}

console.log('AUDIT PASSED — public-demo/ is clean and safe for Netlify deployment.');
console.log('\nDeployment checklist:');
console.log('  [x] Only published company configs present');
console.log('  [x] No sensitive or internal files detected');
console.log('  [x] _redirects present for SPA routing');
console.log('\nNext: push to git and trigger Netlify deploy, or drag public-demo/ to Netlify UI.');
