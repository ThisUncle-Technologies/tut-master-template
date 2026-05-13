'use strict';

// dashboard.js — Lead Dashboard SPA
// Hash-based router. Views: #/leads, #/lead/:slug, #/config/:slug, #/outreach/:slug

// ── Globals ────────────────────────────────────────────────────

var _cfg = null;          // config currently being edited
var _cfgSlug = null;      // slug for the config being edited

// ── Utilities ──────────────────────────────────────────────────

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function get(id)  { return document.getElementById(id); }
function app()    { return get('app'); }
function nl(s)    { return String(s || '').replace(/\n/g, '<br>'); }

function fmtDate(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ── Toast ──────────────────────────────────────────────────────

function toast(msg, type) {
  var el = get('toast');
  el.textContent = msg;
  el.className = 'toast toast--' + (type || 'info') + ' toast--visible';
  clearTimeout(el._t);
  el._t = setTimeout(function () { el.className = 'toast'; }, 3200);
}

// ── Confirm dialog ─────────────────────────────────────────────

function confirm(msg) {
  return new Promise(function (resolve) {
    var overlay = get('confirm-overlay');
    var text    = get('confirm-text');
    var ok      = get('confirm-ok');
    var cancel  = get('confirm-cancel');
    text.textContent = msg;
    overlay.classList.add('confirm--visible');
    function done(val) {
      overlay.classList.remove('confirm--visible');
      ok.onclick = null; cancel.onclick = null;
      resolve(val);
    }
    ok.onclick     = function () { done(true);  };
    cancel.onclick = function () { done(false); };
  });
}

// ── Clipboard ─────────────────────────────────────────────────

function copyText(text, btn) {
  if (!navigator.clipboard) { toast('Clipboard not available — select text manually', 'error'); return; }
  navigator.clipboard.writeText(text).then(function () {
    var orig = btn.textContent;
    btn.textContent = 'Copied!';
    btn.disabled = true;
    setTimeout(function () { btn.textContent = orig; btn.disabled = false; }, 1800);
  }).catch(function () { toast('Copy failed', 'error'); });
}

// ── API client ─────────────────────────────────────────────────

function api(method, path, body) {
  var opts = { method: method };
  if (body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  return fetch(path, opts).then(function (r) {
    return r.text().then(function (text) {
      var data;
      try { data = JSON.parse(text); } catch (e) { data = { error: text || r.statusText }; }
      if (!r.ok) throw new Error(data.error || 'Request failed (' + r.status + ')');
      return data;
    });
  });
}

// ── Badge helpers ──────────────────────────────────────────────

var STATUS_ORDER   = ['new','generated','reviewed','published','contacted','replied','won','lost','archived'];
var PILOT_PRIORITY = ['low','normal','high','urgent'];
var CHECKLIST_LABELS = {
  websiteVerified:       'Website verified',
  phoneVerified:         'Phone verified',
  demoReviewed:          'Demo reviewed',
  copyReviewed:          'Copy reviewed',
  screenshotChecked:     'Screenshots checked',
  scriptReviewed:        'Script reviewed',
  noFakeClaims:          'No fake claims',
  contactInfoComplete:   'Contact info complete',
  mobileChecked:         'Mobile checked',
  whatsappPreviewChecked:'WhatsApp preview checked',
};
var CHECKLIST_KEYS = Object.keys(CHECKLIST_LABELS);

function statusBadge(s) {
  return '<span class="badge badge--' + esc(s) + '">' + esc(s || 'unknown') + '</span>';
}

function classBadge(c) {
  var cls = { NO_WEBSITE: 'no-website', BROKEN_WEBSITE: 'broken-website',
              OUTDATED_WEBSITE: 'outdated-website', MODERN_WEBSITE: 'modern-website' };
  var label = { NO_WEBSITE: 'No website', BROKEN_WEBSITE: 'Broken', OUTDATED_WEBSITE: 'Outdated', MODERN_WEBSITE: 'Modern' };
  return '<span class="badge badge--' + (cls[c] || 'unknown') + '">' + (label[c] || esc(c) || 'Unknown') + '</span>';
}

function healthBar(score) {
  var cls = score < 40 ? 'low' : score < 70 ? 'mid' : 'high';
  return '<div class="health">'
    + '<div class="health__bar"><div class="health__fill health__fill--' + cls + '" style="width:' + Math.min(score, 100) + '%"></div></div>'
    + '<span class="health__label">' + score + '%</span>'
    + '</div>';
}

// ── Pilot helpers ──────────────────────────────────────────────

function pilotPriorityBadge(p) {
  var map = { low: 'priority--low', normal: 'priority--normal', high: 'priority--high', urgent: 'priority--urgent' };
  return '<span class="badge ' + (map[p] || 'priority--normal') + '">' + esc(p || 'normal') + '</span>';
}

function pilotOutcomeBadge(o) {
  if (!o) return '<span class="text-muted">—</span>';
  if (o.won)          return '<span class="badge badge--won">won</span>';
  if (o.lost)         return '<span class="badge badge--lost">lost</span>';
  if (o.meetingBooked) return '<span class="badge badge--meeting">meeting</span>';
  if (o.interested)   return '<span class="badge badge--interested">interested</span>';
  if (o.replied)      return '<span class="badge badge--replied">replied</span>';
  return '<span class="text-muted">—</span>';
}

function readinessScore(r) {
  if (!r) return 0;
  return CHECKLIST_KEYS.filter(function (k) { return !!r[k]; }).length;
}

function readinessBar(score) {
  var pct = Math.round((score / 10) * 100);
  var cls = pct < 40 ? 'low' : pct < 80 ? 'mid' : 'high';
  return '<div class="health">'
    + '<div class="health__bar"><div class="health__fill health__fill--' + cls + '" style="width:' + pct + '%"></div></div>'
    + '<span class="health__label">' + score + '/10</span>'
    + '</div>';
}

function metricBox(label, value, color) {
  return '<div class="metric-box">'
    + '<div class="metric-box__value' + (color ? ' metric-box__value--' + color : '') + '">' + (value || 0) + '</div>'
    + '<div class="metric-box__label">' + esc(label) + '</div>'
    + '</div>';
}

// ── Router ─────────────────────────────────────────────────────

function route() {
  var hash    = (window.location.hash || '#/leads').replace(/^#/, '') || '/leads';
  var navL    = get('nav-leads');
  var navP    = get('nav-pilot');
  if (navL) navL.classList.toggle('active', /^\/leads/.test(hash));
  if (navP) navP.classList.toggle('active', /^\/pilot/.test(hash));

  var m;
  if (/^\/?$|^\/leads\/?$/.test(hash))               return viewLeads();
  if (/^\/pilot\/?$/.test(hash))                      return viewPilot();
  if ((m = hash.match(/^\/lead\/([a-z0-9-]+)$/)))     return viewLead(m[1]);
  if ((m = hash.match(/^\/config\/([a-z0-9-]+)$/)))   return viewConfig(m[1]);
  if ((m = hash.match(/^\/outreach\/([a-z0-9-]+)$/))) return viewOutreach(m[1]);
  viewLeads();
}

// ── View: Leads List ───────────────────────────────────────────

async function viewLeads() {
  app().innerHTML = '<div class="loading">Loading leads…</div>';
  var leads, pilotData;
  try {
    leads     = await api('GET', '/api/leads');
    pilotData = await api('GET', '/api/pilot').catch(function () { return { records: {} }; });
  }
  catch (e) { app().innerHTML = '<div class="page-error">Failed to load leads: ' + esc(e.message) + '</div>'; return; }

  var pr = pilotData.records || {};

  if (!leads.length) {
    app().innerHTML = '<div class="page-header"><h1 class="page-header__title">Leads</h1>'
      + '<button class="btn btn--primary" id="btn-run-all">Run Pipeline (All)</button></div>'
      + '<p class="text-muted">No leads found in state. Click <strong>Sync</strong> to discover leads from the leads/ directory.</p>';
    get('btn-run-all') && (get('btn-run-all').onclick = runAllPipeline);
    return;
  }

  var rows = leads.map(function (l) {
    var prec        = pr[l.slug];
    var priority    = prec && prec.pilotPriority;
    var followupDue = prec && prec.outreach && prec.outreach.nextFollowUpAt
                      && new Date(prec.outreach.nextFollowUpAt) <= new Date();
    var readyToSend = prec && readinessScore(prec.readiness) === 10;
    var priorityTag = (priority && priority !== 'normal')
      ? ' ' + pilotPriorityBadge(priority) : '';
    var indicators  = (readyToSend ? ' <span style="color:var(--green);font-size:11px;" title="Ready to Send">✓</span>' : '')
                    + (followupDue ? ' <span class="pilot-indicator pilot-indicator--followup" title="Follow-up due">⏰</span>' : '');

    return '<tr>'
      + '<td class="td-name"><a href="#/lead/' + esc(l.slug) + '">' + esc(l.name) + '</a>' + priorityTag + indicators + '</td>'
      + '<td>' + esc(l.industry || '—') + '</td>'
      + '<td>' + classBadge(l.websiteClassification) + '</td>'
      + '<td>' + statusBadge(l.status) + '</td>'
      + '<td><span class="badge badge--' + esc(l.outreachStatus || 'pending') + '">' + esc(l.outreachStatus || 'pending') + '</span></td>'
      + '<td>' + healthBar(l.completeness || 0) + '</td>'
      + '<td class="td-actions">'
      + '<a href="#/config/'   + esc(l.slug) + '" class="btn btn--ghost btn--sm">Config</a>'
      + '<a href="#/outreach/' + esc(l.slug) + '" class="btn btn--ghost btn--sm">Outreach</a>'
      + '</td>'
      + '</tr>';
  }).join('');

  app().innerHTML =
    '<div class="page-header">'
    + '<h1 class="page-header__title">Leads <span class="text-muted" style="font-weight:400;font-size:15px;">(' + leads.length + ')</span></h1>'
    + '<button class="btn btn--ghost btn--sm" id="btn-run-all">Run All Pipeline</button>'
    + '</div>'
    + '<div class="table-wrap"><table>'
    + '<thead><tr><th>Name</th><th>Industry</th><th>Website</th><th>Status</th><th>Outreach</th><th>Completeness</th><th>Actions</th></tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>';

  get('btn-run-all').onclick = runAllPipeline;
}

async function runAllPipeline() {
  var btn = get('btn-run-all');
  if (btn) { btn.disabled = true; btn.textContent = 'Running…'; }
  try {
    var results = await api('POST', '/api/pipeline');
    var ok  = results.filter(function (r) { return r.ok; }).length;
    var err = results.filter(function (r) { return !r.ok; }).length;
    toast('Pipeline complete — ' + ok + ' ok' + (err ? ', ' + err + ' failed' : ''), err ? 'error' : 'success');
    viewLeads();
  } catch (e) {
    toast('Pipeline failed: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Run All Pipeline'; }
  }
}

// ── View: Lead Detail ──────────────────────────────────────────

async function viewLead(slug) {
  app().innerHTML = '<div class="loading">Loading…</div>';
  var state, outreach, pilot, outreachLog;
  try {
    state       = await api('GET', '/api/state/' + slug);
    outreach    = await api('GET', '/api/outreach/' + slug).catch(function () { return null; });
    pilot       = await api('GET', '/api/pilot/'   + slug).catch(function () { return null; });
    var allLog  = await api('GET', '/api/outreach-log').catch(function () { return []; });
    outreachLog = allLog.filter(function (e) { return e.slug === slug; });
  } catch (e) {
    app().innerHTML = '<div class="page-error">Lead not found: ' + esc(e.message) + '</div>'; return;
  }

  var audit = outreach && outreach.websiteAudit;

  var strengths = audit && audit.strengths && audit.strengths.length
    ? '<ul class="audit-list audit-list--strengths">' + audit.strengths.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>'
    : '<p class="text-muted" style="font-size:12px;">None recorded.</p>';

  var weaknesses = audit && audit.weaknesses && audit.weaknesses.length
    ? '<ul class="audit-list audit-list--weaknesses">' + audit.weaknesses.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>'
    : '<p class="text-muted" style="font-size:12px;">None recorded.</p>';

  var statusOptions = STATUS_ORDER.map(function (s) {
    return '<option value="' + s + '"' + (s === state.status ? ' selected' : '') + '>' + s + '</option>';
  }).join('');

  var outreachOptions = ['pending','sent','replied'].map(function (s) {
    return '<option value="' + s + '"' + (s === (state.outreachStatus || 'pending') ? ' selected' : '') + '>' + s + '</option>';
  }).join('');

  app().innerHTML =
    '<a href="#/leads" class="back-link mb-2 gap-row" style="display:inline-flex;margin-bottom:1rem;">Leads</a>'
    + '<div class="page-header">'
    + '<h1 class="page-header__title">' + esc(state.name) + '</h1>'
    + statusBadge(state.status)
    + '</div>'

    + '<div class="detail-actions">'
    + '<a href="#/config/'   + esc(slug) + '" class="btn btn--primary">Edit Config</a>'
    + '<a href="#/outreach/' + esc(slug) + '" class="btn btn--ghost">View Outreach</a>'
    + (state.status !== 'published'
        ? '<button class="btn btn--green" id="btn-publish">Publish Demo</button>'
        : '<span class="text-muted" style="font-size:13px;">Published ' + fmtDateShort(state.publishedAt) + '</span>')
    + '<button class="btn btn--ghost btn--sm" id="btn-rerun">Re-run Pipeline</button>'
    + '</div>'

    + '<div class="detail-grid">'

    + '<div class="card">'
    + '<div class="card__title">Lead Info</div>'
    + '<div class="card__row"><span class="card__label">Lead ID</span><span class="card__value text-mono">' + esc(state.leadId || '—') + '</span></div>'
    + '<div class="card__row"><span class="card__label">Industry</span><span class="card__value">' + esc(state.industry || '—') + '</span></div>'
    + '<div class="card__row"><span class="card__label">Sales Rep</span><span class="card__value">' + esc(state.salesRep || '—') + '</span></div>'
    + '<div class="card__row"><span class="card__label">Created</span><span class="card__value">' + fmtDate(state.createdAt) + '</span></div>'
    + '<div class="card__row"><span class="card__label">Updated</span><span class="card__value">' + fmtDate(state.updatedAt) + '</span></div>'
    + '</div>'

    + '<div class="card">'
    + '<div class="card__title">Website Audit</div>'
    + '<div class="card__row"><span class="card__label">Classification</span><span class="card__value">' + classBadge(state.websiteClassification) + '</span></div>'
    + (audit ? '<div class="card__row"><span class="card__label">Score</span><span class="card__value">' + healthBar(audit.score || 0) + '</span></div>' : '')
    + (audit && audit.url ? '<div class="card__row"><span class="card__label">URL</span><span class="card__value text-mono" style="word-break:break-all;font-size:11px;">' + esc(audit.url) + '</span></div>' : '')
    + '<div class="card__row" style="align-items:flex-start;flex-direction:column;gap:.4rem;">'
    + '<span class="card__label" style="width:auto;margin-bottom:.2rem;">Strengths</span>' + strengths
    + '</div>'
    + '<div class="card__row" style="align-items:flex-start;flex-direction:column;gap:.4rem;">'
    + '<span class="card__label" style="width:auto;margin-bottom:.2rem;">Weaknesses</span>' + weaknesses
    + '</div>'
    + '</div>'

    + '</div>'

    + '<div class="card">'
    + '<div class="card__title">Status Controls</div>'
    + '<div class="card__row">'
    + '<span class="card__label">Lead Status</span>'
    + '<div class="status-select-wrap">'
    + '<select class="form-select" id="sel-status" style="width:160px;">' + statusOptions + '</select>'
    + '<button class="btn btn--ghost btn--sm" id="btn-save-status">Save</button>'
    + '</div>'
    + '</div>'
    + '<div class="card__row">'
    + '<span class="card__label">Outreach Status</span>'
    + '<div class="status-select-wrap">'
    + '<select class="form-select" id="sel-outreach" style="width:160px;">' + outreachOptions + '</select>'
    + '<button class="btn btn--ghost btn--sm" id="btn-save-outreach">Save</button>'
    + '</div>'
    + '</div>'
    + '</div>'

    + buildPilotSection(slug, pilot, outreachLog);

  // Event listeners
  var btnPublish = get('btn-publish');
  if (btnPublish) {
    btnPublish.onclick = async function () {
      var ok = await confirm('Publish "' + state.name + '" to companies/' + slug + '.json?\n\nThis makes the demo template live with this config.');
      if (!ok) return;
      btnPublish.disabled = true; btnPublish.textContent = 'Publishing…';
      try {
        await api('POST', '/api/publish/' + slug);
        toast('Published successfully', 'success');
        viewLead(slug);
      } catch (e) {
        toast('Publish failed: ' + e.message, 'error');
        btnPublish.disabled = false; btnPublish.textContent = 'Publish Demo';
      }
    };
  }

  get('btn-rerun').onclick = async function () {
    var ok = await confirm('Re-run pipeline for "' + state.name + '"?\n\nThis will regenerate the config and outreach scripts, overwriting any auto-generated content (manually edited fields may be lost).');
    if (!ok) return;
    var btn = get('btn-rerun');
    btn.disabled = true; btn.textContent = 'Running…';
    try {
      await api('POST', '/api/pipeline/' + slug);
      toast('Pipeline re-run complete', 'success');
      viewLead(slug);
    } catch (e) {
      toast('Pipeline failed: ' + e.message, 'error');
      btn.disabled = false; btn.textContent = 'Re-run Pipeline';
    }
  };

  get('btn-save-status').onclick = async function () {
    var newStatus = get('sel-status').value;
    try {
      await api('PUT', '/api/state/' + slug, { status: newStatus });
      toast('Status updated to "' + newStatus + '"', 'success');
      state.status = newStatus;
    } catch (e) { toast('Save failed: ' + e.message, 'error'); }
  };

  get('btn-save-outreach').onclick = async function () {
    var newStatus = get('sel-outreach').value;
    try {
      await api('PUT', '/api/state/' + slug, { outreachStatus: newStatus });
      toast('Outreach status updated to "' + newStatus + '"', 'success');
    } catch (e) { toast('Save failed: ' + e.message, 'error'); }
  };

  // Pilot event listeners (only if section rendered)
  if (pilot) {
    // Save pilot status (batch, priority, dm, notes, outcomes)
    var btnSavePilot = get('btn-save-pilot');
    if (btnSavePilot) {
      btnSavePilot.onclick = async function () {
        var priorityVal = get('pilot-priority') ? get('pilot-priority').value : pilot.pilotPriority;
        var batchVal    = get('pilot-batch')    ? get('pilot-batch').value.trim()   : pilot.pilotBatch;
        var dmVal       = get('pilot-dm')       ? get('pilot-dm').checked           : pilot.decisionMakerKnown;
        var notesVal    = get('pilot-notes')    ? get('pilot-notes').value          : pilot.notes;
        var outcome = {
          replied:      get('pilot-replied')  ? get('pilot-replied').checked  : pilot.outcome.replied,
          interested:   get('pilot-interested')? get('pilot-interested').checked: pilot.outcome.interested,
          meetingBooked:get('pilot-meeting')  ? get('pilot-meeting').checked  : pilot.outcome.meetingBooked,
          won:          get('pilot-won')      ? get('pilot-won').checked      : pilot.outcome.won,
          lost:         get('pilot-lost')     ? get('pilot-lost').checked     : pilot.outcome.lost,
          lostReason:   get('pilot-lost-reason') ? get('pilot-lost-reason').value : pilot.outcome.lostReason,
          repliedAt:    (get('pilot-replied')  && get('pilot-replied').checked  && !pilot.outcome.repliedAt) ? new Date().toISOString() : pilot.outcome.repliedAt,
        };
        btnSavePilot.disabled = true; btnSavePilot.textContent = 'Saving…';
        try {
          pilot = await api('PUT', '/api/pilot/' + slug, {
            pilotBatch: batchVal, pilotPriority: priorityVal,
            decisionMakerKnown: dmVal, notes: notesVal, outcome: outcome,
          });
          toast('Pilot status saved', 'success');
        } catch (e) { toast('Save failed: ' + e.message, 'error'); }
        finally { btnSavePilot.disabled = false; btnSavePilot.textContent = 'Save Pilot Status'; }
      };
    }

    // Readiness checkboxes — auto-save on change
    CHECKLIST_KEYS.forEach(function (k) {
      var cb = get('chk-' + k);
      if (!cb) return;
      cb.onchange = async function () {
        var patch = {}; patch[k] = cb.checked;
        try {
          pilot = await api('PUT', '/api/pilot/' + slug, { readiness: patch });
          var score = readinessScore(pilot.readiness);
          var banner = get('readiness-banner');
          if (banner) {
            banner.className = 'readiness-banner readiness-banner--' + (score === 10 ? 'ready' : score >= 5 ? 'partial' : 'low');
            banner.innerHTML = score === 10 ? '✓ Ready to Send' : score + ' / 10 complete';
          }
        } catch (e) { toast('Checklist save failed: ' + e.message, 'error'); }
      };
    });

    // Save timing
    var btnSaveTiming = get('btn-save-timing');
    if (btnSaveTiming) {
      btnSaveTiming.onclick = async function () {
        var timing = {
          enrichmentMinutes:    parseMinutes('timing-enrich'),
          configEditingMinutes: parseMinutes('timing-config'),
          outreachPrepMinutes:  parseMinutes('timing-outreach'),
          totalPrepMinutes:     parseMinutes('timing-total'),
        };
        btnSaveTiming.disabled = true; btnSaveTiming.textContent = 'Saving…';
        try {
          pilot = await api('PUT', '/api/pilot/' + slug, { timing: timing });
          toast('Timing saved', 'success');
        } catch (e) { toast('Save failed: ' + e.message, 'error'); }
        finally { btnSaveTiming.disabled = false; btnSaveTiming.textContent = 'Save Timing'; }
      };
    }

    // Submit outreach log entry
    var btnLogOutreach = get('btn-log-outreach');
    if (btnLogOutreach) {
      btnLogOutreach.onclick = async function () {
        var summary = get('olog-summary') ? get('olog-summary').value.trim() : '';
        if (!summary) { toast('Summary is required', 'error'); return; }
        var entry = {
          slug:             slug,
          name:             state.name,
          method:           get('olog-method')      ? get('olog-method').value        : 'whatsapp',
          scriptType:       get('olog-scripttype')  ? get('olog-scripttype').value    : '',
          summary:          summary,
          responseReceived: get('olog-responded')   ? get('olog-responded').checked   : false,
          responseSummary:  get('olog-response')    ? get('olog-response').value      : '',
          nextAction:       get('olog-next')        ? get('olog-next').value          : '',
          followUpAt:       get('olog-followup')    ? get('olog-followup').value      : null,
        };
        btnLogOutreach.disabled = true; btnLogOutreach.textContent = 'Logging…';
        try {
          await api('POST', '/api/outreach-log', entry);
          toast('Outreach logged', 'success');
          viewLead(slug); // reload to show the new entry
        } catch (e) {
          toast('Log failed: ' + e.message, 'error');
          btnLogOutreach.disabled = false; btnLogOutreach.textContent = 'Log Outreach';
        }
      };
    }
  }
}

function parseMinutes(id) {
  var el = get(id);
  if (!el || el.value === '') return null;
  var n = parseInt(el.value, 10);
  return isNaN(n) ? null : n;
}

// ── Pilot section builder ──────────────────────────────────────

function buildPilotSection(slug, pilot, outreachLog) {
  if (!pilot) return '<div class="section-title" style="margin-top:1.5rem;">Pilot Tracking</div>'
    + '<p class="text-muted" style="font-size:12px;">Pilot tracking not available for this lead.</p>';

  var score       = readinessScore(pilot.readiness);
  var bannerCls   = score === 10 ? 'readiness-banner--ready' : score >= 5 ? 'readiness-banner--partial' : 'readiness-banner--low';
  var bannerLabel = score === 10 ? '✓ Ready to Send' : score + ' / 10 complete';

  var checklistHtml = '<ul class="checklist">'
    + CHECKLIST_KEYS.map(function (k) {
        var checked = pilot.readiness && pilot.readiness[k];
        return '<li class="checklist-item' + (checked ? ' checklist-item--checked' : '') + '">'
          + '<input type="checkbox" id="chk-' + k + '"' + (checked ? ' checked' : '') + '>'
          + '<label for="chk-' + k + '">' + esc(CHECKLIST_LABELS[k]) + '</label>'
          + '</li>';
      }).join('')
    + '</ul>'
    + '<div class="readiness-banner ' + bannerCls + '" id="readiness-banner">' + bannerLabel + '</div>';

  var priorityOpts = PILOT_PRIORITY.map(function (p) {
    return '<option value="' + p + '"' + (p === (pilot.pilotPriority || 'normal') ? ' selected' : '') + '>' + p + '</option>';
  }).join('');

  var o = pilot.outcome || {};

  var pilotStatusHtml =
    '<div class="card">'
    + '<div class="card__title">Pilot Status</div>'
    + '<div class="card__row">'
    + '<span class="card__label">Batch</span>'
    + '<input class="form-input" id="pilot-batch" style="max-width:220px;" value="' + esc(pilot.pilotBatch || '') + '">'
    + '</div>'
    + '<div class="card__row">'
    + '<span class="card__label">Priority</span>'
    + '<select class="form-select" id="pilot-priority" style="width:130px;">' + priorityOpts + '</select>'
    + '</div>'
    + '<div class="card__row">'
    + '<span class="card__label">Decision Maker</span>'
    + '<label style="display:flex;align-items:center;gap:.45rem;cursor:pointer;">'
    + '<input type="checkbox" id="pilot-dm"' + (pilot.decisionMakerKnown ? ' checked' : '') + '> Known</label>'
    + '</div>'
    + '<div class="card__row">'
    + '<span class="card__label">Outreach</span>'
    + '<span class="card__value">'
    + (pilot.outreach && pilot.outreach.sent
        ? '<span class="badge badge--sent">sent</span> ' + fmtDateShort(pilot.outreach.lastContactAt)
          + (pilot.outreach.followUpCount > 1 ? ' <span class="text-muted">(' + pilot.outreach.followUpCount + ' contacts)</span>' : '')
        : '<span class="text-muted">not sent</span>')
    + '</span>'
    + '</div>'
    + (pilot.outreach && pilot.outreach.nextFollowUpAt
        ? '<div class="card__row"><span class="card__label">Follow-up</span><span class="card__value">' + esc(pilot.outreach.nextFollowUpAt) + '</span></div>'
        : '')
    + '<div class="card__row" style="flex-direction:column;gap:.4rem;align-items:flex-start;">'
    + '<span class="card__label" style="width:auto;">Outcomes</span>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem .75rem;">'
    + outcomeCheck('pilot-replied',   'Replied',        o.replied)
    + outcomeCheck('pilot-interested','Interested',     o.interested)
    + outcomeCheck('pilot-meeting',   'Meeting Booked', o.meetingBooked)
    + outcomeCheck('pilot-won',       'Won',            o.won)
    + outcomeCheck('pilot-lost',      'Lost',           o.lost)
    + '</div>'
    + (o.lost
        ? '<input class="form-input" id="pilot-lost-reason" placeholder="Lost reason…" style="margin-top:.35rem;max-width:320px;" value="' + esc(o.lostReason || '') + '">'
        : '<input class="form-input" id="pilot-lost-reason" placeholder="Lost reason…" style="margin-top:.35rem;max-width:320px;display:none;" value="">')
    + '</div>'
    + '<div class="card__row" style="flex-direction:column;gap:.4rem;align-items:flex-start;">'
    + '<span class="card__label" style="width:auto;">Notes</span>'
    + '<textarea class="form-textarea" id="pilot-notes" style="min-height:72px;">' + esc(pilot.notes || '') + '</textarea>'
    + '</div>'
    + '<button class="btn btn--ghost btn--sm" id="btn-save-pilot" style="margin-top:.4rem;">Save Pilot Status</button>'
    + '</div>';

  var t = pilot.timing || {};
  var timingHtml =
    '<div class="card">'
    + '<div class="card__title">Time Tracking <span class="text-muted" style="font-weight:400;font-size:11px;">(minutes)</span></div>'
    + '<div class="timing-grid">'
    + timingField('timing-enrich',   'Enrichment',       t.enrichmentMinutes)
    + timingField('timing-config',   'Config editing',   t.configEditingMinutes)
    + timingField('timing-outreach', 'Outreach prep',    t.outreachPrepMinutes)
    + timingField('timing-total',    'Total prep',       t.totalPrepMinutes)
    + '</div>'
    + '<button class="btn btn--ghost btn--sm" id="btn-save-timing" style="margin-top:.75rem;">Save Timing</button>'
    + '</div>';

  var logEntries = outreachLog && outreachLog.length
    ? '<ul class="outreach-log-list">' + outreachLog.map(function (e) {
        return '<li class="outreach-log-item">'
          + '<div class="outreach-log-item__header">'
          + '<span class="outreach-log-item__ts">' + fmtDateShort(e.ts) + '</span>'
          + '<span class="outreach-log-item__method">' + esc(e.method) + '</span>'
          + (e.scriptType ? '<span class="text-muted" style="font-size:11px;">' + esc(e.scriptType) + '</span>' : '')
          + '</div>'
          + '<div class="outreach-log-item__summary">' + esc(e.summary) + '</div>'
          + (e.responseReceived && e.responseSummary ? '<div class="outreach-log-item__response">↩ ' + esc(e.responseSummary) + '</div>' : '')
          + (e.nextAction ? '<div class="outreach-log-item__next">Next: ' + esc(e.nextAction) + (e.followUpAt ? ' · ' + esc(e.followUpAt) : '') + '</div>' : '')
          + '</li>';
      }).join('') + '</ul>'
    : '<p class="text-muted" style="font-size:12px;margin-bottom:.75rem;">No outreach logged yet.</p>';

  var logFormHtml =
    '<div style="border-top:1px solid var(--border);padding-top:.85rem;margin-top:.25rem;">'
    + '<div class="form-section__title" style="margin-bottom:.6rem;">Log New Outreach</div>'
    + '<div class="outreach-log-form">'
    + '<div class="form-group"><label class="form-label">Method</label>'
    + '<select class="form-select" id="olog-method"><option value="whatsapp">WhatsApp</option><option value="call">Call</option><option value="sms">SMS</option><option value="email">Email</option></select></div>'
    + '<div class="form-group"><label class="form-label">Script type</label>'
    + '<input class="form-input" id="olog-scripttype" placeholder="e.g. en-initial"></div>'
    + '<div class="form-group outreach-log-form--full"><label class="form-label">Summary <span style="color:var(--red);">*</span></label>'
    + '<textarea class="form-textarea" id="olog-summary" style="min-height:60px;" placeholder="What was sent / discussed?"></textarea></div>'
    + '<div class="form-group"><label class="form-label">Follow-up date</label>'
    + '<input class="form-input" id="olog-followup" type="date"></div>'
    + '<div class="form-group"><label class="form-label">Next action</label>'
    + '<input class="form-input" id="olog-next" placeholder="e.g. call back Thursday"></div>'
    + '<div class="form-group outreach-log-form--full">'
    + '<label class="checklist-item"><input type="checkbox" id="olog-responded"> Response received</label>'
    + '<textarea class="form-textarea" id="olog-response" style="min-height:50px;margin-top:.35rem;" placeholder="What did they say?"></textarea>'
    + '</div>'
    + '</div>'
    + '<button class="btn btn--primary btn--sm" id="btn-log-outreach" style="margin-top:.5rem;">Log Outreach</button>'
    + '</div>';

  var outreachLogHtml =
    '<div class="card">'
    + '<div class="card__title">Outreach Log</div>'
    + logEntries
    + logFormHtml
    + '</div>';

  return '<div class="section-title" style="margin-top:1.5rem;">Pilot Tracking</div>'
    + '<div class="detail-grid" style="margin-bottom:.5rem;">'
    + pilotStatusHtml
    + '<div class="card"><div class="card__title">Readiness Checklist</div>' + checklistHtml + '</div>'
    + '</div>'
    + timingHtml
    + outreachLogHtml;
}

function outcomeCheck(id, label, checked) {
  return '<label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:12px;">'
    + '<input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '> ' + esc(label) + '</label>';
}

function timingField(id, label, val) {
  return '<div class="form-group">'
    + '<label class="form-label">' + esc(label) + '</label>'
    + '<input class="form-input" id="' + id + '" type="number" min="0" placeholder="—" value="' + (val != null ? val : '') + '">'
    + '</div>';
}

// ── View: Pilot ────────────────────────────────────────────────

async function viewPilot() {
  app().innerHTML = '<div class="loading">Loading pilot data…</div>';
  var pilotData;
  try { pilotData = await api('GET', '/api/pilot'); }
  catch (e) { app().innerHTML = '<div class="page-error">Failed to load pilot data: ' + esc(e.message) + '</div>'; return; }

  var m       = pilotData.metrics;
  var records = Object.values(pilotData.records || {});

  var metricsHtml =
    '<div class="pilot-metrics">'
    + metricBox('Total',     m.total)
    + metricBox('Generated', m.generated)
    + metricBox('Contacted', m.contacted)
    + metricBox('Replied',   m.replied)
    + metricBox('Interested',m.interested)
    + metricBox('Meetings',  m.meetingsBooked)
    + metricBox('Won',       m.won,  'green')
    + metricBox('Lost',      m.lost, 'red')
    + '</div>'
    + '<div class="pilot-rates">'
    + 'Response rate: <strong>' + m.responseRate + '%</strong>'
    + ' &nbsp;·&nbsp; Conversion rate: <strong>' + m.conversionRate + '%</strong>'
    + '</div>';

  var rows = records.length ? records.map(function (r) {
    var followupDue = r.outreach && r.outreach.nextFollowUpAt
                      && new Date(r.outreach.nextFollowUpAt) <= new Date();
    var score       = readinessScore(r.readiness);
    return '<tr>'
      + '<td class="td-name"><a href="#/lead/' + esc(r.slug) + '">' + esc(r.name) + '</a>'
      + (followupDue ? ' <span class="pilot-indicator pilot-indicator--followup" title="Follow-up due">⏰</span>' : '')
      + '</td>'
      + '<td><span class="text-muted" style="font-size:11px;">' + esc(r.pilotBatch || '—') + '</span></td>'
      + '<td>' + pilotPriorityBadge(r.pilotPriority) + '</td>'
      + '<td>' + readinessBar(score) + '</td>'
      + '<td>' + (r.outreach && r.outreach.sent ? fmtDateShort(r.outreach.lastContactAt) : '<span class="text-muted">—</span>') + '</td>'
      + '<td>' + pilotOutcomeBadge(r.outcome) + '</td>'
      + '<td class="td-actions"><a href="#/lead/' + esc(r.slug) + '" class="btn btn--ghost btn--sm">Manage</a></td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="7" class="text-muted" style="text-align:center;padding:2rem 1rem;">'
    + 'No pilot records. Import leads via Sync, then open any Lead Detail to initialize pilot tracking.'
    + '</td></tr>';

  app().innerHTML =
    '<div class="page-header">'
    + '<h1 class="page-header__title">Pilot Tracking</h1>'
    + '</div>'
    + metricsHtml
    + '<div class="table-wrap" style="margin-top:1.25rem;"><table>'
    + '<thead><tr><th>Name</th><th>Batch</th><th>Priority</th><th>Readiness</th><th>Last Contact</th><th>Outcome</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>';
}

// ── View: Config Editor ────────────────────────────────────────

async function viewConfig(slug) {
  app().innerHTML = '<div class="loading">Loading config…</div>';
  try {
    _cfg     = await api('GET', '/api/configs/' + slug);
    _cfgSlug = slug;
  } catch (e) {
    app().innerHTML = '<div class="page-error">Config not found: ' + esc(e.message) + '</div>'; return;
  }
  renderConfigEditor(slug, 'fields');
}

function renderConfigEditor(slug, activeTab) {
  var cfg = _cfg;
  var name = (cfg.brand && cfg.brand.name) || slug;

  var v = cfg.contact || {};
  var ab = cfg.about || {};
  var h = cfg.hero || {};
  var br = cfg.brand || {};

  var fieldsPane =
    '<div class="form-section">'
    + '<div class="form-section__title">Brand</div>'
    + '<div class="form-row"><div class="form-group"><label class="form-label">Company Name</label>'
    + '<input class="form-input" id="f-brand-name" value="' + esc(br.name) + '"></div>'
    + '<div class="form-group"><label class="form-label">Tagline</label>'
    + '<input class="form-input" id="f-brand-tagline" value="' + esc(br.tagline) + '"></div></div>'
    + '</div>'

    + '<div class="form-section">'
    + '<div class="form-section__title">Hero</div>'
    + '<div class="form-row"><div class="form-group"><label class="form-label">Headline</label>'
    + '<input class="form-input" id="f-hero-headline" value="' + esc(h.headline) + '"></div>'
    + '<div class="form-group"><label class="form-label">Headline (em)</label>'
    + '<input class="form-input" id="f-hero-headlineem" value="' + esc(h.headlineEm) + '"></div></div>'
    + '<div class="form-row form-row--full"><div class="form-group"><label class="form-label">Subheadline</label>'
    + '<textarea class="form-textarea" id="f-hero-subheadline">' + esc(h.subheadline) + '</textarea></div></div>'
    + '</div>'

    + '<div class="form-section">'
    + '<div class="form-section__title">About</div>'
    + '<div class="form-row form-row--full"><div class="form-group"><label class="form-label">Heading</label>'
    + '<input class="form-input" id="f-about-heading" value="' + esc(ab.heading) + '"></div></div>'
    + '<div class="form-row form-row--full"><div class="form-group"><label class="form-label">Body paragraph 1</label>'
    + '<textarea class="form-textarea" id="f-about-body0">' + esc((ab.body && ab.body[0]) || '') + '</textarea></div></div>'
    + '<div class="form-row form-row--full"><div class="form-group"><label class="form-label">Body paragraph 2</label>'
    + '<textarea class="form-textarea" id="f-about-body1">' + esc((ab.body && ab.body[1]) || '') + '</textarea></div></div>'
    + '</div>'

    + '<div class="form-section">'
    + '<div class="form-section__title">Contact</div>'
    + '<div class="form-row"><div class="form-group"><label class="form-label">Phone</label>'
    + '<input class="form-input" id="f-contact-phone" value="' + esc(v.phone) + '"></div>'
    + '<div class="form-group"><label class="form-label">WhatsApp (digits only)</label>'
    + '<input class="form-input" id="f-contact-whatsapp" placeholder="255700000000" value="' + esc(v.whatsapp) + '"></div></div>'
    + '<div class="form-row"><div class="form-group"><label class="form-label">Email</label>'
    + '<input class="form-input" id="f-contact-email" value="' + esc(v.email) + '"></div>'
    + '<div class="form-group"><label class="form-label">Address</label>'
    + '<input class="form-input" id="f-contact-address" value="' + esc(v.address) + '"></div></div>'
    + '</div>';

  var rawPane =
    '<textarea class="json-editor" id="json-editor" spellcheck="false">'
    + esc(JSON.stringify(cfg, null, 2))
    + '</textarea>';

  var validationWarns = '';
  // We'll compute this on save

  app().innerHTML =
    '<a href="#/lead/' + esc(slug) + '" class="back-link mb-2 gap-row" style="display:inline-flex;margin-bottom:1rem;">' + esc(name) + '</a>'
    + '<div class="page-header">'
    + '<h1 class="page-header__title">Config Editor</h1>'
    + '<span class="text-muted" style="font-size:13px;">' + esc(slug) + '</span>'
    + '</div>'

    + '<div id="validation-warnings"></div>'

    + '<div class="tabs">'
    + '<button class="tab' + (activeTab === 'fields' ? ' active' : '') + '" data-tab="fields">Key Fields</button>'
    + '<button class="tab' + (activeTab === 'raw'    ? ' active' : '') + '" data-tab="raw">Raw JSON</button>'
    + '</div>'

    + '<div id="pane-fields" class="tab-pane' + (activeTab === 'fields' ? ' active' : '') + '">' + fieldsPane + '</div>'
    + '<div id="pane-raw"    class="tab-pane' + (activeTab === 'raw'    ? ' active' : '') + '">' + rawPane + '</div>'

    + '<div class="gap-row" style="margin-top:1.25rem;">'
    + '<button class="btn btn--primary" id="btn-save-config">Save Draft</button>'
    + '<button class="btn btn--green" id="btn-publish-config">Save &amp; Publish</button>'
    + '<a href="#/lead/' + esc(slug) + '" class="btn btn--ghost">Cancel</a>'
    + '</div>';

  // Tab switching
  document.querySelectorAll('.tab').forEach(function (btn) {
    btn.onclick = function () {
      var target = btn.getAttribute('data-tab');
      syncConfigFromActiveTab(activeTab);
      activeTab = target;
      document.querySelectorAll('.tab').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-tab') === target);
      });
      document.querySelectorAll('.tab-pane').forEach(function (p) {
        p.classList.toggle('active', p.id === 'pane-' + target);
      });
      if (target === 'raw') {
        var ta = get('json-editor');
        if (ta) ta.value = JSON.stringify(_cfg, null, 2);
      } else {
        repopulateFields(_cfg);
      }
    };
  });

  // Save
  get('btn-save-config').onclick = async function () {
    syncConfigFromActiveTab(activeTab);
    var btn = get('btn-save-config');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await api('PUT', '/api/configs/' + slug, _cfg);
      toast('Draft saved', 'success');
    } catch (e) {
      toast('Save failed: ' + e.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Save Draft';
    }
  };

  // Save & Publish
  get('btn-publish-config').onclick = async function () {
    syncConfigFromActiveTab(activeTab);
    var ok = await confirm('Save and publish "' + ((_cfg.brand && _cfg.brand.name) || slug) + '" to companies/' + slug + '.json?');
    if (!ok) return;
    var btn = get('btn-publish-config');
    btn.disabled = true; btn.textContent = 'Publishing…';
    try {
      await api('PUT', '/api/configs/' + slug, _cfg);
      await api('POST', '/api/publish/' + slug);
      toast('Published successfully', 'success');
      window.location.hash = '#/lead/' + slug;
    } catch (e) {
      toast('Failed: ' + e.message, 'error');
      btn.disabled = false; btn.textContent = 'Save & Publish';
    }
  };
}

function syncConfigFromActiveTab(activeTab) {
  if (activeTab === 'raw') {
    var ta = get('json-editor');
    if (!ta) return;
    try { _cfg = JSON.parse(ta.value); }
    catch (e) { toast('JSON parse error: ' + e.message, 'error'); }
  } else {
    readFieldsIntoConfig();
  }
}

function readFieldsIntoConfig() {
  function val(id) { var el = get(id); return el ? el.value : null; }
  if (!_cfg.brand)   _cfg.brand   = {};
  if (!_cfg.hero)    _cfg.hero    = {};
  if (!_cfg.about)   _cfg.about   = {};
  if (!_cfg.contact) _cfg.contact = {};
  if (!Array.isArray(_cfg.about.body)) _cfg.about.body = ['', ''];

  _cfg.brand.name     = val('f-brand-name')     || _cfg.brand.name;
  _cfg.brand.tagline  = val('f-brand-tagline');
  _cfg.hero.headline   = val('f-hero-headline');
  _cfg.hero.headlineEm = val('f-hero-headlineem');
  _cfg.hero.subheadline = val('f-hero-subheadline');
  _cfg.about.heading   = val('f-about-heading');
  _cfg.about.body[0]   = val('f-about-body0');
  _cfg.about.body[1]   = val('f-about-body1');
  _cfg.contact.phone    = val('f-contact-phone');
  _cfg.contact.whatsapp = val('f-contact-whatsapp');
  _cfg.contact.email    = val('f-contact-email');
  _cfg.contact.address  = val('f-contact-address');
}

function repopulateFields(cfg) {
  function set(id, v) { var el = get(id); if (el) el.value = v == null ? '' : v; }
  var br = cfg.brand || {}; var h = cfg.hero || {};
  var ab = cfg.about || {}; var v  = cfg.contact || {};
  set('f-brand-name',       br.name);
  set('f-brand-tagline',    br.tagline);
  set('f-hero-headline',    h.headline);
  set('f-hero-headlineem',  h.headlineEm);
  set('f-hero-subheadline', h.subheadline);
  set('f-about-heading',    ab.heading);
  set('f-about-body0',      ab.body && ab.body[0]);
  set('f-about-body1',      ab.body && ab.body[1]);
  set('f-contact-phone',    v.phone);
  set('f-contact-whatsapp', v.whatsapp);
  set('f-contact-email',    v.email);
  set('f-contact-address',  v.address);
}

// ── View: Outreach Panel ───────────────────────────────────────

async function viewOutreach(slug) {
  app().innerHTML = '<div class="loading">Loading outreach…</div>';
  var data;
  try { data = await api('GET', '/api/outreach/' + slug); }
  catch (e) {
    app().innerHTML = '<div class="page-error">Outreach not found: ' + esc(e.message) + '</div>'; return;
  }

  var script = data.outreachScript || {};
  var audit  = data.websiteAudit   || {};
  var name   = esc(data.name || slug);
  var primary = script.primary || 'en';

  function langPane(lang) {
    var s = script[lang] || {};
    return '<div class="outreach-block">'
      + '<div class="outreach-block__header"><span class="outreach-block__label">WhatsApp Message</span>'
      + '<button class="btn btn--ghost btn--sm copy-btn" data-copy="' + esc(s.whatsappMessage || '') + '">Copy</button></div>'
      + '<div class="outreach-text">' + esc(s.whatsappMessage || '—') + '</div>'
      + '</div>'

      + '<div class="outreach-block">'
      + '<div class="outreach-block__header"><span class="outreach-block__label">Voice Note Script</span>'
      + '<button class="btn btn--ghost btn--sm copy-btn" data-copy="' + esc(s.voiceNoteScript || '') + '">Copy</button></div>'
      + '<div class="outreach-text">' + esc(s.voiceNoteScript || '—') + '</div>'
      + '</div>'

      + '<div class="outreach-block">'
      + '<div class="outreach-block__header"><span class="outreach-block__label">Follow-up Message (Day 3)</span>'
      + '<button class="btn btn--ghost btn--sm copy-btn" data-copy="' + esc(s.followUpMessage || '') + '">Copy</button></div>'
      + '<div class="outreach-text">' + esc(s.followUpMessage || '—') + '</div>'
      + '</div>';
  }

  var enActive = primary === 'en';

  app().innerHTML =
    '<a href="#/lead/' + esc(slug) + '" class="back-link mb-2 gap-row" style="display:inline-flex;margin-bottom:1rem;">' + name + '</a>'
    + '<div class="page-header">'
    + '<h1 class="page-header__title">Outreach Scripts</h1>'
    + classBadge(audit.classification)
    + '<span class="text-muted" style="font-size:12px;">Pitch: ' + esc(script.suggestedPitchAngle || '—') + '</span>'
    + '</div>'

    + '<div class="card mb-2">'
    + '<div class="card__title">Website Audit Summary</div>'
    + '<div class="card__row"><span class="card__label">URL</span><span class="card__value text-mono" style="font-size:11px;">' + esc(audit.url || 'none') + '</span></div>'
    + '<div class="card__row"><span class="card__label">Score</span><span class="card__value">' + healthBar(audit.score || 0) + '</span></div>'
    + '<div class="card__row"><span class="card__label">Response time</span><span class="card__value">'
    + (audit.responseTimeMs != null ? (audit.responseTimeMs / 1000).toFixed(2) + 's' : '—') + '</span></div>'
    + '</div>'

    + '<div class="tabs">'
    + '<button class="tab' + (enActive ? ' active' : '') + '" data-tab="en">English'
    + (primary === 'en' ? ' <span style="font-size:10px;opacity:.7;">(primary)</span>' : '') + '</button>'
    + '<button class="tab' + (!enActive ? ' active' : '') + '" data-tab="sw">Swahili'
    + (primary === 'sw' ? ' <span style="font-size:10px;opacity:.7;">(primary)</span>' : '') + '</button>'
    + '</div>'

    + '<div id="pane-en" class="tab-pane' + (enActive  ? ' active' : '') + '">' + langPane('en') + '</div>'
    + '<div id="pane-sw" class="tab-pane' + (!enActive ? ' active' : '') + '">' + langPane('sw') + '</div>';

  // Tab switching
  document.querySelectorAll('.tab').forEach(function (btn) {
    btn.onclick = function () {
      var t = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === t); });
      document.querySelectorAll('.tab-pane').forEach(function (p) { p.classList.toggle('active', p.id === 'pane-' + t); });
    };
  });

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.onclick = function () { copyText(btn.getAttribute('data-copy'), btn); };
  });
}

// ── Sync button (header) ───────────────────────────────────────

function attachHeaderHandlers() {
  var syncBtn = get('btn-sync');
  if (!syncBtn) return;
  syncBtn.onclick = async function () {
    syncBtn.disabled = true; syncBtn.textContent = 'Syncing…';
    try {
      var result = await api('POST', '/api/sync');
      toast('Sync complete — ' + result.added + ' new, ' + result.total + ' total', 'success');
      if (window.location.hash === '' || window.location.hash === '#/leads' || window.location.hash === '#/') {
        viewLeads();
      }
    } catch (e) {
      toast('Sync failed: ' + e.message, 'error');
    } finally {
      syncBtn.disabled = false; syncBtn.textContent = 'Sync';
    }
  };
}

// ── Init ───────────────────────────────────────────────────────

window.addEventListener('hashchange', route);
window.addEventListener('load', function () {
  attachHeaderHandlers();
  route();
});
