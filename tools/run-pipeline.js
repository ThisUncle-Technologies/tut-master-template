'use strict';

// run-pipeline.js — Generation Pipeline Orchestrator
//
// For each lead in a JSON file:
//   1. Analyze the lead's website (or detect NO_WEBSITE)
//   2. Generate a company config → written to generated/configs/{slug}.json
//   3. Generate outreach scripts → written to generated/outreach/{slug}-outreach.json
//   4. Print a summary table
//
// Usage:
//   node tools/run-pipeline.js                            (uses leads/sample-leads.json)
//   node tools/run-pipeline.js leads/my-leads.json
//   node tools/run-pipeline.js leads/my-leads.json --no-web  (skip website checks)
//
// The --no-web flag is useful for offline testing. All leads are treated as
// NO_WEBSITE when --no-web is passed.

const fs   = require('fs');
const path = require('path');

const { generateCompanyConfig }  = require('./generate-company-config');
const { analyzeWebsite }         = require('./website-quality-analyzer');
const { generateOutreachScript } = require('./outreach-script-generator');
const { slugify }                = require('./utils/slug');

const OUTREACH_DIR = path.join(__dirname, '..', 'generated', 'outreach');
const DEFAULT_LEADS = path.join(__dirname, '..', 'leads', 'sample-leads.json');

// ── Single lead processor ─────────────────────────────────────

async function processlead(lead, skipWebCheck) {
  console.log('\n──────────────────────────────────────────────────');
  console.log('Lead: ' + lead.name + (lead.leadId ? ' (' + lead.leadId + ')' : ''));
  console.log('──────────────────────────────────────────────────');

  // Step 1 — Website analysis
  var audit;
  if (skipWebCheck) {
    console.log('[pipeline] Skipping website check (--no-web)');
    audit = {
      classification:      'NO_WEBSITE',
      score:               0,
      redesignRecommended: true,
      weaknesses:          ['website check skipped'],
      strengths:           [],
      suggestedPitchAngle: 'no-website',
      url:                 lead.website || null,
      responseTimeMs:      null,
    };
  } else {
    var websiteUrl = lead.website || null;
    console.log('[pipeline] Analyzing website: ' + (websiteUrl || 'none'));
    try {
      audit = await analyzeWebsite(websiteUrl);
    } catch (e) {
      console.warn('[pipeline] Website analysis error: ' + e.message + ' — defaulting to NO_WEBSITE');
      audit = {
        classification: 'NO_WEBSITE', score: 0, redesignRecommended: true,
        weaknesses: ['analysis error: ' + e.message], strengths: [],
        suggestedPitchAngle: 'no-website', url: websiteUrl, responseTimeMs: null,
      };
    }
    console.log('[pipeline] Classification: ' + audit.classification + ' (score: ' + audit.score + ')');
    if (audit.weaknesses.length) console.log('[pipeline] Weaknesses:     ' + audit.weaknesses.join(', '));
  }

  // Step 2 — Generate company config
  var genResult;
  try {
    genResult = generateCompanyConfig(lead);
  } catch (e) {
    throw new Error('Config generation failed: ' + e.message);
  }
  var slug       = genResult.slug;
  var config     = genResult.config;
  var validation = genResult.validation;
  console.log('[pipeline] Config generated → generated/configs/' + slug + '.json');
  if (!validation.valid) {
    console.warn('[pipeline] Config warnings: ' + validation.warnings.join('; '));
  }

  // Step 3 — Generate outreach scripts
  var outreach;
  try {
    outreach = generateOutreachScript(lead, audit, slug);
  } catch (e) {
    throw new Error('Outreach generation failed: ' + e.message);
  }

  // Step 4 — Write outreach file
  if (!fs.existsSync(OUTREACH_DIR)) {
    fs.mkdirSync(OUTREACH_DIR, { recursive: true });
  }
  var outreachRecord = {
    leadId:         lead.leadId || '',
    name:           lead.name,
    slug:           slug,
    websiteAudit:   audit,
    outreachScript: outreach,
    generatedAt:    new Date().toISOString(),
  };
  var outreachPath = path.join(OUTREACH_DIR, slug + '-outreach.json');
  fs.writeFileSync(outreachPath, JSON.stringify(outreachRecord, null, 2) + '\n', 'utf8');
  console.log('[pipeline] Outreach written → generated/outreach/' + slug + '-outreach.json');

  return {
    name:           lead.name,
    slug:           slug,
    classification: audit.classification,
    score:          audit.score,
    pitchAngle:     audit.suggestedPitchAngle,
    configValid:    validation.valid,
    warnings:       validation.warnings,
  };
}

// ── Orchestrator ──────────────────────────────────────────────

async function runPipeline(leadsFile, skipWebCheck) {
  // Load leads
  var leads;
  try {
    var raw = JSON.parse(fs.readFileSync(leadsFile, 'utf8'));
    leads = Array.isArray(raw) ? raw : [raw];
  } catch (e) {
    console.error('[pipeline] Could not read leads file "' + leadsFile + '": ' + e.message);
    process.exit(1);
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('TUT GENERATION PIPELINE');
  console.log('Leads file:  ' + leadsFile);
  console.log('Lead count:  ' + leads.length);
  console.log('Web checks:  ' + (skipWebCheck ? 'disabled (--no-web)' : 'enabled'));
  console.log('══════════════════════════════════════════════════');

  var results  = [];
  var errCount = 0;

  for (var i = 0; i < leads.length; i++) {
    var lead = leads[i];
    if (!lead || !lead.name) {
      console.warn('[pipeline] Skipping lead at index ' + i + ' — missing name');
      continue;
    }
    try {
      var result = await processlead(lead, skipWebCheck);
      results.push(result);
    } catch (err) {
      console.error('[pipeline] ✗ Error processing "' + lead.name + '": ' + err.message);
      results.push({ name: lead.name, error: err.message });
      errCount++;
    }
  }

  // Summary table
  console.log('\n══════════════════════════════════════════════════');
  console.log('PIPELINE SUMMARY — ' + results.length + ' lead(s) processed');
  console.log('══════════════════════════════════════════════════');

  results.forEach(function (r) {
    if (r.error) {
      console.log('  ✗ ' + r.name + '\n    ERROR: ' + r.error);
    } else {
      var validTag = r.configValid ? '✓ valid' : '⚠ warnings';
      console.log(
        '  ✓ ' + r.name + '\n' +
        '    slug:    ' + r.slug + '\n' +
        '    website: ' + r.classification + ' (score ' + r.score + ')\n' +
        '    pitch:   ' + r.pitchAngle + '\n' +
        '    config:  ' + validTag + (r.warnings && r.warnings.length ? ' — ' + r.warnings.join('; ') : '')
      );
    }
  });

  console.log('\nOutput files:');
  console.log('  Configs  → generated/configs/');
  console.log('  Outreach → generated/outreach/');
  console.log('══════════════════════════════════════════════════\n');

  if (errCount > 0) {
    process.exit(1);
  }
}

// ── CLI entry point ───────────────────────────────────────────

if (require.main === module) {
  var args        = process.argv.slice(2);
  var skipWebFlag = args.includes('--no-web');
  var fileArg     = args.filter(function (a) { return !a.startsWith('--'); })[0];
  var leadsFile   = fileArg || DEFAULT_LEADS;

  runPipeline(leadsFile, skipWebFlag).catch(function (err) {
    console.error('[pipeline] Fatal error: ' + err.message);
    process.exit(1);
  });
}

module.exports = { runPipeline };
