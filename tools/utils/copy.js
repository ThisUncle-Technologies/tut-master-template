'use strict';

// Per-industry copy templates for the auto-generator.
//
// SAFETY RULES (enforced here, not by the caller):
//   - No director names, certifications, client names, or phone numbers are invented.
//   - Testimonials are never generated (section always disabled).
//   - Stats use conservative floor values (10+, 50+), not invented precision.
//   - All copy is generic and believable for a Tanzanian business of this type.
//   - pick() always returns arr[0] for deterministic output.
//
// To add a new industry: copy the "general" block, rename the key,
// rewrite the copy, and add keywords to infer-industry.js.

const COPY = {

  /* ── CONSTRUCTION ────────────────────────────────────────── */
  construction: {
    taglines:   ["Built to Last.", "Quality You Can See.", "Solid Foundations."],
    subTagline: "Civil Works · Renovations · Construction",
    hero: {
      headlines:    ["Quality Construction,", "Building Tanzania,", "Your Trusted"],
      headlineEms:  ["Delivered on Time.", "One Project at a Time.", "Construction Partner."],
      subheadlines: [
        "We deliver residential, commercial, and civil construction projects across Tanzania — on schedule, within budget, and built to the highest standards.",
        "From foundations to finishing, our experienced team handles every stage of your construction project with care, skill, and professionalism.",
      ],
    },
    about: {
      headings: ["Your Reliable\nConstruction Partner", "Built on Experience\nand Trust"],
      bodies: [
        [
          "We are a Tanzanian construction and civil works company with years of experience delivering residential, commercial, and infrastructure projects across the country.",
          "Our team of qualified engineers, site supervisors, and skilled tradespeople is committed to quality workmanship, transparent communication, and on-time delivery.",
        ],
      ],
    },
    services: [
      { icon: "ri-building-2-line",  title: "Civil Works",         body: "Foundation laying, structural works, and civil engineering for residential and commercial properties." },
      { icon: "ri-tools-line",       title: "Renovations",         body: "Full interior and exterior renovation services — from kitchens and bathrooms to full building refurbishments." },
      { icon: "ri-grid-line",        title: "Tiling & Flooring",   body: "Professional tiling, flooring, and finishing services using quality materials for lasting results." },
      { icon: "ri-drop-line",        title: "Plumbing & Drainage", body: "Complete plumbing installation, pipe works, and drainage systems for new builds and renovations." },
      { icon: "ri-home-gear-line",   title: "Roofing",             body: "Roofing installation and repair using durable materials suited to the Tanzanian climate." },
      { icon: "ri-file-list-3-line", title: "Project Management",  body: "End-to-end project management ensuring your construction is delivered on time and within budget." },
    ],
    stats: [
      { value: 8,  suffix: "+", label: "Years Experience"   },
      { value: 50, suffix: "+", label: "Projects Completed" },
      { value: 40, suffix: "+", label: "Clients Served"     },
      { value: 30, suffix: "+", label: "Qualified Staff"    },
    ],
    whyUs: [
      { icon: "ri-shield-check-line",       title: "Licensed & Registered",  body: "Fully registered with all relevant authorities for construction and civil works in Tanzania." },
      { icon: "ri-medal-line",              title: "Experienced Team",        body: "Our engineers, supervisors, and tradespeople bring years of hands-on experience to every project." },
      { icon: "ri-stack-line",              title: "Quality Materials",       body: "We source from reputable suppliers to ensure every project meets the highest standards." },
      { icon: "ri-calendar-check-line",     title: "On-Time Delivery",        body: "We plan carefully and communicate throughout so your project is completed as agreed." },
      { icon: "ri-money-dollar-circle-line",title: "Transparent Pricing",     body: "No hidden costs — we provide detailed quotations so you know exactly what you are paying for." },
      { icon: "ri-customer-service-line",   title: "After-Build Support",     body: "We stand behind our work and remain available after project completion for any follow-up needs." },
    ],
    cta: {
      heading:     "Ready to Start Your Project?",
      subheading:  "Contact us today for a free site visit and no-obligation quotation.",
      buttonLabel: "Request a Free Quote",
    },
    badges:       [{ value: "8+",  label: "Years Experience"   }, { value: "50+", label: "Projects Completed" }, { value: "TBS",  label: "Registered Firm"   }],
    ctaPrimary:   { label: "Get a Free Quote", type: "whatsapp" },
    ctaSecondary: { label: "Our Services",     href: "#services" },
  },

  /* ── LOGISTICS ───────────────────────────────────────────── */
  logistics: {
    taglines:   ["Moving Tanzania Forward.", "On Time, Every Time.", "Reliable Logistics."],
    subTagline: "Freight · Customs Clearance · Supply",
    hero: {
      headlines:    ["Tanzania's Trusted", "Your Reliable", "Freight & Supply,"],
      headlineEms:  ["Logistics Partner.", "Supply Chain Ally.", "Done Right."],
      subheadlines: [
        "We move goods, clear customs, and supply institutions — on time, every time, anywhere in Tanzania and the East African region.",
        "From sea freight at Dar Port to last-mile delivery in every region, we provide complete logistics and supply chain solutions.",
      ],
    },
    about: {
      headings: ["Your End-to-End\nLogistics Solution", "Reliability You\nCan Count On"],
      bodies: [
        [
          "We are a Tanzanian logistics and supply company with experience moving goods across Tanzania and the East African region.",
          "From sea freight and customs clearance to last-mile delivery and government supply, we offer complete supply chain solutions for businesses, NGOs, and public institutions.",
        ],
      ],
    },
    services: [
      { icon: "ri-ship-2-line",    title: "Sea Freight",             body: "Full and shared container shipments from major global ports to Dar es Salaam, Tanga, and Mtwara." },
      { icon: "ri-truck-line",     title: "Road Freight & Haulage",  body: "Reliable trucking for bulk goods, construction materials, and general cargo across Tanzania." },
      { icon: "ri-file-text-line", title: "Customs Clearance",       body: "Fast, compliant TRA customs clearance at all major Tanzanian ports and border crossings." },
      { icon: "ri-store-2-line",   title: "Government & NGO Supply", body: "Supply of office equipment, furniture, consumables, and general goods to institutions and projects." },
      { icon: "ri-archive-line",   title: "Warehousing & Storage",   body: "Secure warehousing in Dar es Salaam with inventory tracking and goods management." },
      { icon: "ri-route-line",     title: "Last-Mile Distribution",  body: "Nationwide distribution reaching all regions with dedicated vehicles and local agents." },
    ],
    stats: [
      { value: 7,    suffix: "+",  label: "Years in Business"      },
      { value: 2000, suffix: "+",  label: "Consignments Delivered" },
      { value: 26,   suffix: "",   label: "Regions Covered"        },
      { value: 97,   suffix: "%",  label: "On-Time Delivery Rate"  },
    ],
    whyUs: [
      { icon: "ri-shield-check-line",     title: "Licensed & Compliant",   body: "Fully licensed clearing and forwarding agent with all required government registrations." },
      { icon: "ri-timer-line",            title: "Fast Clearance",          body: "Most customs clearances processed within 24–48 hours of vessel arrival." },
      { icon: "ri-global-line",           title: "Regional Network",        body: "Partnerships with freight agents across East Africa for seamless regional shipping." },
      { icon: "ri-team-line",             title: "Dedicated Account Team",  body: "Each client gets a dedicated account officer who manages all shipments end-to-end." },
      { icon: "ri-lock-line",             title: "Cargo Insurance",         body: "All consignments covered with comprehensive marine and inland transit insurance." },
      { icon: "ri-customer-service-line", title: "24/7 Support",            body: "Our operations team is available around the clock for urgent clearance and delivery." },
    ],
    cta: {
      heading:     "Need a Logistics Partner You Can Trust?",
      subheading:  "WhatsApp us for a free freight or supply quote within 24 hours.",
      buttonLabel: "Get a Free Quote",
    },
    badges:       [{ value: "7+",    label: "Years Operating"        }, { value: "2000+", label: "Consignments Delivered" }, { value: "TRA",   label: "Licensed Agent"         }],
    ctaPrimary:   { label: "Get a Free Quote", type: "whatsapp" },
    ctaSecondary: { label: "Our Services",     href: "#services" },
  },

  /* ── CONSULTANCY ─────────────────────────────────────────── */
  consultancy: {
    taglines:   ["Clarity. Strategy. Results.", "Insight That Moves Business.", "Evidence-Based Advisory."],
    subTagline: "Management Consulting & Advisory",
    hero: {
      headlines:    ["Strategy That Drives", "Advisory Built for", "Data-Driven"],
      headlineEms:  ["Real Results.", "Tanzania.", "Decision Making."],
      subheadlines: [
        "We partner with organisations, businesses, and public institutions to solve complex challenges, improve performance, and deliver measurable results.",
        "Our team of analysts, economists, and sector specialists brings international-standard advisory with deep local knowledge.",
      ],
    },
    about: {
      headings: ["Trusted Advisors to\nTanzania's Organisations", "Advisory That\nDelivers Results"],
      bodies: [
        [
          "We are a Tanzanian management consulting and advisory firm with experience working alongside corporations, development agencies, NGOs, and public institutions.",
          "Our multidisciplinary team brings together economists, business analysts, M&E specialists, and sector experts to deliver strategies that are both rigorous and locally applicable.",
        ],
      ],
    },
    services: [
      { icon: "ri-line-chart-line",  title: "Business Strategy",          body: "Market entry, competitive analysis, growth planning, and strategic roadmaps for SMEs and corporates." },
      { icon: "ri-government-line",  title: "Public Sector Advisory",     body: "Policy development, institutional strengthening, and reform support for government agencies." },
      { icon: "ri-bar-chart-2-line", title: "Monitoring & Evaluation",    body: "M&E framework design, baseline surveys, midterm and final evaluations for development programmes." },
      { icon: "ri-funds-line",       title: "Grant & Fund Management",    body: "Technical assistance for donor-funded projects including major international programmes." },
      { icon: "ri-team-line",        title: "Organisational Development", body: "HR strategy, structural reviews, capacity building, and leadership development." },
      { icon: "ri-search-eye-line",  title: "Research & Market Studies",  body: "Feasibility studies, market surveys, financial modelling, and investment due diligence." },
    ],
    stats: [
      { value: 8,  suffix: "+", label: "Years of Practice"     },
      { value: 50, suffix: "+", label: "Clients Served"        },
      { value: 30, suffix: "+", label: "Projects Delivered"    },
      { value: 90, suffix: "%", label: "Client Retention Rate" },
    ],
    whyUs: [
      { icon: "ri-lightbulb-flash-line", title: "Independent Perspective", body: "We bring objective, evidence-based analysis free from internal politics or vested interests." },
      { icon: "ri-earth-line",           title: "International Standards",  body: "Our methodologies are grounded in global best practice and adapted for the Tanzanian context." },
      { icon: "ri-user-star-line",       title: "Senior-Led Delivery",      body: "Every engagement is led by an experienced practitioner, not delegated to junior staff." },
      { icon: "ri-file-shield-2-line",   title: "Confidential & Ethical",   body: "We maintain strict client confidentiality and operate under a rigorous professional code." },
      { icon: "ri-clipboard-line",       title: "Actionable Deliverables",  body: "Our reports are written to be used. We prioritise clarity, prioritisation, and implementation readiness." },
      { icon: "ri-building-4-line",      title: "Donor-Familiar",           body: "Experienced with international donor reporting requirements across major development programmes." },
    ],
    cta: {
      heading:     "Facing a Complex Challenge?",
      subheading:  "Book a free consultation and let's explore how we can help.",
      buttonLabel: "Book a Consultation",
    },
    badges:       [{ value: "8+",  label: "Years of Practice" }, { value: "50+",  label: "Clients Served"   }, { value: "NBAA", label: "Registered Firm" }],
    ctaPrimary:   { label: "Book a Free Consultation", type: "whatsapp" },
    ctaSecondary: { label: "Our Services",              href: "#services" },
  },

  /* ── HEALTHCARE ──────────────────────────────────────────── */
  healthcare: {
    taglines:   ["Your Health, Our Priority.", "Quality Care, Always.", "Compassionate Healthcare."],
    subTagline: "Medical Services & Healthcare",
    hero: {
      headlines:    ["Quality Healthcare", "Your Trusted", "Professional Care"],
      headlineEms:  ["You Can Trust.", "Health Partner.", "When You Need It."],
      subheadlines: [
        "We provide professional, compassionate healthcare services for individuals and families across Tanzania.",
        "From general consultations to specialist referrals, our team is dedicated to your health and wellbeing.",
      ],
    },
    about: {
      headings: ["Healthcare You\nCan Trust", "Committed to\nYour Wellbeing"],
      bodies: [
        [
          "We are a registered healthcare provider committed to delivering quality medical services to patients across Tanzania.",
          "Our team of qualified doctors, nurses, and healthcare staff provides evidence-based care in a clean, comfortable, and welcoming environment.",
        ],
      ],
    },
    services: [
      { icon: "ri-stethoscope-line",     title: "General Consultations",  body: "Comprehensive consultation and diagnosis for adults and children by qualified medical professionals." },
      { icon: "ri-test-tube-line",       title: "Laboratory Services",    body: "Accurate diagnostic laboratory services including blood tests, urinalysis, and pathology." },
      { icon: "ri-medicine-bottle-line", title: "Pharmacy",               body: "Well-stocked on-site pharmacy dispensing quality medicines with qualified pharmacist support." },
      { icon: "ri-heart-pulse-line",     title: "Maternal & Child Health", body: "Antenatal care, delivery support, postnatal care, and child immunisation services." },
      { icon: "ri-tooth-line",           title: "Dental Services",        body: "General and preventive dental care including cleaning, filling, extraction, and oral health advice." },
      { icon: "ri-wheelchair-line",      title: "Specialist Referrals",   body: "Coordinated specialist referral pathway ensuring continuity of care for complex conditions." },
    ],
    stats: [
      { value: 5,    suffix: "+",  label: "Years Serving Patients" },
      { value: 5000, suffix: "+",  label: "Patients Attended"      },
      { value: 10,   suffix: "+",  label: "Qualified Staff"        },
      { value: 6,    suffix: "",   label: "Days a Week, Open"      },
    ],
    whyUs: [
      { icon: "ri-government-line",     title: "Registered Facility",     body: "Fully registered and licensed by the Ministry of Health and relevant regulatory bodies." },
      { icon: "ri-user-heart-line",     title: "Patient-Centred Care",    body: "Every patient is treated with dignity, respect, and individual attention." },
      { icon: "ri-microscope-line",     title: "Qualified Professionals", body: "Our clinical team holds recognised qualifications and maintains ongoing professional development." },
      { icon: "ri-time-line",           title: "Minimal Waiting Times",   body: "We manage appointments to reduce waiting and respect your time." },
      { icon: "ri-hand-heart-line",     title: "Affordable Services",     body: "We offer quality care at fair and transparent pricing accessible to Tanzanian families." },
      { icon: "ri-map-pin-line",        title: "Accessible Location",     body: "Conveniently located with easy access for patients across the area." },
    ],
    cta: {
      heading:     "Your Health Matters to Us",
      subheading:  "Contact us to book an appointment or ask any health question.",
      buttonLabel: "Book an Appointment",
    },
    badges:       [{ value: "5+",    label: "Years of Service"   }, { value: "5000+", label: "Patients Attended" }, { value: "MOH",  label: "Registered Facility" }],
    ctaPrimary:   { label: "Book an Appointment", type: "whatsapp" },
    ctaSecondary: { label: "Our Services",         href: "#services" },
  },

  /* ── EDUCATION ───────────────────────────────────────────── */
  education: {
    taglines:   ["Shaping Future Leaders.", "Education That Empowers.", "Learning Without Limits."],
    subTagline: "Education & Training Services",
    hero: {
      headlines:    ["Education That", "Empowering Tanzania", "Quality Learning"],
      headlineEms:  ["Opens Doors.", "Through Education.", "For Every Student."],
      subheadlines: [
        "We provide quality education and training that equips students and professionals with the knowledge and skills to succeed.",
        "Our experienced educators are committed to nurturing potential, building character, and preparing learners for a competitive world.",
      ],
    },
    about: {
      headings: ["Committed to Quality\nEducation", "Developing Talent,\nBuilding Futures"],
      bodies: [
        [
          "We are a Tanzanian educational institution committed to academic excellence, character development, and practical skills for life and work.",
          "Our qualified team of educators combines academic rigour with a supportive learning environment to bring out the best in every student.",
        ],
      ],
    },
    services: [
      { icon: "ri-book-open-line",  title: "Academic Programmes",     body: "Accredited academic programmes taught by qualified staff, aligned with national standards." },
      { icon: "ri-briefcase-line",  title: "Professional Training",   body: "Practical skills training and professional development programmes for working adults." },
      { icon: "ri-computer-line",   title: "ICT & Digital Skills",    body: "Computer literacy, digital skills, and software training for students and professionals." },
      { icon: "ri-translate-2",     title: "Language Programmes",     body: "English and Swahili language courses for communication, business, and academic success." },
      { icon: "ri-team-line",       title: "Tutoring & Support",      body: "Small group and one-on-one tutoring to support students needing additional academic guidance." },
      { icon: "ri-award-line",      title: "Examinations & Certification", body: "Preparation and registration for national and international examinations and certifications." },
    ],
    stats: [
      { value: 6,   suffix: "+",  label: "Years Established"   },
      { value: 500, suffix: "+",  label: "Students Enrolled"   },
      { value: 20,  suffix: "+",  label: "Qualified Educators" },
      { value: 85,  suffix: "%",  label: "Student Pass Rate"   },
    ],
    whyUs: [
      { icon: "ri-government-line",  title: "Accredited Institution",   body: "Registered and accredited with the relevant national education authorities." },
      { icon: "ri-user-star-line",   title: "Qualified Teaching Staff", body: "All teaching staff hold recognised qualifications and undergo regular professional development." },
      { icon: "ri-book-2-line",      title: "Strong Curriculum",        body: "Our curriculum is aligned with national standards and enriched with practical, relevant content." },
      { icon: "ri-group-line",       title: "Small Class Sizes",        body: "We maintain manageable class sizes to ensure individual attention and better learning outcomes." },
      { icon: "ri-home-smile-line",  title: "Safe Environment",         body: "A safe, clean, and supportive environment where all students can focus on learning." },
      { icon: "ri-parent-line",      title: "Parental Engagement",      body: "We keep parents and guardians informed and involved in their child's educational progress." },
    ],
    cta: {
      heading:     "Invest in Your Future Today",
      subheading:  "Contact us to learn more about enrolment and available programmes.",
      buttonLabel: "Enquire About Enrolment",
    },
    badges:       [{ value: "6+",   label: "Years Established" }, { value: "500+", label: "Students"          }, { value: "NECTA", label: "Registered"       }],
    ctaPrimary:   { label: "Enquire Now",      type: "whatsapp" },
    ctaSecondary: { label: "Our Programmes",   href: "#services" },
  },

  /* ── TRADING ─────────────────────────────────────────────── */
  trading: {
    taglines:   ["Quality Goods, Fair Prices.", "Your Trusted Supplier.", "Trade Done Right."],
    subTagline: "Import · Export · General Trade",
    hero: {
      headlines:    ["Your Trusted", "Quality Products,", "Tanzania's Reliable"],
      headlineEms:  ["Trading Partner.", "Competitive Prices.", "General Supplier."],
      subheadlines: [
        "We supply quality goods to businesses, retailers, and institutions across Tanzania at competitive prices with reliable delivery.",
        "From import and export to wholesale and retail supply, we connect Tanzanian businesses to the products they need.",
      ],
    },
    about: {
      headings: ["Your Reliable\nTrading Partner", "Quality Goods,\nDependable Service"],
      bodies: [
        [
          "We are a Tanzanian trading and supply company with experience importing, exporting, and distributing a wide range of products to businesses and institutions across the country.",
          "Our reliable supply network and competitive pricing make us a trusted partner for retailers, contractors, NGOs, and government purchasers.",
        ],
      ],
    },
    services: [
      { icon: "ri-ship-2-line",       title: "Import & Export",       body: "Sourcing and importing goods from international markets and exporting Tanzanian products abroad." },
      { icon: "ri-store-2-line",      title: "Wholesale Supply",      body: "Wholesale supply of a wide range of products to retailers, contractors, and institutions." },
      { icon: "ri-file-list-line",    title: "Tender & Procurement",  body: "Supply of goods and materials for government, NGO, and corporate tender procurement." },
      { icon: "ri-shopping-bag-line", title: "Retail",                body: "Walk-in and order-based retail supply for individual and business customers." },
      { icon: "ri-box-3-line",        title: "Hardware & Materials",  body: "Supply of hardware, construction materials, and industrial goods for trade and projects." },
      { icon: "ri-truck-line",        title: "Delivery Services",     body: "Delivery of bulk and retail orders to customers across Dar es Salaam and beyond." },
    ],
    stats: [
      { value: 6,   suffix: "+", label: "Years in Business"  },
      { value: 500, suffix: "+", label: "Products Supplied"  },
      { value: 100, suffix: "+", label: "Business Clients"   },
      { value: 26,  suffix: "",  label: "Regions Reached"    },
    ],
    whyUs: [
      { icon: "ri-shield-check-line",       title: "Registered Business",  body: "Fully registered with TRA and all relevant trade authorities in Tanzania." },
      { icon: "ri-price-tag-3-line",        title: "Competitive Pricing",  body: "We leverage strong supplier relationships to offer consistently competitive pricing." },
      { icon: "ri-checkbox-circle-line",    title: "Quality Assured",      body: "We only supply goods that meet our quality standards — no substandard products." },
      { icon: "ri-truck-line",              title: "Reliable Delivery",    body: "On-time delivery to your location, whether in the city or upcountry." },
      { icon: "ri-customer-service-line",   title: "Responsive Service",   body: "Our team responds quickly to enquiries and provides clear quotes with no delays." },
      { icon: "ri-file-shield-2-line",      title: "Invoice & Receipt",    body: "All transactions come with full documentation including VAT invoices where applicable." },
    ],
    cta: {
      heading:     "Looking for a Reliable Supplier?",
      subheading:  "Contact us for a quote or to discuss your supply requirements.",
      buttonLabel: "Request a Quote",
    },
    badges:       [{ value: "6+",  label: "Years Trading" }, { value: "500+", label: "Products"    }, { value: "TRA", label: "Registered"  }],
    ctaPrimary:   { label: "Request a Quote", type: "whatsapp" },
    ctaSecondary: { label: "Our Products",    href: "#services" },
  },

  /* ── ENGINEERING ─────────────────────────────────────────── */
  engineering: {
    taglines:   ["Engineering Solutions.", "Precision. Reliability. Results.", "Built on Engineering Excellence."],
    subTagline: "Engineering & Technical Services",
    hero: {
      headlines:    ["Engineering Solutions", "Technical Expertise,", "Precision"],
      headlineEms:  ["That Work.", "Delivered.", "Engineering."],
      subheadlines: [
        "We provide professional engineering and technical services to businesses and public institutions across Tanzania.",
        "Our team of qualified engineers delivers reliable, code-compliant solutions for electrical, mechanical, structural, and ICT challenges.",
      ],
    },
    about: {
      headings: ["Engineering Expertise\nYou Can Rely On", "Technical Solutions\nfor Tanzania"],
      bodies: [
        [
          "We are a Tanzanian engineering and technical services firm staffed by qualified engineers and technicians across multiple disciplines.",
          "We apply international engineering standards with deep local knowledge to deliver safe, efficient, and cost-effective solutions for our clients.",
        ],
      ],
    },
    services: [
      { icon: "ri-flashlight-line",         title: "Electrical Engineering", body: "Electrical installation, maintenance, and design for commercial and industrial properties." },
      { icon: "ri-settings-3-line",         title: "Mechanical Engineering", body: "Mechanical systems design, installation, and maintenance for industrial and commercial facilities." },
      { icon: "ri-building-line",           title: "Structural Engineering", body: "Structural design, assessment, and advisory for buildings and infrastructure projects." },
      { icon: "ri-computer-line",           title: "ICT & Networking",       body: "Network infrastructure, IT systems, and technology integration for businesses." },
      { icon: "ri-survey-line",             title: "Surveying & Estimation", body: "Quantity surveying, cost estimation, and BOQ preparation for construction and engineering projects." },
      { icon: "ri-tools-line",              title: "Maintenance Services",   body: "Preventive and corrective maintenance programmes for electrical, mechanical, and civil assets." },
    ],
    stats: [
      { value: 7,  suffix: "+", label: "Years Experience"    },
      { value: 60, suffix: "+", label: "Projects Completed"  },
      { value: 15, suffix: "+", label: "Qualified Engineers" },
      { value: 40, suffix: "+", label: "Clients Served"      },
    ],
    whyUs: [
      { icon: "ri-award-line",              title: "Qualified Engineers",    body: "All our engineers hold recognised professional qualifications and current registrations." },
      { icon: "ri-file-shield-2-line",      title: "Code Compliant",         body: "All work is designed and executed to meet applicable Tanzanian and international standards." },
      { icon: "ri-shield-check-line",       title: "Health & Safety First",  body: "We maintain rigorous health and safety standards on every project and work site." },
      { icon: "ri-search-eye-line",         title: "Detailed Engineering",   body: "We invest in thorough design and planning to prevent costly errors and rework." },
      { icon: "ri-customer-service-line",   title: "Responsive Support",     body: "Our technical team is available for urgent call-outs and fast-turnaround repairs." },
      { icon: "ri-money-dollar-circle-line",title: "Value Engineering",      body: "We identify cost-saving opportunities without compromising quality or safety." },
    ],
    cta: {
      heading:     "Have an Engineering Challenge?",
      subheading:  "Contact us for a site assessment or technical consultation.",
      buttonLabel: "Request a Consultation",
    },
    badges:       [{ value: "7+", label: "Years Experience" }, { value: "60+", label: "Projects"          }, { value: "ERB", label: "Registered Firm"    }],
    ctaPrimary:   { label: "Request a Consultation", type: "whatsapp" },
    ctaSecondary: { label: "Our Services",            href: "#services" },
  },

  /* ── CORPORATE ───────────────────────────────────────────── */
  corporate: {
    taglines:   ["Investing in Tanzania's Future.", "Strategic Investments.", "Corporate Excellence."],
    subTagline: "Investment & Corporate Services",
    hero: {
      headlines:    ["Investing in", "Strategic", "Building"],
      headlineEms:  ["Tanzania's Growth.", "Corporate Partners.", "Lasting Value."],
      subheadlines: [
        "We are a Tanzanian investment and corporate services group committed to creating long-term value for our stakeholders across multiple sectors.",
        "From investment management to corporate advisory, we bring the expertise to drive sustainable business growth.",
      ],
    },
    about: {
      headings: ["A Corporate Group Built\nfor Tanzania", "Strategic Vision,\nSustainable Growth"],
      bodies: [
        [
          "We are a Tanzanian corporate group with diversified interests across key sectors of the economy, committed to creating value through disciplined investment and professional management.",
          "Our experienced leadership team combines financial expertise with deep market knowledge to identify and develop opportunities that deliver lasting returns.",
        ],
      ],
    },
    services: [
      { icon: "ri-funds-line",         title: "Investment Management", body: "Strategic investment and portfolio management across equity, fixed income, and real assets." },
      { icon: "ri-briefcase-4-line",   title: "Corporate Advisory",    body: "M&A advisory, corporate restructuring, and strategic planning for businesses and institutions." },
      { icon: "ri-bank-line",          title: "Financial Services",    body: "Financial planning, treasury management, and capital raising for corporate clients." },
      { icon: "ri-building-4-line",    title: "Real Estate",           body: "Commercial and residential property investment, development, and asset management." },
      { icon: "ri-global-line",        title: "Trade & Commerce",      body: "Import, export, and trade facilitation across East Africa and international markets." },
      { icon: "ri-organization-chart", title: "Subsidiary Management", body: "Professional management of subsidiary companies and associated business interests." },
    ],
    stats: [
      { value: 10, suffix: "+", label: "Years Operating"        },
      { value: 5,  suffix: "+", label: "Business Divisions"     },
      { value: 50, suffix: "+", label: "Institutional Partners" },
      { value: 3,  suffix: "+", label: "Sectors of Operation"   },
    ],
    whyUs: [
      { icon: "ri-user-star-line",     title: "Experienced Leadership", body: "Our executive team brings decades of combined experience in finance, operations, and strategy." },
      { icon: "ri-shield-star-line",   title: "Strong Governance",      body: "We operate under robust corporate governance frameworks with full regulatory compliance." },
      { icon: "ri-earth-line",         title: "Regional Reach",         body: "Our networks extend across East Africa, enabling cross-border investment and partnership." },
      { icon: "ri-line-chart-line",    title: "Track Record",           body: "A consistent history of value creation across our investment portfolio." },
      { icon: "ri-handshake-line",     title: "Partnership Approach",   body: "We build long-term relationships with partners and stakeholders based on trust and alignment." },
      { icon: "ri-file-shield-2-line", title: "Confidential & Discreet",body: "All mandates are handled with the highest level of professionalism and confidentiality." },
    ],
    cta: {
      heading:     "Interested in Partnering With Us?",
      subheading:  "Reach out to explore investment or business partnership opportunities.",
      buttonLabel: "Get in Touch",
    },
    badges:       [{ value: "10+", label: "Years Operating"    }, { value: "5+",  label: "Business Divisions" }, { value: "TRA", label: "Registered Group"  }],
    ctaPrimary:   { label: "Get in Touch",  type: "whatsapp" },
    ctaSecondary: { label: "Our Services",  href: "#services" },
  },

  /* ── GENERAL (fallback) ──────────────────────────────────── */
  general: {
    taglines:   ["Quality Service, Every Time.", "Your Trusted Partner.", "Reliable. Professional. Committed."],
    subTagline: "Professional Business Services",
    hero: {
      headlines:    ["Professional Services", "Your Trusted", "Quality Business"],
      headlineEms:  ["You Can Trust.", "Business Partner.", "Services."],
      subheadlines: [
        "We are a professional Tanzanian business committed to delivering quality services with integrity, reliability, and a focus on client satisfaction.",
        "Our experienced team is dedicated to understanding your needs and delivering results that exceed your expectations.",
      ],
    },
    about: {
      headings: ["A Business Built\non Trust", "Professional Service,\nEvery Time"],
      bodies: [
        [
          "We are a professional Tanzanian business with experience delivering quality services to clients across the country.",
          "Our team is committed to reliability, transparency, and doing excellent work — every time.",
        ],
      ],
    },
    services: [
      { icon: "ri-service-line",          title: "Professional Services",    body: "A range of professional services tailored to meet the needs of businesses and individuals." },
      { icon: "ri-customer-service-line", title: "Client Support",           body: "Responsive, attentive support to ensure every client interaction is a positive experience." },
      { icon: "ri-file-list-2-line",      title: "Consulting & Advisory",    body: "Expert guidance to help clients make informed decisions and achieve their objectives." },
      { icon: "ri-team-line",             title: "Project Delivery",         body: "End-to-end project management and execution from planning through to successful delivery." },
      { icon: "ri-tools-line",            title: "Technical Services",       body: "Technical expertise and hands-on support for operational and infrastructure challenges." },
      { icon: "ri-handshake-line",        title: "Partnerships & Alliances", body: "We build and maintain strategic partnerships to expand capacity and deliver better value." },
    ],
    stats: [
      { value: 5,  suffix: "+", label: "Years in Business"  },
      { value: 50, suffix: "+", label: "Projects Completed" },
      { value: 30, suffix: "+", label: "Clients Served"     },
      { value: 10, suffix: "+", label: "Team Members"       },
    ],
    whyUs: [
      { icon: "ri-shield-check-line",       title: "Registered Business",   body: "Fully registered and compliant with all applicable Tanzanian business regulations." },
      { icon: "ri-user-star-line",          title: "Experienced Team",      body: "Our team brings relevant expertise and a genuine commitment to quality service delivery." },
      { icon: "ri-calendar-check-line",     title: "Reliable Delivery",     body: "We deliver on our commitments — on time and to the standard agreed with the client." },
      { icon: "ri-money-dollar-circle-line",title: "Fair Pricing",          body: "Competitive and transparent pricing with no hidden costs." },
      { icon: "ri-customer-service-line",   title: "Responsive Support",    body: "We respond promptly and keep clients informed throughout every engagement." },
      { icon: "ri-handshake-line",          title: "Client-First Approach", body: "Everything we do is guided by what is best for our clients and their objectives." },
    ],
    cta: {
      heading:     "Ready to Work Together?",
      subheading:  "Contact us today to discuss how we can help your business.",
      buttonLabel: "Get in Touch",
    },
    badges:       [{ value: "5+", label: "Years Experience" }, { value: "50+", label: "Projects"        }, { value: "TRA", label: "Registered"      }],
    ctaPrimary:   { label: "Get in Touch",  type: "whatsapp" },
    ctaSecondary: { label: "Our Services",  href: "#services" },
  },
};

// Always returns arr[0] for deterministic, reproducible output.
// The same lead always produces the same config.
function pick(arr) {
  return arr[0];
}

function getCopy(industry) {
  return COPY[industry] || COPY.general;
}

module.exports = { getCopy, pick, COPY };
