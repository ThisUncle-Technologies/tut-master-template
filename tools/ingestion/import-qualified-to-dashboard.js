'use strict';

/**
 * Stage 6 — Import qualified leads into the dashboard.
 *
 * Usage:
 *   node tools/ingestion/import-qualified-to-dashboard.js [--input=path] [--dry-run] [--sales-rep=Name]
 *
 * Reads the most-recent qualified file.
 * Converts each qualified company to the leads/*.json schema.
 * Checks for duplicates against all existing leads/*.json files (by slug).
 * Writes leads/imported-YYYY-MM-DD.json (skips duplicates with a warning).
 * Adds each new lead to dashboard-state.json with status: "new".
 * Does NOT run the Sub-project 2 generation pipeline.
 *
 * Notes field format: "{N} tenders | TZS {X} total | Score: {Y} | classification: {Z}"
 * If the company already has notes from enrichment, appends them.
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..', '..');
const QUAL_DIR    = path.join(ROOT, 'data', 'ingestion', 'qualified');
const LEADS_DIR   = path.join(ROOT, 'leads');
const STATE_FILE  = path.join(ROOT, 'dashboard', 'data', 'dashboard-state.json');
const LOG_DIR     = path.join(ROOT, 'data', 'ingestion', 'logs');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { input: null, dryRun: false, salesRep: 'Victor' };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--input='))      args.input    = a.split('=').slice(1).join('=');
    if (a === '--dry-run')             args.dryRun   = true;
    if (a.startsWith('--sales-rep='))  args.salesRep = a.split('=').slice(1).join('=');
  }
  return args;
}

// ---------------------------------------------------------------------------
// Find most-recent qualified file
// ---------------------------------------------------------------------------
function latestQualifiedFile() {
  if (!fs.existsSync(QUAL_DIR)) return null;
  const files = fs.readdirSync(QUAL_DIR)
    .filter(f => f.endsWith('-qualified.json'))
    .sort()
    .reverse();
  return files.length ? path.join(QUAL_DIR, files[0]) : null;
}

// ---------------------------------------------------------------------------
// Load all existing lead slugs (dedup check)
// ---------------------------------------------------------------------------
function existingLeadSlugs() {
  const slugs = new Set();
  if (!fs.existsSync(LEADS_DIR)) return slugs;

  const files = fs.readdirSync(LEADS_DIR).filter(f => f.endsWith('.json'));
  for (const f of files) {
    try {
      const leads = JSON.parse(fs.readFileSync(path.join(LEADS_DIR, f), 'utf8'));
      if (Array.isArray(leads)) {
        for (const lead of leads) {
          if (lead.leadId) {
            // Derive slug from leadId (lead-NNN format) by name if available,
            // or store name-based slug
            const nameSlug = lead.name
              ? lead.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
              : null;
            if (nameSlug) slugs.add(nameSlug);
          }
          // Also check for explicit slug field
          if (lead.slug) slugs.add(lead.slug);
        }
      }
    } catch (_) {}
  }
  return slugs;
}

// ---------------------------------------------------------------------------
// Read / write dashboard state
// ---------------------------------------------------------------------------
function readState() {
  if (!fs.existsSync(STATE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (_) { return {}; }
}

function writeState(state) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Lead ID generation
// ---------------------------------------------------------------------------
function nextLeadId(existingSlugs) {
  // IDs are sequential across ALL existing lead files
  const allIds = [];
  if (fs.existsSync(LEADS_DIR)) {
    for (const f of fs.readdirSync(LEADS_DIR).filter(f => f.endsWith('.json'))) {
      try {
        const leads = JSON.parse(fs.readFileSync(path.join(LEADS_DIR, f), 'utf8'));
        if (Array.isArray(leads)) {
          for (const l of leads) {
            const m = (l.leadId || '').match(/lead-(\d+)/);
            if (m) allIds.push(parseInt(m[1], 10));
          }
        }
      } catch (_) {}
    }
  }
  const maxId = allIds.length ? Math.max(...allIds) : 0;
  return maxId + 1;
}

// ---------------------------------------------------------------------------
// Format numbers for display
// ---------------------------------------------------------------------------
function formatTZS(n) {
  if (!n) return '0';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

// ---------------------------------------------------------------------------
// Convert a qualified company to the leads schema
// ---------------------------------------------------------------------------
function companyToLead(company, leadIdNum, salesRep) {
  const sm = company.socialMedia || {};

  // Compose the notes field
  const tenderLine = `${company.tenderCount} tender${company.tenderCount !== 1 ? 's' : ''} | TZS ${formatTZS(company.totalAwardValue)} total | Score: ${company.leadScore} | classification: ${company.classification}`;
  const notes = company.enrichNotes
    ? tenderLine + '. ' + company.enrichNotes
    : tenderLine;

  // Clean phone/whatsapp: strip non-digits for whatsapp field
  const rawPhone = company.phone || null;
  const rawWa    = company.whatsapp || (rawPhone ? rawPhone.replace(/\D/g, '') : null);

  return {
    leadId:        `lead-${String(leadIdNum).padStart(3, '0')}`,
    slug:          company.slug,
    name:          company.companyName,
    tagline:       '',
    phone:         rawPhone,
    whatsapp:      rawWa,
    email:         company.email   || null,
    address:       company.location || null,
    website:       company.website  || null,
    industry:      company.industry || 'general',
    services:      [],
    location:      company.location || null,
    locale:        'en-TZ',
    yearFounded:   null,
    socialMedia: {
      facebook:  sm.facebook  || '',
      instagram: sm.instagram || '',
      linkedin:  sm.linkedin  || '',
      twitter:   sm.twitter   || '',
      tiktok:    sm.tiktok    || '',
    },
    salesRep:      salesRep,
    outreachStatus:'pending',
    source:        'nest-awarded-tenders',
    status:        'new',
    notes,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);

  const inputFile = args.input ? path.resolve(args.input) : latestQualifiedFile();
  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error('[import] No qualified file found. Run qualify-leads.js first, or specify --input=path');
    process.exit(1);
  }

  console.log('[import] Reading:', inputFile);
  const qualified = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  console.log('[import]', qualified.length, 'qualified companies');

  const existingSlugs = existingLeadSlugs();
  console.log('[import]', existingSlugs.size, 'existing lead slugs (dedup check)');

  let idCounter = nextLeadId(existingSlugs);
  const newLeads = [];
  const skipped  = [];

  for (const company of qualified) {
    if (existingSlugs.has(company.slug)) {
      console.log('[import] SKIP (duplicate):', company.slug);
      skipped.push({ slug: company.slug, reason: 'already exists in leads/' });
      continue;
    }
    const lead = companyToLead(company, idCounter++, args.salesRep);
    newLeads.push(lead);
    existingSlugs.add(company.slug); // prevent duplicates within this batch
    console.log('[import] + ', lead.leadId, lead.name);
  }

  console.log('[import] New leads:', newLeads.length, '| Skipped:', skipped.length);

  if (newLeads.length === 0) {
    console.log('[import] Nothing to import.');
    return;
  }

  if (args.dryRun) {
    console.log('[dry-run] Would write', newLeads.length, 'leads. Sample:');
    console.log(JSON.stringify(newLeads.slice(0, 1), null, 2));
    return;
  }

  // Write leads file
  if (!fs.existsSync(LEADS_DIR)) fs.mkdirSync(LEADS_DIR, { recursive: true });
  const dateTag  = new Date().toISOString().slice(0, 10);
  const leadsFile = path.join(LEADS_DIR, 'imported-' + dateTag + '.json');
  fs.writeFileSync(leadsFile, JSON.stringify(newLeads, null, 2) + '\n', 'utf8');
  console.log('[import] Leads file →', leadsFile);

  // Update dashboard state — add each new lead with status: "new"
  const state = readState();
  const now   = new Date().toISOString();
  for (const lead of newLeads) {
    if (!state[lead.slug]) {
      state[lead.slug] = {
        slug:          lead.slug,
        name:          lead.name,
        status:        'new',
        outreachStatus:'pending',
        notes:         '',
        createdAt:     now,
        updatedAt:     now,
        source:        'nest-ingestion',
      };
    }
  }
  writeState(state);
  console.log('[import] Dashboard state updated (', newLeads.length, 'entries added with status: "new")');
  console.log('[import] Next step: open the dashboard, review leads, then click Run Pipeline to generate configs.');

  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(path.join(LOG_DIR, 'import.log'), JSON.stringify({
    ts: new Date().toISOString(), event: 'complete', inputFile,
    imported: newLeads.length, skipped: skipped.length, leadsFile,
  }) + '\n', 'utf8');
}

main().catch(err => {
  console.error('[import] Fatal:', err.message);
  process.exit(1);
});
