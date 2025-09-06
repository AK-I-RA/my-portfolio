// smooth nav click but inside scroller
document.querySelectorAll('.navbar a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const scroller = document.querySelector('.scroller');
    const target = document.querySelector(this.getAttribute('href'));
    if (!scroller || !target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

const scroller = document.querySelector('.scroller');
const pages = Array.from(scroller.querySelectorAll('.page'));
let currentIndex = 0;
let isScrolling = false;

// goToSection: scrolls within scroller
function goToSection(index) {
  if (index < 0 || index >= pages.length) return;
  isScrolling = true;
  pages[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
  currentIndex = index;
  // lock for duration of scroll animation
  setTimeout(() => { isScrolling = false; }, 850);
}

// wheel watcher on scroller (one wheel = one page)
scroller.addEventListener('wheel', (e) => {
  if (isScrolling) return;
  if (e.deltaY > 0) {
    goToSection(currentIndex + 1);
  } else if (e.deltaY < 0) {
    goToSection(currentIndex - 1);
  }
});

// allow keyboard arrow navigation
window.addEventListener('keydown', (e) => {
  if (['ArrowDown','PageDown'].includes(e.key)) { e.preventDefault(); goToSection(currentIndex + 1); }
  if (['ArrowUp','PageUp'].includes(e.key))   { e.preventDefault(); goToSection(currentIndex - 1); }
});

// IntersectionObserver (scroller as root) to keep nav active and sync currentIndex
const navLinks = document.querySelectorAll('.navbar a');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      currentIndex = pages.indexOf(entry.target);
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
    }
  });
}, { root: scroller, threshold: 0.6 });

pages.forEach(p => observer.observe(p));
