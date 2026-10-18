/**
 * Suryavamshi Solar Projects LLP - Main Application Controller
 * Handles global interactions, navigation, mobile drawer, counters, and contact workflows.
 */

/**
 * Modal layers (the phone menu here, Settings in premium.js): while one is open, everything else on the
 * page is made inert (no focus, no clicks, skipped by screen readers). Layers can stack; each release
 * only undoes its own changes. `keep` is the list of top-level elements that stay usable.
 */
window.svInert = window.svInert || function(keep) {
  const changed = [];
  Array.prototype.forEach.call(document.body.children, el => {
    if (keep.indexOf(el) > -1 || el.tagName === 'SCRIPT' || el.hasAttribute('inert')) return;
    el.setAttribute('inert', '');
    changed.push(el);
  });
  return function release() { changed.forEach(el => el.removeAttribute('inert')); };
};

document.addEventListener('DOMContentLoaded', function() {
  // Initialize sub-modules
  if (typeof SolarCalculator !== 'undefined') SolarCalculator.init();
  if (typeof SolarFeasibilityController !== 'undefined') SolarFeasibilityController.init();
  if (typeof EquipmentController !== 'undefined') EquipmentController.init();
  if (typeof ProjectsController !== 'undefined') ProjectsController.init();

  initNavigation();
  initMobileDrawer();
  initStatsCounters();
  initSmoothScroll();
});

/**
 * 1. Sticky Navigation & Scroll Spy
 */
function initNavigation() {
  const header = document.querySelector('.header-nav');
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-item-link');

  window.addEventListener('scroll', function() {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Scroll spy
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}

/**
 * 2. Mobile Hamburger Drawer
 */
function initMobileDrawer() {
  const toggleBtn = document.querySelector('.mobile-nav-toggle');
  const drawer = document.querySelector('.mobile-nav-drawer');
  const backdrop = document.querySelector('.mobile-nav-backdrop');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (!toggleBtn || !drawer || !backdrop) return;

  // The menu is a dialog: the button says whether it is open, focus moves in, Escape closes it,
  // focus goes back to the button, and the page behind can't be reached while it is open.
  if (!drawer.id) drawer.id = 'mobileNav';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  toggleBtn.setAttribute('aria-controls', drawer.id);
  toggleBtn.setAttribute('aria-expanded', 'false');
  let release = null;

  function toggleMenu(open) {
    const wasOpen = drawer.classList.contains('open');
    const isOpen = open !== undefined ? open : !wasOpen;
    if (isOpen === wasOpen) return;
    drawer.classList.toggle('open', isOpen);
    backdrop.classList.toggle('open', isOpen);
    toggleBtn.classList.toggle('open', isOpen);
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) {
      release = window.svInert([drawer, backdrop]);
      const first = drawer.querySelector('#drawerClose') || drawer.querySelector('a, button');
      if (first) setTimeout(() => first.focus(), 30);
    } else {
      if (release) { release(); release = null; }
      toggleBtn.focus();
    }
  }

  toggleBtn.addEventListener('click', () => toggleMenu());
  backdrop.addEventListener('click', () => toggleMenu(false));

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  document.addEventListener('keydown', e => {
    if (!drawer.classList.contains('open') || e.defaultPrevented) return;
    // Settings opened from the menu sits on top; its own Escape closes it first.
    const settings = document.querySelector('.settings-backdrop.open');
    if (settings) return;
    if (e.key === 'Escape') { e.preventDefault(); toggleMenu(false); return; }
    if (e.key !== 'Tab') return;
    const items = Array.from(drawer.querySelectorAll('a[href], button:not([disabled])')).filter(el => el.offsetWidth || el.offsetHeight);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  });

  // Back on a wide screen with the menu still open: close it so the page is usable again.
  window.addEventListener('resize', () => {
    if (drawer.classList.contains('open') && getComputedStyle(toggleBtn).display === 'none') toggleMenu(false);
  });
}

/**
 * 3. Animated Number Counters
 */
function initStatsCounters() {
  const statNumbers = document.querySelectorAll('.stat-number');
  if (!statNumbers.length) return;

  let hasAnimated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasAnimated) {
        hasAnimated = true;
        animateCounters();
      }
    });
  }, { threshold: 0.3 });

  const statsSection = document.querySelector('.stats-banner');
  if (statsSection) {
    observer.observe(statsSection);
  }

  function animateCounters() {
    statNumbers.forEach(el => {
      const target = parseFloat(el.getAttribute('data-target'));
      const isDecimal = el.getAttribute('data-decimal') === 'true';
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1800; // ms
      const startTime = performance.now();

      function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic curve
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentVal = ease * target;

        if (isDecimal) {
          el.textContent = `${currentVal.toFixed(1)}${suffix}`;
        } else {
          el.textContent = `${Math.floor(currentVal)}${suffix}`;
        }

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = isDecimal ? `${target.toFixed(1)}${suffix}` : `${target}${suffix}`;
        }
      }

      requestAnimationFrame(update);
    });
  }
}



/**
 * 5. Smooth Anchor Scrolling
 */
function initSmoothScroll() {
  // scrollIntoView (not window.scrollTo) so the jump also works when the site sits inside a taller frame,
  // like the preview viewer; scroll-padding-top in the CSS keeps the section clear of the header.
  document.addEventListener('click', function(e) {
    const anchor = e.target.closest && e.target.closest('a[href*="#"]');
    if (!anchor || anchor.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (anchor.pathname !== location.pathname || anchor.host !== location.host) return;
    const id = decodeURIComponent(anchor.hash.slice(1));
    const targetEl = id && document.getElementById(id);
    if (!targetEl) return;
    e.preventDefault();
    targetEl.scrollIntoView({ behavior: document.documentElement.getAttribute('data-sv-motion') === 'off' ? 'auto' : 'smooth', block: 'start' });
    if (history.pushState) history.pushState(null, '', anchor.hash);
    // Keyboard focus follows the jump, so the next Tab continues from the section (skip link, menu links like #kseb-section).
    if (!targetEl.matches('a[href], button, input, select, textarea, [tabindex]')) targetEl.setAttribute('tabindex', '-1');
    targetEl.focus({ preventScroll: true });
  });
}
