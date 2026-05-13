/* ============================================================
   TUT MASTER TEMPLATE — main.js v2.0.0
   AI-powered website generation platform engine.

   Rendering pipeline:
   fetch → migrateConfig → normalizeConfig → validateConfig
   → applyMeta → handleStatus → renderAll → initInteractions
   → initAnimations (skipped in screenshot mode)

   Security model:
   All config strings are sanitized before DOM insertion.
   sanitizeText() is mandatory in innerHTML template literals.
   sanitizeUrl() is mandatory for all href/src attributes.
   textContent is used wherever possible instead of innerHTML.
============================================================ */

(function () {
  'use strict';

  /* ==========================================================
     SECTION 0 — CONSTANTS & SCREENSHOT MODE
  ========================================================== */

  const COMPANIES_BASE  = '/companies';
  const DEFAULT_SLUG    = 'karimjee-builders';

  // Detected at parse time so CSS class is applied before first paint
  // (The inline <script> in <head> already set the class on <html>;
  //  this flag is used by JS logic throughout init.)
  const isScreenshotMode =
    new URLSearchParams(window.location.search).get('mode') === 'screenshot';

  // Set by loadCompany() — used in trackEvent() and applyMeta()
  let currentSlug = '';

  /* ==========================================================
     SECTION 1 — LOCALE STRINGS
     UI chrome strings only. Company content is never translated.
  ========================================================== */

  const LOCALE_STRINGS = {
    'en-TZ': {
      waGreeting:              'Hello, I would like to inquire about your services.',
      ctaButton:               'Start a Conversation',
      formSubmit:              'Send via WhatsApp',
      chatLabel:               'Chat on WhatsApp',
      formLabelName:           'Full Name',
      formLabelEmail:          'Email Address',
      formLabelPhone:          'Phone / WhatsApp Number',
      formLabelMessage:        'Message',
      formPlaceholderName:     'Your Name',
      formPlaceholderEmail:    'your@email.com',
      formPlaceholderPhone:    '+255 7XX XXX XXX',
      formPlaceholderMessage:  'Tell us about your project or inquiry…',
    },
    'sw-TZ': {
      waGreeting:              'Habari, ningependa kujua kuhusu huduma zenu.',
      ctaButton:               'Anza Mazungumzo',
      formSubmit:              'Tuma kupitia WhatsApp',
      chatLabel:               'Piga Soga WhatsApp',
      formLabelName:           'Jina Kamili',
      formLabelEmail:          'Barua Pepe',
      formLabelPhone:          'Namba ya Simu / WhatsApp',
      formLabelMessage:        'Ujumbe',
      formPlaceholderName:     'Jina lako kamili',
      formPlaceholderEmail:    'barua@pepe.com',
      formPlaceholderPhone:    '+255 7XX XXX XXX',
      formPlaceholderMessage:  'Tuambie kuhusu mradi au swali lako…',
    },
  };

  /* ==========================================================
     SECTION 2 — INDUSTRY HERO GRADIENTS
     Applied when hero background image fails to load.
  ========================================================== */

  const HERO_GRADIENTS = {
    construction: 'linear-gradient(135deg, #1a0a00 0%, #3d1c00 40%, #080808 100%)',
    logistics:    'linear-gradient(135deg, #001428 0%, #002a4e 40%, #060c14 100%)',
    consultancy:  'linear-gradient(135deg, #081208 0%, #0f2a0d 40%, #0b120a 100%)',
    healthcare:   'linear-gradient(135deg, #001a14 0%, #003d2b 40%, #080808 100%)',
    education:    'linear-gradient(135deg, #0a0a1e 0%, #1a1a4e 40%, #080808 100%)',
    trading:      'linear-gradient(135deg, #1a0f00 0%, #3d2800 40%, #0d0a00 100%)',
    engineering:  'linear-gradient(135deg, #0a0a0a 0%, #1f1f1f 40%, #080808 100%)',
    corporate:    'linear-gradient(135deg, #0a0f1a 0%, #1a2a3d 40%, #080808 100%)',
    general:      'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 40%, #080808 100%)',
  };

  /* ==========================================================
     SECTION 3 — SAFETY HELPERS
     All config-derived strings pass through these before DOM insertion.
     This protects against malicious or malformed AI-generated content.
  ========================================================== */

  // Escapes HTML special characters. Use inside innerHTML template literals.
  // Never insert config strings into innerHTML without this.
  function sanitizeText(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#x27;');
  }

  // Validates and returns safe URLs. Rejects anything that is not
  // http/https, mailto, tel, or a relative path. Returns '' on failure.
  function sanitizeUrl(str) {
    if (!str || typeof str !== 'string') return '';
    const s = str.trim();
    if (/^(https?:\/\/|mailto:|tel:|\/|\.\/|\.\.\/)/.test(s)) return s;
    if (/^[a-zA-Z0-9._\-\/]+$/.test(s)) return s;
    return '';
  }

  // Returns true if a string is a valid asset path (relative or absolute URL).
  function isValidAssetPath(str) {
    if (!str || typeof str !== 'string') return false;
    const s = str.trim();
    return /^https?:\/\//.test(s) || /^[a-zA-Z0-9._\-\/]+$/.test(s);
  }

  // FNV-1a 32-bit hash. Used for checksum generation in config tooling.
  function fnv1a(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash  = (hash * 16777619) >>> 0;
    }
    return hash.toString(16);
  }

  /* ==========================================================
     SECTION 4 — LOCALE HELPER
     Always falls back to en-TZ if a key is missing in the active locale.
  ========================================================== */

  function t(key, config) {
    const locale = (config && config.locale) || 'en-TZ';
    return (LOCALE_STRINGS[locale]    || {})[key]
        ?? (LOCALE_STRINGS['en-TZ']   || {})[key]
        ?? '';
  }

  /* ==========================================================
     SECTION 5 — ANALYTICS
     trackEvent() fires a DOM CustomEvent and calls window.__TUT_TRACK
     if defined. Zero vendor lock-in. No network calls by default.
  ========================================================== */

  function trackEvent(name, data) {
    const payload = {
      event:     name,
      slug:      currentSlug,
      timestamp: new Date().toISOString(),
      locale:    (window.COMPANY && window.COMPANY.locale) || 'en-TZ',
      status:    (window.COMPANY && window.COMPANY.status) || 'unknown',
      meta:      data || {},
    };

    document.dispatchEvent(new CustomEvent('tut:track', { detail: payload }));

    if (typeof window.__TUT_TRACK === 'function') {
      try { window.__TUT_TRACK(payload); } catch (e) { /* never block rendering */ }
    }
  }

  /* ==========================================================
     SECTION 6 — MIGRATION
     Transforms old config shapes to the current schema version.
     Add a new case here whenever a breaking schema change is made.
  ========================================================== */

  function versionLessThan(a, b) {
    const pa = String(a).split('.').map(Number);
    const pb = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) < (pb[i] || 0)) return true;
      if ((pa[i] || 0) > (pb[i] || 0)) return false;
    }
    return false;
  }

  function migrateConfig(raw) {
    if (!raw || typeof raw !== 'object') return raw;

    const version = raw.configVersion || '0.9.0';

    // Migration: pre-1.0.0 → 1.0.0
    // Old shape had flat arrays for section data.
    // New shape wraps them in { visible, items }.
    if (!raw.configVersion || versionLessThan(version, '1.0.0')) {
      const ARRAY_SECTIONS = ['services', 'projects', 'stats', 'whyUs', 'gallery', 'testimonials'];
      ARRAY_SECTIONS.forEach(key => {
        if (Array.isArray(raw[key])) {
          raw[key] = { visible: raw[key].length > 0, items: raw[key] };
        }
      });
      raw.configVersion = '1.0.0';
      console.info('[TUT] Config migrated from pre-1.0.0 to 1.0.0');
    }

    // Future migrations go here:
    // if (versionLessThan(raw.configVersion, '1.1.0')) { ... }

    return raw;
  }

  /* ==========================================================
     SECTION 7 — NORMALIZATION
     Guarantees every field exists with a safe default.
     Renderers can read any field without null checks.
  ========================================================== */

  function normalizeConfig(raw) {
    const c = Object.assign({}, raw);

    // Root fields
    c.configVersion = c.configVersion || '1.0.0';
    c.status        = ['draft', 'published', 'archived'].includes(c.status) ? c.status : 'draft';
    c.locale        = ['en-TZ', 'sw-TZ'].includes(c.locale) ? c.locale : 'en-TZ';
    c.lockedFields  = Array.isArray(c.lockedFields) ? c.lockedFields : [];

    // meta
    c.meta                    = c.meta || {};
    c.meta.seoTitle           = c.meta.seoTitle       || (c.brand && c.brand.name) || '';
    c.meta.seoDescription     = c.meta.seoDescription || '';
    c.meta.ogImage            = c.meta.ogImage        || c.meta.defaultOgImage || '';
    c.meta.defaultOgImage     = c.meta.defaultOgImage || '';
    c.meta.canonicalUrl       = c.meta.canonicalUrl   || '';
    c.meta.favicon            = c.meta.favicon        || '';

    // brand
    c.brand            = c.brand || {};
    c.brand.name       = c.brand.name       || 'Company';
    c.brand.tagline    = c.brand.tagline    || '';
    c.brand.subTagline = c.brand.subTagline || '';
    c.brand.logo       = c.brand.logo       || '';
    c.brand.industry   = c.brand.industry   || 'general';
    c.brand.accent     = c.brand.accent     || '#C9431B';
    c.brand.accentAlt  = c.brand.accentAlt  || '#E05C2A';
    c.brand.bgDark     = c.brand.bgDark     || '#080808';
    c.brand.textLight  = c.brand.textLight  || '#EDE8DE';

    // hero
    c.hero              = c.hero || {};
    c.hero.headline     = c.hero.headline     || '';
    c.hero.headlineEm   = c.hero.headlineEm   || '';
    c.hero.subheadline  = c.hero.subheadline  || '';
    c.hero.bgImage      = c.hero.bgImage      || '';
    c.hero.bgVideo      = c.hero.bgVideo      || '';
    c.hero.ctaPrimary   = c.hero.ctaPrimary   || { label: 'Contact Us', type: 'whatsapp' };
    c.hero.ctaSecondary = c.hero.ctaSecondary || null;
    c.hero.badges       = Array.isArray(c.hero.badges) ? c.hero.badges : [];

    // about
    c.about          = c.about || {};
    c.about.heading  = c.about.heading || '';
    c.about.body     = c.about.body    || [];
    c.about.image    = c.about.image   || '';
    if (c.about.director !== null && typeof c.about.director !== 'object') {
      c.about.director = null;
    }

    // Wrapped sections — normalize all six
    const SECTION_KEYS = ['services', 'projects', 'stats', 'whyUs', 'gallery', 'testimonials'];
    SECTION_KEYS.forEach(key => {
      if (!c[key] || typeof c[key] !== 'object' || Array.isArray(c[key])) {
        c[key] = { visible: true, items: [] };
      } else {
        c[key].visible = typeof c[key].visible === 'boolean' ? c[key].visible : true;
        c[key].items   = Array.isArray(c[key].items) ? c[key].items : [];
      }
    });

    // contact
    c.contact          = c.contact || {};
    c.contact.phone    = c.contact.phone    || '';
    c.contact.whatsapp = c.contact.whatsapp || '';
    c.contact.email    = c.contact.email    || '';
    c.contact.address  = c.contact.address  || '';
    c.contact.mapEmbed = c.contact.mapEmbed || '';

    // social
    c.social = c.social || {};
    ['facebook', 'instagram', 'linkedin', 'twitter', 'youtube'].forEach(p => {
      c.social[p] = c.social[p] || '';
    });

    // cta
    c.cta             = c.cta || {};
    c.cta.heading     = c.cta.heading     || '';
    c.cta.subheading  = c.cta.subheading  || '';
    c.cta.buttonLabel = c.cta.buttonLabel || 'Contact Us';

    // internal — preserve verbatim; never read by renderers
    c.internal = c.internal || {};

    return c;
  }

  /* ==========================================================
     SECTION 8 — VALIDATION
     Warns on schema issues. Never throws. Rendering always proceeds.
     This is a developer/AI safety tool, not a user-facing gate.
  ========================================================== */

  function validateConfig(config) {
    const warnings = [];

    function warn(msg) {
      warnings.push(msg);
      console.warn('[TUT] Config warning: ' + msg);
    }

    // Required fields
    if (!config.brand || !config.brand.name)      warn('brand.name is required');
    if (!config.brand || !config.brand.accent)    warn('brand.accent is required');
    if (!config.hero  || !config.hero.headline)   warn('hero.headline is required');
    if (!config.hero  || !config.hero.subheadline) warn('hero.subheadline is required');
    if (!config.contact || !config.contact.whatsapp)
      warn('contact.whatsapp is required — all WhatsApp CTAs will link to #');

    // Type checks
    if (config.status && !['draft', 'published', 'archived'].includes(config.status))
      warn('status "' + config.status + '" is not valid — should be draft, published, or archived');

    if (config.locale && !['en-TZ', 'sw-TZ'].includes(config.locale))
      warn('locale "' + config.locale + '" is not supported — falling back to en-TZ');

    // WhatsApp number format
    if (config.contact.whatsapp && !/^[0-9]{10,15}$/.test(config.contact.whatsapp))
      warn('contact.whatsapp should be digits only (10–15 digits), no + or spaces');

    // Asset path checks
    if (config.hero.bgImage && !isValidAssetPath(config.hero.bgImage))
      warn('hero.bgImage "' + config.hero.bgImage + '" appears invalid');

    if (config.about.image && !isValidAssetPath(config.about.image))
      warn('about.image "' + config.about.image + '" appears invalid');

    // configVersion
    if (!config.configVersion)
      warn('configVersion is missing — config may be outdated');

    if (warnings.length === 0) {
      console.info('[TUT] Config valid (' + (config.brand && config.brand.name) + ')');
    }

    return { valid: warnings.length === 0, warnings };
  }

  /* ==========================================================
     SECTION 9 — CONFIG LOADING
  ========================================================== */

  function resolveSlug() {
    // 1. URL path (production): /abc-contractors → "abc-contractors"
    const pathSlug = window.location.pathname.replace(/^\/|\/$/g, '');
    if (pathSlug && pathSlug !== 'index.html') return pathSlug;

    // 2. Query param (local dev override): ?company=abc-contractors
    const params    = new URLSearchParams(window.location.search);
    const paramSlug = params.get('company');
    if (paramSlug) return paramSlug;

    // 3. Hardcoded default (bare localhost or file://)
    return DEFAULT_SLUG;
  }

  async function loadCompany() {
    const slug = resolveSlug();
    currentSlug = slug;

    try {
      const res = await fetch(COMPANIES_BASE + '/' + slug + '.json');

      if (!res.ok) {
        trackEvent('config_not_found', { slug, status: res.status });
        renderErrorState('not-found');
        return null;
      }

      let raw;
      try {
        raw = await res.json();
      } catch (e) {
        trackEvent('config_invalid', { slug, error: e.message });
        renderErrorState('invalid-config');
        return null;
      }

      raw = migrateConfig(raw);
      const config = normalizeConfig(raw);
      validateConfig(config);
      return config;

    } catch (e) {
      trackEvent('render_error', { slug, error: e.message });
      renderErrorState('not-found');
      return null;
    }
  }

  /* ==========================================================
     SECTION 10 — META INJECTION (OG / Twitter Card / SEO)
     Must run before renderAll so WhatsApp link previews work.
  ========================================================== */

  function applyMeta(config) {
    const m = config.meta;
    const b = config.brand;

    const title  = m.seoTitle       || b.name || '';
    const desc   = m.seoDescription || '';
    const ogImg  = m.ogImage        || '';
    const url    = m.canonicalUrl   || (window.location.origin + '/' + currentSlug);

    // Update document title
    document.title = title;

    // Helper: find existing meta tag or create it
    function ensureMeta(attrName, attrValue, content) {
      if (!content) return;
      let tag = document.querySelector('meta[' + attrName + '="' + attrValue + '"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attrName, attrValue);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    }

    ensureMeta('name',     'description',          desc);
    ensureMeta('property', 'og:title',             title);
    ensureMeta('property', 'og:description',       desc);
    ensureMeta('property', 'og:url',               url);
    ensureMeta('property', 'og:type',              'website');
    ensureMeta('property', 'og:image',             ogImg);
    ensureMeta('name',     'twitter:card',         'summary_large_image');
    ensureMeta('name',     'twitter:title',        title);
    ensureMeta('name',     'twitter:description',  desc);
    ensureMeta('name',     'twitter:image',        ogImg);

    // Favicon
    if (m.favicon) {
      const favEl = document.getElementById('js-favicon');
      const safeHref = sanitizeUrl(m.favicon);
      if (favEl && safeHref) favEl.setAttribute('href', safeHref);
    }

    // Canonical link tag
    if (url) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = url;
    }
  }

  /* ==========================================================
     SECTION 11 — STATUS HANDLING
     draft → preview banner injected
     archived → error screen shown, rendering stops
     published → normal render
  ========================================================== */

  function handleStatus(config) {
    const status = config.status;

    if (status === 'archived') {
      renderErrorState('archived');
      return 'archived';
    }

    if (status === 'draft') {
      const banner = document.createElement('div');
      banner.className = 'draft-banner';
      banner.setAttribute('aria-label', 'Draft preview — not published');
      banner.innerHTML =
        '<i class="ri-eye-line" aria-hidden="true"></i> ' +
        'Preview — This demo has not been published yet';
      document.body.insertBefore(banner, document.body.firstChild);
      return 'draft';
    }

    return 'published';
  }

  /* ==========================================================
     SECTION 12 — ERROR STATES
     Shown when config cannot be loaded or demo is unavailable.
  ========================================================== */

  function renderErrorState(type) {
    const states = {
      'not-found':      { icon: 'ri-link-unlink',       title: 'Demo Not Found',     body: 'This demo link is no longer active or doesn’t exist.' },
      'invalid-config': { icon: 'ri-error-warning-line', title: 'Demo Unavailable',   body: 'This demo could not be loaded. Please contact support.' },
      'archived':       { icon: 'ri-archive-line',       title: 'Demo Archived',      body: 'This demo has been archived and is no longer available.' },
    };

    const s = states[type] || states['not-found'];

    // Dismiss preloader if still visible
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.remove();
    document.body.classList.remove('is-loading');

    // TUT Technologies contact number (update when known)
    const tutWa = 'https://wa.me/255000000000?text=' +
      encodeURIComponent('Hello, I followed a demo link but it appears to be unavailable.');

    document.body.innerHTML =
      '<div class="error-state">' +
        '<div class="error-state__inner">' +
          '<div class="error-state__logo">ThisUncle Technologies</div>' +
          '<i class="error-state__icon ' + s.icon + '" aria-hidden="true"></i>' +
          '<h1 class="error-state__title">' + s.title + '</h1>' +
          '<p class="error-state__body">' + s.body + '</p>' +
          '<a href="' + tutWa + '" class="error-state__btn" target="_blank" rel="noopener">' +
            '<i class="ri-whatsapp-line"></i> Contact ThisUncle Technologies' +
          '</a>' +
        '</div>' +
      '</div>';
  }

  /* ==========================================================
     SECTION 13 — BRAND TOKENS
     Injects brand colors as CSS variables before first paint.
  ========================================================== */

  function injectBrandTokens(config) {
    const root = document.documentElement;
    const b    = config.brand;
    if (b.accent)    root.style.setProperty('--accent',      b.accent);
    if (b.accentAlt) root.style.setProperty('--accent-alt',  b.accentAlt);
    if (b.bgDark)    root.style.setProperty('--bg-dark',     b.bgDark);
    if (b.textLight) root.style.setProperty('--text-light',  b.textLight);
  }

  /* ==========================================================
     SECTION 14 — UTILITY HELPERS
  ========================================================== */

  function el(selector)  { return document.querySelector(selector); }
  function els(selector) { return [...document.querySelectorAll(selector)]; }

  function isEmpty(section) {
    if (!section) return true;
    // Wrapped section format
    if (typeof section === 'object' && 'items' in section) {
      return !section.visible || section.items.length === 0;
    }
    // Legacy fallback
    if (Array.isArray(section)) return section.length === 0;
    return !section;
  }

  function hideSection(id) {
    const section = document.getElementById(id);
    if (section) section.hidden = true;
  }

  function buildWaLink(customText, config) {
    const c   = config || {};
    const num = (c.contact && c.contact.whatsapp) || '';
    const msg = encodeURIComponent(customText || t('waGreeting', c));
    return num ? 'https://wa.me/' + num + '?text=' + msg : '#';
  }

  function socialIcon(platform) {
    const map = {
      facebook:  'ri-facebook-fill',
      instagram: 'ri-instagram-line',
      linkedin:  'ri-linkedin-fill',
      twitter:   'ri-twitter-x-line',
      youtube:   'ri-youtube-fill',
    };
    return map[platform] || 'ri-link';
  }

  function socialLabel(platform) {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  }

  function initials(name) {
    return (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase() || '?';
  }

  /* ==========================================================
     SECTION 15 — RENDERERS
     Each renderer reads only from its section of the config.
     All config strings are sanitized before DOM insertion.
  ========================================================== */

  function injectBrandText(config) {
    const b = config.brand;
    els('.js-brand-name').forEach(n => {
      if (n.tagName === 'IMG') return;
      n.textContent = b.name || '';
    });
    els('.js-brand-tagline').forEach(n => {
      n.textContent = b.subTagline || b.tagline || '';
    });
    // All WhatsApp links
    const waMsg = 'Hello ' + b.name + ', I would like to know more about your services.';
    els('.js-wa-link').forEach(a => {
      a.href = buildWaLink(waMsg, config);
    });
    const hCta = el('.js-header-cta');
    if (hCta) hCta.href = buildWaLink(waMsg, config);
  }

  function injectLogo(config) {
    const b = config.brand;
    if (!b.logo || !isValidAssetPath(b.logo)) return;

    els('.header__logo-text').forEach(span => {
      const img = document.createElement('img');
      img.src       = b.logo;
      img.alt       = b.name + ' logo';
      img.className = 'header__logo-img';
      span.replaceWith(img);
    });
  }

  function renderHero(config) {
    const h = config.hero;
    const b = config.brand;

    const eyeline = el('.hero__eyeline');
    if (eyeline) eyeline.textContent = b.tagline || b.name || '';

    const hl = el('.js-hero-headline');
    const em = el('.js-hero-em');
    if (hl) hl.textContent = h.headline   || '';
    if (em) em.textContent = h.headlineEm || '';

    const sub = el('.js-hero-sub');
    if (sub) sub.textContent = h.subheadline || '';

    // Background media
    const bgVideo = el('.hero__bg-video');
    const bgImg   = el('.hero__bg-img');

    if (h.bgVideo && isValidAssetPath(h.bgVideo) && bgVideo) {
      bgVideo.src           = h.bgVideo;
      bgVideo.style.display = 'block';
      if (bgImg) bgImg.style.display = 'none';
    } else if (h.bgImage && isValidAssetPath(h.bgImage) && bgImg) {
      bgImg.src = h.bgImage;
      bgImg.alt = sanitizeText(b.name) + ' — hero image';
      bgImg.addEventListener('error', function () {
        this.style.display = 'none';
        const heroMedia = this.closest('.hero__media');
        if (heroMedia) {
          const industry = config.brand.industry || 'general';
          heroMedia.style.background = HERO_GRADIENTS[industry] || HERO_GRADIENTS.general;
        }
      }, { once: true });
    } else if (bgImg) {
      // No image configured — apply industry gradient immediately
      const heroMedia = bgImg.closest('.hero__media');
      if (heroMedia) {
        const industry = config.brand.industry || 'general';
        heroMedia.style.background = HERO_GRADIENTS[industry] || HERO_GRADIENTS.general;
      }
    }

    // Primary CTA
    const primaryCta = el('.js-hero-cta-primary');
    const primaryLbl = el('.js-hero-cta-primary-label');
    if (primaryCta && h.ctaPrimary) {
      if (h.ctaPrimary.type === 'whatsapp') {
        primaryCta.href = buildWaLink(
          'Hello ' + b.name + ', I found your website and would like to discuss a project.',
          config
        );
        primaryCta.setAttribute('target', '_blank');
        primaryCta.setAttribute('rel', 'noopener');
      } else if (h.ctaPrimary.href) {
        primaryCta.href = sanitizeUrl(h.ctaPrimary.href) || '#';
        primaryCta.removeAttribute('target');
      }
      if (primaryLbl) primaryLbl.textContent = h.ctaPrimary.label || 'Contact Us';
    }

    // Secondary CTA
    const secCta = el('.js-hero-cta-secondary');
    const secLbl = el('.js-hero-cta-secondary-label');
    if (secCta && h.ctaSecondary) {
      secCta.href = sanitizeUrl(h.ctaSecondary.href) || '#';
      if (secLbl) secLbl.textContent = h.ctaSecondary.label || 'Learn More';
    } else if (secCta) {
      secCta.hidden = true;
    }

    // Ticker
    const tickerTrack = el('.js-ticker-track');
    if (tickerTrack && b.name) {
      tickerTrack.textContent = Array(8)
        .fill(b.name + ' — ' + (b.tagline || 'Excellence') + ' ')
        .join('');
    }

    // Badges
    const badgesEl = el('.js-hero-badges');
    if (badgesEl && h.badges.length) {
      badgesEl.innerHTML = h.badges.map(badge => `
        <div class="hero__badge">
          <span class="hero__badge-value">${sanitizeText(badge.value)}</span>
          <span class="hero__badge-label">${sanitizeText(badge.label)}</span>
        </div>
      `).join('');
    } else if (badgesEl) {
      badgesEl.hidden = true;
    }

    trackEvent('cta_click'); // attach click tracking to CTAs
    els('.js-hero-cta-primary, .js-cta-wa-btn, .wa-fab').forEach(btn => {
      btn.addEventListener('click', () => trackEvent('cta_click'), { once: false });
    });
  }

  function renderAbout(config) {
    const a = config.about;
    if (!a.heading && !a.body.length && !a.image) { hideSection('about'); return; }

    const hEl = el('.js-about-heading');
    if (hEl) hEl.textContent = a.heading || '';

    const textEl = el('.js-about-text');
    if (textEl) {
      const paras = Array.isArray(a.body) ? a.body : [a.body];
      textEl.innerHTML = paras.filter(Boolean)
        .map(p => '<p>' + sanitizeText(p) + '</p>')
        .join('');
    }

    const imgEl = el('.js-about-img');
    if (imgEl && a.image && isValidAssetPath(a.image)) {
      imgEl.src = a.image;
      imgEl.alt = sanitizeText(config.brand.name) + ' — about photo';
    }

    const cardEl = el('.js-director-card');
    if (cardEl && a.director && a.director.name) {
      const d = a.director;
      const hasPhoto = d.photo && isValidAssetPath(d.photo);

      const avatarHtml = hasPhoto
        ? '<div class="director__photo-wrap"><img src="' + d.photo + '" alt="' + sanitizeText(d.name) + '" loading="lazy" /></div>'
        : '<div class="director__monogram">' + initials(d.name) + '</div>';

      cardEl.innerHTML =
        avatarHtml +
        (d.quote ? '<p class="director__quote">“' + sanitizeText(d.quote) + '”</p>' : '') +
        '<p class="director__name">'  + sanitizeText(d.name)  + '</p>' +
        (d.title ? '<p class="director__title">' + sanitizeText(d.title) + '</p>' : '');

      if (hasPhoto) {
        const dirImg = cardEl.querySelector('.director__photo-wrap img');
        if (dirImg) {
          dirImg.addEventListener('error', function () {
            const monogram = document.createElement('div');
            monogram.className   = 'director__monogram';
            monogram.textContent = initials(d.name);
            this.closest('.director__photo-wrap').replaceWith(monogram);
          }, { once: true });
        }
      }
    } else if (cardEl) {
      cardEl.hidden = true;
    }
  }

  function renderServices(config) {
    const section = config.services;
    const grid    = el('.js-services-grid');
    if (!grid) return;
    if (isEmpty(section)) { hideSection('services'); return; }

    grid.innerHTML = section.items.map(s => `
      <div class="service-card" data-reveal="up">
        <i class="service-card__icon ${sanitizeText(s.icon || 'ri-star-line')}" aria-hidden="true"></i>
        <h3 class="service-card__title">${sanitizeText(s.title || '')}</h3>
        <p  class="service-card__body">${sanitizeText(s.body  || '')}</p>
      </div>
    `).join('');
  }

  function renderStats(config) {
    const section = config.stats;
    const grid    = el('.js-stats-grid');
    if (!grid) return;
    if (isEmpty(section)) { hideSection('stats'); return; }

    const statsSection = document.getElementById('stats');
    if (statsSection && config.brand.name) {
      statsSection.setAttribute('data-watermark', config.brand.name.toUpperCase());
    }

    grid.innerHTML = section.items.map(s => `
      <div class="stat-item">
        <div class="stat-item__value" data-target="${sanitizeText(String(s.value))}" data-suffix="${sanitizeText(s.suffix || '')}">0${sanitizeText(s.suffix || '')}</div>
        <div class="stat-item__label">${sanitizeText(s.label || '')}</div>
      </div>
    `).join('');
  }

  function renderProjects(config) {
    const section = config.projects;
    const grid    = el('.js-projects-grid');
    if (!grid) return;
    if (isEmpty(section)) { hideSection('projects'); return; }

    grid.innerHTML = section.items.map(p => {
      const tagClass = p.tag && p.tag.toLowerCase() === 'ongoing'
        ? 'project-card__tag project-card__tag--ongoing'
        : 'project-card__tag';

      const imgHtml = p.image && isValidAssetPath(p.image)
        ? '<img class="project-card__img" src="' + p.image + '" alt="' + sanitizeText(p.title) + '" loading="lazy" />'
        : '';

      return `
        <article class="project-card" data-reveal="up">
          <div class="project-card__img-wrap">
            ${imgHtml}
            <div class="project-card__overlay"></div>
            ${p.tag ? '<span class="' + tagClass + '">' + sanitizeText(p.tag) + '</span>' : ''}
          </div>
          <div class="project-card__body">
            ${p.category ? '<span class="project-card__category">' + sanitizeText(p.category) + '</span>' : ''}
            <h3 class="project-card__title">${sanitizeText(p.title || '')}</h3>
            <div class="project-card__meta">
              ${p.client ? '<span class="project-card__meta-item"><strong>Client:</strong> ' + sanitizeText(p.client) + '</span>' : ''}
              ${p.value  ? '<span class="project-card__meta-item"><strong>Value:</strong> '  + sanitizeText(p.value)  + '</span>' : ''}
              ${p.year   ? '<span class="project-card__meta-item"><strong>Year:</strong> '   + sanitizeText(p.year)   + '</span>' : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach image error handlers after innerHTML is set
    grid.querySelectorAll('.project-card__img').forEach(img => {
      img.addEventListener('error', function () {
        this.style.display = 'none';
      }, { once: true });
    });
  }

  function renderWhyUs(config) {
    const section = config.whyUs;
    const grid    = el('.js-why-grid');
    if (!grid) return;
    if (isEmpty(section)) { hideSection('why-us'); return; }

    const headingEl = el('.js-why-heading');
    if (headingEl && config.brand.name) {
      headingEl.textContent = 'The ' + config.brand.name + ' Difference';
    }

    grid.innerHTML = section.items.map(w => `
      <div class="why-card" data-reveal="up">
        <div class="why-card__icon"><i class="${sanitizeText(w.icon || 'ri-checkbox-circle-line')}" aria-hidden="true"></i></div>
        <h3 class="why-card__title">${sanitizeText(w.title || '')}</h3>
        <p  class="why-card__body">${sanitizeText(w.body  || '')}</p>
      </div>
    `).join('');
  }

  function renderGallery(config) {
    const section = config.gallery;
    const grid    = el('.js-gallery-grid');
    if (!grid) return;
    if (isEmpty(section)) { hideSection('gallery'); return; }

    grid.innerHTML = section.items.map((g, i) => {
      const safeHref = sanitizeUrl(g.image) || '';
      const safeSrc  = (g.image && isValidAssetPath(g.image)) ? g.image : '';
      return `
        <a class="gallery__item glightbox"
           href="${safeHref}"
           data-gallery="site-gallery"
           data-description="${sanitizeText(g.caption || '')}"
           aria-label="View ${sanitizeText(g.caption || ('gallery image ' + (i + 1)))}"
           data-reveal="up">
          <img src="${safeSrc}" alt="${sanitizeText(g.caption || '')}" loading="lazy" />
          <div class="gallery__item-overlay">
            <i class="ri-zoom-in-line" aria-hidden="true"></i>
          </div>
          ${g.caption ? '<span class="gallery__item-caption">' + sanitizeText(g.caption) + '</span>' : ''}
        </a>
      `;
    }).join('');

    grid.querySelectorAll('.gallery__item img').forEach(img => {
      img.addEventListener('error', function () {
        this.closest('.gallery__item').hidden = true;
      }, { once: true });
    });

    grid.querySelectorAll('.gallery__item').forEach(item => {
      item.addEventListener('click', () => trackEvent('gallery_open'));
    });
  }

  function renderTestimonials(config) {
    const section = config.testimonials;
    const wrapper = el('.js-testimonials-wrapper');
    if (!wrapper) return;
    if (isEmpty(section)) { hideSection('testimonials'); return; }

    wrapper.innerHTML = section.items.map(t => {
      const hasAvatar = t.avatar && isValidAssetPath(t.avatar);
      const avatarInner = hasAvatar
        ? '<img src="' + t.avatar + '" alt="' + sanitizeText(t.name) + '" />'
        : initials(t.name);

      return `
        <div class="swiper-slide">
          <div class="testimonial-card">
            <i class="ri-double-quotes-l testimonial-card__quote-icon" aria-hidden="true"></i>
            <p class="testimonial-card__text">${sanitizeText(t.quote || '')}</p>
            <div class="testimonial-card__author">
              <div class="testimonial-card__avatar">${avatarInner}</div>
              <div>
                <div class="testimonial-card__name">${sanitizeText(t.name  || '')}</div>
                <div class="testimonial-card__title">${sanitizeText(t.title || '')}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Avatar image error handlers
    wrapper.querySelectorAll('.testimonial-card__avatar img').forEach((img, i) => {
      const name = (section.items[i] || {}).name || '';
      img.addEventListener('error', function () {
        this.parentElement.textContent = initials(name);
      }, { once: true });
    });
  }

  function renderCta(config) {
    const cta = config.cta;
    const b   = config.brand;

    const heading = el('.js-cta-heading');
    const sub     = el('.js-cta-sub');
    const btn     = el('.js-cta-wa-btn');
    const btnLbl  = el('.js-cta-btn-label');

    if (heading) heading.textContent = cta.heading    || '';
    if (sub)     sub.textContent     = cta.subheading || '';

    if (btn) {
      btn.href = buildWaLink(
        'Hello ' + b.name + ', I’d like to start a project with you.',
        config
      );
    }
    if (btnLbl) btnLbl.textContent = cta.buttonLabel || t('ctaButton', config);
  }

  function renderSocialLinks(container, social, config) {
    if (!container || !social) return;

    const links = Object.entries(social)
      .filter(([, url]) => url && url.trim() !== '')
      .map(([platform, url]) => {
        const safeUrl = sanitizeUrl(url);
        if (!safeUrl) return '';
        return `
          <a href="${safeUrl}" class="social-link"
             aria-label="${sanitizeText(socialLabel(platform))} — opens in new tab"
             target="_blank" rel="noopener noreferrer">
            <i class="${sanitizeText(socialIcon(platform))}" aria-hidden="true"></i>
          </a>
        `;
      })
      .filter(Boolean)
      .join('');

    container.innerHTML = links;
  }

  function renderContact(config) {
    const c = config.contact;
    const s = config.social;
    const b = config.brand;

    const listEl = el('.js-contact-list');
    if (listEl) {
      const waLink   = buildWaLink('Hello ' + b.name, config);
      const chatText = t('chatLabel', config);

      const items = [
        c.phone    && { icon: 'ri-phone-line',    label: 'Phone',
          value: '<a href="tel:' + sanitizeUrl('tel:' + c.phone) + '">' + sanitizeText(c.phone) + '</a>' },
        c.whatsapp && { icon: 'ri-whatsapp-line', label: 'WhatsApp',
          value: '<a href="' + waLink + '" target="_blank" rel="noopener">' + sanitizeText(chatText) + '</a>' },
        c.email    && { icon: 'ri-mail-line',     label: 'Email',
          value: '<a href="mailto:' + sanitizeUrl('mailto:' + c.email) + '">' + sanitizeText(c.email) + '</a>' },
        c.address  && { icon: 'ri-map-pin-2-line', label: 'Address',
          value: sanitizeText(c.address) },
      ].filter(Boolean);

      listEl.innerHTML = items.map(i => `
        <li class="contact__list-item">
          <div class="contact__list-icon"><i class="${i.icon}" aria-hidden="true"></i></div>
          <div>
            <div class="contact__list-label">${i.label}</div>
            <div class="contact__list-value">${i.value}</div>
          </div>
        </li>
      `).join('');

      // Track phone clicks
      listEl.querySelectorAll('a[href^="tel:"]').forEach(a => {
        a.addEventListener('click', () => trackEvent('phone_click'));
      });
    }

    const socEl = el('.js-contact-social');
    if (socEl) renderSocialLinks(socEl, s, config);

    const mapEl = el('.js-contact-map');
    if (mapEl) {
      const safeMap = sanitizeUrl(c.mapEmbed);
      if (safeMap) {
        mapEl.innerHTML = '<iframe src="' + safeMap + '" title="Map" allowfullscreen loading="lazy"></iframe>';
      } else {
        mapEl.hidden = true;
      }
    }
  }

  function renderFooter(config) {
    const c = config.contact;
    const s = config.social;
    const b = config.brand;

    const footSocEl = el('.js-footer-social');
    if (footSocEl) renderSocialLinks(footSocEl, s, config);

    const footContactEl = el('.js-footer-contact');
    if (footContactEl) {
      const waLink   = buildWaLink('Hello ' + b.name, config);
      const chatText = t('chatLabel', config);
      footContactEl.innerHTML =
        '<h4 class="footer__col-heading">Contact</h4>' +
        (c.phone   ? '<div class="footer__contact-item"><i class="ri-phone-line"></i><span><a href="tel:' + sanitizeUrl('tel:' + c.phone) + '">' + sanitizeText(c.phone) + '</a></span></div>' : '') +
        (c.email   ? '<div class="footer__contact-item"><i class="ri-mail-line"></i><span><a href="mailto:' + sanitizeUrl('mailto:' + c.email) + '">' + sanitizeText(c.email) + '</a></span></div>' : '') +
        (c.address ? '<div class="footer__contact-item"><i class="ri-map-pin-2-line"></i><span>' + sanitizeText(c.address) + '</span></div>' : '') +
        (c.whatsapp ? '<div class="footer__contact-item"><i class="ri-whatsapp-line"></i><span><a href="' + waLink + '" target="_blank" rel="noopener">' + sanitizeText(chatText) + '</a></span></div>' : '');
    }

    const copyEl = el('.js-footer-copy');
    if (copyEl) {
      const year = new Date().getFullYear();
      copyEl.textContent = '© ' + year + ' ' + (b.name || 'Company') + '. All rights reserved.';
    }
  }

  function renderAll(config) {
    injectBrandText(config);
    injectLogo(config);
    renderHero(config);
    renderAbout(config);
    renderServices(config);
    renderStats(config);
    renderProjects(config);
    renderWhyUs(config);
    renderGallery(config);
    renderTestimonials(config);
    renderCta(config);
    renderContact(config);
    renderFooter(config);
  }

  /* ==========================================================
     SECTION 16 — INTERACTIONS
  ========================================================== */

  function initContactForm(config) {
    const form = document.getElementById('contact-form');
    if (!form) return;

    // Apply locale strings to form fields
    const nameInput  = form.querySelector('[name="name"]');
    const emailInput = form.querySelector('[name="email"]');
    const phoneInput = form.querySelector('[name="phone"]');
    const msgInput   = form.querySelector('[name="message"]');
    const submitBtn  = form.querySelector('[type="submit"] span, [type="submit"]');

    if (nameInput)  nameInput.placeholder  = t('formPlaceholderName',    config);
    if (emailInput) emailInput.placeholder = t('formPlaceholderEmail',   config);
    if (phoneInput) phoneInput.placeholder = t('formPlaceholderPhone',   config);
    if (msgInput)   msgInput.placeholder   = t('formPlaceholderMessage', config);

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      let valid = true;
      form.querySelectorAll('[required]').forEach(field => {
        field.classList.remove('is-invalid');
        if (!field.value.trim()) { field.classList.add('is-invalid'); valid = false; }
      });
      if (!valid) return;

      const name    = (form.querySelector('[name="name"]')    || {}).value || '';
      const phone   = (form.querySelector('[name="phone"]')   || {}).value || '';
      const message = (form.querySelector('[name="message"]') || {}).value || '';

      const waMsg = 'Hello, my name is ' + name + '.' +
        (phone ? ' My number is ' + phone + '.' : '') + ' ' + message;

      const waUrl = buildWaLink(waMsg, config);
      if (waUrl !== '#') window.open(waUrl, '_blank', 'noopener');

      trackEvent('form_submit');
      form.reset();
    });
  }

  function initPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    document.body.classList.add('is-loading');

    const bar     = preloader.querySelector('.pre__bar');
    const counter = preloader.querySelector('.pre__count');
    let progress  = 0;

    const tick = setInterval(() => {
      progress = Math.min(progress + Math.random() * 18 + 5, 95);
      if (bar)     bar.style.width     = progress + '%';
      if (counter) counter.textContent = Math.round(progress) + '%';
    }, 120);

    function dismiss() {
      clearInterval(tick);
      if (bar)     bar.style.width     = '100%';
      if (counter) counter.textContent = '100%';
      setTimeout(() => {
        preloader.classList.add('is-done');
        document.body.classList.remove('is-loading');
        setTimeout(() => preloader.remove(), 700);
      }, 300);
    }

    const maxTimer = setTimeout(dismiss, 2200);
    window.addEventListener('load', () => { clearTimeout(maxTimer); dismiss(); }, { once: true });
  }

  function initLenis() {
    if (typeof Lenis === 'undefined') return;
    const lenis = new Lenis({ lerp: 0.10, smoothWheel: true });
    window.__lenis = lenis;

    if (typeof gsap !== 'undefined') {
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }

    document.addEventListener('mobile-nav-open',  () => lenis.stop());
    document.addEventListener('mobile-nav-close', () => lenis.start());
  }

  function initCursor() {
    const dot  = el('.cursor__dot');
    const ring = el('.cursor__ring');
    if (!dot || !ring) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

    let mouse = { x: 0, y: 0 };
    let ringPos = { x: 0, y: 0 };

    document.addEventListener('mousemove', e => {
      mouse.x     = e.clientX;
      mouse.y     = e.clientY;
      dot.style.left = e.clientX + 'px';
      dot.style.top  = e.clientY + 'px';
    });

    function animRing() {
      ringPos.x += (mouse.x - ringPos.x) * 0.13;
      ringPos.y += (mouse.y - ringPos.y) * 0.13;
      ring.style.left = ringPos.x + 'px';
      ring.style.top  = ringPos.y + 'px';
      requestAnimationFrame(animRing);
    }
    animRing();

    const hoverTargets = 'a, button, [role="button"], input, textarea, select, label, .gallery__item, .project-card, .service-card, .magnetic';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(hoverTargets)) ring.classList.add('is-hovering');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(hoverTargets)) ring.classList.remove('is-hovering');
    });
  }

  function initHeader() {
    const header  = document.getElementById('header');
    const burger  = el('.header__burger');
    const mNav    = document.getElementById('mobile-nav');
    const overlay = el('.mobile-nav__overlay');
    const closeBtn= el('.mobile-nav__close');
    if (!header) return;

    function onScroll() {
      header.classList.toggle('scrolled', window.scrollY > 60);
      const btt = document.getElementById('back-to-top');
      if (btt) btt.classList.toggle('is-visible', window.scrollY > 500);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function openNav() {
      if (!mNav) return;
      mNav.classList.add('is-open');
      mNav.setAttribute('aria-hidden', 'false');
      if (overlay) overlay.classList.add('is-visible');
      if (burger)  burger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      document.dispatchEvent(new Event('mobile-nav-open'));
    }

    function closeNav() {
      if (!mNav) return;
      mNav.classList.remove('is-open');
      mNav.setAttribute('aria-hidden', 'true');
      if (overlay) overlay.classList.remove('is-visible');
      if (burger)  burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      document.dispatchEvent(new Event('mobile-nav-close'));
    }

    if (burger)   burger.addEventListener('click', openNav);
    if (closeBtn) closeBtn.addEventListener('click', closeNav);
    if (overlay)  overlay.addEventListener('click', closeNav);

    els('.mobile-nav__link').forEach(link => link.addEventListener('click', closeNav));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mNav && mNav.classList.contains('is-open')) closeNav();
    });
  }

  function initBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (window.__lenis) {
        window.__lenis.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  /* ==========================================================
     SECTION 17 — ANIMATIONS
     All skipped in screenshot mode.
  ========================================================== */

  function initHeroEntrance() {
    if (typeof gsap === 'undefined') return;

    const heroTitle = el('.hero__title');
    if (heroTitle && typeof Splitting !== 'undefined') {
      const lines = heroTitle.querySelectorAll('.hero__title-line, .hero__title-em');
      lines.forEach(line => {
        const inner = document.createElement('span');
        inner.className   = 'word-inner';
        inner.textContent = line.textContent;
        line.textContent  = '';
        line.appendChild(inner);
      });
      gsap.from('.hero__title-line .word-inner, .hero__title-em .word-inner', {
        yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.12, delay: 0.4,
      });
    } else if (heroTitle) {
      gsap.from(heroTitle, { yPercent: 20, opacity: 0, duration: 1, delay: 0.5, ease: 'power3.out' });
    }

    gsap.from(['.hero__eyeline', '.hero__sub', '.hero__actions', '.hero__badges'], {
      y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1, delay: 0.7,
    });
    gsap.from('.hero__scroll-hint', { opacity: 0, duration: 0.8, delay: 1.4, ease: 'power2.out' });
  }

  function initRevealAnimations() {
    if (typeof gsap === 'undefined') {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      els('[data-reveal]').forEach(el => observer.observe(el));
      return;
    }

    if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

    els('[data-reveal]').forEach(target => {
      const dir  = target.getAttribute('data-reveal');
      const from = { opacity: 0 };
      if (dir === 'up')    from.y     =  40;
      if (dir === 'down')  from.y     = -40;
      if (dir === 'left')  from.x     = -50;
      if (dir === 'right') from.x     =  50;
      if (dir === 'scale') from.scale = 0.93;

      gsap.from(target, {
        ...from,
        duration: 0.85,
        ease: 'power3.out',
        onStart()    { target.style.willChange = 'transform, opacity'; },
        onComplete() { target.style.willChange = 'auto'; },
        scrollTrigger: { trigger: target, start: 'top 88%', once: true },
      });
    });
  }

  function initMagneticButtons() {
    const magnets  = els('.magnetic');
    if (!magnets.length) return;
    const useGsap  = typeof gsap !== 'undefined';

    magnets.forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const rect = btn.getBoundingClientRect();
        const dx   = (e.clientX - rect.left - rect.width  / 2) * 0.28;
        const dy   = (e.clientY - rect.top  - rect.height / 2) * 0.28;
        if (useGsap) {
          gsap.to(btn, { x: dx, y: dy, duration: 0.35, ease: 'power2.out' });
        } else {
          btn.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (useGsap) {
          gsap.to(btn, { x: 0, y: 0, duration: 0.55, ease: 'elastic.out(1, 0.5)' });
        } else {
          btn.style.transform = '';
        }
      });
    });
  }

  function initStatsCounter(instant) {
    const counters = els('.stat-item__value[data-target]');
    if (!counters.length) return;

    if (instant) {
      // Screenshot mode: show final values immediately
      counters.forEach(el => {
        const target = parseFloat(el.getAttribute('data-target'));
        const suffix = el.getAttribute('data-suffix') || '';
        const isFloat = target % 1 !== 0;
        el.textContent = (isFloat ? target.toFixed(1) : target) + suffix;
      });
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);

        const el      = entry.target;
        const target  = parseFloat(el.getAttribute('data-target'));
        const suffix  = el.getAttribute('data-suffix') || '';
        const isFloat = target % 1 !== 0;
        const dur     = 1600;
        const start   = Date.now();

        function update() {
          const progress = Math.min((Date.now() - start) / dur, 1);
          const eased    = 1 - Math.pow(1 - progress, 3);
          el.textContent = (isFloat ? (target * eased).toFixed(1) : Math.round(target * eased)) + suffix;
          if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
      });
    }, { threshold: 0.4 });

    counters.forEach(c => io.observe(c));
  }

  function initSwiper(noAutoplay) {
    if (typeof Swiper === 'undefined') return;
    const swiperEl = el('.testimonials__swiper');
    if (!swiperEl) return;

    new Swiper('.testimonials__swiper', {
      slidesPerView: 1,
      spaceBetween:  24,
      loop:          true,
      autoplay:      noAutoplay ? false : { delay: 5500, disableOnInteraction: false },
      pagination: { el: '.testimonials__pagination', clickable: true },
      breakpoints: {
        640:  { slidesPerView: 1 },
        768:  { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
    });
  }

  function initLightbox() {
    if (typeof GLightbox === 'undefined') return;
    if (!el('.glightbox')) return;
    GLightbox({ selector: '.glightbox', touchNavigation: true, loop: true, openEffect: 'zoom', closeEffect: 'fade' });
  }

  /* ==========================================================
     SECTION 18 — MAIN ENTRY POINT
  ========================================================== */

  document.addEventListener('DOMContentLoaded', async function () {

    // Screenshot mode: skip preloader, run CSS-only (class already set in <head>)
    if (isScreenshotMode) {
      const preloader = document.getElementById('preloader');
      if (preloader) preloader.hidden = true;
    } else {
      initPreloader();
    }

    const config = await loadCompany();
    if (!config) return; // renderErrorState already shown

    // Expose config for debugging and future dashboard use
    window.COMPANY = config;

    injectBrandTokens(config);
    applyMeta(config);

    const statusResult = handleStatus(config);
    if (statusResult === 'archived') return; // archived screen shown, stop

    renderAll(config);
    initContactForm(config);
    trackEvent('page_loaded', { status: config.status });

    if (isScreenshotMode) {
      // Instantly reveal all animated elements for clean screenshot capture
      els('[data-reveal]').forEach(target => {
        target.style.opacity   = '1';
        target.style.transform = 'none';
      });
      initStatsCounter(true);
      initSwiper(true);
      initLightbox();
      return; // skip all animations and interactions
    }

    requestAnimationFrame(function () {
      initLenis();
      initCursor();
      initHeader();
      initBackToTop();
      initRevealAnimations();
      initMagneticButtons();
      initStatsCounter(false);
      initSwiper(false);
      initLightbox();
      initHeroEntrance();
    });
  });

})();
