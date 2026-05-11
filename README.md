# TUT Master Template

A premium, data-driven business website template built for Tanzanian companies — construction, logistics, supply, consultancy, engineering, healthcare, and general trading.

**Built by ThisUncle Technologies.**

---

## Quick Start

1. Open `index.html` in your browser (no build step required).
2. Edit `data/company.config.js` to customise the site for your client.
3. Add real images to `assets/images/`.
4. Deploy to Vercel, Netlify, or any static host.

---

## Customising for a New Company

**You only ever edit one file: `data/company.config.js`.**

Everything on the site — content, colours, layout, sections — is driven by this single config object.

### Step 1 — Copy the right sample config

Three sample configs are included in `data/`:

| File | Industry |
|---|---|
| `company.config.js` | Construction & Civil Engineering |
| `logistics.config.js` | Freight, Logistics & Government Supply |
| `consultancy.config.js` | Management Consulting & Advisory |

To start a new company, copy the closest sample config, rename it to `company.config.js`, and edit the values.

### Step 2 — Edit the config sections

```
data/company.config.js
├── meta         → SEO title, description, favicon path
├── brand        → Company name, tagline, logo path, brand colours
├── hero         → Headline, background image/video, CTAs, stat badges
├── about        → About text, image, director quote card
├── services     → Array of service cards (icon, title, description)
├── projects     → Tender/project highlights (title, client, value, tag)
├── stats        → Animated counter values (number, suffix, label)
├── whyUs        → Why choose us cards
├── gallery      → Image gallery (image path + caption)
├── testimonials → Client testimonials (quote, name, title)
├── contact      → Phone, WhatsApp, email, address, map embed
├── social       → Facebook, Instagram, LinkedIn, Twitter, YouTube
└── cta          → CTA banner heading, subheading, button label
```

### Step 3 — Brand colours

Change these two values in the `brand` section:

```js
brand: {
  accent:    '#C9431B',   // Primary colour — buttons, highlights, accents
  accentAlt: '#E05C2A',   // Hover variant (usually a lighter shade of accent)
  bgDark:    '#080808',   // Dark section/header background
  textLight: '#EDE8DE',   // Text colour on dark backgrounds
}
```

The template automatically injects these as CSS variables, so the entire site updates instantly.

### Step 4 — Hiding sections

Any section with no data hides automatically. To hide a section deliberately:

- **Services:** set `services: []`
- **Projects:** set `projects: []`
- **Stats:** set `stats: []`
- **Gallery:** set `gallery: []`
- **Testimonials:** set `testimonials: []`
- **Director card:** remove the `director` key from `about`, or set `director: null`
- **Map:** leave `contact.mapEmbed` as `''`

### Step 5 — Adding images

Place images in `assets/images/`. Update the paths in the config:

```js
hero:  { bgImage: 'assets/images/hero.jpg' }
about: { image:   'assets/images/about.jpg' }
```

Recommended image sizes:
| Image | Recommended size |
|---|---|
| Hero background | 1920×1080px |
| About section | 800×1000px (portrait) |
| Project cards | 800×450px (16:9) |
| Gallery images | 800×600px (4:3) |
| Director photo | 200×200px (square, will be cropped to circle) |
| Logo | SVG preferred, or PNG with transparent background |

### Step 6 — WhatsApp integration

Set the WhatsApp number in the contact section. Use **digits only** — no +, no spaces:

```js
contact: {
  whatsapp: '255754123456',   // Tanzania: 255 + number without leading 0
}
```

All WhatsApp buttons across the site (hero, sticky FAB, CTA banner, footer, contact form) use this number automatically. The contact form also redirects to WhatsApp on submit.

### Step 7 — Google Maps embed (optional)

1. Go to [Google Maps](https://maps.google.com) and search the business address.
2. Click **Share → Embed a map → Copy HTML**.
3. Paste **only the `src="..."` URL** (not the full `<iframe>` tag) into the config:

```js
contact: {
  mapEmbed: 'https://www.google.com/maps/embed?pb=...',
}
```

---

## File Structure

```
tut-master-template/
├── index.html              ← Page skeleton (rarely needs editing)
├── assets/
│   └── images/             ← All company images go here
├── css/
│   └── style.css           ← Full stylesheet (CSS variables, components, responsive)
├── js/
│   └── main.js             ← All JavaScript (renderers, animations, interactions)
├── data/
│   ├── company.config.js   ← ACTIVE config (edit this for each new client)
│   ├── logistics.config.js ← Sample: logistics/supply company
│   └── consultancy.config.js ← Sample: consulting/advisory firm
└── README.md
```

---

## Switching Between Sample Companies

To preview what the template looks like for a different industry:

1. Open `index.html` in a text editor.
2. Find the script tag near the bottom:
   ```html
   <script src="data/company.config.js"></script>
   ```
3. Change it to the config you want to preview:
   ```html
   <script src="data/logistics.config.js"></script>
   ```
4. Refresh your browser.

---

## Deploying to Vercel

1. Create a free account at [vercel.com](https://vercel.com).
2. Click **Add New → Project**.
3. Upload the `tut-master-template` folder (drag and drop, or connect a GitHub repo).
4. Vercel detects it as a static site and deploys instantly.
5. Your site is live at a `.vercel.app` URL.

For a custom domain (e.g. `karimjeebuilders.co.tz`), add it in the Vercel project settings under **Domains**.

---

## Deploying to Netlify

1. Go to [netlify.com](https://netlify.com).
2. Drag the `tut-master-template` folder onto the Netlify dashboard.
3. The site deploys in seconds.

---

## Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| HTML5 / CSS3 / ES6+ | — | Core stack |
| GSAP + ScrollTrigger | 3.12.5 | Animations, scroll-triggered reveals |
| Lenis | 1.0.42 | Smooth scrolling |
| Splitting.js | 1.0.6 | Hero text word-reveal animation |
| Swiper | 11 | Testimonials carousel |
| GLightbox | latest | Gallery lightbox |
| RemixIcon | 4.2 | Icon library |
| Google Fonts | — | Cormorant Garamond + Plus Jakarta Sans |

All libraries are loaded from CDN — no npm, no build tools, no Node.js required.

---

## Design Highlights

- **Typography:** Cormorant Garamond (editorial serif headings) + Plus Jakarta Sans (clean body text)
- **Film grain overlay:** Subtle CSS-animated SVG noise for a premium, cinematic feel
- **Custom cursor:** Smooth lerp-based ring cursor (desktop only, hides on touch devices)
- **Magnetic buttons:** Cursor-tracking push effect on all CTA buttons
- **[data-reveal] system:** Scroll-triggered directional reveals (up, left, right, scale)
- **Hero ticker:** Infinite scrolling background brand text
- **Stats counter:** Animated count-up on scroll entry
- **WhatsApp FAB:** Pulsing green sticky button on all devices
- **Responsive:** Mobile-first, fully tested from 375px to 1440px+
- **Dark sections:** Services, Why Us, Testimonials, CTA Banner use the brand dark colour
- **Preloader:** Progress bar + brand name, auto-dismisses on page load

---

## Customisation Tips

- **Change the section order:** Move `<section>` blocks in `index.html` — the JS and CSS adapt automatically.
- **Add a new service category icon:** Use any [RemixIcon](https://remixicon.com) class name in the `icon` field of a service object.
- **Add more projects:** Add objects to the `projects` array — the grid expands automatically.
- **Remove the gallery section entirely:** Set `gallery: []` in the config.
- **Two-line about heading:** Use `\n` in the heading string: `'Line One\nLine Two'`

---

## Support

Built and maintained by **ThisUncle Technologies**.

Website: [thisuncle.co.tz](https://thisuncle.co.tz)
