'use strict';

// tools/batch/generate-from-csv.js
//
// Turns rows from a lead CSV (blitz_batch_input.csv at repo root) into
// published company demos — the batch equivalent of clicking "Publish Demo"
// in the dashboard for each row, one at a time.
//
// Reuses the real pipeline instead of reimplementing it:
//   - generateCompanyConfig() (tools/generate-company-config.js) builds and
//     writes the draft config, including its own inferIndustry() call.
//   - The publish step below is a direct port of publishConfig() in
//     dashboard/server.js (lines ~288-314): re-validate, flip status to
//     "published", stamp publishedAt, write to generated/configs/{slug}.json
//     AND companies/{slug}.json.
//
// SAFETY: like the single-lead path, this never invents director data.
// Managing Director names from the CSV are written to a plain-text side
// file under needs-manual-review/ instead of about.director.
//
// Usage:
//   node tools/batch/generate-from-csv.js [path/to/input.csv]
//   (defaults to blitz_batch_input.csv at the repo root)

const fs            = require('fs');
const path          = require('path');
const { execFileSync } = require('child_process');

const { generateCompanyConfig } = require('../generate-company-config');
const { validateConfig }        = require('../utils/validation');
const { slugify }               = require('../utils/slug');

const ROOT               = path.resolve(__dirname, '..', '..');
const DEFAULT_INPUT       = path.join(ROOT, 'blitz_batch_input.csv');
const CONFIGS_DIR         = path.join(ROOT, 'generated', 'configs');
const COMPANIES_DIR       = path.join(ROOT, 'companies');
const REVIEW_DIR          = path.join(ROOT, 'needs-manual-review');
const COUNTRY_CODE        = '255';

// ── CSV parsing (RFC 4180-ish: handles quoted fields, embedded commas,
//    embedded newlines, and "" escaped quotes) — no npm dependency ────────

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') { continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  // last field/row (files without a trailing newline)
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

function csvToRecords(text) {
  const rows = parseCsv(text);
  const header = rows[0];
  return rows.slice(1).map(r => {
    const rec = {};
    header.forEach((key, idx) => { rec[key.trim()] = (r[idx] || '').trim(); });
    return rec;
  });
}

// ── Phone → WhatsApp normalization ─────────────────────────────────────
//
// Takes the raw "Phone Number" cell (may contain more than one number,
// newline-separated — the first is used), strips separators, strips a
// leading trunk "0", and prepends the Tanzania country code if missing.
// Returns { whatsapp, displayPhone, error }.

function normalizePhone(raw) {
  const first = String(raw || '').split('\n')[0].trim();
  let digits = first.replace(/[^0-9]/g, '');

  if (!digits) return { error: 'no phone digits found' };

  if (digits.startsWith('0')) digits = digits.slice(1);
  if (!digits.startsWith(COUNTRY_CODE)) digits = COUNTRY_CODE + digits;

  if (!/^[0-9]{10,15}$/.test(digits)) {
    return { error: `normalized whatsapp "${digits}" is ${digits.length} digits (schema requires 10-15)` };
  }

  const displayPhone = '+' + digits.slice(0, 3) + ' ' + digits.slice(3);
  return { whatsapp: digits, displayPhone };
}

// ── Row → lead shape expected by generateCompanyConfig() ──────────────

function rowToLead(row) {
  const name = (row['Company Name'] || '').trim();
  return {
    name,
    email: (row['Email Address'] || '').trim(),
    // notes feeds inferIndustry() the same way it feeds the single-lead
    // path — company name + current-site text, nothing invented.
    notes: (row['Current Web'] || '').trim(),
    source: 'blitz-batch-csv',
    leadId: 'blitz-' + (row['s_n'] || '').trim(),
  };
}

// ── Publish step — direct port of publishConfig() in dashboard/server.js ──

function publishDraft(slug) {
  const draftFile = path.join(CONFIGS_DIR, slug + '.json');
  if (!fs.existsSync(draftFile)) {
    return { ok: false, reason: 'draft config not found after generation' };
  }

  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(draftFile, 'utf8'));
  } catch (e) {
    return { ok: false, reason: 'could not read/parse draft config: ' + e.message };
  }

  const v = validateConfig(cfg);
  if (!v.valid) {
    return { ok: false, reason: 'validation failed: ' + v.warnings.join('; ') };
  }

  const now = new Date().toISOString();
  cfg.status      = 'published';
  cfg.updatedAt   = now;
  cfg.publishedAt = now;
  if (cfg.internal) { cfg.internal.updatedAt = now; cfg.internal.publishedAt = now; }

  const written = JSON.stringify(cfg, null, 2) + '\n';
  fs.writeFileSync(draftFile, written, 'utf8');
  fs.mkdirSync(COMPANIES_DIR, { recursive: true });
  fs.writeFileSync(path.join(COMPANIES_DIR, slug + '.json'), written, 'utf8');

  return { ok: true, publishedAt: now };
}

// ── Main ────────────────────────────────────────────────────────────────

function main() {
  const inputPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_INPUT;

  if (!fs.existsSync(inputPath)) {
    console.error(`Input CSV not found: ${inputPath}`);
    process.exit(1);
  }

  const records = csvToRecords(fs.readFileSync(inputPath, 'utf8'));
  console.log(`Read ${records.length} row(s) from ${path.relative(ROOT, inputPath)}\n`);

  const skipped   = [];
  const published = [];

  fs.mkdirSync(REVIEW_DIR, { recursive: true });

  for (const row of records) {
    const rowLabel = `row ${row.s_n || '?'} (${row['Company Name'] || 'unnamed'})`;

    const name = (row['Company Name'] || '').trim();
    if (!name) {
      skipped.push({ name: row['Company Name'] || '(blank)', reason: 'missing Company Name' });
      continue;
    }

    const phoneResult = normalizePhone(row['Phone Number']);
    if (phoneResult.error) {
      skipped.push({ name, reason: phoneResult.error });
      continue;
    }

    const lead = rowToLead(row);
    lead.whatsapp = phoneResult.whatsapp;
    lead.phone    = phoneResult.displayPhone;

    let result;
    try {
      result = generateCompanyConfig(lead);
    } catch (e) {
      skipped.push({ name, reason: 'generateCompanyConfig threw: ' + e.message });
      continue;
    }

    const publishResult = publishDraft(result.slug);
    if (!publishResult.ok) {
      skipped.push({ name, reason: publishResult.reason });
      continue;
    }

    const director = (row['Managing Director'] || '').trim();
    if (director) {
      const notePath = path.join(REVIEW_DIR, result.slug + '.txt');
      fs.writeFileSync(
        notePath,
        `Company: ${name}\nSlug: ${result.slug}\nManaging Director (from CSV, not auto-populated into about.director): ${director}\nSource Tier: ${(row['Source Tier'] || '').trim()}\n`,
        'utf8'
      );
    }

    published.push({ name, slug: result.slug, sourceTier: (row['Source Tier'] || '').trim() });
    console.log(`✓ published: ${rowLabel} → companies/${result.slug}.json`);
  }

  // ── Deployment pipeline: reuse the existing scripts as-is ────────────

  console.log('\n--- Running prepare-netlify-demo.js ---');
  try {
    execFileSync('node', [path.join(ROOT, 'tools', 'deployment', 'prepare-netlify-demo.js')], {
      cwd: ROOT, stdio: 'inherit',
    });
  } catch (e) {
    console.error('prepare-netlify-demo.js failed: ' + e.message);
  }

  console.log('\n--- Running audit-public-demo.js ---');
  let auditPassed = true;
  try {
    execFileSync('node', [path.join(ROOT, 'tools', 'deployment', 'audit-public-demo.js')], {
      cwd: ROOT, stdio: 'inherit',
    });
  } catch (e) {
    auditPassed = false;
    console.error('audit-public-demo.js reported failures (see output above).');
  }

  // ── Summary ────────────────────────────────────────────────────────

  const summaryLines = [];
  summaryLines.push('--- Batch Summary ---');
  summaryLines.push(`Total rows read : ${records.length}`);
  summaryLines.push(`Published       : ${published.length}`);
  summaryLines.push(`Skipped         : ${skipped.length}`);
  if (skipped.length) {
    summaryLines.push('\nSkipped rows:');
    skipped.forEach(s => summaryLines.push(`  - ${s.name}: ${s.reason}`));
  }
  summaryLines.push(`\npublic-demo/ audit: ${auditPassed ? 'PASSED' : 'FAILED — see output above'}`);
  summaryLines.push(
    '\nREMINDER: photos, real project history, and director bios are placeholder/generic ' +
    'for every published company by design (the generator never invents this data). ' +
    'Do a manual content pass — see needs-manual-review/{slug}.txt for Managing Director ' +
    'names pulled from the CSV — before sending demos to higher-value leads ' +
    `(${published.filter(p => p.sourceTier === 'strong').length} of the published companies are Source Tier "strong").`
  );

  const summaryText = summaryLines.join('\n') + '\n';
  console.log('\n' + summaryText);
  fs.writeFileSync(path.join(REVIEW_DIR, '_batch-run-summary.txt'), summaryText, 'utf8');
}

main();
