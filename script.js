/* ==========================
   Cover-overlap script (pointer-driven)
   Keep this as script.js
   ========================== */

document.addEventListener('DOMContentLoaded', () => {
  const scroller = document.querySelector('.scroller');
  if (!scroller) {
    console.error('No .scroller found');
    return;
  }
  const pages = Array.from(scroller.querySelectorAll('.page'));
  if (!pages.length) return;

  // nav clicks (kept simple & compatible)
  document.querySelectorAll('.navbar a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // pointer state (normalized)
  let pointerTargetY = 0.95;
  let pointerY = 0.95;
  const pointerEase = 0.12;

  function setPointer(y) {
    pointerTargetY = Math.max(0, Math.min(1, y));
  }

  window.addEventListener('mousemove', (e) => setPointer(e.clientY / window.innerHeight));
  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) setPointer(e.touches[0].clientY / window.innerHeight);
  }, { passive: true });

  window.addEventListener('mouseleave', () => setPointer(0.95));
  window.addEventListener('touchend', () => setPointer(0.95));

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }

  // Ensure all nextInner start at 100% (safety)
  pages.forEach((p, i) => {
    const inner = p.querySelector('.page-inner') || p;
    if (i !== 0) inner.style.transform = 'translate3d(0,100%,0)';
    inner.style.willChange = 'transform, opacity';
  });

  // main update loop
  function update() {
    // smooth pointer
    pointerY = lerp(pointerY, pointerTargetY, pointerEase);

    // disable effect on small screens
    const mobile = window.innerWidth < 900;
    const viewHeight = scroller.clientHeight;
    const scRect = scroller.getBoundingClientRect();

    pages.forEach((page, i) => {
      const inner = page.querySelector('.page-inner') || page;
      const next = pages[i + 1];
      // reset per-frame classes (we add as needed)
      inner.classList.remove('page-covered');
      if (!next) return;

      const nextInner = next.querySelector('.page-inner') || next;
      const nextRect = next.getBoundingClientRect();

      // distance from next.top to scroller.top
      const distance = nextRect.top - scRect.top;
      // progress 0..1 as next.top goes from below viewport to top
      const progress = clamp(1 - (distance / viewHeight), 0, 1);

      if (mobile) {
        // fallback: keep default sticky behaviour — reset inline styles
        nextInner.style.transform = '';
        inner.style.opacity = '';
        inner.style.transform = '';
        nextInner.classList.remove('page-incoming');
        inner.classList.remove('page-covered');
        return;
      }

      if (progress > 0) {
        inner.classList.add('page-covered');
        nextInner.classList.add('page-incoming');

        // base translate in px from scroll (100% -> 0px)
        const basePx = (1 - progress) * viewHeight;

        // pointer pull: move pointer up (pointerY small) -> larger pull
        const pointerPull = clamp((1 - pointerY), 0, 1);

        // pointer influence scaled by progress (so pointer matters mostly when section is peeking)
        const pointerInfluencePx = viewHeight * 0.85 * pointerPull * progress;

        // final translate (px)
        let finalPx = basePx - pointerInfluencePx;
        // clamp so it doesn't go negative (we lock to 0 when fully covered)
        finalPx = Math.max(0, finalPx);

        const finalPct = (finalPx / viewHeight) * 100;
        nextInner.style.transform = `translate3d(0, ${finalPct}%, 0)`;

        // subtle fade & scale on covered page
        inner.style.opacity = `${1 - (0.18 * progress)}`; // matches your screenshot fade
        inner.style.transform = `scale(${1 - (0.006 * progress)})`;

        // if fully pulled (finalPx very small) lock incoming to 0 and disable pointer events on covered
        if (finalPx <= 0.5) {
          nextInner.style.transform = `translate3d(0, 0%, 0)`;
          inner.style.pointerEvents = 'none';
        } else {
          inner.style.pointerEvents = '';
        }
      } else {
        // reset when next isn't peeking
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

  // keep layout consistent on resize
  window.addEventListener('resize', () => {
    pages.forEach((p, i) => {
      const inner = p.querySelector('.page-inner') || p;
      if (i !== 0) inner.style.transform = 'translate3d(0,100%,0)';
    });
  });
});
