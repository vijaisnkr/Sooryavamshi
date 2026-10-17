/**
 * Suryavamshi Solar - Staff Portal Controller
 * Sign-in check, enquiry list (status tabs, search, sort), lead details panel
 * (status, follow-up date, private notes), spreadsheet download and a quiet
 * auto-refresh that announces new enquiries. Every customer value is escaped
 * before it reaches the page.
 */

(function() {
  const STATUSES = ["New", "Contacted", "Site Visit Scheduled", "Site Visit Completed", "Proposal Sent", "Converted", "Closed"];
  const STATUS_LABEL = {
    "New": "New",
    "Contacted": "Contacted",
    "Site Visit Scheduled": "Visit booked",
    "Site Visit Completed": "Visit done",
    "Proposal Sent": "Proposal sent",
    "Converted": "Converted",
    "Closed": "Closed"
  };
  const STATUS_CLASS = {
    "New": "st-new",
    "Contacted": "st-contacted",
    "Site Visit Scheduled": "st-visit-sched",
    "Site Visit Completed": "st-visit-done",
    "Proposal Sent": "st-proposal",
    "Converted": "st-converted",
    "Closed": "st-closed"
  };
  const TABS = [["All", "All"], ["due", "Follow-up due"]].concat(STATUSES.map(s => [s, STATUS_LABEL[s]]));
  const IST = "Asia/Kolkata";
  const REFRESH_MS = 2 * 60 * 1000;
  const PAGE_TITLE = "Enquiries · Suryavamshi Staff";

  let enquiries = [];
  let knownIds = null;
  let view = "All";
  let search = "";
  let sort = "newest";
  let lastLoaded = 0;
  let loading = false;
  let openId = null;
  let notesDirty = false;
  let lastFocus = null;
  let supportsExtras = true; // false until the admin_notes / follow_up_on columns exist

  const $ = id => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", initAdminPortal);

  async function initAdminPortal() {
    setupTheme();
    buildTabs();
    setupEventListeners();
    await checkAuthState();
  }

  /* ---------- sign-in ---------- */

  async function checkAuthState() {
    let activeUserEmail = null;

    try {
      const user = await SooryavamshiSupabase.getAdminUser();
      if (user && user.email) {
        activeUserEmail = user.email;
      }
    } catch (e) {
      console.warn("Supabase user fetch failed:", e);
    }

    // Only a verified Supabase user gets in
    if (!activeUserEmail) {
      localStorage.removeItem("sooryavamshi_admin_session");
      window.location.replace("login.html");
      return;
    }

    $("userEmailTag").textContent = activeUserEmail;
    $("userAvatar").textContent = activeUserEmail.charAt(0);
    $("userProfileWrap").title = `Signed in as ${activeUserEmail}`;
    paintGreeting();

    await loadEnquiries();
    startAutoRefresh();
  }

  async function handleSignOut() {
    try {
      await SooryavamshiSupabase.signOutAdmin();
    } catch (e) {}
    localStorage.removeItem("sooryavamshi_admin_session");
    window.location.href = "login.html";
  }

  /* ---------- events ---------- */

  function setupEventListeners() {
    $("signOutBtn").addEventListener("click", handleSignOut);
    $("refreshBtn").addEventListener("click", () => loadEnquiries({ manual: true }));
    $("exportBtn").addEventListener("click", exportCsv);

    let debounceTimer = null;
    $("searchInput").addEventListener("input", e => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        search = e.target.value;
        renderList();
      }, 150);
    });

    $("sortSelect").addEventListener("change", e => {
      sort = e.target.value;
      renderList();
    });

    $("statusTabs").addEventListener("click", e => {
      const tab = e.target.closest("[data-view]");
      if (tab) setView(tab.dataset.view);
    });

    document.querySelectorAll(".metric[data-view]").forEach(card => {
      card.addEventListener("click", () => setView(view === card.dataset.view ? "All" : card.dataset.view));
    });

    const list = $("leadList");
    list.addEventListener("click", e => {
      const copyBtn = e.target.closest("[data-copy]");
      if (copyBtn) {
        copyText(copyBtn.dataset.copy, "KSEB number copied");
        return;
      }
      if (e.target.closest("[data-retry]")) {
        loadEnquiries({ manual: true });
        return;
      }
      if (e.target.closest("[data-clear]")) {
        clearFilters();
        return;
      }
      if (e.target.closest("a, select, button:not([data-open])")) return;
      const row = e.target.closest(".lead");
      if (row) openDrawer(row.dataset.id);
    });
    list.addEventListener("change", e => {
      const sel = e.target.closest("select[data-status]");
      if (sel) changeStatus(sel.closest(".lead").dataset.id, sel.value);
    });

    // Lead details panel
    $("drawerClose").addEventListener("click", closeDrawer);
    $("drawerBackdrop").addEventListener("click", closeDrawer);
    $("drawerStatus").addEventListener("click", e => {
      const pill = e.target.closest("[data-set-status]");
      if (pill && openId) changeStatus(openId, pill.dataset.setStatus);
    });
    $("drawerQuick").addEventListener("click", e => {
      const copyBtn = e.target.closest("[data-copy]");
      if (copyBtn) copyText(copyBtn.dataset.copy, copyBtn.dataset.copyMsg || "Copied");
    });
    $("followDate").addEventListener("change", e => setFollowUp(e.target.value || null));
    document.querySelectorAll("[data-follow]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.follow;
        const key = v === "clear" ? null : addDaysKey(Number(v));
        $("followDate").value = key || "";
        setFollowUp(key);
      });
    });
    $("notesInput").addEventListener("input", () => {
      notesDirty = true;
      setNotesState("Not saved yet", "");
    });
    $("notesSave").addEventListener("click", saveNotes);

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && openId) {
        closeDrawer();
        return;
      }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
      if (e.key === "/" && !typing && !openId) {
        e.preventDefault();
        $("searchInput").focus();
      }
    });
  }

  function setView(v) {
    view = v;
    renderAll();
    if (window.innerWidth < 980) {
      document.querySelector(".panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function clearFilters() {
    view = "All";
    search = "";
    $("searchInput").value = "";
    renderAll();
  }

  /* ---------- data ---------- */

  async function loadEnquiries(opts = {}) {
    if (loading) return;
    loading = true;
    const btn = $("refreshBtn");
    btn.classList.add("spin");
    btn.disabled = true;

    try {
      const res = await SooryavamshiSupabase.getEnquiries();

      if (res.error) {
        if (/40[13]/.test(res.error)) {
          window.location.replace("login.html");
          return;
        }
        if (!enquiries.length) {
          showListError("Check the internet connection, then press Try again.");
        } else {
          toast("Couldn't check for new enquiries. Showing the last list.", true);
        }
        return;
      }

      const rows = res.data || [];

      // An expired sign-in comes back as an empty list, not an error
      if (!rows.length && enquiries.length) {
        const user = await SooryavamshiSupabase.getAdminUser().catch(() => null);
        if (!user) {
          window.location.replace("login.html");
          return;
        }
      }

      const fresh = knownIds ? rows.filter(r => !knownIds.has(r.id)) : [];
      knownIds = new Set(rows.map(r => r.id));
      enquiries = rows;
      if (rows.length) supportsExtras = "follow_up_on" in rows[0] && "admin_notes" in rows[0];
      lastLoaded = Date.now();

      renderAll();

      if (fresh.length === 1) {
        toast(`New enquiry from ${fresh[0].full_name || "a visitor"}`);
      } else if (fresh.length > 1) {
        toast(`${fresh.length} new enquiries just came in`);
      } else if (opts.manual) {
        toast("You're up to date");
      }

      if (openId) {
        const item = findItem(openId);
        if (item) fillDrawer(item, !notesDirty);
      }
    } finally {
      loading = false;
      btn.classList.remove("spin");
      btn.disabled = false;
    }
  }

  function startAutoRefresh() {
    setInterval(() => {
      if (document.visibilityState === "visible") loadEnquiries();
    }, REFRESH_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoaded > 60 * 1000) loadEnquiries();
    });
    setInterval(paintUpdated, 30 * 1000);
  }

  function findItem(id) {
    return enquiries.find(x => String(x.id) === String(id));
  }

  // Optimistic save: show the change at once, put it back if the database refuses
  async function saveFields(id, fields, okMsg) {
    const item = findItem(id);
    if (!item) return false;
    const before = {};
    Object.keys(fields).forEach(k => { before[k] = item[k]; });
    Object.assign(item, fields);
    renderAll();
    if (openId === String(id)) fillDrawer(item, false);

    const res = await SooryavamshiSupabase.updateEnquiry(id, fields);
    if (!res || !res.success) {
      Object.assign(item, before);
      renderAll();
      if (openId === String(id)) fillDrawer(item, false);
      toast(`Couldn't save. ${(res && res.error) || "Please try again."}`, true);
      return false;
    }
    if (okMsg) toast(okMsg);
    return true;
  }

  async function changeStatus(id, status) {
    const item = findItem(id);
    if (!item || item.status === status) return;
    const name = firstName(item.full_name) || "Enquiry";
    const ok = await saveFields(id, { status }, `${name} moved to ${STATUS_LABEL[status]}`);
    if (ok && status === "Site Visit Scheduled" && supportsExtras && !item.follow_up_on && openId === String(id)) {
      $("followDate").focus();
      toast("Pick the visit date under Next follow-up");
    }
  }

  function setFollowUp(key) {
    if (!openId) return;
    saveFields(openId, { follow_up_on: key }, key ? `Follow-up set for ${formatDay(key)}` : "Follow-up cleared");
  }

  async function saveNotes() {
    if (!openId) return;
    const text = $("notesInput").value.trim();
    setNotesState("Saving…", "");
    const ok = await saveFields(openId, { admin_notes: text || null });
    if (ok) {
      notesDirty = false;
      setNotesState(`Saved at ${new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date())}`, "ok");
    } else {
      setNotesState("Not saved. Try again.", "err");
    }
    return ok;
  }

  function setNotesState(text, cls) {
    const el = $("notesState");
    el.textContent = text;
    el.className = "save-state" + (cls ? " " + cls : "");
  }

  /* ---------- rendering ---------- */

  function renderAll() {
    paintMetrics();
    paintTabs();
    renderList();
    paintUpdated();
  }

  function isOpenStatus(status) {
    return status !== "Converted" && status !== "Closed";
  }

  function isDue(item) {
    return !!item.follow_up_on && isOpenStatus(item.status) && item.follow_up_on <= todayKey();
  }

  function isFresh(item) {
    return item.status === "New" && Date.now() - new Date(item.created_at).getTime() < 24 * 3600 * 1000;
  }

  function paintGreeting() {
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: IST, hour: "numeric", hour12: false }).format(new Date()));
    $("greeting").textContent = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  }

  function paintMetrics() {
    const total = enquiries.length;
    const count = s => enquiries.filter(x => x.status === s).length;
    const newCount = count("New");
    const due = enquiries.filter(isDue);
    const overdue = due.filter(x => x.follow_up_on < todayKey()).length;
    const visits = count("Site Visit Scheduled");
    const visitsDone = count("Site Visit Completed");
    const won = count("Converted");

    $("metricNew").textContent = newCount;
    $("metricNewSub").textContent = newCount ? "Waiting for a first call" : "Everyone has been called";
    $("metricDue").textContent = due.length;
    $("metricDueSub").textContent = !supportsExtras ? "Turns on after the update" : overdue ? `${overdue} overdue` : due.length ? "Due today" : "Nothing due today";
    document.querySelector(".m-due").classList.toggle("has-due", due.length > 0);
    $("metricSiteVisits").textContent = visits;
    $("metricVisitSub").textContent = `${visitsDone} ${visitsDone === 1 ? "visit" : "visits"} done`;
    $("metricConverted").textContent = won;
    $("metricWonSub").textContent = total ? `${Math.round((won / total) * 100)}% of ${total} enquiries` : "No enquiries yet";

    document.querySelectorAll(".metric[data-view]").forEach(card => {
      card.classList.toggle("active", card.dataset.view === view);
    });

    const parts = [];
    if (newCount) parts.push(`${newCount} new ${newCount === 1 ? "enquiry is" : "enquiries are"} waiting for a first call`);
    if (due.length) parts.push(`${due.length} ${due.length === 1 ? "follow-up is" : "follow-ups are"} due`);
    $("summaryLine").textContent = parts.length
      ? parts.join(" and ") + "."
      : total ? "You're all caught up. Nothing is waiting on you right now." : "New requests from the website will appear here.";

    document.title = (newCount ? `(${newCount}) ` : "") + PAGE_TITLE;
  }

  function buildTabs() {
    $("statusTabs").innerHTML = TABS.map(([key, label]) =>
      `<button type="button" class="tab" role="tab" data-view="${esc(key)}" aria-selected="false">${esc(label)} <span class="count">0</span></button>`
    ).join("");
  }

  function paintTabs() {
    document.querySelectorAll("#statusTabs .tab").forEach(tab => {
      const key = tab.dataset.view;
      const n = key === "All" ? enquiries.length
        : key === "due" ? enquiries.filter(isDue).length
        : enquiries.filter(x => x.status === key).length;
      tab.querySelector(".count").textContent = n;
      tab.setAttribute("aria-selected", String(key === view));
      tab.classList.toggle("hidden", key === "due" && !supportsExtras);
    });
  }

  function paintUpdated() {
    if (!lastLoaded) return;
    const s = Math.round((Date.now() - lastLoaded) / 1000);
    $("updatedText").textContent = s < 45 ? "Updated just now" : `Updated ${Math.round(s / 60)} min ago`;
  }

  function getFiltered() {
    let rows = enquiries.slice();
    if (view === "due") rows = rows.filter(isDue);
    else if (view !== "All") rows = rows.filter(x => x.status === view);

    const q = search.trim().toLowerCase();
    if (q) {
      const qDigits = q.replace(/\D/g, "");
      rows = rows.filter(item => {
        const text = [item.full_name, item.city_location, item.pin_code, item.email, item.admin_notes, item.rooftop_details]
          .map(v => String(v || "").toLowerCase()).join(" ");
        if (text.includes(q)) return true;
        if (qDigits.length >= 3) {
          const nums = [item.phone_number, item.kseb_consumer_number].map(v => String(v || "").replace(/\D/g, "")).join(" ");
          return nums.includes(qDigits);
        }
        return false;
      });
    }

    const time = x => new Date(x.created_at).getTime() || 0;
    if (sort === "oldest") rows.sort((a, b) => time(a) - time(b));
    else if (sort === "follow") rows.sort((a, b) => {
      if (a.follow_up_on && b.follow_up_on) return a.follow_up_on.localeCompare(b.follow_up_on);
      if (a.follow_up_on) return -1;
      if (b.follow_up_on) return 1;
      return time(b) - time(a);
    });
    else if (sort === "bill") rows.sort((a, b) => (Number(b.monthly_consumption) || 0) - (Number(a.monthly_consumption) || 0));
    else rows.sort((a, b) => time(b) - time(a));
    return rows;
  }

  function renderList() {
    const list = $("leadList");
    const rows = getFiltered();

    if (!enquiries.length) {
      list.innerHTML = `<div class="empty"><svg class="ic"><use href="#i-inbox"/></svg><strong>No enquiries yet</strong>New site assessment requests from the website will show up here.</div>`;
    } else if (!rows.length) {
      list.innerHTML = `<div class="empty"><svg class="ic"><use href="#i-search"/></svg><strong>Nothing matches</strong>No enquiries fit this filter.<div style="margin-top:14px"><button type="button" class="btn btn-sm" data-clear>Show all enquiries</button></div></div>`;
    } else {
      list.innerHTML = rows.map(rowHtml).join("");
      if (window.SvSelect) SvSelect.enhanceAll(list);
    }

    $("listCount").textContent = enquiries.length
      ? `Showing ${rows.length} of ${enquiries.length} ${enquiries.length === 1 ? "enquiry" : "enquiries"}`
      : "";
  }

  function showListError(message) {
    $("leadList").innerHTML = `<div class="empty"><svg class="ic"><use href="#i-alert"/></svg><strong>Couldn't load enquiries</strong>${esc(message)}<div style="margin-top:14px"><button type="button" class="btn btn-sm" data-retry>Try again</button></div></div>`;
    $("summaryLine").textContent = "The list couldn't be loaded.";
  }

  function rowHtml(item) {
    const id = String(item.id);
    const name = item.full_name || "No name given";
    const town = item.city_location || "Location not given";
    const fresh = isFresh(item);
    const follow = followChip(item);
    const kseb = (item.kseb_consumer_number || "").trim();

    return `
      <div class="lead${fresh ? " is-fresh" : ""}${openId === id ? " is-open" : ""}" data-id="${esc(id)}">
        <div class="who">
          <button type="button" class="who-name" data-open>${esc(name)}${fresh ? ' <span class="badge-new">New</span>' : ""}</button>
          <div class="who-sub"><svg class="ic"><use href="#i-pin"/></svg><span>${esc(town)}${item.pin_code ? " · " + esc(item.pin_code) : ""}</span></div>
        </div>
        <div class="when col-when">${esc(relTime(item.created_at))}<small>${esc(formatShortIST(item.created_at))}</small></div>
        <div class="contact">
          <span class="phone">${esc(item.phone_number || "")}</span>
          <a class="icon-btn call" href="${esc(telHref(item.phone_number))}" title="Call" aria-label="Call ${esc(name)}"><svg class="ic"><use href="#i-phone"/></svg></a>
          <a class="icon-btn wa" href="${esc(waHref(item))}" target="_blank" rel="noopener noreferrer" title="WhatsApp" aria-label="WhatsApp ${esc(name)}"><svg class="ic"><use href="#i-wa"/></svg></a>
        </div>
        <div class="usage">${usageHtml(item)}</div>
        <div class="kseb">${kseb
          ? `<code>${esc(kseb)}</code><button type="button" class="copy" data-copy="${esc(kseb)}" title="Copy KSEB number" aria-label="Copy KSEB number"><svg class="ic"><use href="#i-copy"/></svg></button>`
          : '<span class="muted-dash">Not given</span>'}</div>
        <div class="col-follow">${follow
          ? `<span class="follow ${follow.cls}"><svg class="ic"><use href="#i-cal"/></svg>${esc(follow.label)}</span>`
          : '<span class="muted-dash">—</span>'}</div>
        <div class="col-status">
          <select class="status ${STATUS_CLASS[item.status] || "st-new"}" data-status aria-label="Status for ${esc(name)}">
            ${STATUSES.map(s => `<option value="${esc(s)}" data-cls="${STATUS_CLASS[s]}"${item.status === s ? " selected" : ""}>${esc(STATUS_LABEL[s])}</option>`).join("")}
          </select>
        </div>
        <svg class="ic chev" aria-hidden="true"><use href="#i-right"/></svg>
      </div>`;
  }

  function usageHtml(item) {
    const bill = Number(item.monthly_bill_inr) || 0;
    const units = Number(item.monthly_consumption) || 0;
    const kw = Number(item.estimated_solar_capacity) || 0;
    const kwText = kw ? `${kw.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kW` : "";
    if (bill) {
      const sub = [units ? `≈ ${fmtNum(units)} units` : "", kwText].filter(Boolean).join(" · ");
      return `₹${fmtNum(bill)} bill${sub ? `<small>${esc(sub)}</small>` : ""}`;
    }
    if (units) {
      return `${fmtNum(units)} units${kwText ? `<small>≈ ${esc(kwText)} system</small>` : ""}`;
    }
    return '<span class="muted-dash">Not given</span>';
  }

  function followChip(item) {
    if (!item.follow_up_on) return null;
    const d = daysBetween(todayKey(), item.follow_up_on);
    const open = isOpenStatus(item.status);
    if (d < 0) return { label: d === -1 ? "Yesterday" : `${-d} days late`, cls: open ? "overdue" : "" };
    if (d === 0) return { label: "Today", cls: open ? "today" : "" };
    if (d === 1) return { label: "Tomorrow", cls: "" };
    return { label: formatDay(item.follow_up_on), cls: "" };
  }

  /* ---------- lead details panel ---------- */

  function openDrawer(id) {
    const item = findItem(id);
    if (!item) return;
    if (openId && openId !== String(id) && notesDirty) saveNotes();
    openId = String(id);
    notesDirty = false;
    lastFocus = document.activeElement;
    fillDrawer(item, true);
    setNotesState("", "");
    $("leadDrawer").classList.add("open");
    $("leadDrawer").setAttribute("aria-hidden", "false");
    $("drawerBackdrop").classList.add("open");
    document.body.style.overflow = "hidden";
    document.querySelectorAll(".lead.is-open").forEach(r => r.classList.remove("is-open"));
    const row = document.querySelector(`.lead[data-id="${cssEsc(openId)}"]`);
    if (row) row.classList.add("is-open");
    setTimeout(() => $("drawerClose").focus(), 60);
  }

  async function closeDrawer() {
    if (!openId) return;
    if (notesDirty) await saveNotes();
    openId = null;
    notesDirty = false;
    $("leadDrawer").classList.remove("open");
    $("leadDrawer").setAttribute("aria-hidden", "true");
    $("drawerBackdrop").classList.remove("open");
    document.body.style.overflow = "";
    document.querySelectorAll(".lead.is-open").forEach(r => r.classList.remove("is-open"));
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  function fillDrawer(item, resetNotes) {
    const name = item.full_name || "No name given";
    const kseb = (item.kseb_consumer_number || "").trim();
    $("drawerName").textContent = name;
    $("drawerSub").textContent = `Received ${formatFullIST(item.created_at)} · ${relTime(item.created_at)}`;

    const quick = [
      `<a class="btn" href="${esc(telHref(item.phone_number))}"><svg class="ic"><use href="#i-phone"/></svg>Call</a>`,
      `<a class="btn btn-wa" href="${esc(waHref(item))}" target="_blank" rel="noopener noreferrer"><svg class="ic"><use href="#i-wa"/></svg>WhatsApp</a>`,
      `<a class="btn" href="${esc(mapsHref(item))}" target="_blank" rel="noopener noreferrer"><svg class="ic"><use href="#i-pin"/></svg>Open in Maps</a>`,
      kseb
        ? `<button type="button" class="btn" data-copy="${esc(kseb)}" data-copy-msg="KSEB number copied"><svg class="ic"><use href="#i-copy"/></svg>Copy KSEB no.</button>`
        : item.email
          ? `<a class="btn" href="mailto:${esc(item.email)}"><svg class="ic"><use href="#i-mail"/></svg>Email</a>`
          : `<button type="button" class="btn" data-copy="${esc(item.phone_number || "")}" data-copy-msg="Phone number copied"><svg class="ic"><use href="#i-copy"/></svg>Copy phone</button>`
    ];
    $("drawerQuick").innerHTML = quick.join("");

    $("drawerStatus").innerHTML = STATUSES.map(s =>
      `<button type="button" class="pill ${STATUS_CLASS[s]}" data-set-status="${esc(s)}" aria-pressed="${item.status === s}">${esc(STATUS_LABEL[s])}</button>`
    ).join("");

    $("followBlock").classList.toggle("hidden", !supportsExtras);
    $("notesBlock").classList.toggle("hidden", !supportsExtras);
    $("extrasNote").classList.toggle("hidden", supportsExtras);
    $("followDate").value = item.follow_up_on || "";
    if (resetNotes) $("notesInput").value = item.admin_notes || "";

    const bill = Number(item.monthly_bill_inr) || 0;
    const units = Number(item.monthly_consumption) || 0;
    const kw = Number(item.estimated_solar_capacity) || 0;
    const facts = [
      ["Phone", item.phone_number, "mono"],
      ["Email", item.email],
      ["Town / location", item.city_location],
      ["PIN code", item.pin_code, "mono"],
      ["KSEB consumer no.", kseb, "mono"],
      ["Monthly bill", bill ? `₹${fmtNum(bill)}` : ""],
      ["Monthly units", units ? `${fmtNum(units)} units${bill ? " (estimated from the bill)" : ""}` : ""],
      ["Suggested system", kw ? `About ${kw.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kW` : ""],
      ["Best time to call", item.preferred_contact_time],
      ["Came from", item.source]
    ];
    let html = facts.map(([label, value, cls]) =>
      `<div class="fact"><span>${esc(label)}</span><b${cls ? ` class="${cls}"` : ""}>${value ? esc(value) : '<span class="muted-dash">Not given</span>'}</b></div>`
    ).join("");
    html += `<div class="fact wide"><span>About the roof</span><p>${item.rooftop_details ? esc(item.rooftop_details) : '<span class="muted-dash">Nothing added</span>'}</p></div>`;
    $("drawerFacts").innerHTML = html;
  }

  /* ---------- helpers ---------- */

  function firstName(full) {
    const w = String(full || "").trim().split(/\s+/)[0] || "";
    if (!w) return "";
    return w === w.toUpperCase() ? w.charAt(0) + w.slice(1).toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1);
  }

  function waNumber(phone) {
    let d = String(phone || "").replace(/\D/g, "");
    if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    if (d.length === 10) d = "91" + d;
    return d;
  }

  function telHref(phone) {
    return "tel:" + String(phone || "").replace(/[^\d+]/g, "");
  }

  function waMessage(item) {
    const first = firstName(item.full_name);
    const hi = `Hello${first ? " " + first : ""}, this is Suryavamshi Solar.`;
    switch (item.status) {
      case "Site Visit Scheduled":
        return `${hi} We'd like to confirm your free site visit${item.follow_up_on ? " on " + formatDay(item.follow_up_on) : ""}. Please send your location pin here so our engineer can find your home easily.`;
      case "Site Visit Completed":
        return `${hi} Thank you for your time during the site visit. We're preparing your solar proposal and will send it to you shortly.`;
      case "Proposal Sent":
        return `${hi} Did you get a chance to look at the solar proposal we sent? We're happy to answer any questions about the system or the subsidy.`;
      case "Converted":
        return `${hi} Thank you for choosing us for your solar installation. We'll keep you updated at every step.`;
      default:
        return `${hi} Thank you for your site assessment request. When is a good time to call you?`;
    }
  }

  function waHref(item) {
    return `https://wa.me/${waNumber(item.phone_number)}?text=${encodeURIComponent(waMessage(item))}`;
  }

  function mapsHref(item) {
    const q = [item.city_location, item.pin_code, "Kerala"].filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  async function copyText(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (err) {}
      ta.remove();
    }
    toast(okMsg);
  }

  function toast(message, isError) {
    const wrap = $("toastWrap");
    const el = document.createElement("div");
    el.className = "toast" + (isError ? " err" : "");
    el.innerHTML = `<svg class="ic"><use href="#i-${isError ? "alert" : "check"}"/></svg><span></span>`;
    el.querySelector("span").textContent = message;
    wrap.appendChild(el);
    while (wrap.children.length > 3) wrap.firstElementChild.remove();
    setTimeout(() => el.remove(), isError ? 6000 : 3200);
  }

  /* ---------- Excel download ---------- */

  // Columns of the downloaded sheet: heading, width, cell type, value
  const SHEET_COLUMNS = [
    ["Received (IST)", 20, "datetime", r => r.created_at],
    ["Name", 24, "text", r => r.full_name],
    ["Phone", 17, "text", r => r.phone_number],
    ["Email", 28, "text", r => r.email],
    ["Town / location", 18, "text", r => r.city_location],
    ["PIN", 9, "text", r => r.pin_code],
    ["KSEB consumer no.", 18, "text", r => r.kseb_consumer_number],
    ["Monthly bill", 13, "rupees", r => r.monthly_bill_inr],
    ["Monthly units", 13, "number", r => r.monthly_consumption],
    ["Suggested kW", 13, "number", r => r.estimated_solar_capacity],
    ["Best time to call", 21, "text", r => r.preferred_contact_time],
    ["Status", 21, "text", r => r.status],
    ["Next follow-up", 17, "date", r => r.follow_up_on],
    ["Notes", 42, "wrap", r => r.admin_notes],
    ["About the roof", 36, "wrap", r => r.rooftop_details],
    ["Came from", 11, "text", r => r.source]
  ];

  function exportCsv() {
    const rows = getFiltered();
    if (!rows.length) {
      toast("There's nothing in this view to download", true);
      return;
    }
    const blob = buildXlsx(rows);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `suryavamshi-enquiries-${todayKey()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast(`Downloaded ${rows.length} ${rows.length === 1 ? "enquiry" : "enquiries"}`);
  }

  // A small .xlsx writer: one sheet, navy header row, frozen header, filters,
  // real dates in Indian time and phone / KSEB / PIN kept as text.
  // Customer text is always written as plain text, never as a formula.
  function buildXlsx(rows) {
    const xml = v => String(v)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const col = i => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
    const IST_MS = 5.5 * 3600 * 1000;
    const serialFromIso = iso => (new Date(iso).getTime() + IST_MS) / 86400000 + 25569;
    const serialFromKey = key => keyToUTC(key) / 86400000 + 25569;
    // style ids in styles.xml below
    const ST = { head: 1, text: 2, wrap: 3, number: 4, rupees: 5, datetime: 6, date: 7 };

    const blank = (ref, type) => `<c r="${ref}" s="${ST[type] || ST.text}"/>`; // keeps the row's bottom line
    const cell = (ref, type, value) => {
      if (value == null || value === "") return blank(ref, type);
      if (type === "datetime" || type === "date") {
        const n = type === "date" ? serialFromKey(value) : serialFromIso(value);
        return isFinite(n) ? `<c r="${ref}" s="${ST[type]}"><v>${n}</v></c>` : blank(ref, type);
      }
      if (type === "number" || type === "rupees") {
        const n = Number(value);
        return isFinite(n) ? `<c r="${ref}" s="${ST[type]}"><v>${n}</v></c>` : blank(ref, type);
      }
      return `<c r="${ref}" s="${ST[type] || ST.text}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    };

    const last = col(SHEET_COLUMNS.length - 1) + (rows.length + 1);
    const head = `<row r="1" ht="24" customHeight="1">${SHEET_COLUMNS.map((c, i) => `<c r="${col(i)}1" s="${ST.head}" t="inlineStr"><is><t>${xml(c[0])}</t></is></c>`).join("")}</row>`;
    const body = rows.map((r, ri) => {
      const n = ri + 2;
      return `<row r="${n}">${SHEET_COLUMNS.map((c, i) => cell(col(i) + n, c[2], c[3](r))).join("")}</row>`;
    }).join("");

    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${last}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${SHEET_COLUMNS.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c[1]}" customWidth="1"/>`).join("")}</cols><sheetData>${head}${body}</sheetData><autoFilter ref="A1:${last}"/><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape"/></worksheet>`;

    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="&quot;₹&quot;#,##0"/><numFmt numFmtId="165" formatCode="d mmm yyyy, h:mm AM/PM"/><numFmt numFmtId="166" formatCode="ddd, d mmm yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><color rgb="FF0B2340"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B2340"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFE1E8F0"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf><xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf><xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

    const files = [
      ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
      ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Enquiries" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Enquiries!$A$1:$${last.replace(/(\d+)$/, "$$$1")}</definedName></definedNames></workbook>`],
      ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ["xl/worksheets/sheet1.xml", sheet],
      ["xl/styles.xml", styles]
    ];
    return new Blob([zipStore(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  // Uncompressed ZIP (an .xlsx file is a zip of the XML parts above)
  function zipStore(files) {
    const enc = new TextEncoder();
    const table = zipStore.table || (zipStore.table = (() => {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
      return t;
    })());
    const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = table[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    const parts = [], central = [];
    let offset = 0;
    files.forEach(([name, text]) => {
      const nameBytes = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(8, 0, true);
      local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true); local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, nameBytes.length, true); local.setUint16(28, 0, true);
      parts.push(new Uint8Array(local.buffer), nameBytes, data);

      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true); cd.setUint16(10, 0, true);
      cd.setUint16(12, dosTime, true); cd.setUint16(14, dosDate, true); cd.setUint32(16, crc, true);
      cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true); cd.setUint16(28, nameBytes.length, true);
      cd.setUint16(30, 0, true); cd.setUint16(32, 0, true); cd.setUint16(34, 0, true); cd.setUint16(36, 0, true); cd.setUint32(38, 0, true); cd.setUint32(42, offset, true);
      central.push(new Uint8Array(cd.buffer), nameBytes);
      offset += 30 + nameBytes.length + data.length;
    });
    const cdSize = central.reduce((n, b) => n + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]));
  }

  function setupTheme() {
    const btn = $("themeBtn");
    const paint = () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      btn.querySelector("use").setAttribute("href", dark ? "#i-sun" : "#i-moon");
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      btn.title = dark ? "Light mode" : "Dark mode";
    };
    btn.addEventListener("click", () => {
      const dark = document.documentElement.getAttribute("data-theme") !== "dark";
      if (dark) document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
      try { localStorage.setItem("sv-admin-theme", dark ? "dark" : "light"); } catch (e) {}
      paint();
    });
    paint();
  }

  /* dates (all in Indian time) */

  function istDateKey(d) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  }

  function todayKey() {
    return istDateKey(new Date());
  }

  function addDaysKey(n) {
    return istDateKey(new Date(Date.now() + n * 86400000));
  }

  function keyToUTC(key) {
    const [y, m, d] = String(key).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  }

  function daysBetween(fromKey, toKey) {
    return Math.round((keyToUTC(toKey) - keyToUTC(fromKey)) / 86400000);
  }

  function formatDay(key) {
    return new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(keyToUTC(key)));
  }

  function relTime(iso) {
    const t = new Date(iso).getTime();
    if (!t) return "—";
    const s = (Date.now() - t) / 1000;
    if (s < 60) return "Just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    const days = daysBetween(istDateKey(new Date(t)), todayKey());
    if (days === 0) return `${Math.floor(s / 3600)} h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short" }).format(new Date(t));
  }

  function formatShortIST(iso) {
    const t = new Date(iso);
    if (isNaN(t)) return "";
    return new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(t);
  }

  function formatFullIST(iso) {
    const t = new Date(iso);
    if (isNaN(t)) return "";
    return new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(t);
  }

  function fmtNum(n) {
    return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function esc(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cssEsc(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"');
  }
})();
