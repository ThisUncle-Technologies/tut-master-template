'use strict';

// Port of validateConfig() from js/main.js for use in Node.js generation tools.
// Identical rules — no DOM, no console output; returns { valid, warnings } instead.

function isValidAssetPath(str) {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim();
  return /^https?:\/\//.test(s) || /^[a-zA-Z0-9._\-\/]+$/.test(s);
}

function validateConfig(config) {
  const warnings = [];
  function warn(msg) { warnings.push(msg); }

  if (!config.brand || !config.brand.name)
    warn('brand.name is required');
  if (!config.brand || !config.brand.accent)
    warn('brand.accent is required');
  if (!config.hero || !config.hero.headline)
    warn('hero.headline is required');
  if (!config.hero || !config.hero.subheadline)
    warn('hero.subheadline is required');
  if (!config.contact || !config.contact.whatsapp)
    warn('contact.whatsapp is required — WhatsApp CTAs will be disabled');

  if (config.status && !['draft', 'published', 'archived'].includes(config.status))
    warn('status "' + config.status + '" is not valid — must be draft, published, or archived');

  if (config.locale && !['en-TZ', 'sw-TZ'].includes(config.locale))
    warn('locale "' + config.locale + '" is not supported — will fall back to en-TZ');

  if (config.contact && config.contact.whatsapp &&
      !/^[0-9]{10,15}$/.test(config.contact.whatsapp))
    warn('contact.whatsapp should be digits only (10-15 digits), no + or spaces');

  if (config.hero && config.hero.bgImage && !isValidAssetPath(config.hero.bgImage))
    warn('hero.bgImage "' + config.hero.bgImage + '" appears invalid');

  if (config.about && config.about.image && !isValidAssetPath(config.about.image))
    warn('about.image "' + config.about.image + '" appears invalid');

  if (!config.configVersion)
    warn('configVersion is missing');

  return { valid: warnings.length === 0, warnings };
}

module.exports = { validateConfig };
