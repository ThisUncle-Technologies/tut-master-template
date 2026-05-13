'use strict';

// dashboard/server.js — Lead Dashboard HTTP Server
//
// Raw Node.js http module. Zero npm dependencies.
// Port 3001. Serves static files from dashboard/ and API routes.
//
// Usage:
//   node dashboard/server.js

const http = require('http');
const fs   = require('fs');
const path = require('path');

const { generateCompanyConfig }  = require('../tools/generate-company-config');
const { analyzeWebsite }         = require('../tools/website-quality-analyzer');
const { generateOutreachScript } = require('../tools/outreach-script-generator');
const { validateConfig }         = require('../tools/utils/validation');
const { slugify }                = require('../tools/utils/slug');

const PORT = 3001;

// ── Path constants ─────────────────────────────────────────────

const ROOT          = path.join(__dirname, '..');
const DASHBOARD_DIR = __dirname;
const DATA_DIR      = path.join(__dirname, 'data');
const STATE_FILE    = path.join(DATA_DIR, 'dashboard-state.json');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activity-log.json');
const CONFIGS_DIR   = path.join(ROOT, 'generated', 'configs');
const OUTREACH_DIR  = path.join(ROOT, 'generated', 'outreach');
const COMPANIES_DIR = path.join(ROOT, 'companies');
const LEADS_DIR      = path.join(ROOT, 'leads');
const PILOT_FILE     = path.join(DATA_DIR, 'pilot-state.json');
const OUTREACH_LOG   = path.join(DATA_DIR, 'outreach-log.json');

const MAX_ACTIVITY     = 500;
const MAX_OUTREACH_LOG = 1000;
const MAX_BODY         = 512 * 1024;

// ── I/O helpers ────────────────────────────────────────────────

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return fallback; }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── State ──────────────────────────────────────────────────────

function readState()    { return readJson(STATE_FILE, {}); }
function writeState(s)  { writeJson(STATE_FILE, s); }

// ── Pilot state ────────────────────────────────────────────────

function readPilot()   { return readJson(PILOT_FILE, {}); }
function writePilot(p) { writeJson(PILOT_FILE, p); }

var CHECKLIST_KEYS = [
  'websiteVerified', 'phoneVerified', 'demoReviewed', 'copyReviewed',
  'screenshotChecked', 'scriptReviewed', 'noFakeClaims', 'contactInfoComplete',
  'mobileChecked', 'whatsappPreviewChecked',
];
var TIMING_KEYS    = ['enrichmentMinutes', 'configEditingMinutes', 'outreachPrepMinutes', 'totalPrepMinutes'];
var OUTREACH_KEYS  = ['sent', 'sentAt', 'method', 'followUpCount', 'lastContactAt', 'nextFollowUpAt'];
var OUTCOME_KEYS   = ['replied', 'repliedAt', 'interested', 'meetingBooked', 'won', 'lost', 'lostReason'];

function makePilotRecord(slug, name) {
  var now = new Date().toISOString();
  var ym  = now.slice(0, 7);
  return {
    slug: slug, name: name || slug,
    pilotBatch: ym, pilotPriority: 'normal', decisionMakerKnown: false,
    readiness: {
      websiteVerified: false, phoneVerified: false, demoReviewed: false,
      copyReviewed: false, screenshotChecked: false, scriptReviewed: false,
      noFakeClaims: false, contactInfoComplete: false,
      mobileChecked: false, whatsappPreviewChecked: false,
    },
    timing: { enrichmentMinutes: null, configEditingMinutes: null, outreachPrepMinutes: null, totalPrepMinutes: null },
    outreach: { sent: false, sentAt: null, method: null, followUpCount: 0, lastContactAt: null, nextFollowUpAt: null },
    outcome: { replied: false, repliedAt: null, interested: false, meetingBooked: false, won: false, lost: false, lostReason: null },
    notes: '', createdAt: now, updatedAt: now,
  };
}

// ── Activity ───────────────────────────────────────────────────

function logActivity(entry) {
  var log = readJson(ACTIVITY_FILE, []);
  log.unshift(Object.assign({ ts: new Date().toISOString() }, entry));
  if (log.length > MAX_ACTIVITY) log.length = MAX_ACTIVITY;
  writeJson(ACTIVITY_FILE, log);
}

// ── Completeness score ─────────────────────────────────────────

function completeness(cfg) {
  var s = 0;
  if (cfg.contact) {
    if (cfg.contact.phone)    s += 10;
    if (cfg.contact.whatsapp) s += 20;
    if (cfg.contact.email)    s += 10;
    if (cfg.contact.address)  s += 10;
  }
  if (cfg.about && cfg.about.director) s += 10;
  if (cfg.about && cfg.about.image && cfg.about.image !== 'assets/images/about.jpg') s += 5;
  if (cfg.hero && cfg.hero.bgImage && cfg.hero.bgImage !== 'assets/images/hero.jpg') s += 5;
  if (cfg.projects && cfg.projects.items && cfg.projects.items.length) s += 10;
  if (cfg.gallery && cfg.gallery.items && cfg.gallery.items.length) s += 10;
  if (cfg.testimonials && cfg.testimonials.items && cfg.testimonials.items.length) s += 10;
  return s;
}

// ── Body parser ────────────────────────────────────────────────

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    var size = 0;
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > MAX_BODY) { req.destroy(); reject(new Error('Body too large')); return; }
      chunks.push(chunk);
    });
    req.on('end',   function () { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

// ── HTTP helpers ───────────────────────────────────────────────

var CORS = { 'Access-Control-Allow-Origin': '*' };

function json(res, data, status) {
  res.writeHead(status || 200, Object.assign({ 'Content-Type': 'application/json' }, CORS));
  res.end(JSON.stringify(data));
}

function fail(res, msg, status) { json(res, { error: msg }, status || 400); }

function validSlug(s) {
  return typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,79}[a-z0-9]$/.test(s);
}

// ── Lead loader ────────────────────────────────────────────────

function loadAllLeads() {
  if (!fs.existsSync(LEADS_DIR)) return [];
  return fs.readdirSync(LEADS_DIR)
    .filter(function (f) { return f.endsWith('.json'); })
    .reduce(function (all, f) {
      var raw = readJson(path.join(LEADS_DIR, f), []);
      return all.concat(Array.isArray(raw) ? raw : [raw]);
    }, []);
}

// ── Pipeline runner ────────────────────────────────────────────

async function runOneLead(lead) {
  var audit;
  try { audit = await analyzeWebsite(lead.website || null); }
  catch (e) {
    audit = {
      classification: 'NO_WEBSITE', score: 0, redesignRecommended: true,
      weaknesses: ['error: ' + e.message], strengths: [],
      suggestedPitchAngle: 'no-website', url: lead.website || null, responseTimeMs: null,
    };
  }
  var gen     = generateCompanyConfig(lead);
  var outreach = generateOutreachScript(lead, audit, gen.slug);
  ensureDir(OUTREACH_DIR);
  writeJson(path.join(OUTREACH_DIR, gen.slug + '-outreach.json'), {
    leadId: lead.leadId || '', name: lead.name, slug: gen.slug,
    websiteAudit: audit, outreachScript: outreach,
    generatedAt: new Date().toISOString(),
  });
  return { slug: gen.slug, audit: audit };
}

// ── API handlers ───────────────────────────────────────────────

async function getLeads(req, res) {
  var state = readState();
  var leads = Object.values(state).map(function (entry) {
    var cfg = readJson(path.join(CONFIGS_DIR, entry.slug + '.json'), null);
    return Object.assign({}, entry, { completeness: cfg ? completeness(cfg) : 0 });
  });
  json(res, leads);
}

async function getActivity(req, res) {
  json(res, readJson(ACTIVITY_FILE, []));
}

async function listConfigs(req, res) {
  if (!fs.existsSync(CONFIGS_DIR)) return json(res, []);
  var files = fs.readdirSync(CONFIGS_DIR).filter(function (f) { return f.endsWith('.json'); });
  json(res, files.map(function (f) {
    var cfg = readJson(path.join(CONFIGS_DIR, f), {});
    return {
      slug:     f.replace('.json', ''),
      name:     cfg.brand && cfg.brand.name,
      status:   cfg.status,
      industry: cfg.brand && cfg.brand.industry,
    };
  }));
}

async function getDraftConfig(req, res, m) {
  var slug = m[1];
  if (!validSlug(slug)) return fail(res, 'Invalid slug');
  var file = path.join(CONFIGS_DIR, slug + '.json');
  if (!fs.existsSync(file)) return fail(res, 'Config not found', 404);
  json(res, readJson(file, {}));
}

async function saveDraftConfig(req, res, m) {
  var slug = m[1];
  if (!validSlug(slug)) return fail(res, 'Invalid slug');
  var body;
  try { body = JSON.parse(await readBody(req)); }
  catch (e) { return fail(res, 'Invalid JSON: ' + e.message); }
  if (!body.brand || !body.brand.name) return fail(res, 'brand.name is required');
  var now = new Date().toISOString();
  body.updatedAt = now;
  if (body.internal) body.internal.updatedAt = now;
  ensureDir(CONFIGS_DIR);
  writeJson(path.join(CONFIGS_DIR, slug + '.json'), body);
  logActivity({ type: 'config_saved', slug: slug, name: body.brand.name });
  json(res, { ok: true, slug: slug, updatedAt: now });
}

async function listCompanies(req, res) {
  if (!fs.existsSync(COMPANIES_DIR)) return json(res, []);
  var files = fs.readdirSync(COMPANIES_DIR).filter(function (f) { return f.endsWith('.json'); });
  json(res, files.map(function (f) {
    var cfg = readJson(path.join(COMPANIES_DIR, f), {});
    return {
      slug:     f.replace('.json', ''),
      name:     cfg.brand && cfg.brand.name,
      status:   cfg.status,
      industry: cfg.brand && cfg.brand.industry,
    };
  }));
}

async function getLeadState(req, res, m) {
  var slug = m[1];
  if (!validSlug(slug)) return fail(res, 'Invalid slug');
  var state = readState();
  if (!state[slug]) return fail(res, 'Not found', 404);
  json(res, state[slug]);
}

async function updateLeadState(req, res, m) {
  var slug = m[1];
  if (!validSlug(slug)) return fail(res, 'Invalid slug');
  var body;
  try { body = JSON.parse(await readBody(req)); }
  catch (e) { return fail(res, 'Invalid JSON'); }
  var state = readState();
  if (!state[slug]) return fail(res, 'Not found', 404);
  ['status', 'outreachStatus', 'notes'].forEach(function (k) {
    if (k in body) state[slug][k] = body[k];
  });
  state[slug].updatedAt = new Date().toISOString();
  writeState(state);
  logActivity({ type: 'status_updated', slug: slug, name: state[slug].name, status: state[slug].status });
  json(res, state[slug]);
}

async function getOutreach(req, res, m) {
  var slug = m[1];
  if (!validSlug(slug)) return fail(res, 'Invalid slug');
  var file = path.join(OUTREACH_DIR, slug + '-outreach.json');
  if (!fs.existsSync(file)) return fail(res, 'Outreach not found', 404);
  json(res, readJson(file, {}));
}

async function publishConfig(req, res, m) {
  var slug = m[1];
  if (!validSlug(slug)) return fail(res, 'Invalid slug');
  var draftFile = path.join(CONFIGS_DIR, slug + '.json');
  if (!fs.existsSync(draftFile)) return fail(res, 'Draft config not found', 404);
  var cfg = readJson(draftFile, null);
  if (!cfg) return fail(res, 'Could not read draft config', 500);
  var v = validateConfig(cfg);
  if (!v.valid) return fail(res, 'Validation failed: ' + v.warnings.join('; '), 422);
  var now = new Date().toISOString();
  cfg.status      = 'published';
  cfg.updatedAt   = now;
  cfg.publishedAt = now;
  if (cfg.internal) { cfg.internal.updatedAt = now; cfg.internal.publishedAt = now; }
  writeJson(draftFile, cfg);
  ensureDir(COMPANIES_DIR);
  writeJson(path.join(COMPANIES_DIR, slug + '.json'), cfg);
  var state = readState();
  if (state[slug]) {
    state[slug].status      = 'published';
    state[slug].publishedAt = now;
    state[slug].updatedAt   = now;
    writeState(state);
  }
  logActivity({ type: 'published', slug: slug, name: cfg.brand.name });
  json(res, { ok: true, slug: slug, publishedAt: now });
}

async function pipelineOne(req, res, m) {
  var slug = m[1];
  if (!validSlug(slug)) return fail(res, 'Invalid slug');
  var leads = loadAllLeads();
  var lead  = leads.find(function (l) { return l && l.name && slugify(l.name) === slug; });
  if (!lead) return fail(res, 'Lead source record not found in leads/ directory', 404);
  try {
    var result = await runOneLead(lead);
    var state  = readState();
    if (state[slug]) {
      state[slug].status               = 'generated';
      state[slug].websiteClassification = result.audit.classification;
      state[slug].updatedAt            = new Date().toISOString();
      writeState(state);
    }
    logActivity({ type: 'pipeline_run', slug: slug, name: lead.name, classification: result.audit.classification });
    json(res, { ok: true, slug: slug, classification: result.audit.classification });
  } catch (e) {
    fail(res, 'Pipeline failed: ' + e.message, 500);
  }
}

async function pipelineAll(req, res) {
  var leads = loadAllLeads().filter(function (l) { return l && l.name; });
  if (!leads.length) return fail(res, 'No leads found in leads/ directory', 404);
  var results = [];
  for (var i = 0; i < leads.length; i++) {
    var lead = leads[i];
    try {
      var r = await runOneLead(lead);
      results.push({ slug: r.slug, name: lead.name, ok: true, classification: r.audit.classification });
    } catch (e) {
      results.push({ slug: slugify(lead.name), name: lead.name, ok: false, error: e.message });
    }
  }
  var state = readState();
  results.forEach(function (r) {
    if (r.ok && state[r.slug]) {
      state[r.slug].status               = 'generated';
      state[r.slug].websiteClassification = r.classification;
      state[r.slug].updatedAt            = new Date().toISOString();
    }
  });
  writeState(state);
  logActivity({ type: 'pipeline_all', count: results.filter(function (r) { return r.ok; }).length });
  json(res, results);
}

async function syncState(req, res) {
  var leads = loadAllLeads().filter(function (l) { return l && l.name; });
  var state = readState();
  var added = 0;
  leads.forEach(function (lead) {
    // Prefer explicit slug on lead (set by import stage); fall back to slugify(name)
    var slug    = lead.slug || slugify(lead.name);
    var cfgFile = path.join(CONFIGS_DIR, slug + '.json');
    var outFile = path.join(OUTREACH_DIR, slug + '-outreach.json');
    if (state[slug]) return; // already tracked

    if (fs.existsSync(cfgFile)) {
      // Lead has been through the generation pipeline
      var cfg     = readJson(cfgFile, {});
      var outData = readJson(outFile, null);
      state[slug] = {
        slug:                 slug,
        leadId:               lead.leadId || '',
        name:                 lead.name,
        industry:             (cfg.brand && cfg.brand.industry) || 'general',
        websiteClassification: (outData && outData.websiteAudit && outData.websiteAudit.classification) || 'UNKNOWN',
        status:               cfg.status === 'published' ? 'published' : 'generated',
        outreachStatus:       lead.outreachStatus || 'pending',
        salesRep:             lead.salesRep || '',
        createdAt:            (cfg.internal && cfg.internal.createdAt) || new Date().toISOString(),
        updatedAt:            new Date().toISOString(),
        publishedAt:          cfg.publishedAt || null,
      };
    } else {
      // Imported lead — no config generated yet; use status from lead file (default: "new")
      state[slug] = {
        slug:                 slug,
        leadId:               lead.leadId || '',
        name:                 lead.name,
        industry:             lead.industry || 'general',
        websiteClassification:'UNKNOWN',
        status:               lead.status || 'new',
        outreachStatus:       lead.outreachStatus || 'pending',
        salesRep:             lead.salesRep || '',
        createdAt:            new Date().toISOString(),
        updatedAt:            new Date().toISOString(),
        publishedAt:          null,
      };
    }
    added++;
  });
  if (added) writeState(state);
  logActivity({ type: 'sync', added: added });
  json(res, { ok: true, added: added, total: Object.keys(state).length });
}

// ── Pilot handlers ─────────────────────────────────────────────

async function getPilot(req, res) {
  var pilot   = readPilot();
  var state   = readState();
  var records = Object.values(pilot);

  var m = { total: records.length, generated: 0, contacted: 0, replied: 0,
            interested: 0, meetingsBooked: 0, won: 0, lost: 0 };
  records.forEach(function (r) {
    var ts = state[r.slug] || {};
    if (ts.status === 'generated' || ts.status === 'reviewed' || ts.status === 'published') m.generated++;
    if (r.outreach && r.outreach.sent)        m.contacted++;
    if (r.outcome  && r.outcome.replied)      m.replied++;
    if (r.outcome  && r.outcome.interested)   m.interested++;
    if (r.outcome  && r.outcome.meetingBooked) m.meetingsBooked++;
    if (r.outcome  && r.outcome.won)          m.won++;
    if (r.outcome  && r.outcome.lost)         m.lost++;
  });
  m.responseRate   = m.contacted ? Math.round((m.replied   / m.contacted) * 100) : 0;
  m.conversionRate = m.contacted ? Math.round((m.won       / m.contacted) * 100) : 0;

  json(res, { records: pilot, metrics: m });
}

async function getPilotOne(req, res, m) {
  var slug = m[1];
  if (!validSlug(slug)) return fail(res, 'Invalid slug');
  var pilot = readPilot();
  if (!pilot[slug]) {
    var state = readState();
    if (!state[slug]) return fail(res, 'Lead not found in dashboard state', 404);
    pilot[slug] = makePilotRecord(slug, state[slug].name);
    writePilot(pilot);
  }
  json(res, pilot[slug]);
}

async function updatePilotOne(req, res, m) {
  var slug = m[1];
  if (!validSlug(slug)) return fail(res, 'Invalid slug');
  var body;
  try { body = JSON.parse(await readBody(req)); }
  catch (e) { return fail(res, 'Invalid JSON'); }

  var pilot = readPilot();
  if (!pilot[slug]) {
    var state = readState();
    if (!state[slug]) return fail(res, 'Lead not found in dashboard state', 404);
    pilot[slug] = makePilotRecord(slug, state[slug].name);
  }
  var r = pilot[slug];

  ['pilotBatch', 'pilotPriority', 'decisionMakerKnown', 'notes'].forEach(function (k) {
    if (k in body) r[k] = body[k];
  });
  if (body.readiness && typeof body.readiness === 'object') {
    CHECKLIST_KEYS.forEach(function (k) { if (k in body.readiness) r.readiness[k] = !!body.readiness[k]; });
  }
  if (body.timing && typeof body.timing === 'object') {
    TIMING_KEYS.forEach(function (k) {
      if (k in body.timing) r.timing[k] = body.timing[k] == null ? null : Number(body.timing[k]);
    });
  }
  if (body.outreach && typeof body.outreach === 'object') {
    OUTREACH_KEYS.forEach(function (k) { if (k in body.outreach) r.outreach[k] = body.outreach[k]; });
  }
  if (body.outcome && typeof body.outcome === 'object') {
    OUTCOME_KEYS.forEach(function (k) { if (k in body.outcome) r.outcome[k] = body.outcome[k]; });
  }
  r.updatedAt = new Date().toISOString();
  writePilot(pilot);
  logActivity({ type: 'pilot_updated', slug: slug, name: r.name });
  json(res, r);
}

async function getOutreachLog(req, res) {
  json(res, readJson(OUTREACH_LOG, []));
}

async function addOutreachEntry(req, res) {
  var body;
  try { body = JSON.parse(await readBody(req)); }
  catch (e) { return fail(res, 'Invalid JSON'); }
  if (!body.slug || !validSlug(body.slug)) return fail(res, 'Invalid slug');

  var log   = readJson(OUTREACH_LOG, []);
  var ts    = new Date().toISOString();
  var entry = {
    id:               'ol-' + ts.replace(/[-:T.Z]/g, '').slice(0, 14) + '-' + String(log.length + 1).padStart(3, '0'),
    slug:             body.slug,
    name:             body.name             || '',
    ts:               ts,
    method:           body.method           || 'whatsapp',
    scriptType:       body.scriptType       || '',
    summary:          body.summary          || '',
    responseReceived: !!body.responseReceived,
    responseSummary:  body.responseSummary  || '',
    nextAction:       body.nextAction       || '',
    followUpAt:       body.followUpAt       || null,
  };
  log.unshift(entry);
  if (log.length > MAX_OUTREACH_LOG) log.length = MAX_OUTREACH_LOG;
  writeJson(OUTREACH_LOG, log);

  // Update pilot state — mark outreach sent
  var pilot = readPilot();
  if (pilot[body.slug]) {
    var pr = pilot[body.slug];
    if (!pr.outreach.sent) pr.outreach.sentAt = ts;
    pr.outreach.sent = true;
    pr.outreach.followUpCount  = (pr.outreach.followUpCount || 0) + 1;
    pr.outreach.lastContactAt  = ts;
    if (entry.followUpAt) pr.outreach.nextFollowUpAt = entry.followUpAt;
    pr.updatedAt = ts;
    writePilot(pilot);
  }

  logActivity({ type: 'outreach_logged', slug: body.slug, name: entry.name, method: entry.method });
  json(res, entry, 201);
}

// ── Route table ────────────────────────────────────────────────

var ROUTES = [
  { method: 'GET',  re: /^\/api\/leads$/,                fn: getLeads },
  { method: 'GET',  re: /^\/api\/activity$/,             fn: getActivity },
  { method: 'GET',  re: /^\/api\/configs$/,              fn: listConfigs },
  { method: 'GET',  re: /^\/api\/configs\/([^\/]+)$/,    fn: getDraftConfig },
  { method: 'PUT',  re: /^\/api\/configs\/([^\/]+)$/,    fn: saveDraftConfig },
  { method: 'GET',  re: /^\/api\/companies$/,            fn: listCompanies },
  { method: 'GET',  re: /^\/api\/state\/([^\/]+)$/,      fn: getLeadState },
  { method: 'PUT',  re: /^\/api\/state\/([^\/]+)$/,      fn: updateLeadState },
  { method: 'GET',  re: /^\/api\/outreach\/([^\/]+)$/,   fn: getOutreach },
  { method: 'POST', re: /^\/api\/publish\/([^\/]+)$/,    fn: publishConfig },
  { method: 'POST', re: /^\/api\/pipeline\/([^\/]+)$/,   fn: pipelineOne },
  { method: 'POST', re: /^\/api\/pipeline$/,              fn: pipelineAll },
  { method: 'POST', re: /^\/api\/sync$/,                 fn: syncState },
  { method: 'GET',  re: /^\/api\/pilot$/,                fn: getPilot },
  { method: 'GET',  re: /^\/api\/pilot\/([^\/]+)$/,      fn: getPilotOne },
  { method: 'PUT',  re: /^\/api\/pilot\/([^\/]+)$/,      fn: updatePilotOne },
  { method: 'GET',  re: /^\/api\/outreach-log$/,         fn: getOutreachLog },
  { method: 'POST', re: /^\/api\/outreach-log$/,         fn: addOutreachEntry },
];

// ── Static file server ─────────────────────────────────────────

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

function serveStatic(urlPath, res) {
  var filePath = urlPath === '/' ? '/index.html' : urlPath;
  var resolved = path.resolve(DASHBOARD_DIR, '.' + filePath);
  var safe     = DASHBOARD_DIR + path.sep;
  if (!resolved.startsWith(safe) && resolved !== DASHBOARD_DIR) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  if (!fs.existsSync(resolved)) {
    // SPA fallback
    resolved = path.join(DASHBOARD_DIR, 'index.html');
    if (!fs.existsSync(resolved)) { res.writeHead(404); res.end('Not found'); return; }
  }
  var content = fs.readFileSync(resolved);
  res.writeHead(200, { 'Content-Type': MIME[path.extname(resolved)] || 'application/octet-stream' });
  res.end(content);
}

// ── HTTP server ────────────────────────────────────────────────

var server = http.createServer(async function (req, res) {
  var urlPath = (req.url || '/').split('?')[0];
  var method  = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    res.writeHead(204, Object.assign({
      'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }, CORS));
    res.end();
    return;
  }

  if (urlPath.startsWith('/api/')) {
    var matched = false;
    for (var i = 0; i < ROUTES.length; i++) {
      var route = ROUTES[i];
      if (route.method !== method) continue;
      var m = urlPath.match(route.re);
      if (m) {
        matched = true;
        try { await route.fn(req, res, m); }
        catch (e) {
          console.error('[api] Unhandled error on', urlPath, '—', e.message);
          if (!res.headersSent) fail(res, 'Internal server error', 500);
        }
        break;
      }
    }
    if (!matched) fail(res, 'Not found', 404);
    return;
  }

  try { serveStatic(urlPath, res); }
  catch (e) { if (!res.headersSent) { res.writeHead(500); res.end('Server error'); } }
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('');
  console.log('════════════════════════════════════════════════');
  console.log('  TUT Lead Dashboard');
  console.log('  http://localhost:' + PORT);
  console.log('════════════════════════════════════════════════');
  console.log('');
});

server.on('error', function (e) {
  if (e.code === 'EADDRINUSE') {
    console.error('[server] Port ' + PORT + ' is already in use. Stop the other process first.');
  } else {
    console.error('[server] Error:', e.message);
  }
  process.exit(1);
});
