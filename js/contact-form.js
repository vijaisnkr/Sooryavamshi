/**
 * Suryavamshi Solar Projects LLP - Contact & Consultation Form Controller
 *
 * Handles client-side validation, anti-spam honeypot, Supabase database submission,
 * and responsive success/error state handling.
 * Errors are tied to their fields (aria-invalid, aria-describedby) and the result of a
 * submit is announced. WhatsApp buttons open a chat pre-filled with what the visitor typed.
 */

(function() {
  const WA = "https://wa.me/919061626868?text=";

  // The form's inline onsubmit and its submit listener both run on one submit,
  // so a second call is ignored while a submission is already being sent
  let sending = false;
  // The estimate shown at the top of the form ({kw, panels, bill, units}), if any
  let shownEstimate = null;
  // What the WhatsApp buttons after a send (success or failed save) fill in
  let successWaText = "";
  let errorWaText = "";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContactForm);
  } else {
    initContactForm();
  }

  // Global fail-safe hook directly invoked by HTML onsubmit / onclick
  window.handleAssessmentSubmit = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    initContactForm();
    const form = document.getElementById("assessment-form") || document.getElementById("consultationForm");
    if (form && window._doSubmitForm) {
      window._doSubmitForm(e);
    }
  };

  function inr(n) {
    return Math.round(Number(n) || 0).toLocaleString("en-IN");
  }

  function val(id) {
    const el = document.getElementById(id);
    return el && typeof el.value === "string" ? el.value.trim() : "";
  }

  // Pre-fill a WhatsApp link with getText() only at the moment it is clicked, then put the plain address back.
  // Clarity records the address of every clicked link (even inside data-clarity-mask), reading it in a listener
  // that runs before this one, so it only ever sees the plain wa.me address: the privacy page says Clarity
  // never gets what was typed in the form. The browser still opens the pre-filled chat as a normal link.
  function waOnClick(link, getText) {
    if (!link || link.dataset.svWa) return;
    link.dataset.svWa = "1";
    const plain = link.getAttribute("href");
    link.addEventListener("click", function() {
      link.href = WA + encodeURIComponent(getText());
      setTimeout(() => { link.setAttribute("href", plain); }, 1000);
    });
  }

  function initContactForm() {
    const form = document.getElementById("assessment-form") || document.getElementById("consultationForm");
    const submitBtn = document.getElementById("submitFormBtn") || (form ? form.querySelector('button[type="submit"]') : null);

    if (!form) return;
    // handleAssessmentSubmit calls this again on every submit: bind only once
    if (form.dataset.svBound) return;
    form.dataset.svBound = "1";

    // Monthly usage can be typed as a bill (₹) or as units: wire up the switch first,
    // so prefilled values land in the right mode
    initUsageSwitch();

    // Prefill helper: If calculator passed units or location via session/hash
    handlePrepopulation();

    // "No bill handy? Send your details on WhatsApp" under the KSEB number
    initNoBillLink();

    // On the contact page, "Free Site Visit" buttons that point at this same page open the form
    // instead of reloading the page (and losing what was typed). The calculator page does this itself.
    if (!document.getElementById("calcUnitsSlider")) {
      document.addEventListener("click", function(e) {
        const a = e.target.closest && e.target.closest("a[href]");
        if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
        let url;
        try { url = new URL(a.getAttribute("href"), window.location.href); } catch (err) { return; }
        if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search || url.hash) return;
        if (getComputedStyle(form).display === "none") return;
        e.preventDefault();
        form.scrollIntoView({ behavior: document.documentElement.getAttribute("data-sv-motion") === "off" ? "auto" : "smooth", block: "start" });
        const first = document.getElementById("client-name");
        if (first) { try { first.focus({ preventScroll: true }); } catch (err) { first.focus(); } }
      });
    }

    // Bind Form Submit Event
    form.addEventListener("submit", handleFormSubmit);

    window._doSubmitForm = handleFormSubmit;

    async function handleFormSubmit(e) {
      if (e && e.preventDefault) e.preventDefault();
      if (sending) return;

      // Reset previous error/success states
      hideMessages();
      clearInlineErrors();

      // 1. Anti-Spam Honeypot Check
      const honeypot = document.getElementById("contactHoneypot");
      if (honeypot && honeypot.value.trim() !== "") {
        console.warn("Spam submission intercepted by honeypot.");
        form.reset();
        showSuccessMessage(form, {});
        return;
      }

      // 2. Collect and Trim Form Values
      const getNameVal = () => (document.getElementById("client-name")?.value || document.getElementById("contactName")?.value || "").trim();
      const getPhoneVal = () => (document.getElementById("client-phone")?.value || document.getElementById("contactPhone")?.value || "").trim();
      const getLocVal = () => (document.getElementById("client-location")?.value || document.getElementById("contactLocation")?.value || "").trim();
      const getUnitsVal = () => (document.getElementById("client-consumption")?.value || document.getElementById("contactUnits")?.value || "").trim();

      const rawData = {
        full_name: getNameVal(),
        phone_number: getPhoneVal(),
        email: (document.getElementById("contactEmail")?.value || document.getElementById("client-email")?.value || "").trim(),
        pin_code: (document.getElementById("contactPin")?.value || document.getElementById("client-pin")?.value || "").trim(),
        city_location: getLocVal(),
        monthly_consumption: getUnitsVal(),
        kseb_consumer_number: (document.getElementById("contactKsebNo")?.value || document.getElementById("client-kseb")?.value || "").trim(),
        rooftop_details: (document.getElementById("contactMessage")?.value || document.getElementById("client-message")?.value || "").trim(),
        preferred_contact_time: (document.querySelector('input[name="client-time"]:checked')?.value || document.getElementById("contactTime")?.value || document.getElementById("client-time")?.value || "").trim(),
        rooftop_photo_path: (document.getElementById("contactPhotoPath")?.value || document.getElementById("client-photo-path")?.value || "").trim()
      };

      // Read the usage as a bill or as units ("Rs. 3500", "₹3,500/mo" and "400 units" all work)
      const usage = readUsage(rawData.monthly_consumption);
      rawData.usage_mode = usage.mode;
      rawData.usage_value = usage.value;
      rawData.kseb_consumer_number = rawData.kseb_consumer_number.replace(/\D/g, "");
      rawData.pin_code = rawData.pin_code.replace(/\D/g, "");

      // Units: what they typed, or estimated from the bill at the same tariff the calculator uses
      const numericUnits = usage.mode === "bill" ? Math.round(usage.value / getTariff()) : usage.value;
      const monthlyBill = usage.mode === "bill" && usage.value > 0 ? usage.value : null;

      // Estimated system size from this visitor's own usage
      let estCapacity = null;
      if (numericUnits > 0) {
        try {
          if (window.SolarCalculator && typeof window.SolarCalculator.compute === "function" && window.SOORYAVAMSHI_CONFIG) {
            estCapacity = parseFloat(window.SolarCalculator.compute(numericUnits, window.SOORYAVAMSHI_CONFIG.calculator.states[0]).recommendedKw) || null;
          }
        } catch (err) {}
        if (!estCapacity) estCapacity = Math.max(1.0, Math.round((numericUnits / (30 * 4.2 * 0.82)) * 10) / 10);
      }
      rawData.estimated_solar_capacity = estCapacity;

      // 3. Client-side Validation
      const validationErrors = validateForm(rawData);
      if (Object.keys(validationErrors).length > 0) {
        displayInlineErrors(validationErrors);
        return;
      }

      // 4. Loading State: Disable button and show spinner
      sending = true;
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" style="animation: spin 0.8s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px;">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          <span>Sending your request...</span>
        `;
      }

      try {
        // 5. Submit to Supabase Backend
        const result = await SooryavamshiSupabase.submitSiteAssessmentRequest({
          ...rawData,
          monthly_consumption: numericUnits,
          monthly_bill_inr: monthlyBill
        });
        if (!result || !result.success) throw new Error((result && result.error) || "Save failed");

        if (window.svTrack) window.svTrack("generate_lead", { form_page: window.location.pathname });

        // Clear form inputs
        form.reset();

        // Display designated success message
        showSuccessMessage(form, rawData);
      } catch (err) {
        console.warn("Notice during submission:", err);
        if (window.svTrack) window.svTrack("lead_submit_failed", { form_page: window.location.pathname });
        // Keep the form filled in and offer the same details on WhatsApp, so the enquiry isn't lost
        showErrorMessage(rawData);
      } finally {
        sending = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    }

    /**
     * Real-time inline field clearing on input
     */
    form.querySelectorAll("input, textarea").forEach(input => {
      input.addEventListener("input", function() {
        clearFieldError(this);
      });
    });
  }

  /**
   * Permissive & clean validation logic
   */
  function validateForm(data) {
    const errors = {};

    // 1. Full Name (At least 2 characters)
    if (!data.full_name || data.full_name.trim().length < 2) {
      const fieldId = document.getElementById("client-name") ? "client-name" : "contactName";
      errors[fieldId] = "Please enter your full name.";
    }

    // 2. Phone Number (At least 7 digits)
    const cleanPhone = data.phone_number.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 7) {
      const phoneFieldId = document.getElementById("client-phone") ? "client-phone" : "contactPhone";
      errors[phoneFieldId] = "Please enter a valid mobile number.";
    }

    // 3. City / Location
    if (!data.city_location || data.city_location.trim().length < 2) {
      const locFieldId = document.getElementById("client-location") ? "client-location" : "contactLocation";
      errors[locFieldId] = "Please enter your location/town.";
    }

    // 4. KSEB consumer number is optional (13 digits, printed on the electricity bill), but must be complete when given
    const ksebFieldId = document.getElementById("client-kseb") ? "client-kseb" : (document.getElementById("contactKsebNo") ? "contactKsebNo" : null);
    if (ksebFieldId && data.kseb_consumer_number && data.kseb_consumer_number.length !== 13) {
      errors[ksebFieldId] = `KSEB consumer numbers have 13 digits (you typed ${data.kseb_consumer_number.length}). Please check your bill, or leave this empty.`;
    }

    // 5. PIN code and email are optional, but must be complete when given
    const pinFieldId = document.getElementById("client-pin") ? "client-pin" : (document.getElementById("contactPin") ? "contactPin" : null);
    if (pinFieldId && data.pin_code && !/^[1-9]\d{5}$/.test(data.pin_code)) {
      errors[pinFieldId] = "PIN codes have 6 digits, e.g. 688524. You can also leave this empty.";
    }
    const emailFieldId = document.getElementById("client-email") ? "client-email" : (document.getElementById("contactEmail") ? "contactEmail" : null);
    if (emailFieldId && data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
      errors[emailFieldId] = "That email doesn't look complete, e.g. name@gmail.com. You can also leave this empty.";
    }

    // 6. Monthly usage is optional, but if typed it must contain a number
    const usageFieldId = document.getElementById("client-consumption") ? "client-consumption" : "contactUnits";
    if (data.monthly_consumption && !(data.usage_value > 0)) {
      errors[usageFieldId] = data.usage_mode === "bill" ? "Please type your bill as a number, e.g. 3500." : "Please type your units as a number, e.g. 400.";
    }

    return errors;
  }

  /**
   * KSEB tariff used to turn a bill into units (same figure the solar calculator uses)
   */
  function getTariff() {
    try {
      const st = window.SOORYAVAMSHI_CONFIG.calculator.states[0];
      return st.defaultTariff || window.SOORYAVAMSHI_CONFIG.calculator.averageTariffPerUnitInr || 7.2;
    } catch (e) {
      return 7.2;
    }
  }

  function panelWattage() {
    try { return window.SOORYAVAMSHI_CONFIG.calculator.standardPanelWattage || 550; } catch (e) { return 550; }
  }

  /**
   * Works out whether the visitor gave a bill or units, and the number they meant.
   * Words in the text win over the switch: "Rs. 3500" is a bill, "400 units" is units.
   */
  const BILL_WORDS = /₹|\brs\b|inr|rupee|bill/;
  const UNIT_WORDS = /unit|kwh/;
  function readUsage(text) {
    const input = document.getElementById("client-consumption") || document.getElementById("contactUnits");
    let mode = (input && input.dataset.usage) || "bill";
    const t = String(text || "").toLowerCase();
    if (BILL_WORDS.test(t)) mode = "bill";
    else if (UNIT_WORDS.test(t)) mode = "units";
    // First number in the text, ignoring thousands commas ("3,500" -> 3500; "Rs. 3500" -> 3500, not .3500)
    const m = t.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
    return { mode, value: m ? parseFloat(m[0]) : 0 };
  }

  /**
   * Bill / Units switch next to the monthly usage box
   */
  function setUsageMode(mode) {
    const input = document.getElementById("client-consumption");
    if (!input || (mode !== "bill" && mode !== "units")) return;
    input.dataset.usage = mode;
    input.placeholder = mode === "bill" ? "e.g. 3500" : "e.g. 400";
    const label = document.getElementById("client-consumption-label");
    if (label) label.textContent = mode === "bill" ? "Average monthly bill (₹)" : "Average monthly units (kWh)";
    document.querySelectorAll(".usage-switch [data-usage]").forEach(btn => {
      btn.setAttribute("aria-checked", String(btn.dataset.usage === mode));
    });
  }
  window.svSetUsageMode = setUsageMode;

  function initUsageSwitch() {
    const input = document.getElementById("client-consumption");
    if (!input) return;
    document.querySelectorAll(".usage-switch [data-usage]").forEach(btn => {
      btn.addEventListener("click", () => { setUsageMode(btn.dataset.usage); input.focus(); });
    });
    // Typing "units" or "₹"/"Rs" flips the switch to match
    input.addEventListener("input", () => {
      const t = input.value.toLowerCase();
      if (BILL_WORDS.test(t)) setUsageMode("bill");
      else if (UNIT_WORDS.test(t)) setUsageMode("units");
      // The visitor changed the figure we filled in: the estimate and our message no longer match it
      if (input.dataset.autoValue !== undefined && input.value !== input.dataset.autoValue) {
        delete input.dataset.autoValue;
        if (shownEstimate && (shownEstimate.bill || shownEstimate.units)) showEstimate(null);
        const msg = document.getElementById("client-message");
        if (msg && msg.dataset.autoText && msg.value === msg.dataset.autoText) { msg.value = ""; delete msg.dataset.autoText; }
      }
    });
  }

  /* ---------- Field errors: shown under the field, tied to it, and announced ---------- */

  function baseDescribedBy(inputEl) {
    if (inputEl.dataset.describedbyBase === undefined) {
      inputEl.dataset.describedbyBase = inputEl.getAttribute("aria-describedby") || "";
    }
    return inputEl.dataset.describedbyBase;
  }

  function clearFieldError(inputEl) {
    if (!inputEl || !inputEl.id) return;
    const errorEl = document.getElementById(`${inputEl.id}-error`);
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.style.display = "none";
    }
    inputEl.classList.remove("input-error");
    if (inputEl.getAttribute("aria-invalid")) {
      inputEl.removeAttribute("aria-invalid");
      const base = baseDescribedBy(inputEl);
      if (base) inputEl.setAttribute("aria-describedby", base);
      else inputEl.removeAttribute("aria-describedby");
    }
  }

  function clearInlineErrors() {
    document.querySelectorAll(".field-error-msg").forEach(el => {
      el.textContent = "";
      el.style.display = "none";
    });
    document.querySelectorAll(".input-error, [aria-invalid]").forEach(el => clearFieldError(el));
    setStatus("");
  }

  // One polite line for screen readers ("Please check 2 fields: ...")
  function setStatus(text) {
    const status = document.getElementById("form-status");
    if (!status) return;
    status.textContent = "";
    if (text) setTimeout(() => { status.textContent = text; }, 60);
  }

  function fieldName(inputEl) {
    const label = document.querySelector(`label[for="${inputEl.id}"]`);
    const text = label ? label.textContent : (inputEl.getAttribute("aria-label") || inputEl.id);
    return text.replace(/\*|\(optional\)/gi, "").replace(/\s+/g, " ").trim();
  }

  /**
   * Displays inline error messages under specific form inputs
   */
  function displayInlineErrors(errors) {
    let firstErrorField = null;
    const names = [];

    for (const [fieldId, errorMsg] of Object.entries(errors)) {
      const inputEl = document.getElementById(fieldId);
      if (inputEl) {
        inputEl.classList.add("input-error");
        let errorEl = document.getElementById(`${fieldId}-error`);
        if (!errorEl) {
          errorEl = document.createElement("p");
          errorEl.id = `${fieldId}-error`;
          errorEl.className = "field-error-msg";
          // Right under the box, above any help text
          inputEl.insertAdjacentElement("afterend", errorEl);
        }
        errorEl.textContent = errorMsg;
        errorEl.style.display = "block";
        const base = baseDescribedBy(inputEl);
        inputEl.setAttribute("aria-invalid", "true");
        inputEl.setAttribute("aria-describedby", (errorEl.id + " " + base).trim());
        names.push(fieldName(inputEl));

        if (!firstErrorField) firstErrorField = inputEl;
      }
    }

    if (names.length) setStatus(`Please check ${names.length} ${names.length === 1 ? "field" : "fields"}: ${names.join(", ")}.`);

    if (firstErrorField) {
      try { firstErrorField.focus({ preventScroll: true }); } catch (e) { firstErrorField.focus(); }
      firstErrorField.scrollIntoView({ behavior: document.documentElement.getAttribute("data-sv-motion") === "off" ? "auto" : "smooth", block: "center" });
    }
  }

  function hideMessages() {
    const successBox1 = document.getElementById("form-success");
    const successBox2 = document.getElementById("formSuccessMessage");
    const errorBox1 = document.getElementById("form-error");
    const errorBox2 = document.getElementById("formErrorMessage");

    if (successBox1) {
      successBox1.classList.add("hidden");
      successBox1.style.setProperty("display", "none", "important");
    }
    if (successBox2) {
      successBox2.style.display = "none";
    }
    if (errorBox1) {
      errorBox1.classList.add("hidden");
      errorBox1.style.setProperty("display", "none", "important");
    }
    if (errorBox2) {
      errorBox2.style.display = "none";
    }
  }

  function safeScrollIntoView(el) {
    if (el && typeof el.scrollIntoView === "function") {
      try {
        el.scrollIntoView({ behavior: document.documentElement.getAttribute("data-sv-motion") === "off" ? "auto" : "smooth", block: "nearest" });
      } catch (e) {
        try { el.scrollIntoView(); } catch (e2) {}
      }
    }
  }

  function showSuccessMessage(form, data) {
    if (form) {
      form.classList.add("hidden");
      form.style.setProperty("display", "none", "important");
    }

    const successBox1 = document.getElementById("form-success");
    if (successBox1) {
      // WhatsApp after booking: the bill photo goes to the same team, with the visitor's name
      const name = data && data.full_name ? data.full_name : "";
      const waText = "Hi, I just booked a free site visit on suryavamshi.com." + (name ? ` My name is ${name}.` : "") + " Here is a photo of my KSEB bill.";
      const wa = document.getElementById("form-success-wa") || successBox1.querySelector('a[href*="wa.me"]');
      if (wa) { successWaText = waText; waOnClick(wa, () => successWaText); }

      successBox1.classList.remove("hidden");
      successBox1.style.setProperty("display", "flex", "important");
      successBox1.style.visibility = "visible";
      safeScrollIntoView(successBox1);
      // Move focus to the confirmation, so keyboard and screen reader users hear it
      if (!successBox1.hasAttribute("tabindex")) successBox1.setAttribute("tabindex", "-1");
      try { successBox1.focus({ preventScroll: true }); } catch (e) { successBox1.focus(); }
      return;
    }

    const successBox2 = document.getElementById("formSuccessMessage");
    if (successBox2) {
      successBox2.style.display = "block";
      successBox2.style.visibility = "visible";
      successBox2.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 8px;">☀️</div>
        <h4 style="color: #218739; font-size: 1.15rem; margin-bottom: 8px; font-weight: 700;">Request Submitted Successfully</h4>
        <p style="font-size: 0.96rem; line-height: 1.5; color: #155724; margin: 0; font-weight: 500;">
          Thank you! Your site assessment request has been received. We'll call you to fix a time for your visit.
        </p>
      `;
      safeScrollIntoView(successBox2);
    }
  }

  /**
   * Shown when the request could not be saved: a WhatsApp link pre-filled with what the visitor typed
   */
  function showErrorMessage(data) {
    const errorBox = document.getElementById("form-error");
    if (!errorBox) return;

    const lines = [
      "Hello Suryavamshi team, I tried to request a free site assessment on your website but it didn't go through. My details:",
      `Name: ${data.full_name}`,
      `Phone: ${data.phone_number}`,
      `Location: ${data.city_location}`
    ];
    if (data.pin_code) lines.push(`PIN code: ${data.pin_code}`);
    if (data.usage_value > 0) lines.push(data.usage_mode === "bill" ? `Monthly bill: ₹${inr(data.usage_value)}` : `Monthly units: ${data.usage_value}`);
    if (data.kseb_consumer_number) lines.push(`KSEB consumer no.: ${data.kseb_consumer_number}`);
    if (data.email) lines.push(`Email: ${data.email}`);
    if (data.preferred_contact_time) lines.push(`Best time to call: ${data.preferred_contact_time}`);
    if (data.rooftop_details) lines.push(`About my roof: ${data.rooftop_details}`);

    const waLink = document.getElementById("form-error-wa");
    if (waLink) { errorWaText = lines.join("\n"); waOnClick(waLink, () => errorWaText); }

    errorBox.classList.remove("hidden");
    errorBox.style.setProperty("display", "flex", "important");
    errorBox.style.visibility = "visible";
    // Re-write the message so the alert is read out again on a second failed try
    const msg = document.getElementById("form-error-msg");
    if (msg) { const t = msg.textContent; msg.textContent = ""; setTimeout(() => { msg.textContent = t; }, 60); }
    safeScrollIntoView(errorBox);
  }

  /* ---------- Estimate summary at the top of the form ---------- */

  function parseKw(v) {
    const n = parseFloat(String(v || "").replace(/[^\d.]/g, ""));
    return n >= 0.5 && n <= 500 ? Math.round(n * 10) / 10 : null;
  }

  // "an 8 kW system", "a 5 kW system"
  function article(kw) {
    return /^(8\d{0,2}|11|18)(\.\d+)?$/.test(String(kw)) ? "an" : "a";
  }

  // Shows "Your estimate: 4.6 kW · 9 panels · ₹3,500 bill" (calculator), or the size picked on a guide page.
  // A size picked on a guide has no panel count here: the guides use different panels (8 × 625 W for 5 kW, 13 × 635 W for 8 kW)
  function showEstimate(est) {
    const chip = document.getElementById("form-estimate");
    const kw = est ? parseKw(est.kw) : null;
    const fromBill = !!(est && (est.bill || est.units));
    shownEstimate = kw ? { kw, panels: est.panels || (fromBill ? Math.ceil(kw * 1000 / panelWattage()) : null), bill: est.bill || null, units: est.units || null } : null;
    if (!chip) return;
    if (!shownEstimate) { chip.hidden = true; return; }
    const e = shownEstimate;
    const text = chip.querySelector(".est-text") || chip;
    if (e.bill || e.units) {
      text.textContent = `Your estimate: ${e.kw} kW · ${e.panels} panels · ` + (e.bill ? `₹${inr(e.bill)} bill` : `${inr(e.units)} units a month`);
    } else {
      text.textContent = `You're asking about ${article(e.kw)} ${e.kw} kW system`;
    }
    chip.hidden = false;
  }
  window.svShowEstimate = showEstimate;

  function prefillMessage(text) {
    const msg = document.getElementById("client-message") || document.getElementById("contactMessage");
    if (!msg || !text) return;
    if (!msg.value.trim() || msg.value === msg.dataset.autoText) {
      msg.value = text;
      msg.dataset.autoText = text;
    }
  }

  /* ---------- "No bill handy? Send your details on WhatsApp" ---------- */

  function noBillText() {
    const lines = ["Hi, I'd like to book a free solar site visit. I don't have my KSEB bill handy right now."];
    const name = val("client-name"), phone = val("client-phone"), loc = val("client-location"), pin = val("client-pin");
    if (name) lines.push(`Name: ${name}`);
    if (phone) lines.push(`Phone: ${phone}`);
    const usageRaw = val("client-consumption");
    if (usageRaw) {
      const u = readUsage(usageRaw);
      if (u.value > 0) lines.push(u.mode === "bill" ? `Monthly bill: ₹${inr(u.value)}` : `Monthly units: ${inr(u.value)}`);
    }
    if (loc) lines.push(`Location: ${loc}`);
    if (pin) lines.push(`PIN code: ${pin}`);
    // The estimate shown on the form (the calculator keeps it in step with the bill field)
    const est = shownEstimate;
    if (est && est.kw) lines.push(`Solar size: about ${est.kw} kW` + (est.panels ? `, ${est.panels} panels` : ""));
    return lines.join("\n");
  }

  function initNoBillLink() {
    const link = document.getElementById("client-kseb-wa");
    if (!link) return;
    // The text is read at the moment of the click, so it includes what the calculator filled in too
    waOnClick(link, noBillText);
    link.addEventListener("click", () => {
      if (window.svTrack) window.svTrack("no_bill_whatsapp", { form_page: window.location.pathname });
    });
  }

  /**
   * Populates fields if navigated from Solar Calculator or URL params
   * contact.html?bill=3500 | ?units=400, plus ?kw=4.6, ?location=Kochi, ?pin=688524
   */
  function handlePrepopulation() {
    try {
      const params = new URLSearchParams(window.location.search);
      const unitsInput = document.getElementById("client-consumption") || document.getElementById("contactUnits");
      const locInput = document.getElementById("client-location") || document.getElementById("contactLocation");
      const pinInput = document.getElementById("client-pin") || document.getElementById("contactPin");

      const units = parseFloat(params.get("units"));
      const bill = parseFloat(params.get("bill"));
      if (units > 0 && unitsInput) { setUsageMode("units"); unitsInput.value = Math.round(units); }
      else if (bill > 0 && unitsInput) { setUsageMode("bill"); unitsInput.value = Math.round(bill); }
      if (unitsInput && unitsInput.value) unitsInput.dataset.autoValue = unitsInput.value;
      if (params.get("location") && locInput) locInput.value = params.get("location").slice(0, 80);
      if (params.get("pin") && pinInput) pinInput.value = params.get("pin").replace(/\D/g, "").slice(0, 6);

      // System size from the calculator (with the bill) or from a guide page (?kw=3).
      // The calculator page shows its own live estimate, so it is skipped there.
      const kw = parseKw(params.get("kw"));
      if (kw && !document.getElementById("calcUnitsSlider")) {
        showEstimate({ kw, bill: bill > 0 && !(units > 0) ? Math.round(bill) : null, units: units > 0 ? Math.round(units) : null });
        const e = shownEstimate;
        if (e.bill || e.units) {
          const usage = e.bill ? `my monthly bill of about ₹${inr(e.bill)}` : `my monthly use of ${inr(e.units)} units`;
          prefillMessage(`I used the solar calculator: about ${e.kw} kW (${e.panels} panels) for ${usage}. Please arrange a free site visit.`);
        } else {
          prefillMessage(`I'd like a free site visit for ${article(e.kw)} ${e.kw} kW rooftop solar system.`);
        }
      }
    } catch (e) {}
  }
})();
