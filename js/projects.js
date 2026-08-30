/**
 * Sooryavamshi Solar Projects LLP - Projects Gallery & Modal Viewer
 * Handles category filtering, project cards rendering, and detailed modal views.
 */

const ProjectsController = (function() {
  let activeFilter = 'all';
  let modalOverlay, modalContent, modalCloseBtn;

  function init() {
    modalOverlay = document.getElementById('projectModalOverlay');
    modalContent = document.getElementById('projectModalContent');
    modalCloseBtn = document.getElementById('projectModalCloseBtn');

    bindFilterButtons();
    bindCardClicks();
    bindModalEvents();
  }

  function bindFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        activeFilter = this.getAttribute('data-filter');

        projectCards.forEach(card => {
          const category = card.getAttribute('data-category');
          if (activeFilter === 'all' || category === activeFilter) {
            card.style.display = 'flex';
            card.style.animation = 'fadeInUp 400ms ease forwards';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  function bindCardClicks() {
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
      card.addEventListener('click', function() {
        const projId = this.getAttribute('data-id');
        openProjectModal(projId);
      });
    });
  }

  function openProjectModal(id) {
    const project = SOORYAVAMSHI_CONFIG.projects.find(p => p.id === id);
    if (!project || !modalOverlay || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-image-banner">
        <img src="${project.image}" alt="${project.title}">
        <span class="project-badge" style="position: absolute; top: 16px; left: 16px;">${project.badge}</span>
        <span class="project-capacity-pill" style="position: absolute; bottom: 16px; right: 16px;">${project.capacity}</span>
      </div>
      <div class="modal-body">
        <div class="project-location" style="margin-bottom: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          ${project.location}
        </div>
        <h3 style="font-size: 1.6rem; margin-bottom: 12px; color: var(--color-primary);">${project.title}</h3>
        <p style="font-size: 1rem; color: var(--color-text-body); line-height: 1.6; margin-bottom: 20px;">${project.description}</p>
        
        <div class="modal-specs-grid">
          <div class="modal-spec-box">
            <div class="modal-spec-label">Photovoltaic Modules</div>
            <div class="modal-spec-val" style="font-size: 0.95rem;">${project.panels}</div>
          </div>
          <div class="modal-spec-box">
            <div class="modal-spec-label">Inverter &amp; Control</div>
            <div class="modal-spec-val" style="font-size: 0.95rem;">${project.inverter}</div>
          </div>
          <div class="modal-spec-box">
            <div class="modal-spec-label">Annual Clean Yield</div>
            <div class="modal-spec-val" style="font-size: 0.95rem; color: var(--color-success);">${project.annualGeneration}</div>
          </div>
        </div>

        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--color-border-light); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div style="font-family: var(--font-heading); font-weight: 700; color: var(--color-success); font-size: 1.1rem;">
            Estimated Benefit: ${project.savings}
          </div>
          <a href="#contact" class="btn btn-primary" onclick="ProjectsController.closeModal();">
            Consult on Similar Project
          </a>
        </div>
      </div>
    `;

    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function bindModalEvents() {
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', closeModal);
    }

    if (modalOverlay) {
      modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
          closeModal();
        }
      });
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  return {
    init,
    openProjectModal,
    closeModal
  };
})();
