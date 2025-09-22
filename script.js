document.addEventListener('DOMContentLoaded', () => {
  const scroller = document.querySelector('.scroller');
  if (!scroller) return;

  const pages = Array.from(scroller.querySelectorAll('.page'));
  if (!pages.length) return;

  // Navbar smooth scroll (unchanged behavior)
  document.querySelectorAll('.navbar a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Pointer tracking for subtle parallax
  let pointerTargetY = 0.95;
  let pointerY = 0.95;
  const pointerEase = 0.12;

  function setPointer(y) { pointerTargetY = Math.max(0, Math.min(1, y)); }
  window.addEventListener('mousemove', e => setPointer(e.clientY / window.innerHeight));
  window.addEventListener('touchmove', e => {
    if (e.touches && e.touches[0]) setPointer(e.touches[0].clientY / window.innerHeight);
  }, { passive: true });
  window.addEventListener('mouseleave', () => setPointer(0.95));
  window.addEventListener('touchend', () => setPointer(0.95));

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }

  // Set up initial transforms: every page's .page-inner except the first should be off-screen
  pages.forEach((p, i) => {
    const inner = p.querySelector('.page-inner') || p;
    if (i !== 0) inner.style.transform = 'translate3d(0,100%,0)';
    inner.style.willChange = 'transform, opacity';
  });

  // Main RAF loop
  function update() {
    pointerY = lerp(pointerY, pointerTargetY, pointerEase);

    const mobile = window.innerWidth < 900;
    const viewHeight = window.innerHeight;
    const scRect = scroller.getBoundingClientRect();

    pages.forEach((page, i) => {
      const inner = page.querySelector('.page-inner') || page;
      const next = pages[i + 1];

      // clear classes, we'll add them again if needed
      inner.classList.remove('page-covered');
      inner.classList.remove('page-incoming');

      if (!next) {
        // no next page: make sure current page is fully visible
        inner.style.transform = '';
        inner.style.opacity = '';
        inner.style.pointerEvents = '';
        return;
      }

      const nextInner = next.querySelector('.page-inner') || next;
      const nextRect = nextInner.getBoundingClientRect();

      // distance from top of scroller to top of next page
      const distance = nextRect.top - scRect.top;
      // progress from 0 (next page below viewport) -> 1 (next reached top)
      const progress = clamp(1 - (distance / viewHeight), 0, 1);

      if (mobile) {
        // on mobile disable overlap and keep normal flow (clean fallback)
        nextInner.style.transform = '';
        inner.style.opacity = '';
        inner.style.transform = '';
        nextInner.classList.remove('page-incoming');
        inner.classList.remove('page-covered');
        nextInner.style.pointerEvents = '';
        inner.style.pointerEvents = '';
        return;
      }

      if (progress > 0) {
        // mark states so CSS takes visual priority
        inner.classList.add('page-covered');
        nextInner.classList.add('page-incoming');

        // base translate in percent (incoming starts at 100% -> 0%)
        // we slightly reduce arrival offset based on pointer height to create a subtle parallax
        const pointerPull = clamp((1 - pointerY), 0, 1);
        const pointerInfluence = pointerPull * 0.18 * progress; // small factor
        const incomingPct = Math.max(0, (1 - progress) * 100 - (pointerInfluence * 100));

        // set transform on incoming page; CSS transition will animate to this value
        nextInner.style.transform = `translate3d(0, ${incomingPct}%, 0)`;

        // fade & scale covered page (small amount) to give depth
        inner.style.opacity = `${1 - (0.14 * progress)}`;
        inner.style.transform = `scale(${1 - (0.0065 * progress)}) translateY(${(-2.2 * progress)}vh)`;

        // when fully arrived, lock incoming to exact position and disable interactions on covered page
        if (incomingPct <= 0.5) {
          nextInner.style.transform = `translate3d(0, 0%, 0)`;
          inner.style.pointerEvents = 'none';
        } else {
          inner.style.pointerEvents = '';
        }
      } else {
        // reset if progress == 0 (next page is fully below viewport)
        nextInner.classList.remove('page-incoming');
        nextInner.style.transform = `translate3d(0,100%,0)`;
        inner.classList.remove('page-covered');
        inner.style.transform = '';
        inner.style.opacity = '';
        inner.style.pointerEvents = '';
      }
    });

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);

  // ensure pages reset on resize
  window.addEventListener('resize', () => {
    pages.forEach((p, i) => {
      const inner = p.querySelector('.page-inner') || p;
      if (i !== 0) inner.style.transform = 'translate3d(0,100%,0)';
      inner.style.opacity = '';
      inner.style.pointerEvents = '';
    });
  });
});
