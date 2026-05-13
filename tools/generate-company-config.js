'use strict';

// generateCompanyConfig(lead)
//
// Converts a raw lead record into a fully valid companies/{slug}.json
// compatible with the Sub-project 1 schema (configVersion 1.0.0).
//
// SAFETY CONTRACT:
//   - Never invents directors, phone numbers, certifications, or clients.
//   - Testimonials section is always disabled (visible: false, items: []).
//   - about.director is always null; it is listed in lockedFields.
//   - Stats use conservative floor values from per-industry defaults.
//   - All claims in copy.js are deliberately generic and unverifiable.
//   - Configs are always written with status: "draft".

const fs   = require('fs');
const path = require('path');

const { slugify }         = require('./utils/slug');
const { computeChecksum } = require('./utils/checksum');
const { INDUSTRY_BRAND }  = require('./utils/defaults');
const { inferIndustry }   = require('./utils/infer-industry');
const { validateConfig }  = require('./utils/validation');
const { getCopy, pick }   = require('./utils/copy');

const OUTPUT_DIR = path.join(__dirname, '..', 'generated', 'configs');

// ── Internal helpers ──────────────────────────────────────────

function nowIso() {
  return new Date().toISOString();
}

// ── Builder functions (one per config section) ────────────────

function buildMeta(lead, slug, copy) {
  const subTagline = copy.subTagline || 'Professional Services';
  return {
    seoTitle:       lead.name + ' | ' + subTagline + ' — Tanzania',
    seoDescription: pick(copy.hero.subheadlines),
    ogImage:        'assets/images/og-cover.jpg',
    defaultOgImage: '',
    canonicalUrl:   'https://demo.thisuncle.co.tz/' + slug,
    favicon:        '',
  };
}

function buildBrand(lead, industry, copy) {
  const tokens = INDUSTRY_BRAND[industry] || INDUSTRY_BRAND.general;
  return {
    name:       lead.name,
    tagline:    lead.tagline || pick(copy.taglines),
    subTagline: copy.subTagline,
    logo:       '',
    industry,
    accent:     tokens.accent,
    accentAlt:  tokens.accentAlt,
    bgDark:     tokens.bgDark,
    textLight:  tokens.textLight,
  };
}

function buildHero(copy) {
  return {
    headline:     pick(copy.hero.headlines),
    headlineEm:   pick(copy.hero.headlineEms),
    subheadline:  pick(copy.hero.subheadlines),
    bgImage:      'assets/images/hero.jpg',
    bgVideo:      '',
    ctaPrimary:   copy.ctaPrimary,
    ctaSecondary: copy.ctaSecondary,
    badges:       copy.badges,
  };
}

function buildAbout(copy) {
  return {
    heading:  pick(copy.about.headings),
    body:     pick(copy.about.bodies),
    image:    'assets/images/about.jpg',
    // director is never auto-generated; listed in lockedFields
    director: null,
  };
}

function buildContact(lead) {
  return {
    phone:    lead.phone    || '',
    whatsapp: lead.whatsapp || '',
    email:    lead.email    || '',
    address:  lead.address  || '',
    mapEmbed: '',
  };
}

function buildSocial(lead) {
  const s = lead.socialMedia || {};
  return {
    facebook:  s.facebook  || '',
    instagram: s.instagram || '',
    linkedin:  s.linkedin  || '',
    twitter:   s.twitter   || '',
    youtube:   s.youtube   || '',
  };
}

function buildInternal(lead, ts) {
  return {
    leadId:          lead.leadId         || '',
    createdAt:       ts,
    updatedAt:       ts,
    generatedBy:     'auto',
    source:          lead.source         || 'leads-pipeline',
    salesRep:        lead.salesRep       || '',
    demoVersion:     '2.0.0',
    outreachStatus:  lead.outreachStatus || 'pending',
  };
}

// ── Main builder ──────────────────────────────────────────────

function buildConfig(lead) {
  const industry = inferIndustry(lead);
  const slug     = slugify(lead.name);
  const copy     = getCopy(industry);
  const ts       = nowIso();
  const locale   = lead.locale === 'sw-TZ' ? 'sw-TZ' : 'en-TZ';

  const config = {
    configVersion: '1.0.0',
    generatedAt:   ts,
    updatedAt:     ts,
    checksum:      '',       // computed after assembly
    status:        'draft',
    locale,
    lockedFields:  ['about.director'],

    meta:         buildMeta(lead, slug, copy),
    brand:        buildBrand(lead, industry, copy),
    hero:         buildHero(copy),
    about:        buildAbout(copy),

    services: {
      visible: true,
      items:   copy.services,
    },

    // Projects section is always empty in auto-generated configs.
    // A human editor should fill this with real project history.
    projects: {
      visible: false,
      items:   [],
    },

    stats: {
      visible: true,
      items:   copy.stats,
    },

    whyUs: {
      visible: true,
      items:   copy.whyUs,
    },

    // Gallery is always empty — images must come from the real company.
    gallery: {
      visible: false,
      items:   [],
    },

    // Testimonials are NEVER auto-generated. Fabricating them is dishonest.
    // A human editor must add these after client verification.
    testimonials: {
      visible: false,
      items:   [],
    },

    contact:  buildContact(lead),
    social:   buildSocial(lead),

    cta: {
      heading:     copy.cta.heading,
      subheading:  copy.cta.subheading,
      buttonLabel: copy.cta.buttonLabel,
    },

    internal: buildInternal(lead, ts),
  };

  // Checksum covers visible content only (excludes internal + timestamps)
  config.checksum = computeChecksum(config);

  return { slug, config };
}

// ── Public API ────────────────────────────────────────────────

function generateCompanyConfig(lead) {
  const { slug, config } = buildConfig(lead);

  const validation = validateConfig(config);
  if (!validation.valid) {
    console.warn('[generator] Validation warnings for "' + lead.name + '":');
    validation.warnings.forEach(w => console.warn('  ⚠ ' + w));
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outPath = path.join(OUTPUT_DIR, slug + '.json');
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log('[generator] Written: ' + outPath);

  return { slug, config, validation };
}

// ── CLI entry point ───────────────────────────────────────────

if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage:');
    console.error('  node tools/generate-company-config.js leads/sample-leads.json');
    console.error('  node tools/generate-company-config.js \'{"name":"Acme Ltd",...}\'');
    process.exit(1);
  }

  let leads;
  try {
    if (fs.existsSync(arg)) {
      const raw = JSON.parse(fs.readFileSync(arg, 'utf8'));
      leads = Array.isArray(raw) ? raw : [raw];
    } else {
      const raw = JSON.parse(arg);
      leads = Array.isArray(raw) ? raw : [raw];
    }
  } catch (e) {
    console.error('Could not parse lead data: ' + e.message);
    process.exit(1);
  }

  leads.forEach(lead => {
    const result = generateCompanyConfig(lead);
    const status = result.validation.valid ? '✓ valid' : '⚠ warnings';
    console.log('[generator] ' + result.slug + ' — config ' + status);
  });
}

module.exports = { generateCompanyConfig, buildConfig };
