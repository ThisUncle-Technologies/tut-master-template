'use strict';

// Keyword → industry mapping.
// Checked against: lead.name + lead.services[] + lead.notes (all lowercased).
// First match wins. Falls back to "general" if nothing matches.
const INDUSTRY_KEYWORDS = {
  construction: [
    'builder', 'build', 'construct', 'civil', 'renovati', 'architect',
    'contractor', 'tile', 'tiling', 'plumbing', 'masonry', 'fundi',
    'ujenzi', 'real estate', 'property', 'roofing', 'carpentry', 'concrete',
  ],
  logistics: [
    'logistic', 'freight', 'transport', 'shipping', 'supply chain',
    'delivery', 'courier', 'haulage', 'cargo', 'clearance', 'forwarding',
    'usafirishaji', 'warehouse', 'distributor', 'clearing',
  ],
  consultancy: [
    'consult', 'advisory', 'strategy', 'analyst', 'research', 'evaluation',
    'policy', 'management consult', 'monitoring', 'm&e', 'advisory partner',
  ],
  healthcare: [
    'hospital', 'clinic', 'medical', 'health', 'pharma', 'doctor',
    'dental', 'nursing', 'laboratory', 'lab', 'afya', 'dispensary',
  ],
  education: [
    'school', 'college', 'university', 'academy', 'training centre',
    'institute', 'education', 'learning', 'shule', 'chuo', 'tutoring',
  ],
  trading: [
    'trading', 'general trade', 'import', 'export', 'wholesale', 'retail',
    'general merchant', 'biashara', 'hardware', 'supermarket', 'general supplier',
  ],
  engineering: [
    'engineer', 'electrical', 'mechanical', 'structural engineering',
    'surveying', 'ict solution', 'software', 'tech solution', 'it service',
  ],
  corporate: [
    'group', 'holding', 'investment', 'finance', 'bank', 'insurance',
    'assurance', 'capital', 'asset management',
  ],
};

function inferIndustry(lead) {
  // Honour an explicitly set industry field first
  if (lead.industry && INDUSTRY_KEYWORDS[lead.industry]) return lead.industry;

  const haystack = [
    lead.name              || '',
    (lead.services || []).join(' '),
    lead.notes             || '',
  ].join(' ').toLowerCase();

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    for (const kw of keywords) {
      if (haystack.includes(kw.toLowerCase())) return industry;
    }
  }

  return 'general';
}

module.exports = { inferIndustry };
