/* ByteLogicx – nav.js */
(function () {
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');

  /* ── Scroll: add .scrolled ── */
  function handleScroll() {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      /* Keep scrolled on inner pages (no hero) */
      if (!document.querySelector('.hero')) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // run once on load

  /* ── Hamburger toggle ── */
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function () {
      const isOpen = mobileNav.classList.toggle('open');
      hamburger.classList.toggle('active', isOpen);
      navbar.classList.toggle('open', isOpen);
    });

    /* Close menu when a link is clicked */
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileNav.classList.remove('open');
        hamburger.classList.remove('active');
        navbar.classList.remove('open');
      });
    });
  }
})();
