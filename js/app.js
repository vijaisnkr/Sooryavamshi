/**
 * Sooryavamshi Solar Projects LLP - Main Application Controller
 * Handles global interactions, navigation, mobile drawer, counters, and contact workflows.
 */

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

  function toggleMenu(open) {
    const isOpen = open !== undefined ? open : !drawer.classList.contains('open');
    drawer.classList.toggle('open', isOpen);
    backdrop.classList.toggle('open', isOpen);
    toggleBtn.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  toggleBtn.addEventListener('click', () => toggleMenu());
  backdrop.addEventListener('click', () => toggleMenu(false));

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
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
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;
      
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}
