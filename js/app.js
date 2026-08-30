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
  initContactForm();
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
 * 4. Contact & Consultation Form
 */
function initContactForm() {
  const form = document.getElementById('consultationForm');
  const successBox = document.getElementById('formSuccessMessage');

  if (!form || !successBox) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      Processing Request...
    `;

    // Simulate reliable CRM processing
    setTimeout(() => {
      const name = document.getElementById('contactName')?.value || 'Valued Customer';
      const phone = document.getElementById('contactPhone')?.value || '';
      const location = document.getElementById('contactLocation')?.value || '';
      const pin = document.getElementById('contactPin')?.value || '';
      const ksebNo = document.getElementById('contactKsebNo')?.value || '';
      const units = document.getElementById('contactUnits')?.value || 'N/A';
      const refId = `SS-${Math.floor(100000 + Math.random() * 900000)}`;

      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      form.reset();

      const locSummary = [location, pin ? `PIN: ${pin}` : '', ksebNo ? `KSEB No: ${ksebNo}` : ''].filter(Boolean).join(' | ');

      successBox.style.display = 'block';
      successBox.innerHTML = `
        <div style="font-size: 2.2rem; margin-bottom: 8px;">☀️</div>
        <h4 style="color: var(--color-success); font-size: 1.25rem; margin-bottom: 6px;">Site Assessment Request Received!</h4>
        <p style="font-size: 0.95rem; margin-bottom: 12px; color: var(--color-text-body);">
          Thank you, <strong>${name}</strong>. Our residential solar engineer will review your power profile (${units} units/mo${locSummary ? ` for <em>${locSummary}</em>` : ''}) and coordinate KSEB section verification. We will call you at <strong>${phone}</strong> within <strong>4 working hours</strong>.
        </p>
        <div style="font-family: var(--font-heading); font-size: 0.85rem; background: #FFFFFF; display: inline-block; padding: 6px 14px; border-radius: var(--radius-full); border: 1px dashed var(--color-success); color: var(--color-primary); font-weight: 700;">
          Reference Ticket: #${refId}
        </div>
      `;

      successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 1000);
  });
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
