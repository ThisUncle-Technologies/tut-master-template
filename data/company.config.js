// ============================================================
//  TUT MASTER TEMPLATE — COMPANY CONFIG
//  ✏️  Edit ONLY this file to customise the site for a new client.
//  Every section reads from this object.
//  Leave an array empty ([]) or a string empty ('') to hide
//  the corresponding section automatically.
// ============================================================

const COMPANY = {

  /* ── META ──────────────────────────────────────────────────── */
  meta: {
    seoTitle:       'Karimjee Builders Ltd | Construction & Civil Engineering — Tanzania',
    seoDescription: 'Award-winning construction and civil engineering firm delivering government-tendered and private projects across Tanzania since 2008.',
    favicon:        '',   // e.g. 'assets/images/favicon.png'
  },

  /* ── BRAND ─────────────────────────────────────────────────── */
  brand: {
    name:       'Karimjee Builders',
    tagline:    'Building Tanzania\'s Future',
    subTagline: 'Government-Tendered Construction & Civil Engineering',
    logo:       '',           // image path — leave empty to use text logo
    accent:     '#C9431B',    // primary accent colour (buttons, highlights)
    accentAlt:  '#E05C2A',    // hover/gradient variant
    bgDark:     '#080808',    // dark section background
    textLight:  '#EDE8DE',    // text colour on dark backgrounds
  },

  /* ── HERO ──────────────────────────────────────────────────── */
  hero: {
    headline:    'Building Tanzania\'s',
    headlineEm:  'Infrastructure',
    subheadline: 'We deliver government-tendered construction projects on time, on budget, and to the highest standard — across mainland Tanzania and Zanzibar.',
    bgImage:     'assets/images/hero.jpg',  // full-bleed background image
    bgVideo:     '',   // path to .mp4 — if set, overrides bgImage
    ctaPrimary:  { label: 'WhatsApp Us Now',   type: 'whatsapp' },
    ctaSecondary:{ label: 'View Our Projects', href: '#projects' },
    badges: [
      { value: '15+',  label: 'Years Experience'          },
      { value: '120+', label: 'Projects Completed'        },
      { value: 'CRB',  label: 'Class I Registered'        },
    ],
  },

  /* ── ABOUT ─────────────────────────────────────────────────── */
  about: {
    heading: 'Built on Trust,\nDelivered with Precision',
    body: [
      'Karimjee Builders Limited is a Dar es Salaam-based construction and civil engineering firm with over 15 years of experience delivering roads, buildings, water infrastructure, and government-tendered projects across Tanzania.',
      'We combine seasoned local expertise with international construction standards to deliver every project on time and within budget. Our compliance record, technical capacity, and financial standing make us a preferred partner for government agencies, NGOs, and private developers.',
    ],
    image: 'assets/images/about.jpg',
    director: {
      name:  'Eng. Rashid Karimjee',
      title: 'Managing Director & Lead Engineer',
      photo: 'assets/images/director.jpg',
      quote: 'Every structure we build is a commitment to the communities that will use it for generations.',
    },
  },

  /* ── SERVICES ──────────────────────────────────────────────── */
  services: [
    {
      icon:  'ri-building-2-line',
      title: 'Civil Construction',
      body:  'Roads, bridges, drainage systems, and public infrastructure delivered to TANROADS and municipal standards.',
    },
    {
      icon:  'ri-home-gear-line',
      title: 'Building Works',
      body:  'Commercial, residential, and institutional buildings — from foundation to finishing.',
    },
    {
      icon:  'ri-water-flash-line',
      title: 'Water & Sanitation',
      body:  'Boreholes, piped water systems, and sanitation facilities for rural and urban communities.',
    },
    {
      icon:  'ri-tools-line',
      title: 'Renovation & Retrofitting',
      body:  'Structural upgrades, MEP works, and full building renovation for existing facilities.',
    },
    {
      icon:  'ri-shield-check-line',
      title: 'Project Management',
      body:  'End-to-end project supervision, BOQ preparation, and contractor coordination.',
    },
    {
      icon:  'ri-file-list-3-line',
      title: 'Tender Preparation',
      body:  'Technical and financial tender documentation for government and donor-funded projects.',
    },
  ],

  /* ── PROJECTS / TENDER HIGHLIGHTS ────────────────────────── */
  projects: [
    {
      title:    'Kigamboni Road Rehabilitation',
      category: 'Road Infrastructure',
      client:   'Dar es Salaam City Council',
      value:    'TZS 2.4 Billion',
      year:     '2023',
      image:    'assets/images/project-1.jpg',
      tag:      'Completed',
    },
    {
      title:    'Mtwara District Hospital Extension',
      category: 'Healthcare Infrastructure',
      client:   'Ministry of Health',
      value:    'TZS 1.8 Billion',
      year:     '2022',
      image:    'assets/images/project-2.jpg',
      tag:      'Completed',
    },
    {
      title:    'Kilosa Water Supply Scheme',
      category: 'Water & Sanitation',
      client:   'DAWASA / World Bank',
      value:    'TZS 950 Million',
      year:     '2024',
      image:    'assets/images/project-3.jpg',
      tag:      'Ongoing',
    },
    {
      title:    'Arusha Teachers\' Housing',
      category: 'Residential Construction',
      client:   'Ministry of Education',
      value:    'TZS 1.1 Billion',
      year:     '2021',
      image:    'assets/images/project-4.jpg',
      tag:      'Completed',
    },
  ],

  /* ── STATS ────────────────────────────────────────────────── */
  stats: [
    { value: 15,  suffix: '+',  label: 'Years in Business'      },
    { value: 120, suffix: '+',  label: 'Projects Completed'     },
    { value: 6.8, suffix: 'B+', label: 'Tenders Awarded (TZS)'  },
    { value: 300, suffix: '+',  label: 'Workers Employed'       },
  ],

  /* ── WHY CHOOSE US ────────────────────────────────────────── */
  whyUs: [
    {
      icon:  'ri-award-line',
      title: 'Government-Registered',
      body:  'Fully registered with BRELA, TRA, PPRA, and CRB Class I contractor status.',
    },
    {
      icon:  'ri-timer-line',
      title: 'On-Time Delivery',
      body:  'We have a 96% on-schedule delivery rate across all completed contracts.',
    },
    {
      icon:  'ri-map-pin-2-line',
      title: 'Local Expertise',
      body:  'Deep knowledge of Tanzania\'s terrain, regulations, and supply chains.',
    },
    {
      icon:  'ri-team-line',
      title: 'Qualified Team',
      body:  'In-house engineers, quantity surveyors, and site managers on every project.',
    },
    {
      icon:  'ri-bank-line',
      title: 'Financial Standing',
      body:  'Able to mobilise and self-fund projects while awaiting stage payments.',
    },
    {
      icon:  'ri-shield-star-line',
      title: 'ISO & Safety Certified',
      body:  'ISO 9001:2015 certified. Zero-fatality record across 15 years of operations.',
    },
  ],

  /* ── GALLERY ──────────────────────────────────────────────── */
  gallery: [
    { image: 'assets/images/gallery-1.jpg', caption: 'Kigamboni road works in progress'    },
    { image: 'assets/images/gallery-2.jpg', caption: 'Hospital extension structural works' },
    { image: 'assets/images/gallery-3.jpg', caption: 'Water pipeline installation'         },
    { image: 'assets/images/gallery-4.jpg', caption: 'Residential housing units'           },
    { image: 'assets/images/gallery-5.jpg', caption: 'Bridge abutment construction'        },
    { image: 'assets/images/gallery-6.jpg', caption: 'Heavy machinery on site'             },
  ],

  /* ── TESTIMONIALS ─────────────────────────────────────────── */
  testimonials: [
    {
      quote:  'Karimjee Builders delivered our road project three weeks ahead of schedule and under budget. We will be awarding them future tenders without hesitation.',
      name:   'Eng. Peter Msola',
      title:  'Director of Infrastructure, Dar es Salaam City Council',
      avatar: '',
    },
    {
      quote:  'Professional, compliant, and communicative. The hospital extension was completed to an exceptional standard. A reliable partner for any government project.',
      name:   'Dr. Amina Nyundo',
      title:  'Regional Medical Officer, Mtwara Region',
      avatar: '',
    },
    {
      quote:  'From documentation to completion, Karimjee demonstrated the kind of competence and integrity we look for in construction partners.',
      name:   'James Rutabingwa',
      title:  'Project Coordinator, World Bank Tanzania',
      avatar: '',
    },
  ],

  /* ── CONTACT ──────────────────────────────────────────────── */
  contact: {
    phone:    '+255 754 123 456',
    whatsapp: '255754123456',   // digits only — no +, spaces, or dashes
    email:    'info@karimjeebuilders.co.tz',
    address:  'Plot 45, Msasani Peninsula, Dar es Salaam, Tanzania',
    mapEmbed: '',   // Google Maps embed src URL — optional
  },

  /* ── SOCIAL ───────────────────────────────────────────────── */
  social: {
    facebook:  'https://facebook.com',
    instagram: 'https://instagram.com',
    linkedin:  'https://linkedin.com',
    twitter:   '',
    youtube:   '',
  },

  /* ── CTA BANNER ───────────────────────────────────────────── */
  cta: {
    heading:     'Ready to Build Something Great?',
    subheading:  'Send us a message on WhatsApp and we\'ll respond within the hour.',
    buttonLabel: 'Start a Conversation',
  },

};
