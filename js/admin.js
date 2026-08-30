/**
 * Sooryavamshi Solar Projects LLP - Admin Portal Controller
 * Manages Supabase Auth, leads dashboard, status mutations, search, and date formatting.
 */

(function() {
  let activeEnquiries = [];
  let currentSearch = "";
  let currentStatus = "All";

  document.addEventListener("DOMContentLoaded", initAdminPortal);

  async function initAdminPortal() {
    setupEventListeners();
    await checkAuthState();
  }

  function setupEventListeners() {
    // 1. Sign In Form
    const loginForm = document.getElementById("adminLoginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", handleLogin);
    }

    // 2. Sign Out Button
    const signOutBtn = document.getElementById("signOutBtn");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", handleSignOut);
    }

    // 3. Search input (debounced)
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener("input", function(e) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentSearch = e.target.value;
          renderTable();
        }, 200);
      });
    }

    // 4. Status Filter dropdown
    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) {
      statusFilter.addEventListener("change", function(e) {
        currentStatus = e.target.value;
        renderTable();
      });
    }

    // 5. Refresh Button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function() {
        loadEnquiries(true);
      });
    }

    // 6. Supabase Config Modal triggers
    const modal = document.getElementById("configModal");
    const openModalBtn = document.getElementById("configModalBtn");
    const closeModalBtn = document.getElementById("closeConfigModalBtn");
    const cancelModalBtn = document.getElementById("cancelConfigBtn");
    const configForm = document.getElementById("configForm");

    if (openModalBtn && modal) {
      openModalBtn.addEventListener("click", () => {
        const cfg = SOORYAVAMSHI_SUPABASE_CONFIG.getConfig();
        document.getElementById("modalSupabaseUrl").value = cfg.url || "";
        document.getElementById("modalSupabaseKey").value = cfg.anonKey || "";
        modal.classList.add("active");
      });
    }

    const hideModal = () => modal && modal.classList.remove("active");
    if (closeModalBtn) closeModalBtn.addEventListener("click", hideModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener("click", hideModal);

    if (configForm) {
      configForm.addEventListener("submit", function(e) {
        e.preventDefault();
        const url = document.getElementById("modalSupabaseUrl").value.trim();
        const key = document.getElementById("modalSupabaseKey").value.trim();
        SOORYAVAMSHI_SUPABASE_CONFIG.setConfig(url, key);
        SooryavamshiSupabase.resetClient();
        hideModal();
        alert("Supabase configuration saved successfully! Reconnecting...");
        checkAuthState();
      });
    }
  }

  /**
   * Checks Supabase connection and loads dashboard
   */
  async function checkAuthState() {
    const authGate = document.getElementById("authGateSection");
    const dashboard = document.getElementById("dashboardSection");
    const userProfileWrap = document.getElementById("userProfileWrap");
    const userEmailTag = document.getElementById("userEmailTag");

    // Always show dashboard and hide login barrier
    if (authGate) authGate.style.display = "none";
    if (dashboard) dashboard.style.display = "block";
    if (userProfileWrap) userProfileWrap.style.display = "flex";

    const user = await SooryavamshiSupabase.getAdminUser();
    if (user && user.email) {
      userEmailTag.textContent = user.email;
    } else {
      userEmailTag.textContent = "Sooryavamshi Staff";
    }

    loadEnquiries();
  }

  /**
   * Handles email & password login
   */
  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;
    const errorEl = document.getElementById("loginErrorMsg");
    const submitBtn = document.getElementById("loginSubmitBtn");

    errorEl.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>Authenticating...</span>";

    try {
      const { data, error } = await SooryavamshiSupabase.signInAdmin(email, password);

      if (error) {
        errorEl.textContent = error.message || "Invalid login credentials. Please check and retry.";
        errorEl.style.display = "block";
      } else {
        await checkAuthState();
      }
    } catch (err) {
      errorEl.textContent = "Connection error. Please verify your Supabase project status.";
      errorEl.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "<span>Sign In to Dashboard</span>";
    }
  }

  /**
   * Handles user logout
   */
  async function handleSignOut() {
    await SooryavamshiSupabase.signOutAdmin();
    await checkAuthState();
  }

  /**
   * Loads enquiries from Supabase
   */
  async function loadEnquiries(isManualRefresh = false) {
    const tbody = document.getElementById("enquiriesTableBody");
    if (!tbody) return;

    if (isManualRefresh) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #64748B;">Refreshing records from Supabase...</td></tr>`;
    }

    const response = await SooryavamshiSupabase.getEnquiries();
    activeEnquiries = response.data || [];

    updateMetrics();
    renderTable();
  }

  /**
   * Computes and updates metrics cards
   */
  function updateMetrics() {
    const total = activeEnquiries.length;
    const newCount = activeEnquiries.filter(x => x.status === "New").length;
    const siteVisits = activeEnquiries.filter(x => x.status === "Site Visit Scheduled" || x.status === "Site Visit Completed").length;
    const converted = activeEnquiries.filter(x => x.status === "Converted").length;

    document.getElementById("metricTotal").textContent = total;
    document.getElementById("metricNew").textContent = newCount;
    document.getElementById("metricSiteVisits").textContent = siteVisits;
    document.getElementById("metricConverted").textContent = converted;
  }

  /**
   * Filters and renders enquiries table
   */
  function renderTable() {
    const tbody = document.getElementById("enquiriesTableBody");
    if (!tbody) return;

    let filtered = [...activeEnquiries];

    // Status filter
    if (currentStatus !== "All") {
      filtered = filtered.filter(item => item.status === currentStatus);
    }

    // Search query
    if (currentSearch.trim()) {
      const q = currentSearch.trim().toLowerCase();
      filtered = filtered.filter(item => {
        const name = (item.full_name || "").toLowerCase();
        const phone = (item.phone_number || "").toLowerCase();
        const loc = (item.city_location || "").toLowerCase();
        const pin = (item.pin_code || "").toLowerCase();
        const email = (item.email || "").toLowerCase();
        const kseb = (item.kseb_consumer_number || "").toLowerCase();
        return name.includes(q) || phone.includes(q) || loc.includes(q) || pin.includes(q) || email.includes(q) || kseb.includes(q);
      });
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: #64748B;">
            <div style="font-size: 1.8rem; margin-bottom: 8px;">🔍</div>
            <strong>No assessment enquiries found matching your filter.</strong>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(item => {
      const formattedDate = formatTimestampIST(item.created_at);
      const cleanPhone = (item.phone_number || "").replace(/\D/g, "");
      const waNumber = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
      const statusClass = getStatusClass(item.status);

      return `
        <tr data-id="${item.id}">
          <td style="white-space: nowrap; font-size: 0.82rem; font-family: var(--font-technical); color: #475569;">
            ${formattedDate}
            ${item._offline_pending ? '<br><span style="color:#D97706;font-size:0.72rem;font-weight:700;">[Local Buffer]</span>' : ''}
          </td>
          <td>
            <strong style="color: #073B6B; font-size: 0.95rem;">${escapeHtml(item.full_name || "")}</strong>
            ${item.email ? `<br><a href="mailto:${encodeURIComponent(item.email)}" style="font-size: 0.8rem; color: #64748B;">${escapeHtml(item.email)}</a>` : ""}
          </td>
          <td style="white-space: nowrap;">
            <a href="tel:${cleanPhone}" class="quick-action-link" title="Call customer">
              📞 ${escapeHtml(item.phone_number || "")}
            </a>
            <br>
            <a href="https://wa.me/${waNumber}" target="_blank" rel="noopener noreferrer" class="whatsapp-btn" title="Chat on WhatsApp">
              💬 WhatsApp
            </a>
          </td>
          <td>
            <strong>${escapeHtml(item.city_location || "")}</strong>
            ${item.pin_code ? `<br><span style="font-size: 0.78rem; color: #64748B;">PIN: ${escapeHtml(item.pin_code)}</span>` : ""}
          </td>
          <td style="font-family: var(--font-technical); font-weight: 700; color: #218739; font-size: 0.95rem;">
            ${item.monthly_consumption ? `${item.monthly_consumption} Units` : "-"}
          </td>
          <td style="font-family: var(--font-technical); font-size: 0.82rem; color: #073B6B;">
            ${item.kseb_consumer_number ? `<code>${escapeHtml(item.kseb_consumer_number)}</code>` : '<span style="color:#94A3B8;">—</span>'}
          </td>
          <td style="max-width: 240px; font-size: 0.82rem; color: #475569; line-height: 1.4;">
            ${escapeHtml(item.rooftop_details || "No special rooftop notes provided.")}
          </td>
          <td>
            <select class="status-select ${statusClass}" onchange="window.handleStatusChange('${item.id}', this.value)">
              <option value="New" ${item.status === "New" ? "selected" : ""}>New</option>
              <option value="Contacted" ${item.status === "Contacted" ? "selected" : ""}>Contacted</option>
              <option value="Site Visit Scheduled" ${item.status === "Site Visit Scheduled" ? "selected" : ""}>Site Visit Scheduled</option>
              <option value="Site Visit Completed" ${item.status === "Site Visit Completed" ? "selected" : ""}>Site Visit Completed</option>
              <option value="Proposal Sent" ${item.status === "Proposal Sent" ? "selected" : ""}>Proposal Sent</option>
              <option value="Converted" ${item.status === "Converted" ? "selected" : ""}>Converted</option>
              <option value="Closed" ${item.status === "Closed" ? "selected" : ""}>Closed</option>
            </select>
          </td>
        </tr>
      `;
    }).join("");
  }

  /**
   * Updates enquiry status on selection change
   */
  window.handleStatusChange = async function(id, newStatus) {
    const selectEl = document.querySelector(`tr[data-id="${id}"] .status-select`);
    if (selectEl) {
      selectEl.className = `status-select ${getStatusClass(newStatus)}`;
    }

    const item = activeEnquiries.find(x => x.id === id);
    if (item) item.status = newStatus;

    updateMetrics();

    const res = await SooryavamshiSupabase.updateEnquiryStatus(id, newStatus);
    if (!res.success) {
      alert("Failed to update status: " + (res.error || "Unknown error"));
    }
  };

  /**
   * Helper: Formats ISO timestamp to Indian Standard Time (IST)
   */
  function formatTimestampIST(isoString) {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }).format(date);
    } catch (e) {
      return isoString;
    }
  }

  /**
   * Helper: Returns CSS class for status pill
   */
  function getStatusClass(status) {
    switch (status) {
      case "New": return "status-new";
      case "Contacted": return "status-contacted";
      case "Site Visit Scheduled": return "status-visit-sched";
      case "Site Visit Completed": return "status-visit-done";
      case "Proposal Sent": return "status-proposal";
      case "Converted": return "status-converted";
      case "Closed": return "status-closed";
      default: return "status-new";
    }
  }

  /**
   * Helper: Sanitizes HTML output to prevent XSS
   */
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
