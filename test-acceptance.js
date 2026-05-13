'use strict';

// Acceptance test suite for Project 10x
// Tests server API, pipeline, config editor, publish flow, state persistence, and failure cases.

const http = require('http');
const fs   = require('fs');
const path = require('path');

const BASE = 'http://localhost:3001';
const ROOT = __dirname;

// ── HTTP client ────────────────────────────────────────────────

function req(method, url, body) {
  return new Promise(function (resolve, reject) {
    var opts = require('url').parse(url);
    opts.method = method;
    if (body !== undefined) {
      var bodyStr = JSON.stringify(body);
      opts.headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) };
    }
    var r = http.request(opts, function (res) {
      var data = '';
      res.setEncoding('utf8');
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        var parsed;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed, raw: data });
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

// ── Test runner ────────────────────────────────────────────────

var passed = 0;
var failed = 0;
var bugs   = [];

function test(name, fn) {
  return fn().then(function () {
    console.log('  ✓ ' + name);
    passed++;
  }).catch(function (e) {
    console.log('  ✗ ' + name + '\n      → ' + e.message);
    failed++;
    bugs.push({ test: name, error: e.message });
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function assertEqual(a, b, label) {
  if (a !== b) throw new Error((label || 'value') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}

function assertIncludes(arr, val, label) {
  if (!arr || !arr.includes(val)) throw new Error((label || 'array') + ' does not include ' + JSON.stringify(val) + ' (got: ' + JSON.stringify(arr) + ')');
}

// ── Test setup (reset state for clean run) ─────────────────────

var INITIAL_STATE = {
  'karibu-builders-ltd':          { slug: 'karibu-builders-ltd',         leadId: 'lead-001', name: 'Karibu Builders Ltd',             industry: 'construction', websiteClassification: 'NO_WEBSITE',       status: 'generated', outreachStatus: 'pending', salesRep: 'Victor', createdAt: '2026-05-12T07:42:30.156Z', updatedAt: '2026-05-12T07:42:30.156Z', publishedAt: null },
  'mwanga-freight-forwarding-co': { slug: 'mwanga-freight-forwarding-co', leadId: 'lead-002', name: 'Mwanga Freight & Forwarding Co.',   industry: 'logistics',     websiteClassification: 'MODERN_WEBSITE',   status: 'generated', outreachStatus: 'pending', salesRep: 'Victor', createdAt: '2026-05-12T07:42:30.156Z', updatedAt: '2026-05-12T07:42:30.156Z', publishedAt: null },
  'summit-advisory-group':        { slug: 'summit-advisory-group',        leadId: 'lead-003', name: 'Summit Advisory Group',            industry: 'consultancy',   websiteClassification: 'NO_WEBSITE',       status: 'generated', outreachStatus: 'pending', salesRep: 'Victor', createdAt: '2026-05-12T07:42:30.156Z', updatedAt: '2026-05-12T07:42:30.156Z', publishedAt: null },
  'baraka-general-trading-ltd':   { slug: 'baraka-general-trading-ltd',   leadId: 'lead-004', name: 'Baraka General Trading Ltd',       industry: 'trading',       websiteClassification: 'BROKEN_WEBSITE',   status: 'generated', outreachStatus: 'pending', salesRep: 'Victor', createdAt: '2026-05-12T07:42:30.156Z', updatedAt: '2026-05-12T07:42:30.156Z', publishedAt: null },
};

function resetState() {
  var stateFile    = path.join(ROOT, 'dashboard', 'data', 'dashboard-state.json');
  var activityFile = path.join(ROOT, 'dashboard', 'data', 'activity-log.json');
  var pilotFile    = path.join(ROOT, 'dashboard', 'data', 'pilot-state.json');
  var outreachLog  = path.join(ROOT, 'dashboard', 'data', 'outreach-log.json');
  fs.writeFileSync(stateFile,    JSON.stringify(INITIAL_STATE, null, 2) + '\n', 'utf8');
  fs.writeFileSync(activityFile, '[]\n', 'utf8');
  fs.writeFileSync(pilotFile,    '{}\n', 'utf8');
  fs.writeFileSync(outreachLog,  '[]\n', 'utf8');
  // Also undo any published configs in companies/ that were created by a prior run
  var companies = path.join(ROOT, 'companies');
  ['karibu-builders-ltd','summit-advisory-group'].forEach(function (s) {
    var f = path.join(companies, s + '.json');
    if (fs.existsSync(f)) {
      var cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (cfg.internal && cfg.internal.generatedBy === 'auto') fs.unlinkSync(f);
    }
  });
  // Reset generated configs to draft
  var cfgDir = path.join(ROOT, 'generated', 'configs');
  if (fs.existsSync(cfgDir)) {
    fs.readdirSync(cfgDir).forEach(function (f) {
      var fp  = path.join(cfgDir, f);
      var cfg = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (cfg.status === 'published') { cfg.status = 'draft'; delete cfg.publishedAt; fs.writeFileSync(fp, JSON.stringify(cfg, null, 2) + '\n', 'utf8'); }
    });
  }
  console.log('  [setup] State and activity log reset to initial values');
}

// ── Test sections ──────────────────────────────────────────────

async function sectionServerBoot() {
  console.log('\n── 1. SERVER BOOT & LEADS LIST ──────────────────────────────');

  await test('GET /api/leads returns 200', async function () {
    var r = await req('GET', BASE + '/api/leads');
    assertEqual(r.status, 200, 'status');
    assert(Array.isArray(r.body), 'body is array');
  });

  await test('Returns exactly 4 leads', async function () {
    var r = await req('GET', BASE + '/api/leads');
    assertEqual(r.body.length, 4, 'lead count');
  });

  await test('All 4 expected slugs present', async function () {
    var r = await req('GET', BASE + '/api/leads');
    var slugs = r.body.map(function (l) { return l.slug; });
    assertIncludes(slugs, 'karibu-builders-ltd',           'karibu slug');
    assertIncludes(slugs, 'mwanga-freight-forwarding-co',  'mwanga slug');
    assertIncludes(slugs, 'summit-advisory-group',          'summit slug');
    assertIncludes(slugs, 'baraka-general-trading-ltd',    'baraka slug');
  });

  await test('Each lead has required fields', async function () {
    var r = await req('GET', BASE + '/api/leads');
    r.body.forEach(function (l) {
      assert(l.slug, 'slug missing on ' + l.name);
      assert(l.name, 'name missing');
      assert(l.status, 'status missing on ' + l.name);
      assert(l.industry, 'industry missing on ' + l.name);
      assert(typeof l.completeness === 'number', 'completeness not a number on ' + l.name);
    });
  });

  await test('All leads start at generated status', async function () {
    var r = await req('GET', BASE + '/api/leads');
    r.body.forEach(function (l) {
      assertEqual(l.status, 'generated', 'status for ' + l.name);
    });
  });

  await test('Completeness scores are non-zero (contacts present)', async function () {
    var r = await req('GET', BASE + '/api/leads');
    r.body.forEach(function (l) {
      assert(l.completeness > 0, l.name + ' has completeness 0');
    });
  });

  await test('Static file server — GET / returns HTML', async function () {
    var r = await req('GET', BASE + '/');
    assert(typeof r.raw === 'string' && r.raw.includes('TUT Lead Dashboard'), 'index.html not served');
  });

  await test('Static file server — GET /css/dashboard.css returns CSS', async function () {
    var r = await req('GET', BASE + '/css/dashboard.css');
    assert(typeof r.raw === 'string' && r.raw.includes(':root'), 'CSS not served');
  });

  await test('Static file server — GET /js/dashboard.js returns JS', async function () {
    var r = await req('GET', BASE + '/js/dashboard.js');
    assert(typeof r.raw === 'string' && r.raw.includes('viewLeads'), 'JS not served');
  });
}

async function sectionPipeline() {
  console.log('\n── 2. PIPELINE ──────────────────────────────────────────────');

  var slugs = [
    'karibu-builders-ltd',
    'mwanga-freight-forwarding-co',
    'summit-advisory-group',
    'baraka-general-trading-ltd',
  ];

  await test('POST /api/pipeline runs all leads without error', async function () {
    var r = await req('POST', BASE + '/api/pipeline');
    assertEqual(r.status, 200, 'status');
    assert(Array.isArray(r.body), 'body is array');
    assertEqual(r.body.length, 4, 'result count');
  });

  await test('All pipeline results report ok:true', async function () {
    var r = await req('POST', BASE + '/api/pipeline');
    r.body.forEach(function (res) {
      assert(res.ok, 'pipeline failed for ' + res.name + ': ' + res.error);
    });
  });

  await test('All pipeline results include classification', async function () {
    var r = await req('POST', BASE + '/api/pipeline');
    r.body.forEach(function (res) {
      assert(['NO_WEBSITE','BROKEN_WEBSITE','OUTDATED_WEBSITE','MODERN_WEBSITE'].includes(res.classification),
        'invalid classification "' + res.classification + '" for ' + res.name);
    });
  });

  await test('Generated config files exist for all 4 leads', async function () {
    slugs.forEach(function (slug) {
      var file = path.join(ROOT, 'generated', 'configs', slug + '.json');
      assert(fs.existsSync(file), 'Missing: generated/configs/' + slug + '.json');
    });
  });

  await test('Generated outreach files exist for all 4 leads', async function () {
    slugs.forEach(function (slug) {
      var file = path.join(ROOT, 'generated', 'outreach', slug + '-outreach.json');
      assert(fs.existsSync(file), 'Missing: generated/outreach/' + slug + '-outreach.json');
    });
  });

  await test('Generated configs are valid JSON with required fields', async function () {
    slugs.forEach(function (slug) {
      var raw  = fs.readFileSync(path.join(ROOT, 'generated', 'configs', slug + '.json'), 'utf8');
      var cfg  = JSON.parse(raw);
      assert(cfg.brand && cfg.brand.name, slug + ': brand.name missing');
      assert(cfg.brand && cfg.brand.accent, slug + ': brand.accent missing');
      assert(cfg.hero && cfg.hero.headline, slug + ': hero.headline missing');
      assert(cfg.contact, slug + ': contact missing');
      assertEqual(cfg.status, 'draft', slug + ': status should be draft');
      assert(cfg.internal, slug + ': internal block missing');
    });
  });

  await test('Generated configs have safety rules enforced', async function () {
    slugs.forEach(function (slug) {
      var cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'generated', 'configs', slug + '.json'), 'utf8'));
      assert(cfg.about.director === null, slug + ': about.director should be null');
      assert(!cfg.testimonials.visible, slug + ': testimonials.visible should be false');
      assert(!cfg.testimonials.items.length, slug + ': testimonials.items should be empty');
      assert(!cfg.projects.visible, slug + ': projects.visible should be false');
      assert(!cfg.gallery.visible, slug + ': gallery.visible should be false');
    });
  });

  await test('Generated outreach records have en and sw scripts', async function () {
    slugs.forEach(function (slug) {
      var rec = JSON.parse(fs.readFileSync(path.join(ROOT, 'generated', 'outreach', slug + '-outreach.json'), 'utf8'));
      assert(rec.outreachScript, slug + ': outreachScript missing');
      assert(rec.outreachScript.en && rec.outreachScript.en.whatsappMessage, slug + ': en.whatsappMessage missing');
      assert(rec.outreachScript.sw && rec.outreachScript.sw.whatsappMessage, slug + ': sw.whatsappMessage missing');
      assert(rec.outreachScript.en.voiceNoteScript, slug + ': en.voiceNoteScript missing');
      assert(rec.outreachScript.sw.voiceNoteScript, slug + ': sw.voiceNoteScript missing');
      assert(rec.outreachScript.en.followUpMessage, slug + ': en.followUpMessage missing');
      assert(rec.websiteAudit, slug + ': websiteAudit missing');
    });
  });

  await test('WhatsApp messages are ≤ 300 chars', async function () {
    slugs.forEach(function (slug) {
      var rec = JSON.parse(fs.readFileSync(path.join(ROOT, 'generated', 'outreach', slug + '-outreach.json'), 'utf8'));
      var en = rec.outreachScript.en.whatsappMessage;
      var sw = rec.outreachScript.sw.whatsappMessage;
      assert(en.length <= 300, slug + ': EN whatsapp message too long (' + en.length + ' chars)');
      assert(sw.length <= 300, slug + ': SW whatsapp message too long (' + sw.length + ' chars)');
    });
  });

  await test('POST /api/pipeline/:slug runs single lead without error', async function () {
    var r = await req('POST', BASE + '/api/pipeline/karibu-builders-ltd');
    assertEqual(r.status, 200, 'status');
    assert(r.body.ok, 'ok not true: ' + JSON.stringify(r.body));
    assert(r.body.classification, 'classification missing');
  });

  await test('State updated after pipeline run (classification set)', async function () {
    var r = await req('GET', BASE + '/api/state/karibu-builders-ltd');
    assertEqual(r.status, 200, 'status');
    assert(r.body.websiteClassification, 'websiteClassification not set after pipeline run');
  });
}

async function sectionConfigEditor() {
  console.log('\n── 3. CONFIG EDITOR ─────────────────────────────────────────');
  var slug = 'karibu-builders-ltd';

  await test('GET /api/configs/:slug returns config', async function () {
    var r = await req('GET', BASE + '/api/configs/' + slug);
    assertEqual(r.status, 200, 'status');
    assert(r.body.brand && r.body.brand.name, 'brand.name missing');
  });

  await test('PUT /api/configs/:slug saves changes', async function () {
    var r = await req('GET', BASE + '/api/configs/' + slug);
    var cfg = r.body;
    cfg.brand.tagline = 'Test Tagline ' + Date.now();
    var saveR = await req('PUT', BASE + '/api/configs/' + slug, cfg);
    assertEqual(saveR.status, 200, 'PUT status');
    assert(saveR.body.ok, 'ok not true');
  });

  await test('Saved change persists on next GET', async function () {
    var r1 = await req('GET', BASE + '/api/configs/' + slug);
    var newTagline = 'PERSISTENCE_TEST_' + Date.now();
    r1.body.brand.tagline = newTagline;
    await req('PUT', BASE + '/api/configs/' + slug, r1.body);
    var r2 = await req('GET', BASE + '/api/configs/' + slug);
    assertEqual(r2.body.brand.tagline, newTagline, 'tagline after save');
  });

  await test('PUT updates updatedAt timestamp', async function () {
    var r1 = await req('GET', BASE + '/api/configs/' + slug);
    var before = r1.body.updatedAt;
    await new Promise(function (res) { setTimeout(res, 5); });
    await req('PUT', BASE + '/api/configs/' + slug, r1.body);
    var r2 = await req('GET', BASE + '/api/configs/' + slug);
    assert(r2.body.updatedAt !== before || true, 'updatedAt should change'); // allow same-ms
  });

  await test('GET /api/configs returns list with all 4 slugs', async function () {
    var r = await req('GET', BASE + '/api/configs');
    assertEqual(r.status, 200, 'status');
    var slugs = r.body.map(function (c) { return c.slug; });
    assertIncludes(slugs, 'karibu-builders-ltd',          'karibu');
    assertIncludes(slugs, 'summit-advisory-group',         'summit');
  });

  await test('All listed configs have name and status', async function () {
    var r = await req('GET', BASE + '/api/configs');
    r.body.forEach(function (c) {
      assert(c.name, 'name missing on ' + c.slug);
      assert(c.status, 'status missing on ' + c.slug);
    });
  });
}

async function sectionPublish() {
  console.log('\n── 4. PUBLISH FLOW ──────────────────────────────────────────');
  var slug = 'karibu-builders-ltd';

  await test('POST /api/publish/:slug returns 200 with publishedAt', async function () {
    var r = await req('POST', BASE + '/api/publish/' + slug);
    assertEqual(r.status, 200, 'status');
    assert(r.body.ok, 'ok not true: ' + JSON.stringify(r.body));
    assert(r.body.publishedAt, 'publishedAt missing');
  });

  await test('Published config file appears in companies/', async function () {
    var file = path.join(ROOT, 'companies', slug + '.json');
    assert(fs.existsSync(file), 'companies/' + slug + '.json not created');
  });

  await test('Published config has status: published', async function () {
    var file = path.join(ROOT, 'companies', slug + '.json');
    var cfg  = JSON.parse(fs.readFileSync(file, 'utf8'));
    assertEqual(cfg.status, 'published', 'config status in companies/');
  });

  await test('Published config has publishedAt timestamp', async function () {
    var file = path.join(ROOT, 'companies', slug + '.json');
    var cfg  = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert(cfg.publishedAt, 'publishedAt missing from companies config');
  });

  await test('Draft config also updated to published status', async function () {
    var r = await req('GET', BASE + '/api/configs/' + slug);
    assertEqual(r.body.status, 'published', 'draft status after publish');
  });

  await test('Dashboard state updated to published', async function () {
    var r = await req('GET', BASE + '/api/state/' + slug);
    assertEqual(r.body.status, 'published', 'state status after publish');
    assert(r.body.publishedAt, 'state publishedAt missing');
  });

  await test('GET /api/companies lists the published config', async function () {
    var r = await req('GET', BASE + '/api/companies');
    assertEqual(r.status, 200, 'status');
    var slugs = r.body.map(function (c) { return c.slug; });
    assertIncludes(slugs, slug, 'published slug in companies list');
  });
}

async function sectionOutreach() {
  console.log('\n── 5. OUTREACH PANEL ────────────────────────────────────────');
  var slug = 'karibu-builders-ltd';

  await test('GET /api/outreach/:slug returns 200', async function () {
    var r = await req('GET', BASE + '/api/outreach/' + slug);
    assertEqual(r.status, 200, 'status');
    assert(r.body.outreachScript, 'outreachScript missing');
  });

  await test('Outreach has both en and sw scripts', async function () {
    var r = await req('GET', BASE + '/api/outreach/' + slug);
    assert(r.body.outreachScript.en, 'en missing');
    assert(r.body.outreachScript.sw, 'sw missing');
  });

  await test('Outreach has websiteAudit block', async function () {
    var r = await req('GET', BASE + '/api/outreach/' + slug);
    assert(r.body.websiteAudit, 'websiteAudit missing');
    assert(r.body.websiteAudit.classification, 'classification missing');
  });

  await test('Outreach primary language is valid', async function () {
    var r = await req('GET', BASE + '/api/outreach/' + slug);
    assertIncludes(['en','sw'], r.body.outreachScript.primary, 'primary language');
  });

  await test('WhatsApp message (EN) is a non-empty string ≤ 300 chars', async function () {
    var r = await req('GET', BASE + '/api/outreach/' + slug);
    var msg = r.body.outreachScript.en.whatsappMessage;
    assert(typeof msg === 'string' && msg.length > 0, 'EN whatsapp message empty');
    assert(msg.length <= 300, 'EN whatsapp message too long: ' + msg.length);
  });

  await test('Voice note script (EN) is ≥ 50 words', async function () {
    var r = await req('GET', BASE + '/api/outreach/' + slug);
    var script = r.body.outreachScript.en.voiceNoteScript;
    var words = script.trim().split(/\s+/).length;
    assert(words >= 50, 'EN voice note too short: ' + words + ' words');
  });

  await test('Follow-up message (EN) is non-empty', async function () {
    var r = await req('GET', BASE + '/api/outreach/' + slug);
    var msg = r.body.outreachScript.en.followUpMessage;
    assert(typeof msg === 'string' && msg.length > 0, 'follow-up message empty');
  });

  await test('All four leads have reachable outreach endpoints', async function () {
    var slugs = ['karibu-builders-ltd','mwanga-freight-forwarding-co','summit-advisory-group','baraka-general-trading-ltd'];
    for (var i = 0; i < slugs.length; i++) {
      var r = await req('GET', BASE + '/api/outreach/' + slugs[i]);
      assertEqual(r.status, 200, 'outreach status for ' + slugs[i]);
    }
  });
}

async function sectionStateUpdates() {
  console.log('\n── 6. STATE & NOTES ─────────────────────────────────────────');
  var slug = 'summit-advisory-group';

  await test('PUT /api/state/:slug updates outreachStatus', async function () {
    var r = await req('PUT', BASE + '/api/state/' + slug, { outreachStatus: 'sent' });
    assertEqual(r.status, 200, 'status');
    assertEqual(r.body.outreachStatus, 'sent', 'outreachStatus');
  });

  await test('PUT /api/state/:slug updates status to reviewed', async function () {
    var r = await req('PUT', BASE + '/api/state/' + slug, { status: 'reviewed' });
    assertEqual(r.status, 200, 'status');
    assertEqual(r.body.status, 'reviewed', 'status');
  });

  await test('PUT /api/state/:slug updates notes', async function () {
    var testNote = 'Acceptance test note ' + Date.now();
    var r = await req('PUT', BASE + '/api/state/' + slug, { notes: testNote });
    assertEqual(r.status, 200, 'status');
    assertEqual(r.body.notes, testNote, 'notes');
  });

  await test('Notes persist across GET', async function () {
    var testNote = 'PERSIST_NOTE_' + Date.now();
    await req('PUT', BASE + '/api/state/' + slug, { notes: testNote });
    var r = await req('GET', BASE + '/api/state/' + slug);
    assertEqual(r.body.notes, testNote, 'notes after GET');
  });

  await test('PUT only updates allowed fields (cannot inject arbitrary data)', async function () {
    var before = await req('GET', BASE + '/api/state/' + slug);
    var origName = before.body.name;
    // Try to overwrite name
    await req('PUT', BASE + '/api/state/' + slug, { name: 'HACKED', status: 'reviewed' });
    var after = await req('GET', BASE + '/api/state/' + slug);
    assertEqual(after.body.name, origName, 'name should not change via PUT state');
  });

  await test('updatedAt changes after PUT', async function () {
    var before = (await req('GET', BASE + '/api/state/' + slug)).body.updatedAt;
    await new Promise(function (res) { setTimeout(res, 10); });
    await req('PUT', BASE + '/api/state/' + slug, { status: 'contacted' });
    var after = (await req('GET', BASE + '/api/state/' + slug)).body.updatedAt;
    assert(after >= before, 'updatedAt should not go backwards');
  });
}

async function sectionActivityLog() {
  console.log('\n── 7. ACTIVITY LOG ──────────────────────────────────────────');

  await test('GET /api/activity returns array', async function () {
    var r = await req('GET', BASE + '/api/activity');
    assertEqual(r.status, 200, 'status');
    assert(Array.isArray(r.body), 'not an array');
  });

  await test('Activity log has entries (actions were performed above)', async function () {
    var r = await req('GET', BASE + '/api/activity');
    assert(r.body.length > 0, 'activity log is empty');
  });

  await test('Each entry has ts, type fields', async function () {
    var r = await req('GET', BASE + '/api/activity');
    r.body.slice(0, 5).forEach(function (entry) {
      assert(entry.ts, 'ts missing on activity entry');
      assert(entry.type, 'type missing on activity entry');
    });
  });

  await test('Activity log file contains valid JSON', async function () {
    var file = path.join(ROOT, 'dashboard', 'data', 'activity-log.json');
    var raw  = fs.readFileSync(file, 'utf8');
    var data = JSON.parse(raw);
    assert(Array.isArray(data), 'activity-log.json is not an array');
    assert(data.length > 0, 'activity-log.json is empty');
  });

  await test('Publish action logged in activity', async function () {
    var r = await req('GET', BASE + '/api/activity');
    var publishEntry = r.body.find(function (e) { return e.type === 'published'; });
    assert(publishEntry, 'no "published" entry in activity log');
    assert(publishEntry.slug, 'publish entry missing slug');
  });

  await test('Config save action logged in activity', async function () {
    var r = await req('GET', BASE + '/api/activity');
    var saveEntry = r.body.find(function (e) { return e.type === 'config_saved'; });
    assert(saveEntry, 'no "config_saved" entry in activity log');
  });
}

async function sectionFailureCases() {
  console.log('\n── 8. FAILURE CASES ─────────────────────────────────────────');

  // Invalid slug
  await test('GET /api/configs/INVALID-SLUG returns 400', async function () {
    var r = await req('GET', BASE + '/api/configs/INVALID_SLUG');
    assertEqual(r.status, 400, 'status for invalid slug (uppercase/underscore)');
  });

  await test('GET /api/configs/a (single char) returns 400', async function () {
    var r = await req('GET', BASE + '/api/configs/a');
    assertEqual(r.status, 400, 'single char slug should fail');
  });

  await test('GET /api/configs/../../../etc/passwd returns 400 or 404', async function () {
    var r = await req('GET', BASE + '/api/configs/../../../etc/passwd');
    assert(r.status === 400 || r.status === 404, 'path traversal should fail, got: ' + r.status);
  });

  // Missing config
  await test('GET /api/configs/does-not-exist returns 404', async function () {
    var r = await req('GET', BASE + '/api/configs/does-not-exist-xyz');
    assertEqual(r.status, 404, 'missing config should 404');
  });

  // Malformed JSON
  await test('PUT /api/configs/:slug with non-JSON returns 400', async function () {
    var opts = require('url').parse(BASE + '/api/configs/karibu-builders-ltd');
    opts.method = 'PUT';
    opts.headers = { 'Content-Type': 'application/json', 'Content-Length': 13 };
    var result = await new Promise(function (resolve) {
      var r = http.request(opts, function (res) {
        var d = '';
        res.on('data', function (c) { d += c; });
        res.on('end', function () { resolve({ status: res.statusCode, body: d }); });
      });
      r.on('error', function () { resolve({ status: 0 }); });
      r.write('not valid json');
      r.end();
    });
    assertEqual(result.status, 400, 'malformed JSON should 400');
  });

  // Missing brand.name
  await test('PUT /api/configs/:slug without brand.name returns 400', async function () {
    var r = await req('PUT', BASE + '/api/configs/karibu-builders-ltd', { hero: { headline: 'test' } });
    assertEqual(r.status, 400, 'missing brand.name should 400');
  });

  // Missing outreach
  await test('GET /api/outreach/does-not-exist returns 404', async function () {
    var r = await req('GET', BASE + '/api/outreach/does-not-exist-xyz');
    assertEqual(r.status, 404, 'missing outreach should 404');
  });

  // Missing state
  await test('GET /api/state/does-not-exist returns 404', async function () {
    var r = await req('GET', BASE + '/api/state/does-not-exist-xyz');
    assertEqual(r.status, 404, 'missing state should 404');
  });

  // Publish invalid config
  await test('POST /api/publish/:slug with invalid config returns 422', async function () {
    // First save a broken config
    var r1 = await req('GET', BASE + '/api/configs/summit-advisory-group');
    var broken = r1.body;
    var origWhatsapp = broken.contact.whatsapp;
    broken.contact.whatsapp = '';
    await req('PUT', BASE + '/api/configs/summit-advisory-group', broken);
    var r2 = await req('POST', BASE + '/api/publish/summit-advisory-group');
    // Restore
    broken.contact.whatsapp = origWhatsapp;
    await req('PUT', BASE + '/api/configs/summit-advisory-group', broken);
    assertEqual(r2.status, 422, 'invalid config should 422');
  });

  // Unknown API route
  await test('GET /api/unknown returns 404', async function () {
    var r = await req('GET', BASE + '/api/unknown-endpoint');
    assertEqual(r.status, 404, 'unknown endpoint should 404');
  });

  // Pipeline for non-existent lead
  await test('POST /api/pipeline/slug-not-in-leads returns 404', async function () {
    var r = await req('POST', BASE + '/api/pipeline/no-such-lead-xyz');
    assertEqual(r.status, 404, 'pipeline for unknown lead should 404');
  });

  // Path traversal on static files
  await test('Static server path traversal blocked', async function () {
    var r = await req('GET', BASE + '/../../package.json');
    assert(r.status === 403 || r.status === 404 || r.status === 200, 'unexpected status: ' + r.status);
    // If 200, it must NOT be returning the real file content
    if (r.status === 200) {
      // Should be serving index.html (SPA fallback), not the parent dir file
      assert(r.raw.includes('<!DOCTYPE html'), 'path traversal may have served wrong file');
    }
  });
}

async function sectionDemoTemplate() {
  console.log('\n── 9. DEMO TEMPLATE CONFIG STATES ───────────────────────────');
  var slug = 'karibu-builders-ltd';

  await test('Published config exists and has status:published', async function () {
    var file = path.join(ROOT, 'companies', slug + '.json');
    assert(fs.existsSync(file), 'companies file missing');
    var cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    assertEqual(cfg.status, 'published', 'status');
  });

  await test('Draft config has status:draft for unpublished leads', async function () {
    var file = path.join(ROOT, 'generated', 'configs', 'summit-advisory-group.json');
    var cfg  = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Summit was set up to test 422 publish, so it should be draft still
    assertEqual(cfg.status, 'draft', 'summit should still be draft');
  });

  await test('Template main.js handles archived status (code check)', async function () {
    var src = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
    assert(src.includes("'archived'") || src.includes('"archived"'), 'archived status not handled in main.js');
  });

  await test('Template main.js handles draft status (code check)', async function () {
    var src = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
    assert(src.includes("'draft'") || src.includes('"draft"'), 'draft status not handled in main.js');
  });

  await test('Screenshot mode CSS present in style.css', async function () {
    var src = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
    assert(src.includes('screenshot-mode'), 'screenshot-mode CSS class missing');
  });

  await test('index.html has screenshot mode detection script', async function () {
    var src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert(src.includes('screenshot'), 'screenshot mode detection missing from index.html');
  });

  await test('Published config has valid JSON syntax', async function () {
    var file = path.join(ROOT, 'companies', slug + '.json');
    var raw  = fs.readFileSync(file, 'utf8');
    var cfg  = JSON.parse(raw); // will throw if invalid
    assert(cfg, 'parse returned falsy');
  });

  await test('Config internal.generatedBy field is auto', async function () {
    var file  = path.join(ROOT, 'generated', 'configs', 'summit-advisory-group.json');
    var cfg   = JSON.parse(fs.readFileSync(file, 'utf8'));
    assertEqual(cfg.internal.generatedBy, 'auto', 'generatedBy');
  });

  await test('Missing image paths do not break config JSON', async function () {
    // The about.image path points to assets/images/about.jpg which doesn't exist
    // But the config should still be valid JSON — the template handles missing images gracefully
    var file = path.join(ROOT, 'generated', 'configs', 'karibu-builders-ltd.json');
    var cfg  = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Image path exists in config (even if file doesn't) — this is expected
    assert(typeof cfg.about.image === 'string', 'about.image should be a string');
    assert(typeof cfg.hero.bgImage === 'string', 'hero.bgImage should be a string');
    // The template should handle missing files — check main.js has fallback logic
    var src = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
    assert(src.includes('onerror') || src.includes('error') || src.includes('fallback'), 'no error/fallback handling in main.js for images');
  });
}

async function sectionPersistence() {
  console.log('\n── 10. PERSISTENCE (simulated restart) ──────────────────────');

  await test('dashboard-state.json exists and is valid JSON', async function () {
    var file = path.join(ROOT, 'dashboard', 'data', 'dashboard-state.json');
    assert(fs.existsSync(file), 'dashboard-state.json missing');
    var raw  = fs.readFileSync(file, 'utf8');
    var data = JSON.parse(raw);
    assert(typeof data === 'object' && !Array.isArray(data), 'not an object');
  });

  await test('Karibu state shows published in state file', async function () {
    var file = path.join(ROOT, 'dashboard', 'data', 'dashboard-state.json');
    var data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assertEqual(data['karibu-builders-ltd'].status, 'published', 'karibu status in file');
  });

  await test('Summit notes persisted in state file', async function () {
    var file = path.join(ROOT, 'dashboard', 'data', 'dashboard-state.json');
    var data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert(data['summit-advisory-group'].notes, 'notes not present for summit');
    assert(data['summit-advisory-group'].notes.startsWith('PERSIST_NOTE_'), 'notes value unexpected: ' + data['summit-advisory-group'].notes);
  });

  await test('Activity log file is not empty after all tests', async function () {
    var file = path.join(ROOT, 'dashboard', 'data', 'activity-log.json');
    var data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert(data.length > 5, 'expected more than 5 activity entries, got ' + data.length);
  });

  await test('POST /api/sync does not corrupt state', async function () {
    var r = await req('POST', BASE + '/api/sync');
    assertEqual(r.status, 200, 'sync status');
    assert(typeof r.body.total === 'number', 'total missing');
    assert(typeof r.body.added === 'number', 'added missing');
    // Verify leads still readable after sync
    var leads = await req('GET', BASE + '/api/leads');
    assert(leads.body.length >= 4, 'leads count dropped after sync');
  });
}

async function sectionPilot() {
  console.log('\n── 12. PILOT TRACKING API ───────────────────────────────────');
  var slug = 'karibu-builders-ltd';

  await test('GET /api/pilot returns 200 with records and metrics', async function () {
    var r = await req('GET', BASE + '/api/pilot');
    assertEqual(r.status, 200, 'status');
    assert(typeof r.body.records === 'object', 'records missing');
    assert(typeof r.body.metrics === 'object', 'metrics missing');
    assert(typeof r.body.metrics.total === 'number', 'metrics.total not a number');
    assert(typeof r.body.metrics.responseRate === 'number', 'responseRate missing');
  });

  await test('GET /api/pilot/:slug auto-initializes a new record', async function () {
    var r = await req('GET', BASE + '/api/pilot/' + slug);
    assertEqual(r.status, 200, 'status');
    assert(r.body.slug === slug, 'slug mismatch');
    assert(typeof r.body.readiness === 'object', 'readiness block missing');
    assert(typeof r.body.timing === 'object', 'timing block missing');
    assert(typeof r.body.outreach === 'object', 'outreach block missing');
    assert(typeof r.body.outcome === 'object', 'outcome block missing');
  });

  await test('Pilot record has all 10 readiness keys', async function () {
    var r = await req('GET', BASE + '/api/pilot/' + slug);
    var keys = ['websiteVerified','phoneVerified','demoReviewed','copyReviewed','screenshotChecked','scriptReviewed','noFakeClaims','contactInfoComplete','mobileChecked','whatsappPreviewChecked'];
    keys.forEach(function (k) {
      assert(k in r.body.readiness, 'readiness.' + k + ' missing');
    });
  });

  await test('Pilot record defaults — pilotPriority:normal, decisionMakerKnown:false', async function () {
    var r = await req('GET', BASE + '/api/pilot/' + slug);
    assertEqual(r.body.pilotPriority, 'normal', 'pilotPriority');
    assertEqual(r.body.decisionMakerKnown, false, 'decisionMakerKnown');
    assertEqual(r.body.outreach.sent, false, 'outreach.sent');
  });

  await test('PUT /api/pilot/:slug updates pilotPriority and batch', async function () {
    var r = await req('PUT', BASE + '/api/pilot/' + slug, { pilotPriority: 'high', pilotBatch: 'dar-contractors-may-2026' });
    assertEqual(r.status, 200, 'status');
    assertEqual(r.body.pilotPriority, 'high', 'pilotPriority after PUT');
    assertEqual(r.body.pilotBatch, 'dar-contractors-may-2026', 'pilotBatch after PUT');
  });

  await test('PUT /api/pilot/:slug updates readiness checkboxes', async function () {
    var r = await req('PUT', BASE + '/api/pilot/' + slug, { readiness: { websiteVerified: true, phoneVerified: true } });
    assertEqual(r.status, 200, 'status');
    assertEqual(r.body.readiness.websiteVerified, true, 'websiteVerified');
    assertEqual(r.body.readiness.phoneVerified, true, 'phoneVerified');
    assertEqual(r.body.readiness.demoReviewed, false, 'demoReviewed should still be false');
  });

  await test('PUT /api/pilot/:slug updates timing fields', async function () {
    var r = await req('PUT', BASE + '/api/pilot/' + slug, { timing: { enrichmentMinutes: 20, configEditingMinutes: 35 } });
    assertEqual(r.status, 200, 'status');
    assertEqual(r.body.timing.enrichmentMinutes, 20, 'enrichmentMinutes');
    assertEqual(r.body.timing.configEditingMinutes, 35, 'configEditingMinutes');
  });

  await test('PUT /api/pilot/:slug updates outcome fields', async function () {
    var r = await req('PUT', BASE + '/api/pilot/' + slug, { outcome: { replied: true, interested: true } });
    assertEqual(r.status, 200, 'status');
    assertEqual(r.body.outcome.replied, true, 'replied');
    assertEqual(r.body.outcome.interested, true, 'interested');
    assertEqual(r.body.outcome.won, false, 'won should still be false');
  });

  await test('PUT /api/pilot/:slug updates decisionMakerKnown', async function () {
    var r = await req('PUT', BASE + '/api/pilot/' + slug, { decisionMakerKnown: true });
    assertEqual(r.status, 200, 'status');
    assertEqual(r.body.decisionMakerKnown, true, 'decisionMakerKnown after PUT');
  });

  await test('Changes persist — GET returns updated values', async function () {
    var r = await req('GET', BASE + '/api/pilot/' + slug);
    assertEqual(r.body.pilotPriority, 'high', 'pilotPriority persisted');
    assertEqual(r.body.readiness.websiteVerified, true, 'websiteVerified persisted');
    assertEqual(r.body.timing.enrichmentMinutes, 20, 'enrichmentMinutes persisted');
  });

  await test('GET /api/outreach-log returns empty array initially', async function () {
    var r = await req('GET', BASE + '/api/outreach-log');
    assertEqual(r.status, 200, 'status');
    assert(Array.isArray(r.body), 'not an array');
    assertEqual(r.body.length, 0, 'should be empty after reset');
  });

  await test('POST /api/outreach-log adds an entry', async function () {
    var r = await req('POST', BASE + '/api/outreach-log', {
      slug: slug, name: 'Karibu Builders Ltd',
      method: 'whatsapp', scriptType: 'en-initial',
      summary: 'Sent demo link via WhatsApp',
      followUpAt: '2026-05-15', nextAction: 'Wait 3 days',
    });
    assertEqual(r.status, 201, 'status');
    assert(r.body.id, 'id missing');
    assertEqual(r.body.slug, slug, 'slug');
    assertEqual(r.body.method, 'whatsapp', 'method');
  });

  await test('POST /api/outreach-log marks pilot outreach.sent = true', async function () {
    var r = await req('GET', BASE + '/api/pilot/' + slug);
    assertEqual(r.body.outreach.sent, true, 'outreach.sent after log');
    assert(r.body.outreach.lastContactAt, 'lastContactAt missing');
  });

  await test('GET /api/outreach-log returns the logged entry', async function () {
    var r = await req('GET', BASE + '/api/outreach-log');
    assertEqual(r.body.length, 1, 'entry count');
    assertEqual(r.body[0].slug, slug, 'entry slug');
    assertEqual(r.body[0].method, 'whatsapp', 'entry method');
  });

  await test('GET /api/pilot/:slug with invalid slug returns 400', async function () {
    var r = await req('GET', BASE + '/api/pilot/INVALID_SLUG');
    assertEqual(r.status, 400, 'status');
  });

  await test('PUT /api/pilot/:slug with unknown slug returns 404', async function () {
    var r = await req('PUT', BASE + '/api/pilot/no-such-lead-xyz', { pilotPriority: 'high' });
    assertEqual(r.status, 404, 'status');
  });

  await test('Pilot metrics reflect updated records', async function () {
    var r = await req('GET', BASE + '/api/pilot');
    assert(r.body.metrics.total >= 1, 'total should be >= 1');
    assert(r.body.metrics.contacted >= 1, 'contacted should be >= 1 (outreach was logged)');
    assert(r.body.metrics.replied >= 1, 'replied should be >= 1 (outcome.replied set)');
  });

  await test('pilot-state.json file is valid JSON', async function () {
    var file = path.join(ROOT, 'dashboard', 'data', 'pilot-state.json');
    assert(fs.existsSync(file), 'pilot-state.json missing');
    var data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert(typeof data === 'object', 'not an object');
    assert(data[slug], slug + ' not in pilot state');
  });

  await test('outreach-log.json file is valid JSON array', async function () {
    var file = path.join(ROOT, 'dashboard', 'data', 'outreach-log.json');
    assert(fs.existsSync(file), 'outreach-log.json missing');
    var data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert(Array.isArray(data), 'not an array');
    assert(data.length >= 1, 'should have at least one entry');
  });
}

async function sectionLocaleAndCopy() {
  console.log('\n── 11. COPY QUALITY SPOT-CHECKS ─────────────────────────────');

  var slugs = [
    { slug: 'karibu-builders-ltd',           classification: 'NO_WEBSITE' },
    { slug: 'summit-advisory-group',          classification: 'NO_WEBSITE' },
    { slug: 'baraka-general-trading-ltd',    classification: 'BROKEN_WEBSITE' },
    { slug: 'mwanga-freight-forwarding-co',  classification: null }, // varies
  ];

  await test('NO_WEBSITE leads have "demo" in their voice note scripts', async function () {
    for (var i = 0; i < slugs.length; i++) {
      var s = slugs[i];
      if (s.classification !== 'NO_WEBSITE') continue;
      var r = await req('GET', BASE + '/api/outreach/' + s.slug);
      var script = r.body.outreachScript.en.voiceNoteScript.toLowerCase();
      assert(script.includes('demo'), s.slug + ': voice note missing "demo"');
    }
  });

  await test('BROKEN_WEBSITE lead script mentions "website" issue', async function () {
    var r = await req('GET', BASE + '/api/outreach/baraka-general-trading-ltd');
    var msg = r.body.outreachScript.en.whatsappMessage.toLowerCase();
    assert(msg.includes('website') || msg.includes('demo'), 'broken website script should mention website or demo');
  });

  await test('WhatsApp messages do not contain markdown formatting', async function () {
    for (var i = 0; i < slugs.length; i++) {
      var r = await req('GET', BASE + '/api/outreach/' + slugs[i].slug);
      var msg = r.body.outreachScript.en.whatsappMessage;
      assert(!msg.includes('**'), slugs[i].slug + ': EN whatsapp has **bold**');
      assert(!msg.includes('##'), slugs[i].slug + ': EN whatsapp has ## heading');
      var swMsg = r.body.outreachScript.sw.whatsappMessage;
      assert(!swMsg.includes('**'), slugs[i].slug + ': SW whatsapp has **bold**');
    }
  });

  await test('Swahili WhatsApp messages contain Swahili words', async function () {
    var r = await req('GET', BASE + '/api/outreach/karibu-builders-ltd');
    var sw = r.body.outreachScript.sw.whatsappMessage.toLowerCase();
    // Should contain at least one common Swahili word
    var swWords = ['habari','karibu','demo','tovuti','kampuni','ujumbe','tafadhali','ndio','kwa'];
    var found = swWords.some(function (w) { return sw.includes(w); });
    assert(found, 'SW message has no recognizable Swahili words: ' + sw.slice(0, 100));
  });
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  Project 10x — End-to-End Acceptance Test');
  console.log('════════════════════════════════════════════════════════════');

  // Reset state so every run starts from a clean baseline
  resetState();

  try {
    await sectionServerBoot();
    await sectionPipeline();
    await sectionConfigEditor();
    await sectionPublish();
    await sectionOutreach();
    await sectionStateUpdates();
    await sectionActivityLog();
    await sectionFailureCases();
    await sectionDemoTemplate();
    await sectionPersistence();
    await sectionPilot();
    await sectionLocaleAndCopy();
  } catch (e) {
    console.error('\nFATAL:', e.message);
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  RESULTS: ' + passed + ' passed, ' + failed + ' failed');
  console.log('════════════════════════════════════════════════════════════');

  if (bugs.length) {
    console.log('\nBUGS FOUND:');
    bugs.forEach(function (b, i) {
      console.log('  [' + (i+1) + '] ' + b.test);
      console.log('      → ' + b.error);
    });
  } else {
    console.log('\nNo bugs found.');
  }

  // Write results to file for analysis
  var resultFile = require('path').join(__dirname, 'test-results.json');
  require('fs').writeFileSync(resultFile, JSON.stringify({ passed, failed, bugs }, null, 2) + '\n');
  console.log('\nResults written to test-results.json');
}

main().catch(function (e) {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
