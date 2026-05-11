// ============================================================
//  TUT MASTER TEMPLATE — CONSULTANCY / PROFESSIONAL SERVICES
//  Sample: Kilimanjaro Advisory Partners
//  To use: rename this file to company.config.js
// ============================================================

const COMPANY = {

  meta: {
    seoTitle:       'Kilimanjaro Advisory Partners | Management Consulting & Strategy — Tanzania',
    seoDescription: 'Tanzania\'s premier management consulting firm. Business strategy, M&E, grant management, public sector advisory, and organisational development.',
    favicon:        '',
  },

  brand: {
    name:       'Kilimanjaro Advisory',
    tagline:    'Clarity. Strategy. Results.',
    subTagline: 'Management Consulting & Public Sector Advisory',
    logo:       '',
    accent:     '#2D5A27',   // deep forest green — authority, growth
    accentAlt:  '#3D7A35',
    bgDark:     '#0B120A',
    textLight:  '#EBF0EA',
  },

  hero: {
    headline:    'Strategy That Drives',
    headlineEm:  'Real Results',
    subheadline: 'We partner with Tanzanian businesses, NGOs, and government agencies to solve complex problems, improve performance, and deliver measurable impact.',
    bgImage:     'assets/images/hero.jpg',
    bgVideo:     '',
    ctaPrimary:  { label: 'Book a Free Consultation', type: 'whatsapp' },
    ctaSecondary:{ label: 'Our Practice Areas',       href: '#services' },
    badges: [
      { value: '12+',  label: 'Years Advisory Experience' },
      { value: '80+',  label: 'Clients Served'            },
      { value: 'NBAA', label: 'Registered Firm'           },
    ],
  },

  about: {
    heading: 'Trusted Advisors to\nTanzania\'s Leading Organisations',
    body: [
      'Kilimanjaro Advisory Partners is a Tanzanian management consulting firm with over 12 years of experience advising corporations, development agencies, NGOs, and government institutions across East Africa.',
      'Our multidisciplinary team of economists, business analysts, M&E specialists, and public policy experts brings world-class advisory rigour with deep local context — a combination that delivers strategies you can actually implement.',
    ],
    image: 'assets/images/about.jpg',
    director: {
      name:  'Dr. Beatrice Mwalimu',
      title: 'Founding Partner & Lead Strategist',
      photo: 'assets/images/director.jpg',
      quote: 'Good strategy doesn\'t just answer the question you asked — it uncovers the question you should have asked.',
    },
  },

  services: [
    { icon: 'ri-line-chart-line',   title: 'Business Strategy',           body: 'Market entry, competitive analysis, growth planning, and strategic roadmap development for SMEs and corporates.' },
    { icon: 'ri-government-line',   title: 'Public Sector Advisory',      body: 'Policy development, institutional strengthening, performance management, and reform support for government agencies.' },
    { icon: 'ri-bar-chart-2-line',  title: 'Monitoring & Evaluation',     body: 'M&E framework design, baseline surveys, midterm and final evaluations for development programmes and NGO projects.' },
    { icon: 'ri-funds-line',        title: 'Grant & Fund Management',     body: 'Technical assistance for donor-funded projects including EU, USAID, World Bank, and UN system programmes.' },
    { icon: 'ri-team-line',         title: 'Organisational Development',  body: 'HR strategy, structural reviews, capacity building, and leadership development for growing organisations.' },
    { icon: 'ri-search-eye-line',   title: 'Research & Market Studies',   body: 'Feasibility studies, market surveys, financial modelling, and investment due diligence across sectors.' },
  ],

  projects: [
    { title: 'Tanzania Revenue Authority Capacity Review',   category: 'Public Sector Advisory', client: 'TRA / GIZ',                 value: 'USD 280,000',    year: '2023', image: 'assets/images/project-1.jpg', tag: 'Completed' },
    { title: 'USAID TUHIFADHI Programme M&E',                category: 'Monitoring & Evaluation',client: 'USAID Tanzania',             value: 'USD 145,000',    year: '2024', image: 'assets/images/project-2.jpg', tag: 'Ongoing'   },
    { title: 'Agribusiness Investment Strategy — SAGCOT',    category: 'Business Strategy',       client: 'SAGCOT Centre Ltd',         value: 'USD 95,000',     year: '2022', image: 'assets/images/project-3.jpg', tag: 'Completed' },
    { title: 'SME Growth Programme — NMB Foundation',        category: 'Capacity Development',    client: 'NMB Foundation',            value: 'TZS 320 Million', year: '2023', image: 'assets/images/project-4.jpg', tag: 'Completed' },
  ],

  stats: [
    { value: 12,  suffix: '+',  label: 'Years of Practice'       },
    { value: 80,  suffix: '+',  label: 'Clients Served'          },
    { value: 4.2, suffix: 'M+', label: 'USD in Projects Managed' },
    { value: 95,  suffix: '%',  label: 'Client Retention Rate'   },
  ],

  whyUs: [
    { icon: 'ri-lightbulb-flash-line', title: 'Independent Perspective',   body: 'We bring objective, evidence-based analysis free from internal politics or vested interests.' },
    { icon: 'ri-earth-line',           title: 'International Standards',   body: 'Our methodologies are grounded in international best practice and adapted for the Tanzanian context.' },
    { icon: 'ri-user-star-line',       title: 'Senior-Led Delivery',       body: 'Every engagement is led by a Partner, not delegated to junior staff. You get our best people, always.' },
    { icon: 'ri-file-shield-2-line',   title: 'Confidential & Ethical',    body: 'We maintain strict client confidentiality and operate under a rigorous professional code of conduct.' },
    { icon: 'ri-clipboard-line',       title: 'Actionable Deliverables',   body: 'Our reports are written to be used, not filed. We prioritise clarity, prioritisation, and implementation readiness.' },
    { icon: 'ri-building-4-line',      title: 'Donor-Familiar',            body: 'Experienced with EU, USAID, World Bank, AfDB, UN, and bilateral donor reporting requirements.' },
  ],

  gallery: [
    { image: 'assets/images/gallery-1.jpg', caption: 'Strategic planning retreat — Arusha'          },
    { image: 'assets/images/gallery-2.jpg', caption: 'M&E training workshop — Dodoma'               },
    { image: 'assets/images/gallery-3.jpg', caption: 'Client presentation — boardroom'              },
    { image: 'assets/images/gallery-4.jpg', caption: 'Community validation focus group'             },
    { image: 'assets/images/gallery-5.jpg', caption: 'Policy forum — Dar es Salaam'                 },
    { image: 'assets/images/gallery-6.jpg', caption: 'Field data collection — Mbeya Region'         },
  ],

  testimonials: [
    { quote: 'Kilimanjaro Advisory delivered an M&E framework that genuinely changed how we track programme impact. Professional, thorough, and easy to work with.', name: 'Sarah Mensah',       title: 'Country Director, ActionAid Tanzania',          avatar: '' },
    { quote: 'Their strategic review of our operations identified inefficiencies we had ignored for years. The implementation roadmap they provided was worth every shilling.', name: 'Mohamed Kamau',   title: 'CEO, Pan African Commodities Ltd',               avatar: '' },
    { quote: 'We engaged KAP for a sensitive public sector review. Their discretion, technical depth, and delivery quality exceeded expectations significantly.', name: 'Commissioner A. Diallo', title: 'Director General, Tanzania Revenue Authority', avatar: '' },
  ],

  contact: {
    phone:    '+255 762 987 654',
    whatsapp: '255762987654',
    email:    'advisory@kilimanjaroadvisory.co.tz',
    address:  'Golden Jubilee Towers, Ohio Street, Dar es Salaam, Tanzania',
    mapEmbed: '',
  },

  social: {
    facebook:  '',
    instagram: '',
    linkedin:  'https://linkedin.com',
    twitter:   'https://twitter.com',
    youtube:   '',
  },

  cta: {
    heading:     'Facing a Complex Challenge?',
    subheading:  'Book a free 30-minute consultation and let\'s explore how we can help.',
    buttonLabel: 'Book a Consultation',
  },

};
