document.addEventListener('DOMContentLoaded', () => {
  const scroller = document.querySelector('.scroller');
  if (!scroller) return;

  // Every full-screen section
  const pages = Array.from(scroller.querySelectorAll('.page'));
  if (!pages.length) return;

  // Each page's sticky inner wrapper (or the page itself if inner missing)
  const inners = pages.map(p => p.querySelector('.page-inner') || p);

  // Initialize: park every page after the first below the viewport
  inners.forEach((inner, i) => {
    inner.style.willChange = 'transform, opacity, box-shadow, filter';
    if (i !== 0) inner.style.transform = 'translate3d(0,100%,0)';
  });

  // Compute each page's top offset relative to the SCROLLER (not the window)
  let pageTops = [];
  function computeTops() {
    pageTops = pages.map(p => p.offsetTop);
  }
  computeTops();

  // Recompute when layout changes
  const ro = new ResizeObserver(() => computeTops());
  pages.forEach(p => ro.observe(p));

  let ticking = false;

  function frame() {
    ticking = false;

    const sTop = scroller.scrollTop;
    const vh = scroller.clientHeight;

    // Walk each pair (current page + next page)
    for (let i = 0; i < inners.length; i++) {
      const current = inners[i];
      const next = inners[i + 1];

      // Clear state each pass
      current.classList.remove('page-covered');
      if (next) next.classList.remove('page-incoming');

      // Last page: ensure visible & interactive
      if (!next) {
        current.style.transform = '';
        current.style.opacity = '';
        current.style.pointerEvents = '';
        continue;
      }

      const nextTop = pageTops[i + 1];     // where the next page starts in scroller content
      const distance = nextTop - sTop;     // px from scroller top to next page start
      const progress = Math.max(0, Math.min(1, 1 - (distance / vh))); // 0→1 as next reaches the top

      if (progress <= 0) {
        // Next page still fully below; keep it parked
        next.style.transform = 'translate3d(0,100%,0)';
        next.style.opacity = '';
        current.style.transform = '';
        current.style.opacity = '';
        current.style.pointerEvents = '';
        continue;
      }

      // Overlap state
      current.classList.add('page-covered');
      next.classList.add('page-incoming');

      // Incoming translate: 100% → 0% as progress 0 → 1
      const incomingPct = Math.max(0, (1 - progress) * 100);
      next.style.transform = `translate3d(0, ${incomingPct}%, 0)`;

      // Covered page’s subtle dim/scale/lift
      current.style.opacity = String(1 - (0.14 * progress));
      current.style.transform = `scale(${1 - 0.0065 * progress}) translateY(${-2.2 * progress}vh)`;

      // When essentially on top, snap & disable interactions beneath
      if (incomingPct <= 0.5) {
        next.style.transform = 'translate3d(0,0,0)';
        current.style.pointerEvents = 'none';
      } else {
        current.style.pointerEvents = '';
      }
    }
  }

  function requestFrame() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  // Scroll the SCROLLER (not window)
  scroller.addEventListener('scroll', requestFrame, { passive: true });

  // Re-init on resize/orientation
  window.addEventListener('resize', () => {
    computeTops();
    inners.forEach((inner, i) => {
      inner.classList.remove('page-covered', 'page-incoming');
      inner.style.opacity = '';
      inner.style.pointerEvents = '';
      inner.style.transform = i === 0 ? '' : 'translate3d(0,100%,0)';
    });
    requestFrame();
  });

  // Smooth nav links (kept simple)
  document.querySelectorAll('.navbar a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const id = a.getAttribute('href');
      const el = document.querySelector(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // First paint
  requestFrame();
});
