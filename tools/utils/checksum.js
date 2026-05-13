'use strict';

// FNV-1a 32-bit hash. Matches the implementation in js/main.js exactly.
// Used so the browser can verify config integrity if needed in future.
function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash  = (hash * 16777619) >>> 0;
  }
  return hash.toString(16);
}

// Computes a checksum over the content fields of a config object.
// Excludes internal block, timestamps, and the checksum field itself
// so the checksum only changes when visible content changes.
function computeChecksum(config) {
  const content = {
    brand:        config.brand,
    hero:         config.hero,
    about:        config.about,
    services:     config.services,
    projects:     config.projects,
    stats:        config.stats,
    whyUs:        config.whyUs,
    gallery:      config.gallery,
    testimonials: config.testimonials,
    contact:      config.contact,
    social:       config.social,
    cta:          config.cta,
  };
  return fnv1a(JSON.stringify(content));
}

module.exports = { fnv1a, computeChecksum };
