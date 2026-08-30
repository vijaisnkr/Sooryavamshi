/**
 * Sooryavamshi Solar Projects LLP - KSEB Feasibility Portal Gateway
 * Guides consumers to the official KSEB reCap capacity tracker and connects to our Solar Calculator & Enquiry Form.
 */

const KsebFeasibilityGateway = (function() {
  function init() {
    const btnPortal = document.getElementById('btnOpenKsebPortal');
    if (btnPortal) {
      btnPortal.addEventListener('click', function() {
        console.log('[Sooryavamshi] Redirecting user to official KSEB reCap portal: https://wss.kseb.in/selfservices/reCap');
      });
    }

    // Connect calculator next button smoothly if clicked
    const calcNextBtn = document.getElementById('calcFeasibilityNextBtn');
    if (calcNextBtn) {
      calcNextBtn.addEventListener('click', function(e) {
        const target = document.getElementById('feasibility');
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return { init };
})();
