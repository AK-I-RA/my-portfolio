/* =====================================================================
   Ankit Rawat — Portfolio script
   ---------------------------------------------------------------------
   Adds all interactivity on top of index.html + style.css. Every
   feature checks that its elements (and libraries) exist first, so the
   page still works if a section or a CDN script is missing.

   External libraries (loaded with `defer` in index.html):
     GSAP + ScrollTrigger  scroll-linked animations
     Lenis                 smooth scrolling

   TABLE OF CONTENTS
     01. Setup & environment checks
     02. Hero availability date
     03. Text splitting + hero entrance timing
     04. Fit the hero name to the screen width
     05. Scroll reveals
     06. Smooth scrolling (Lenis)
     07. Scroll-linked animations (GSAP ScrollTrigger)
     08. Floating menu button + panel
     09. In-page anchor navigation
     10. Services: align stacked card heights
     11. Works: sticky project counter
     12. Custom "View" cursor
     13. Contact form (mailto)
     14. Competitive programming badges
     15. Footer: live IST clock
   ===================================================================== */

// Tells the inline script in index.html that this file loaded, so it
// doesn't un-hide the animated elements as a fallback.
window.__portfolioReady = true;

document.addEventListener('DOMContentLoaded', () => {

  /* ===================================================================
     01. SETUP & ENVIRONMENT CHECKS
     =================================================================== */
  const root = document.documentElement;
  // Visitor asked the OS for less motion → skip animations, show everything
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // A real mouse is available (not touch) → enable the custom cursor
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;


  /* ===================================================================
     02. HERO AVAILABILITY DATE
     Shows the current month and year, e.g. "SEP '26". Runs before text
     splitting so the new text gets split and animated too.
     =================================================================== */
  const availabilityDateEl = document.getElementById('availabilityDate');
  if (availabilityDateEl) {
    const now = new Date();
    const month = now.toLocaleDateString('en-US', { month: 'short' });
    availabilityDateEl.textContent = `${month} '${String(now.getFullYear()).slice(-2)}`;
  }


  /* ===================================================================
     03. TEXT SPLITTING + HERO ENTRANCE TIMING
     =================================================================== */

  /**
   * Wraps the text of an element marked with data-split="words|chars"
   * in masked spans, so each word / character can slide up on its own:
   *   words → <span class="w"><span class="wi">word</span></span>
   *   chars → <span class="w"><span class="c">c</span>…</span>
   * Each piece gets a staggered delay (--d) that the CSS transition uses.
   *
   * @param {HTMLElement} el   element to split
   * @param {number}      base delay in seconds before the first piece moves
   */
  const split = (el, base = 0) => {
    const mode = el.dataset.split;
    const label = el.textContent.replace(/\s+/g, ' ').trim();

    // Walk the element's children so nested tags (<em>, <br>) are kept
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            if (mode === 'chars') {
              [...part].forEach((ch) => {
                const c = document.createElement('span');
                c.className = 'c';
                c.textContent = ch;
                w.appendChild(c);
              });
            } else {
              const wi = document.createElement('span');
              wi.className = 'wi';
              wi.textContent = part;
              w.appendChild(wi);
            }
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);

    // Character-split text reads badly to screen readers; expose the whole string instead.
    if (mode === 'chars' && !el.closest('[aria-hidden="true"]')) {
      el.setAttribute('aria-label', label);
      el.querySelectorAll('.w').forEach((w) => w.setAttribute('aria-hidden', 'true'));
    }

    // Stagger: each character / word starts slightly after the previous one
    const step = mode === 'chars' ? 0.035 : 0.022;
    el.querySelectorAll('.c, .wi').forEach((s, i) => s.style.setProperty('--d', `${(base + i * step).toFixed(3)}s`));
  };

  // Hero entrance order (seconds after the curtain lifts)
  // Each row: [selector, start delay, extra delay per matching element]
  const heroDelays = [
    ['.hero-header [data-anim]', 0, 0.06],
    ['.hero-name .name-line', 0, 0.12],
    ['.hero-photo', 0.25, 0],
    ['.hero-headline', 0.35, 0],
    ['.hero-arrow', 0.5, 0],
    ['.hero-left .pill', 0.55, 0],
    ['.avail-label', 0.5, 0],
    ['.avail-date', 0.6, 0],
  ];
  const heroEls = [];
  heroDelays.forEach(([sel, base, stagger]) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      const d = base + i * stagger;
      if (el.dataset.split) split(el, d);
      else el.style.setProperty('--d', `${d}s`);
      heroEls.push(el);
    });
  });

  // Split every remaining data-split element on the page (no base delay)
  document.querySelectorAll('[data-split]').forEach((el) => {
    if (!el.querySelector('.w')) split(el);
  });


  /* ===================================================================
     04. FIT THE HERO NAME TO THE SCREEN WIDTH
     Measures the name at a known size, then scales the font so the
     letters span the full width of the hero.
     =================================================================== */
  const heroName = document.getElementById('heroName');
  const nameFit = heroName && heroName.querySelector('.fit');
  const fitName = () => {
    if (!nameFit) return;
    // Always measure from a fixed 100px baseline so errors can't compound
    heroName.style.fontSize = '100px';
    // Measure the glyphs themselves (first to last letter on the widest line)
    let width = 0;
    heroName.querySelectorAll('.name-line').forEach((line) => {
      const chars = line.querySelectorAll('.c');
      if (!chars.length) return;
      const lineWidth = chars[chars.length - 1].getBoundingClientRect().right - chars[0].getBoundingClientRect().left;
      width = Math.max(width, lineWidth);
    });
    // On one-line layouts the two words sit side by side; measure across both
    const all = heroName.querySelectorAll('.c');
    const first = all[0].getBoundingClientRect(), last = all[all.length - 1].getBoundingClientRect();
    if (Math.abs(first.top - last.top) < 5) width = last.right - first.left;
    if (!width) return;
    heroName.style.fontSize = `${Math.floor(100 * (heroName.clientWidth / width) * 0.99)}px`;
  };
  if (nameFit) {
    fitName();
    // Re-fit whenever the name's width changes (web font swap) or the viewport resizes
    if ('ResizeObserver' in window) new ResizeObserver(fitName).observe(nameFit);
    window.addEventListener('resize', fitName);
  }


  /* ===================================================================
     05. SCROLL REVEALS
     Adds the class "in" to animated elements (see section 04 of
     style.css). Hero elements play on a timer after the curtain lifts;
     everything else plays when it scrolls into view.
     =================================================================== */
  const scrollReveals = [...document.querySelectorAll('[data-split], [data-anim]')].filter((el) => !heroEls.includes(el));

  if (reduceMotion) {
    // No animation: show everything straight away
    [...heroEls, ...scrollReveals].forEach((el) => el.classList.add('in'));
  } else {
    // Wait for the page-load curtain to clear before the hero plays
    setTimeout(() => heroEls.forEach((el) => el.classList.add('in')), 750);

    if ('IntersectionObserver' in window) {
      // Photos start fully clipped, and a clipped-away element never counts as intersecting,
      // so observe their (unclipped) parent instead and reveal the photo from there.
      const proxied = new Map();
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (proxied.get(entry.target) || [entry.target]).forEach((el) => el.classList.add('in'));
            io.unobserve(entry.target); // reveal once only
          }
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
      scrollReveals.forEach((el) => {
        if (el.dataset.anim === 'photo' && el.parentElement) {
          const host = el.parentElement;
          proxied.set(host, [...(proxied.get(host) || []), el]);
          io.observe(host);
        } else {
          io.observe(el);
        }
      });
    } else {
      // Very old browsers: no observer available, so just show everything
      scrollReveals.forEach((el) => el.classList.add('in'));
    }
  }


  /* ===================================================================
     06. SMOOTH SCROLLING (LENIS)
     =================================================================== */
  let lenis = null;
  if (!reduceMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
      smoothWheel: true,
    });
  }


  /* ===================================================================
     07. SCROLL-LINKED ANIMATIONS (GSAP SCROLLTRIGGER)
     `scrub: true` ties each animation's progress directly to the scroll
     position instead of playing it on a timer.
     =================================================================== */
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);

    // Drive Lenis from GSAP's ticker so both stay in sync frame by frame
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    if (!reduceMotion) {
      // Hero recedes and fades out as the dark content sheet slides over it
      gsap.to('.hero-inner', {
        scale: 0.93,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: { trigger: '.content', start: 'top bottom', end: 'top top', scrub: true },
      });

      // Page-lift reveal: the contact section waits underneath (counter-scrolling so it
      // appears parked) while the dark content page slides up and away over it.
      gsap.fromTo('#contact', { y: () => -window.innerHeight }, {
        y: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '.content',
          start: 'bottom bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true, // recompute the start offset on resize
        },
      });

      // …and the contact card grows to full size / opacity at the same time
      gsap.fromTo('#contactCard', { scale: 0.92, opacity: 0.6 }, {
        scale: 1,
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: '.content', start: 'bottom bottom', end: 'bottom top', scrub: true },
      });
    }
  } else if (lenis) {
    // GSAP failed to load: run Lenis on its own animation loop
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }


  /* ===================================================================
     08. FLOATING MENU BUTTON + PANEL
     =================================================================== */
  const menuBtn = document.getElementById('menuBtn');
  const menuPanel = document.getElementById('menuPanel');

  /** Opens or closes the full-screen menu and locks page scrolling while open. */
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuPanel.classList.toggle('is-open', open);
    menuPanel.setAttribute('aria-hidden', String(!open));
    if (lenis) open ? lenis.stop() : lenis.start();
    root.style.overflow = open ? 'hidden' : '';
  };

  if (menuBtn && menuPanel) {
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

    // Show the button only after scrolling 60% of a screen past the top
    const toggleBtn = () => menuBtn.classList.toggle('show', window.scrollY > window.innerHeight * 0.6);
    toggleBtn();
    window.addEventListener('scroll', toggleBtn, { passive: true });
  }


  /* ===================================================================
     09. IN-PAGE ANCHOR NAVIGATION
     Links like href="#works" scroll smoothly (through Lenis when active)
     and close the menu panel if it is open.
     =================================================================== */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    a.addEventListener('click', (e) => {
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      if (menuPanel && menuPanel.classList.contains('is-open')) setMenu(false);
      const y = href === '#hero' ? 0 : target.getBoundingClientRect().top + window.scrollY;
      if (lenis) lenis.scrollTo(y);
      else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });


  /* ===================================================================
     10. SERVICES: ALIGN STACKED CARD HEIGHTS
     The cards stack by sticking one title row lower each. They must all
     have the same bottom edge, or a taller card hits the end of the stack
     first and slides up over the others. CSS gives a target height; if a
     card's content is taller than that (short screens, zoom, long text),
     stretch every card to match.
     =================================================================== */
  const serviceCards = [...document.querySelectorAll('.service-card')];
  const alignServiceCards = () => {
    if (!serviceCards.length) return;
    // 1. Read the CSS target height and the step between card positions
    serviceCards.forEach((c) => { c.style.minHeight = ''; });
    const cssTarget = parseFloat(getComputedStyle(serviceCards[0]).minHeight) || 0;
    const step = serviceCards.length > 1
      ? parseFloat(getComputedStyle(serviceCards[1]).top) - parseFloat(getComputedStyle(serviceCards[0]).top)
      : 0;
    // 2. Measure each card's natural content height
    serviceCards.forEach((c) => { c.style.minHeight = '0px'; });
    let full = cssTarget;
    serviceCards.forEach((c, i) => { full = Math.max(full, c.offsetHeight + i * step); });
    // 3. Apply heights so every bottom edge lands on the same line
    serviceCards.forEach((c, i) => { c.style.minHeight = `${Math.ceil(full - i * step)}px`; });
  };
  alignServiceCards();
  // Re-run whenever the layout may have changed
  window.addEventListener('resize', alignServiceCards);
  window.addEventListener('load', alignServiceCards);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignServiceCards);


  /* ===================================================================
     11. WORKS: STICKY PROJECT COUNTER
     Rolls the big "0X" counter to the number of the project in view.
     =================================================================== */
  const counterCol = document.getElementById('counterCol');
  const works = document.querySelectorAll('.work');
  if (counterCol && works.length) {
    // The active project is the last one whose top has crossed the middle of the screen.
    let current = -1;
    const updateCounter = () => {
      const mid = window.innerHeight * 0.5;
      let idx = 0;
      works.forEach((w, i) => { if (w.getBoundingClientRect().top < mid) idx = i; });
      if (idx === current) return;
      current = idx;
      counterCol.style.transform = `translateY(-${(idx * 100) / works.length}%)`;
    };
    updateCounter();
    window.addEventListener('scroll', updateCounter, { passive: true });
    window.addEventListener('resize', updateCounter);
    if (lenis) lenis.on('scroll', updateCounter); // smooth-scroll frames, in case native events lag
  }


  /* ===================================================================
     12. CUSTOM "VIEW" CURSOR
     A circle that trails the mouse and appears over project tiles.
     Desktop only (needs a real mouse).
     =================================================================== */
  const cursor = document.getElementById('cursor');
  if (cursor && canHover && !reduceMotion) {
    let x = -200, y = -200, cx = -200, cy = -200; // target (x, y) and current (cx, cy)
    window.addEventListener('mousemove', (e) => {
      x = e.clientX; y = e.clientY;
      cursor.classList.toggle('on', !!e.target.closest('.work-tile'));
    });
    // Each frame, move 18% of the remaining distance → smooth trailing motion
    const follow = () => {
      cx += (x - cx) * 0.18;
      cy += (y - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }


  /* ===================================================================
     13. CONTACT FORM (MAILTO, NO BACKEND)
     Checks the fields are filled in, then opens the visitor's email app
     with the message pre-written.
     =================================================================== */
  const form = document.getElementById('contactForm');
  const formNote = document.getElementById('formNote');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();

      if (!name || !email || !message) {
        formNote.textContent = 'Please fill in every field before sending.';
        formNote.classList.remove('is-success');
        return;
      }

      const subject = encodeURIComponent(`Portfolio inquiry from ${name}`);
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href = `mailto:ankitrawat7895@gmail.com?subject=${subject}&body=${body}`;
      formNote.textContent = 'Opening your email client…';
      formNote.classList.add('is-success');
    });
  }


  /* ===================================================================
     14. COMPETITIVE PROGRAMMING BADGES
     =================================================================== */

  // Rating band colours per site: [minimum rating, colour], highest first.
  // Official band colours, lifted slightly so they read on the dark card.
  const rankBands = {
    codeforces: [[3000, '#ff3b3b'], [2400, '#ff4d4d'], [2100, '#ffa53d'], [1900, '#c77dff'], [1600, '#5b8cff'], [1400, '#2ec4b6'], [1200, '#3fbf5f'], [0, '#9a9a9a']],
    atcoder: [[2800, '#ff4d4d'], [2400, '#ffa53d'], [2000, '#e0d44a'], [1600, '#5b8cff'], [1200, '#2ec4c4'], [800, '#3fbf5f'], [400, '#b0743a'], [0, '#9a9a9a']],
  };

  /** Colours a badge (via the --rank CSS variable) from the rating number shown in it. */
  const paintRank = (link) => {
    const bands = rankBands[link.dataset.site];
    const rating = parseInt(link.querySelector('.cp-rating').textContent, 10);
    if (!bands || Number.isNaN(rating)) return;
    link.style.setProperty('--rank', bands.find(([min]) => rating >= min)[1]);
  };
  document.querySelectorAll('.cp-link[data-site]').forEach(paintRank);

  // Codeforces: refresh rating live (HTML keeps the last known value).
  // AtCoder has no public API, so its rating is updated by hand in index.html.
  const cfRating = document.getElementById('cfRating');
  const cfRank = document.getElementById('cfRank');
  if (cfRating && window.fetch) {
    fetch('https://codeforces.com/api/user.info?handles=AK--I--RA')
      .then((r) => r.json())
      .then((data) => {
        const user = data.status === 'OK' && data.result[0];
        if (!user || !user.rating) return;
        cfRating.textContent = user.rating;
        // "candidate master" → "Candidate Master"
        if (cfRank && user.rank) cfRank.textContent = user.rank.replace(/\b\w/g, (ch) => ch.toUpperCase());
        paintRank(cfRating.closest('.cp-link'));
      })
      .catch(() => {}); // offline / API down: keep the values already in the HTML
  }


  /* ===================================================================
     15. FOOTER: LIVE IST CLOCK
     =================================================================== */
  const timeEl = document.getElementById('localTime');
  if (timeEl) {
    const updateClock = () => {
      const time = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
      }).format(new Date());
      timeEl.textContent = `${time}, IST`;
    };
    updateClock();
    setInterval(updateClock, 1000); // tick every second
  }
});
