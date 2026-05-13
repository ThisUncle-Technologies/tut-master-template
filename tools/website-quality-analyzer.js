'use strict';

// Website Quality Analyzer
//
// Fetches a URL and scores it against a set of heuristic signals.
// Does NOT use Puppeteer or Lighthouse — lightweight, offline-safe.
// Uses only Node.js built-in modules (https, http, url).
//
// Classifications:
//   NO_WEBSITE      — url is null/empty
//   BROKEN_WEBSITE  — URL unreachable (network error, 4xx, 5xx, timeout)
//   OUTDATED_WEBSITE — reachable but score < 45
//   MODERN_WEBSITE  — reachable and score >= 45
//
// Scoring is heuristic. It cannot replace a full audit.
// Use it to guide pitch angle, not to make factual claims about the site.

const https   = require('https');
const http    = require('http');
const { URL } = require('url');

const TIMEOUT_MS   = 8000;
const MAX_BODY_LEN = 200000; // 200 KB cap to avoid downloading huge pages

// ── HTTP fetch ────────────────────────────────────────────────

function fetchPage(rawUrl, redirectDepth) {
  redirectDepth = redirectDepth || 0;
  if (redirectDepth > 3) return Promise.resolve({ ok: false, error: 'too many redirects' });

  return new Promise(function (resolve) {
    let url;
    try {
      // Prepend https:// if no protocol provided
      const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl;
      url = new URL(normalized);
    } catch (e) {
      return resolve({ ok: false, error: 'invalid URL: ' + e.message });
    }

    const lib   = url.protocol === 'https:' ? https : http;
    const start = Date.now();

    const req = lib.get(
      url.href,
      { timeout: TIMEOUT_MS, headers: { 'User-Agent': 'TUT-WebAnalyzer/2.0 (demo quality check)' } },
      function (res) {
        // Follow one level of redirect
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.destroy();
          fetchPage(res.headers.location, redirectDepth + 1).then(resolve);
          return;
        }

        let body = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          body += chunk;
          if (body.length > MAX_BODY_LEN) res.destroy();
        });
        res.on('end', function () {
          resolve({
            ok:             res.statusCode >= 200 && res.statusCode < 400,
            statusCode:     res.statusCode,
            https:          url.protocol === 'https:',
            responseTimeMs: Date.now() - start,
            body:           body,
            finalUrl:       url.href,
          });
        });
        res.on('error', function (err) {
          resolve({ ok: false, error: err.message });
        });
      }
    );

    req.on('error',   function (err) { resolve({ ok: false, error: err.message }); });
    req.on('timeout', function ()    { req.destroy(); resolve({ ok: false, error: 'timeout after ' + TIMEOUT_MS + 'ms' }); });
  });
}

// ── HTML scoring ──────────────────────────────────────────────

function scoreHtml(html, meta) {
  let score = 0;
  var weaknesses = [];
  var strengths  = [];

  // +10 — HTTPS
  if (meta.https) {
    score += 10;
    strengths.push('HTTPS / SSL');
  } else {
    weaknesses.push('no HTTPS (insecure connection)');
  }

  // +10 — Reachable (already confirmed before calling this function)
  score += 10;
  strengths.push('website is reachable');

  // +15 — Viewport meta (mobile-friendly indicator)
  if (/<meta[^>]+name=["']viewport["']/i.test(html)) {
    score += 15;
    strengths.push('mobile viewport meta present');
  } else {
    weaknesses.push('no viewport meta tag (likely not mobile-friendly)');
  }

  // +10 — WhatsApp link
  if (/wa\.me|whatsapp\.com|api\.whatsapp/i.test(html)) {
    score += 10;
    strengths.push('WhatsApp CTA present');
  } else {
    weaknesses.push('no WhatsApp CTA');
  }

  // +10 — Contact information (Tanzanian phone pattern or email)
  if (/(\+?255|0[67]\d{8,9})|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(html)) {
    score += 10;
    strengths.push('contact information present');
  } else {
    weaknesses.push('no visible contact information');
  }

  // +5 — Has an H1 tag
  if (/<h1[\s>]/i.test(html)) {
    score += 5;
    strengths.push('has H1 heading');
  } else {
    score -= 5;
    weaknesses.push('no H1 tag (poor SEO structure)');
  }

  // +5 — Open Graph tags (social share readiness)
  if (/og:title/i.test(html)) {
    score += 5;
    strengths.push('Open Graph meta tags present');
  } else {
    weaknesses.push('no Open Graph tags (poor social share previews)');
  }

  // +5 / -10 — Response time
  if (meta.responseTimeMs < 3000) {
    score += 5;
    strengths.push('fast page load (under 3s)');
  } else if (meta.responseTimeMs > 6000) {
    score -= 10;
    weaknesses.push('very slow load time (' + (meta.responseTimeMs / 1000).toFixed(1) + 's)');
  } else {
    weaknesses.push('slow load time (' + (meta.responseTimeMs / 1000).toFixed(1) + 's)');
  }

  // +5 — CTA buttons
  if (/<button|\bclass=["'][^"']*\bbtn\b/i.test(html)) {
    score += 5;
    strengths.push('has CTA buttons');
  } else {
    weaknesses.push('no obvious CTA buttons');
  }

  // Copyright year check — penalise old sites
  var copyrightPattern = /(?:&copy;|©|\bcopyright\b)\s*(?:-?\s*)?(\d{4})/gi;
  var match;
  var years = [];
  while ((match = copyrightPattern.exec(html)) !== null) {
    var y = parseInt(match[1], 10);
    if (y >= 1990 && y <= 2030) years.push(y);
  }
  if (years.length > 0) {
    var maxYear = Math.max.apply(null, years);
    if (maxYear < 2018) {
      score -= 15;
      weaknesses.push('copyright year ' + maxYear + ' — very outdated design likely');
    } else if (maxYear < 2022) {
      score -= 5;
      weaknesses.push('copyright year ' + maxYear + ' — may be showing its age');
    }
  }

  // Table-based layout detection (old school)
  var tableCount = (html.match(/<table/gi) || []).length;
  if (tableCount > 3) {
    score -= 15;
    weaknesses.push('heavy use of HTML tables — suggests old table-based layout');
  }

  // Responsive framework detection (bonus signal only — not penalised if absent)
  if (/bootstrap|tailwind|foundation/i.test(html)) {
    strengths.push('modern CSS framework detected');
  }

  return {
    score:      Math.max(0, Math.min(100, score)),
    weaknesses: weaknesses,
    strengths:  strengths,
  };
}

// ── Classification ────────────────────────────────────────────

function classify(score) {
  return score >= 45 ? 'MODERN_WEBSITE' : 'OUTDATED_WEBSITE';
}

function pitchAngle(classification) {
  var map = {
    NO_WEBSITE:       'no-website',
    BROKEN_WEBSITE:   'broken-website',
    OUTDATED_WEBSITE: 'redesign',
    MODERN_WEBSITE:   'enhancement',
  };
  return map[classification] || 'redesign';
}

// ── Public API ────────────────────────────────────────────────

async function analyzeWebsite(url) {
  // No URL → NO_WEBSITE
  if (!url || !String(url).trim()) {
    return {
      classification:      'NO_WEBSITE',
      score:               0,
      redesignRecommended: true,
      weaknesses:          ['no website URL provided'],
      strengths:           [],
      suggestedPitchAngle: 'no-website',
      url:                 null,
      responseTimeMs:      null,
    };
  }

  var result = await fetchPage(url);

  if (!result.ok) {
    return {
      classification:      'BROKEN_WEBSITE',
      score:               0,
      redesignRecommended: true,
      weaknesses:          ['website unreachable — ' + (result.error || 'HTTP ' + result.statusCode)],
      strengths:           [],
      suggestedPitchAngle: 'broken-website',
      url:                 url,
      responseTimeMs:      null,
    };
  }

  var scored       = scoreHtml(result.body, result);
  var classification = classify(scored.score);

  return {
    classification:      classification,
    score:               scored.score,
    redesignRecommended: classification !== 'MODERN_WEBSITE',
    weaknesses:          scored.weaknesses,
    strengths:           scored.strengths,
    suggestedPitchAngle: pitchAngle(classification),
    url:                 result.finalUrl || url,
    responseTimeMs:      result.responseTimeMs,
  };
}

// ── CLI entry point ───────────────────────────────────────────

if (require.main === module) {
  var url = process.argv[2];
  if (!url) {
    console.error('Usage: node tools/website-quality-analyzer.js <url>');
    console.error('       node tools/website-quality-analyzer.js http://example.com');
    process.exit(1);
  }
  analyzeWebsite(url).then(function (result) {
    console.log(JSON.stringify(result, null, 2));
  }).catch(function (err) {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { analyzeWebsite };
