/* ============================================================
   TUT MASTER TEMPLATE — main.js
   Reads data/company.config.js (COMPANY global), renders every
   section, then initialises all animations and interactions.
============================================================ */

(function () {
  'use strict';

  // ── Guard: config must be loaded ────────────────────────────
  if (typeof COMPANY === 'undefined') {
    console.error('[TUT] company.config.js not loaded. Add it before main.js.');
    return;
  }

  /* ==========================================================
     SECTION 1 — CONFIG → CSS VARIABLES
  ========================================================== */
  function injectBrandTokens() {
    const root = document.documentElement;
    const b = COMPANY.brand;
    if (b.accent)    root.style.setProperty('--accent',     b.accent);
    if (b.accentAlt) root.style.setProperty('--accent-alt', b.accentAlt);
    if (b.bgDark)    root.style.setProperty('--bg-dark',    b.bgDark);
    if (b.textLight) root.style.setProperty('--text-light', b.textLight);
  }

  /* ==========================================================
     SECTION 2 — SEO / META INJECTION
  ========================================================== */
  function injectMeta() {
    const m = COMPANY.meta;
    const b = COMPANY.brand;

    const titleEl = document.getElementById('js-seo-title');
    const descEl  = document.getElementById('js-seo-desc');
    const favEl   = document.getElementById('js-favicon');
    const ogTitle = document.getElementById('js-og-title');
    const ogDesc  = document.getElementById('js-og-desc');

    if (titleEl) titleEl.textContent = m.seoTitle || b.name;
    if (descEl)  descEl.setAttribute('content', m.seoDescription || '');
    if (favEl && m.favicon) favEl.setAttribute('href', m.favicon);
    if (ogTitle) ogTitle.setAttribute('content', m.seoTitle || b.name);
    if (ogDesc)  ogDesc.setAttribute('content',  m.seoDescription || '');
  }

  /* ==========================================================
     SECTION 3 — UTILITY HELPERS
  ========================================================== */
  function el(selector) { return document.querySelector(selector); }
  function els(selector) { return [...document.querySelectorAll(selector)]; }

  function isEmpty(val) {
    if (val === null || val === undefined || val === '') return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
  }

  function hideSection(id) {
    const section = document.getElementById(id);
    if (section) section.hidden = true;
  }

  function buildWaLink(text) {
    const num  = (COMPANY.contact && COMPANY.contact.whatsapp) || '';
    const msg  = encodeURIComponent(text || 'Hello, I would like to enquire about your services.');
    return num ? `https://wa.me/${num}?text=${msg}` : '#';
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
    return name
      ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
      : '?';
  }

  /* ==========================================================
     SECTION 4 — BRAND NAME / TAGLINE (all .js-brand-name)
  ========================================================== */
  function injectBrandText() {
    const b = COMPANY.brand;
    els('.js-brand-name').forEach(n => {
      if (n.tagName === 'IMG') return;
      n.textContent = b.name || '';
    });
    els('.js-brand-tagline').forEach(n => {
      n.textContent = b.subTagline || b.tagline || '';
    });
    // WhatsApp links — all .js-wa-link elements
    els('.js-wa-link').forEach(a => {
      a.href = buildWaLink(`Hello ${b.name}, I would like to know more about your services.`);
    });
    // Header CTA
    const hCta = el('.js-header-cta');
    if (hCta) {
      hCta.href = buildWaLink(`Hello ${b.name}, I would like to know more about your services.`);
    }
  }

  /* ==========================================================
     SECTION 5 — LOGO
  ========================================================== */
  function injectLogo() {
    const b = COMPANY.brand;
    if (!b.logo) return; // text fallback already in HTML

    els('.header__logo-text').forEach(span => {
      const img = document.createElement('img');
      img.src = b.logo;
      img.alt = b.name + ' logo';
      img.className = 'header__logo-img';
      span.replaceWith(img);
    });
  }

  /* ==========================================================
     SECTION 6 — HERO
  ========================================================== */
  function renderHero() {
    const h = COMPANY.hero;
    const b = COMPANY.brand;
    if (!h) return;

    // Eyeline / tagline
    const eyeline = el('.hero__eyeline');
    if (eyeline) eyeline.textContent = b.tagline || b.name || '';

    // Headline + em
    const hl = el('.js-hero-headline');
    const em = el('.js-hero-em');
    if (hl) hl.textContent = h.headline    || '';
    if (em) em.textContent = h.headlineEm  || '';

    // Subheadline
    const sub = el('.js-hero-sub');
    if (sub) sub.textContent = h.subheadline || '';

    // Background media — video takes priority
    const bgVideo = el('.hero__bg-video');
    const bgImg   = el('.hero__bg-img');

    if (h.bgVideo && bgVideo) {
      bgVideo.src = h.bgVideo;
      bgVideo.style.display = 'block';
      if (bgImg) bgImg.style.display = 'none';
    } else if (h.bgImage && bgImg) {
      bgImg.src = h.bgImage;
      bgImg.alt = b.name + ' — hero image';
    }

    // Primary CTA
    const primaryCta = el('.js-hero-cta-primary');
    const primaryLbl = el('.js-hero-cta-primary-label');
    if (primaryCta && h.ctaPrimary) {
      if (h.ctaPrimary.type === 'whatsapp') {
        primaryCta.href = buildWaLink(`Hello ${b.name}, I found your website and would like to discuss a project.`);
        primaryCta.setAttribute('target', '_blank');
        primaryCta.setAttribute('rel', 'noopener');
      } else if (h.ctaPrimary.href) {
        primaryCta.href = h.ctaPrimary.href;
        primaryCta.removeAttribute('target');
      }
      if (primaryLbl) primaryLbl.textContent = h.ctaPrimary.label || 'Contact Us';
    }

    // Secondary CTA
    const secCta = el('.js-hero-cta-secondary');
    const secLbl = el('.js-hero-cta-secondary-label');
    if (secCta && h.ctaSecondary) {
      secCta.href = h.ctaSecondary.href || '#';
      if (secLbl) secLbl.textContent = h.ctaSecondary.label || 'Learn More';
    }

    // Ticker content
    const tickerTrack = el('.js-ticker-track');
    if (tickerTrack) {
      const text = b.name
        ? Array(8).fill(b.name + ' — ' + (b.tagline || 'Excellence') + ' ').join('')
        : '';
      tickerTrack.textContent = text;
    }

    // Badges
    const badgesEl = el('.js-hero-badges');
    if (badgesEl && h.badges && h.badges.length) {
      badgesEl.innerHTML = h.badges.map(badge => `
        <div class="hero__badge">
          <span class="hero__badge-value">${badge.value}</span>
          <span class="hero__badge-label">${badge.label}</span>
        </div>
      `).join('');
    } else if (badgesEl) {
      badgesEl.hidden = true;
    }
  }

  /* ==========================================================
     SECTION 7 — ABOUT
  ========================================================== */
  function renderAbout() {
    const a = COMPANY.about;
    if (!a) { hideSection('about'); return; }

    // Heading
    const hEl = el('.js-about-heading');
    if (hEl) hEl.textContent = a.heading || '';

    // Body paragraphs (supports string or array)
    const textEl = el('.js-about-text');
    if (textEl) {
      const paras = Array.isArray(a.body) ? a.body : [a.body];
      textEl.innerHTML = paras.filter(Boolean).map(p => `<p>${p}</p>`).join('');
    }

    // About image
    const imgEl = el('.js-about-img');
    if (imgEl && a.image) {
      imgEl.src = a.image;
      imgEl.alt = (COMPANY.brand.name || '') + ' — about photo';
    }

    // Director card
    const cardEl = el('.js-director-card');
    if (cardEl && a.director && a.director.name) {
      const d = a.director;
      const avatarHtml = d.photo
        ? `<div class="director__photo-wrap"><img src="${d.photo}" alt="${d.name}" onerror="this.parentElement.outerHTML='<div class=\\'director__monogram\\'>${initials(d.name)}</div>'"/></div>`
        : `<div class="director__monogram">${initials(d.name)}</div>`;

      cardEl.innerHTML = `
        ${avatarHtml}
        ${d.quote ? `<p class="director__quote">"${d.quote}"</p>` : ''}
        <p class="director__name">${d.name}</p>
        ${d.title ? `<p class="director__title">${d.title}</p>` : ''}
      `;
    } else if (cardEl) {
      cardEl.hidden = true;
    }
  }

  /* ==========================================================
     SECTION 8 — SERVICES
  ========================================================== */
  function renderServices() {
    const services = COMPANY.services;
    const grid     = el('.js-services-grid');
    if (!grid) return;

    if (isEmpty(services)) { hideSection('services'); return; }

    grid.innerHTML = services.map(s => `
      <div class="service-card" data-reveal="up">
        <i class="service-card__icon ${s.icon || 'ri-star-line'}" aria-hidden="true"></i>
        <h3 class="service-card__title">${s.title || ''}</h3>
        <p  class="service-card__body">${s.body   || ''}</p>
      </div>
    `).join('');
  }

  /* ==========================================================
     SECTION 9 — STATS
  ========================================================== */
  function renderStats() {
    const stats = COMPANY.stats;
    const grid  = el('.js-stats-grid');
    if (!grid) return;

    if (isEmpty(stats)) { hideSection('stats'); return; }

    // Set watermark text on stats section
    const statsSection = document.getElementById('stats');
    if (statsSection && COMPANY.brand && COMPANY.brand.name) {
      statsSection.setAttribute('data-watermark', COMPANY.brand.name.toUpperCase());
    }

    grid.innerHTML = stats.map(s => `
      <div class="stat-item">
        <div class="stat-item__value" data-target="${s.value}" data-suffix="${s.suffix || ''}">0${s.suffix || ''}</div>
        <div class="stat-item__label">${s.label || ''}</div>
      </div>
    `).join('');
  }

  /* ==========================================================
     SECTION 10 — PROJECTS
  ========================================================== */
  function renderProjects() {
    const projects = COMPANY.projects;
    const grid     = el('.js-projects-grid');
    if (!grid) return;

    if (isEmpty(projects)) { hideSection('projects'); return; }

    grid.innerHTML = projects.map(p => {
      const tagClass = p.tag && p.tag.toLowerCase() === 'ongoing'
        ? 'project-card__tag project-card__tag--ongoing'
        : 'project-card__tag';

      const imgHtml = p.image
        ? `<img class="project-card__img" src="${p.image}" alt="${p.title}" loading="lazy"
               onerror="this.style.display='none'" />`
        : '';

      return `
        <article class="project-card" data-reveal="up">
          <div class="project-card__img-wrap">
            ${imgHtml}
            <div class="project-card__overlay"></div>
            ${p.tag ? `<span class="${tagClass}">${p.tag}</span>` : ''}
          </div>
          <div class="project-card__body">
            ${p.category ? `<span class="project-card__category">${p.category}</span>` : ''}
            <h3 class="project-card__title">${p.title || ''}</h3>
            <div class="project-card__meta">
              ${p.client ? `<span class="project-card__meta-item"><strong>Client:</strong> ${p.client}</span>` : ''}
              ${p.value  ? `<span class="project-card__meta-item"><strong>Value:</strong> ${p.value}</span>`  : ''}
              ${p.year   ? `<span class="project-card__meta-item"><strong>Year:</strong> ${p.year}</span>`    : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  /* ==========================================================
     SECTION 11 — WHY US
  ========================================================== */
  function renderWhyUs() {
    const items = COMPANY.whyUs;
    const grid  = el('.js-why-grid');
    if (!grid) return;

    if (isEmpty(items)) { hideSection('why-us'); return; }

    // Update heading to use brand name
    const headingEl = el('.js-why-heading');
    if (headingEl && COMPANY.brand && COMPANY.brand.name) {
      headingEl.textContent = `The ${COMPANY.brand.name} Difference`;
    }

    grid.innerHTML = items.map(w => `
      <div class="why-card" data-reveal="up">
        <div class="why-card__icon"><i class="${w.icon || 'ri-checkbox-circle-line'}" aria-hidden="true"></i></div>
        <h3 class="why-card__title">${w.title || ''}</h3>
        <p  class="why-card__body">${w.body   || ''}</p>
      </div>
    `).join('');
  }

  /* ==========================================================
     SECTION 12 — GALLERY
  ========================================================== */
  function renderGallery() {
    const gallery = COMPANY.gallery;
    const grid    = el('.js-gallery-grid');
    if (!grid) return;

    if (isEmpty(gallery)) { hideSection('gallery'); return; }

    grid.innerHTML = gallery.map((g, i) => `
      <a class="gallery__item glightbox"
         href="${g.image || ''}"
         data-gallery="site-gallery"
         data-description="${g.caption || ''}"
         aria-label="View ${g.caption || 'gallery image ' + (i + 1)}"
         data-reveal="up">
        <img src="${g.image || ''}" alt="${g.caption || ''}" loading="lazy"
             onerror="this.parentElement.hidden=true" />
        <div class="gallery__item-overlay">
          <i class="ri-zoom-in-line" aria-hidden="true"></i>
        </div>
        ${g.caption ? `<span class="gallery__item-caption">${g.caption}</span>` : ''}
      </a>
    `).join('');
  }

  /* ==========================================================
     SECTION 13 — TESTIMONIALS
  ========================================================== */
  function renderTestimonials() {
    const testimonials = COMPANY.testimonials;
    const wrapper      = el('.js-testimonials-wrapper');
    if (!wrapper) return;

    if (isEmpty(testimonials)) { hideSection('testimonials'); return; }

    wrapper.innerHTML = testimonials.map(t => {
      const avatarHtml = t.avatar
        ? `<img src="${t.avatar}" alt="${t.name}"
               onerror="this.outerHTML='${initials(t.name)}'" />`
        : initials(t.name);

      return `
        <div class="swiper-slide">
          <div class="testimonial-card">
            <i class="ri-double-quotes-l testimonial-card__quote-icon" aria-hidden="true"></i>
            <p class="testimonial-card__text">${t.quote || ''}</p>
            <div class="testimonial-card__author">
              <div class="testimonial-card__avatar">${avatarHtml}</div>
              <div>
                <div class="testimonial-card__name">${t.name  || ''}</div>
                <div class="testimonial-card__title">${t.title || ''}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ==========================================================
     SECTION 14 — CTA BANNER
  ========================================================== */
  function renderCta() {
    const cta = COMPANY.cta;
    const b   = COMPANY.brand;
    if (!cta) return;

    const heading = el('.js-cta-heading');
    const sub     = el('.js-cta-sub');
    const btn     = el('.js-cta-wa-btn');
    const btnLbl  = el('.js-cta-btn-label');

    if (heading) heading.textContent = cta.heading    || '';
    if (sub)     sub.textContent     = cta.subheading || '';

    if (btn) {
      btn.href = buildWaLink(`Hello ${b.name}, I'd like to start a project with you.`);
    }
    if (btnLbl) btnLbl.textContent = cta.buttonLabel || 'Start a Conversation';
  }

  /* ==========================================================
     SECTION 15 — CONTACT
  ========================================================== */
  function renderContact() {
    const c = COMPANY.contact;
    const s = COMPANY.social;
    const b = COMPANY.brand;

    // Contact list
    const listEl = el('.js-contact-list');
    if (listEl && c) {
      const items = [
        c.phone    && { icon: 'ri-phone-line',    label: 'Phone',    value: `<a href="tel:${c.phone}">${c.phone}</a>`       },
        c.whatsapp && { icon: 'ri-whatsapp-line',  label: 'WhatsApp', value: `<a href="${buildWaLink(`Hello ${b.name}`)}" target="_blank" rel="noopener">${c.phone || c.whatsapp}</a>` },
        c.email    && { icon: 'ri-mail-line',      label: 'Email',    value: `<a href="mailto:${c.email}">${c.email}</a>`    },
        c.address  && { icon: 'ri-map-pin-2-line', label: 'Address',  value: c.address                                      },
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
    }

    // Social links in contact section
    const socEl = el('.js-contact-social');
    if (socEl && s) {
      renderSocialLinks(socEl, s);
    }

    // Map embed
    const mapEl = el('.js-contact-map');
    if (mapEl) {
      if (c && c.mapEmbed) {
        mapEl.innerHTML = `<iframe src="${c.mapEmbed}" title="Map" allowfullscreen loading="lazy"></iframe>`;
      } else {
        mapEl.hidden = true;
      }
    }
  }

  /* ==========================================================
     SECTION 16 — SOCIAL LINKS (shared helper)
  ========================================================== */
  function renderSocialLinks(container, social) {
    if (!container || !social) return;

    const links = Object.entries(social)
      .filter(([, url]) => url && url.trim() !== '')
      .map(([platform, url]) => `
        <a href="${url}" class="social-link"
           aria-label="${socialLabel(platform)} — opens in new tab"
           target="_blank" rel="noopener noreferrer">
          <i class="${socialIcon(platform)}" aria-hidden="true"></i>
        </a>
      `).join('');

    container.innerHTML = links;
  }

  /* ==========================================================
     SECTION 17 — FOOTER
  ========================================================== */
  function renderFooter() {
    const c = COMPANY.contact;
    const s = COMPANY.social;

    // Social links in footer
    const footSocEl = el('.js-footer-social');
    if (footSocEl && s) renderSocialLinks(footSocEl, s);

    // Footer contact column
    const footContactEl = el('.js-footer-contact');
    if (footContactEl && c) {
      const b = COMPANY.brand;
      footContactEl.innerHTML = `
        <h4 class="footer__col-heading">Contact</h4>
        ${c.phone   ? `<div class="footer__contact-item"><i class="ri-phone-line"></i><span><a href="tel:${c.phone}">${c.phone}</a></span></div>` : ''}
        ${c.email   ? `<div class="footer__contact-item"><i class="ri-mail-line"></i><span><a href="mailto:${c.email}">${c.email}</a></span></div>` : ''}
        ${c.address ? `<div class="footer__contact-item"><i class="ri-map-pin-2-line"></i><span>${c.address}</span></div>` : ''}
        ${c.whatsapp? `<div class="footer__contact-item"><i class="ri-whatsapp-line"></i><span><a href="${buildWaLink(`Hello ${b.name}`)}" target="_blank" rel="noopener">Chat on WhatsApp</a></span></div>` : ''}
      `;
    }

    // Copyright
    const copyEl = el('.js-footer-copy');
    if (copyEl) {
      const year = new Date().getFullYear();
      const name = COMPANY.brand && COMPANY.brand.name ? COMPANY.brand.name : 'Company';
      copyEl.textContent = `© ${year} ${name}. All rights reserved.`;
    }
  }

  /* ==========================================================
     SECTION 18 — CONTACT FORM
  ========================================================== */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Basic validation
      let valid = true;
      const required = form.querySelectorAll('[required]');
      required.forEach(field => {
        field.classList.remove('is-invalid');
        if (!field.value.trim()) {
          field.classList.add('is-invalid');
          valid = false;
        }
      });

      if (!valid) return;

      // Build WhatsApp message from form
      const name    = (form.querySelector('[name="name"]')    || {}).value || '';
      const phone   = (form.querySelector('[name="phone"]')   || {}).value || '';
      const message = (form.querySelector('[name="message"]') || {}).value || '';

      const waMsg = `Hello, my name is ${name}.${phone ? ' My number is ' + phone + '.' : ''} ${message}`;
      const waUrl = buildWaLink(waMsg);

      if (waUrl !== '#') {
        window.open(waUrl, '_blank', 'noopener');
      }

      // Reset form
      form.reset();
    });
  }

  /* ==========================================================
     SECTION 19 — PRELOADER
  ========================================================== */
  function initPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    document.body.classList.add('is-loading');

    const bar     = preloader.querySelector('.pre__bar');
    const counter = preloader.querySelector('.pre__count');
    let   progress = 0;

    const tick = setInterval(() => {
      const increment = Math.random() * 18 + 5;
      progress = Math.min(progress + increment, 95);

      if (bar)     bar.style.width = progress + '%';
      if (counter) counter.textContent = Math.round(progress) + '%';
    }, 120);

    function dismiss() {
      clearInterval(tick);
      if (bar)     bar.style.width = '100%';
      if (counter) counter.textContent = '100%';

      setTimeout(() => {
        preloader.classList.add('is-done');
        document.body.classList.remove('is-loading');

        setTimeout(() => {
          preloader.remove();
        }, 700);
      }, 300);
    }

    // Dismiss after max 2.2s or when window loads (whichever is first)
    const maxTimer = setTimeout(dismiss, 2200);
    window.addEventListener('load', () => {
      clearTimeout(maxTimer);
      dismiss();
    }, { once: true });
  }

  /* ==========================================================
     SECTION 20 — LENIS SMOOTH SCROLL + GSAP TICKER
  ========================================================== */
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

    // Stop/start lenis when mobile nav opens / closes
    document.addEventListener('mobile-nav-open',  () => lenis.stop());
    document.addEventListener('mobile-nav-close', () => lenis.start());
  }

  /* ==========================================================
     SECTION 21 — CUSTOM CURSOR
  ========================================================== */
  function initCursor() {
    const dot  = el('.cursor__dot');
    const ring = el('.cursor__ring');
    if (!dot || !ring) return;

    // Hide on touch devices
    if (!window.matchMedia('(hover: hover)').matches) return;

    let mouse = { x: 0, y: 0 };
    let ring_  = { x: 0, y: 0 };
    let raf;

    document.addEventListener('mousemove', e => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      dot.style.left = e.clientX + 'px';
      dot.style.top  = e.clientY + 'px';
    });

    function animRing() {
      ring_.x += (mouse.x - ring_.x) * 0.13;
      ring_.y += (mouse.y - ring_.y) * 0.13;
      ring.style.left = ring_.x + 'px';
      ring.style.top  = ring_.y + 'px';
      raf = requestAnimationFrame(animRing);
    }
    animRing();

    // Expand on interactive elements
    const hoverTargets = 'a, button, [role="button"], input, textarea, select, label, .gallery__item, .project-card, .service-card, .magnetic';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(hoverTargets)) ring.classList.add('is-hovering');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(hoverTargets)) ring.classList.remove('is-hovering');
    });
  }

  /* ==========================================================
     SECTION 22 — HEADER (scroll state + mobile nav)
  ========================================================== */
  function initHeader() {
    const header  = document.getElementById('header');
    const burger  = el('.header__burger');
    const mNav    = document.getElementById('mobile-nav');
    const overlay = el('.mobile-nav__overlay');
    const closeBtn= el('.mobile-nav__close');
    if (!header) return;

    // Scroll state
    function onScroll() {
      header.classList.toggle('scrolled', window.scrollY > 60);
      // Back to top
      const btt = document.getElementById('back-to-top');
      if (btt) btt.classList.toggle('is-visible', window.scrollY > 500);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile nav open/close
    function openNav() {
      if (!mNav) return;
      mNav.classList.add('is-open');
      mNav.setAttribute('aria-hidden', 'false');
      if (overlay) overlay.classList.add('is-visible');
      if (burger) burger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      document.dispatchEvent(new Event('mobile-nav-open'));
    }

    function closeNav() {
      if (!mNav) return;
      mNav.classList.remove('is-open');
      mNav.setAttribute('aria-hidden', 'true');
      if (overlay) overlay.classList.remove('is-visible');
      if (burger) burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      document.dispatchEvent(new Event('mobile-nav-close'));
    }

    if (burger)  burger.addEventListener('click', openNav);
    if (closeBtn) closeBtn.addEventListener('click', closeNav);
    if (overlay) overlay.addEventListener('click', closeNav);

    // Close on mobile nav link click
    els('.mobile-nav__link').forEach(link => {
      link.addEventListener('click', closeNav);
    });

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mNav && mNav.classList.contains('is-open')) closeNav();
    });
  }

  /* ==========================================================
     SECTION 23 — BACK TO TOP
  ========================================================== */
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
     SECTION 24 — GSAP HERO ENTRANCE
  ========================================================== */
  function initHeroEntrance() {
    if (typeof gsap === 'undefined') return;

    // Splitting.js word-reveal on hero title
    const heroTitle = el('.hero__title');
    if (heroTitle && typeof Splitting !== 'undefined') {
      const lines = heroTitle.querySelectorAll('.hero__title-line, .hero__title-em');
      lines.forEach(line => {
        const inner = document.createElement('span');
        inner.className = 'word-inner';
        inner.textContent = line.textContent;
        line.textContent = '';
        line.appendChild(inner);
      });

      gsap.from('.hero__title-line .word-inner, .hero__title-em .word-inner', {
        yPercent: 110,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.12,
        delay: 0.4,
      });
    } else if (heroTitle) {
      // Fallback without Splitting
      gsap.from(heroTitle, { yPercent: 20, opacity: 0, duration: 1, delay: 0.5, ease: 'power3.out' });
    }

    // Other hero elements
    gsap.from(['.hero__eyeline', '.hero__sub', '.hero__actions', '.hero__badges'], {
      y: 24,
      opacity: 0,
      duration: .8,
      ease: 'power3.out',
      stagger: 0.1,
      delay: 0.7,
    });

    gsap.from('.hero__scroll-hint', {
      opacity: 0,
      duration: .8,
      delay: 1.4,
      ease: 'power2.out',
    });
  }

  /* ==========================================================
     SECTION 25 — [data-reveal] SCROLL TRIGGERS
  ========================================================== */
  function initRevealAnimations() {
    if (typeof gsap === 'undefined') {
      // Fallback: add is-revealed class via IntersectionObserver
      const observer = new IntersectionObserver((entries) => {
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

    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    els('[data-reveal]').forEach(target => {
      const dir = target.getAttribute('data-reveal');
      const from = { opacity: 0 };

      if (dir === 'up')    { from.y =  40; }
      if (dir === 'down')  { from.y = -40; }
      if (dir === 'left')  { from.x = -50; }
      if (dir === 'right') { from.x =  50; }
      if (dir === 'scale') { from.scale = 0.93; }

      gsap.from(target, {
        ...from,
        duration: 0.85,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: target,
          start: 'top 88%',
          once:  true,
        },
      });
    });

    // Staggered children (.services__grid, .why-us__grid cards)
    ['.services__grid', '.why-us__grid', '.projects__grid'].forEach(parent => {
      const parentEl = el(parent);
      if (!parentEl) return;
      const children = [...parentEl.children];
      if (!children.length) return;

      gsap.from(children, {
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: {
          trigger: parentEl,
          start: 'top 88%',
          once:  true,
        },
      });
    });
  }

  /* ==========================================================
     SECTION 26 — MAGNETIC BUTTONS
  ========================================================== */
  function initMagneticButtons() {
    const magnets = els('.magnetic');
    if (!magnets.length) return;

    const useGsap = typeof gsap !== 'undefined';

    magnets.forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const rect  = btn.getBoundingClientRect();
        const cx    = rect.left + rect.width  / 2;
        const cy    = rect.top  + rect.height / 2;
        const dx    = (e.clientX - cx) * 0.28;
        const dy    = (e.clientY - cy) * 0.28;

        if (useGsap) {
          gsap.to(btn, { x: dx, y: dy, duration: 0.35, ease: 'power2.out' });
        } else {
          btn.style.transform = `translate(${dx}px, ${dy}px)`;
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

  /* ==========================================================
     SECTION 27 — STATS COUNTER
  ========================================================== */
  function initStatsCounter() {
    const counters = els('.stat-item__value[data-target]');
    if (!counters.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);

        const el     = entry.target;
        const target = parseFloat(el.getAttribute('data-target'));
        const suffix = el.getAttribute('data-suffix') || '';
        const isFloat = target % 1 !== 0;
        const duration = 1600;
        const start = Date.now();

        function update() {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = target * eased;

          el.textContent = (isFloat ? current.toFixed(1) : Math.round(current)) + suffix;
          if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
      });
    }, { threshold: 0.4 });

    counters.forEach(c => io.observe(c));
  }

  /* ==========================================================
     SECTION 28 — SWIPER TESTIMONIALS
  ========================================================== */
  function initSwiper() {
    if (typeof Swiper === 'undefined') return;

    const swiperEl = el('.testimonials__swiper');
    if (!swiperEl) return;

    new Swiper('.testimonials__swiper', {
      slidesPerView: 1,
      spaceBetween:  24,
      loop:          true,
      autoplay:      { delay: 5500, disableOnInteraction: false },
      pagination: {
        el:            '.testimonials__pagination',
        clickable:     true,
      },
      breakpoints: {
        640:  { slidesPerView: 1 },
        768:  { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
    });
  }

  /* ==========================================================
     SECTION 29 — GLIGHTBOX GALLERY
  ========================================================== */
  function initLightbox() {
    if (typeof GLightbox === 'undefined') return;
    if (!el('.glightbox')) return;

    GLightbox({
      selector:      '.glightbox',
      touchNavigation: true,
      loop:          true,
      openEffect:    'zoom',
      closeEffect:   'fade',
    });
  }

  /* ==========================================================
     SECTION 30 — FILM GRAIN (already animated via CSS)
     Nothing to init; CSS keyframe handles it.
  ========================================================== */

  /* ==========================================================
     MAIN INIT — run everything in order
  ========================================================== */
  function init() {
    // 1. Brand tokens + meta (before paint)
    injectBrandTokens();
    injectMeta();

    // 2. Render all sections from config
    injectBrandText();
    injectLogo();
    renderHero();
    renderAbout();
    renderServices();
    renderStats();
    renderProjects();
    renderWhyUs();
    renderGallery();
    renderTestimonials();
    renderCta();
    renderContact();
    renderFooter();

    // 3. Interactions
    initContactForm();

    // 4. Animations + UI (deferred slightly to let DOM settle)
    initPreloader();

    requestAnimationFrame(() => {
      initLenis();
      initCursor();
      initHeader();
      initBackToTop();

      initRevealAnimations();
      initMagneticButtons();
      initStatsCounter();
      initSwiper();
      initLightbox();
      initHeroEntrance();
    });
  }

  // Entry point
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
