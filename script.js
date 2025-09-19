document.addEventListener('DOMContentLoaded', () => {
  const scroller = document.querySelector('.scroller');
  if (!scroller) return;

  const pages = Array.from(scroller.querySelectorAll('.page'));
  if (!pages.length) return;

  // Navbar smooth scroll
  document.querySelectorAll('.navbar a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Pointer tracking (used to add subtle parallax when overlapping)
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

  // Set up initial transforms
  pages.forEach((p, i) => {
    const inner = p.querySelector('.page-inner') || p;
    if (i !== 0) inner.style.transform = 'translate3d(0,100%,0)';
    inner.style.willChange = 'transform, opacity';
  });

  function update() {
    pointerY = lerp(pointerY, pointerTargetY, pointerEase);

    const mobile = window.innerWidth < 900;
    const viewHeight = scroller.clientHeight;
    const scRect = scroller.getBoundingClientRect();

    pages.forEach((page, i) => {
      const inner = page.querySelector('.page-inner') || page;
      const next = pages[i + 1];

      // remove classes up-front; we'll re-add as needed
      inner.classList.remove('page-covered');
      inner.classList.remove('page-incoming');

      if (!next) return;

      const nextInner = next.querySelector('.page-inner') || next;
      const nextRect = nextInner.getBoundingClientRect();
      const distance = nextRect.top - scRect.top;
      const progress = clamp(1 - (distance / viewHeight), 0, 1);

      if (mobile) {
        // mobile: disable complex transforms
        nextInner.style.transform = '';
        inner.style.opacity = '';
        inner.style.transform = '';
        nextInner.classList.remove('page-incoming');
        inner.classList.remove('page-covered');
        return;
      }

      if (progress > 0) {
        // mark states
        inner.classList.add('page-covered');
        nextInner.classList.add('page-incoming');

        // base translate in px
        const basePx = (1 - progress) * viewHeight;

        // pointer effect (subtle pull when mouse higher on screen)
        const pointerPull = clamp((1 - pointerY), 0, 1);
        const pointerInfluencePx = viewHeight * 0.85 * pointerPull * progress;

        // final pixel offset for incoming page (we subtract pointer influence so incoming arrives slightly faster when pointer near top)
        let finalPx = basePx - pointerInfluencePx;
        finalPx = Math.max(0, finalPx);
        const finalPct = (finalPx / viewHeight) * 100;

        // set transform on incoming page; CSS transition will animate to this value smoothly
        nextInner.style.transform = `translate3d(0, ${finalPct}%, 0)`;

        // fade & scale covered page (small amount) to give depth
        inner.style.opacity = `${1 - (0.18 * progress)}`;
        inner.style.transform = `scale(${1 - (0.006 * progress)})`;

        // when fully arrived, lock incoming to exact position and enable pointer events
        if (finalPx <= 0.5) {
          nextInner.style.transform = `translate3d(0, 0%, 0)`;
          inner.style.pointerEvents = 'none';
        } else {
          inner.style.pointerEvents = '';
        }
      } else {
        // reset next page to default off-screen position
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
    });
  });
});
