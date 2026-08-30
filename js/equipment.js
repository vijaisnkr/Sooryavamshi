/**
 * Sooryavamshi Solar Projects LLP - Equipment Showcase Controller
 * Handles expandable technical specifications and details.
 */

const EquipmentController = (function() {
  function init() {
    const expandButtons = document.querySelectorAll('.eq-expand-btn');

    expandButtons.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('data-target');
        const content = document.getElementById(targetId);
        
        if (!content) return;

        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
          content.classList.remove('expanded');
          this.innerHTML = `<span>View Technical Details</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
          this.setAttribute('aria-expanded', 'false');
        } else {
          content.classList.add('expanded');
          this.innerHTML = `<span>Hide Technical Details</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
          this.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  return { init };
})();
