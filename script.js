/* ---------------------------
   Smooth nav clicks (inside .scroller)
   --------------------------- */
document.querySelectorAll('.navbar a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const scroller = document.querySelector('.scroller');
    const target = document.querySelector(this.getAttribute('href'));
    if (!scroller || !target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ---------------------------
   Setup references
   --------------------------- */
const scroller = document.querySelector('.scroller');
if (!scroller) {
  console.error('No .scroller found — ensure script runs after DOM and .scroller exists.');
  throw new Error('No .scroller found');
}
const pages = Array.from(scroller.querySelectorAll('.page'));
const navLinks = document.querySelectorAll('.navbar a');

/* ---------------------------
   IntersectionObserver: nav highlighting (scroller root)
   - Also toggles .animate on the .page element so CSS per-page animations run on view.
   --------------------------- */
if (scroller && pages.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      // nav highlight
      if (entry.isIntersecting) {
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
        entry.target.classList.add('animate'); // optional child triggers
      } else {
        entry.target.classList.remove('animate');
      }
    });
  }, { root: scroller, threshold: 0.6 });

  pages.forEach(p => io.observe(p));
}

/* ---------------------------
   Utilities
   --------------------------- */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/* ---------------------------
   Cover-overlap animation loop
   - incoming .page-inner moves from translateY(100%) -> translateY(0%)
   - previous page gets a subtle dim / scale
   - effect disabled under 900px
   --------------------------- */
let ticking = false;

function updateCoverOverlap() {
  if (!scroller || !pages.length) {
    ticking = false;
    return;
  }

  // disable effect on small screens (mobile)
  if (window.innerWidth < 900) {
    pages.forEach(page => {
      const inner = page.querySelector('.page-inner') || page;
      inner.classList.remove('page-incoming', 'page-covered');
      inner.style.transform = '';
      inner.style.opacity = '';
      inner.style.pointerEvents = '';
    });
    ticking = false;
    return;
  }

  const scrollerRect = scroller.getBoundingClientRect();
  const viewHeight = scroller.clientHeight;

  pages.forEach((page, i) => {
    const inner = page.querySelector('.page-inner') || page;
    const next = pages[i + 1];

    // reset defaults for this frame
    inner.classList.remove('page-covered');
    inner.style.pointerEvents = '';
    // we intentionally do not reset transform/opacity here for non-active pages (so non-first remain offscreen)
    if (!next) {
      // still make sure this page content responds slightly to scroll if you want (optional)
      return;
    }

    const nextInner = next.querySelector('.page-inner') || next;
    const nextRect = next.getBoundingClientRect();

    // distance from next.top to scroller.top in viewport coords
    const distance = nextRect.top - scrollerRect.top;
    // progress goes 0 -> 1 as next.top moves from below viewport to aligned (or in)
    const progress = clamp(1 - (distance / viewHeight), 0, 1);

    if (progress > 0) {
      // mark classes so CSS can add shadow / z-index
      inner.classList.add('page-covered');
      nextInner.classList.add('page-incoming');

      // incoming: from 100% (off-screen) -> 0% (in-place)
      const incomingPct = (1 - progress) * 100; // 100 -> 0
      nextInner.style.transform = `translateY(${incomingPct}%)`;
      nextInner.style.willChange = 'transform';
      nextInner.style.pointerEvents = 'auto';

      // covered page slight visual tweak (non-invasive)
      inner.style.opacity = `${1 - (0.12 * progress)}`;
      inner.style.transform = `scale(${1 - (0.005 * progress)})`;
      inner.style.willChange = 'transform, opacity';
      inner.style.pointerEvents = progress > 0.5 ? 'none' : 'auto';
    } else {
      // reset nextInner to stay OFFSCREEN until needed
      nextInner.classList.remove('page-incoming');
      nextInner.style.transform = `translateY(100%)`;
      nextInner.style.willChange = '';
      nextInner.style.pointerEvents = '';
      // reset covered state if any
      inner.classList.remove('page-covered');
      inner.style.transform = '';
      inner.style.opacity = '';
    }
  });

  ticking = false;
}

function onScroll() {
  if (!ticking) {
    requestAnimationFrame(updateCoverOverlap);
    ticking = true;
  }
}

/* ---------------------------
   Attach scroll/resize/load handlers
   --------------------------- */
scroller.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => requestAnimationFrame(updateCoverOverlap));
window.addEventListener('load', () => requestAnimationFrame(updateCoverOverlap));
requestAnimationFrame(updateCoverOverlap);
