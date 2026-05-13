'use strict';

// Brand token defaults per industry.
// Each industry has a distinct colour palette that sets the visual mood
// of the generated demo site without any manual input from the sales rep.
const INDUSTRY_BRAND = {
  construction: { accent: '#C9431B', accentAlt: '#E05C2A', bgDark: '#0D0500', textLight: '#F0EAE0' },
  logistics:    { accent: '#1B5E8C', accentAlt: '#2074A8', bgDark: '#060C14', textLight: '#E8F0F8' },
  consultancy:  { accent: '#2D5A27', accentAlt: '#3D7A35', bgDark: '#0B120A', textLight: '#EBF0EA' },
  healthcare:   { accent: '#1A6B52', accentAlt: '#228C6B', bgDark: '#050F0B', textLight: '#E8F5F0' },
  education:    { accent: '#2A3D8C', accentAlt: '#3A52B8', bgDark: '#050814', textLight: '#E8EBF8' },
  trading:      { accent: '#8C5A1A', accentAlt: '#B07225', bgDark: '#0D0800', textLight: '#F5EDD8' },
  engineering:  { accent: '#3D3D3D', accentAlt: '#5A5A5A', bgDark: '#080808', textLight: '#EBEBEB' },
  corporate:    { accent: '#1A2A5E', accentAlt: '#253978', bgDark: '#060810', textLight: '#E8EBF5' },
  general:      { accent: '#C9431B', accentAlt: '#E05C2A', bgDark: '#080808', textLight: '#EDE8DE' },
};

module.exports = { INDUSTRY_BRAND };
