'use strict';

// Converts a company name into a URL-safe kebab-case slug.
// "Karibu Builders Ltd." → "karibu-builders-ltd"
function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

module.exports = { slugify };
