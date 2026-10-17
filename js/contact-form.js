/**
 * Suryavamshi Solar Projects LLP - Contact & Consultation Form Controller
 * 
 * Handles client-side validation, anti-spam honeypot, Supabase database submission,
 * and responsive success/error state handling.
 */

(function() {
  // The form's inline onsubmit and its submit listener both run on one submit,
  // so a second call is ignored while a submission is already being sent
  let sending = false;

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
        showSuccessMessage(form);
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
          <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 0.8s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px;">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          <span>Submitting Request...</span>
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

        // Record timestamp
        localStorage.setItem("sooryavamshi_last_submit_ts", Date.now().toString());
        if (window.svTrack) window.svTrack("generate_lead", { form_page: window.location.pathname });

        // Clear form inputs
        form.reset();

        // Display designated success message
        showSuccessMessage(form);
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
        const errorEl = document.getElementById(`${this.id}-error`);
        if (errorEl) {
          errorEl.textContent = "";
          errorEl.style.display = "none";
        }
        this.classList.remove("input-error");
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

    // 4. KSEB consumer number (13 digits, printed on the electricity bill)
    const ksebFieldId = document.getElementById("client-kseb") ? "client-kseb" : (document.getElementById("contactKsebNo") ? "contactKsebNo" : null);
    if (ksebFieldId) {
      if (!data.kseb_consumer_number) {
        errors[ksebFieldId] = "Please enter your KSEB consumer number. It's the 13-digit number on your bill.";
      } else if (data.kseb_consumer_number.length !== 13) {
        errors[ksebFieldId] = `KSEB consumer numbers have 13 digits (you typed ${data.kseb_consumer_number.length}). Please check your bill.`;
      }
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
    });
  }

  function clearInlineErrors() {
    document.querySelectorAll(".field-error-msg").forEach(el => {
      el.textContent = "";
      el.style.display = "none";
    });
    document.querySelectorAll(".input-error").forEach(el => {
      el.classList.remove("input-error");
    });
  }

  /**
   * Displays inline error messages under specific form inputs
   */
  function displayInlineErrors(errors) {
    let firstErrorField = null;

    for (const [fieldId, errorMsg] of Object.entries(errors)) {
      const inputEl = document.getElementById(fieldId);
      if (inputEl) {
        inputEl.classList.add("input-error");
        let errorEl = document.getElementById(`${fieldId}-error`);
        if (!errorEl) {
          errorEl = document.createElement("div");
          errorEl.id = `${fieldId}-error`;
          errorEl.className = "field-error-msg";
          errorEl.style.color = "#DC2626";
          errorEl.style.fontSize = "0.8rem";
          errorEl.style.marginTop = "4px";
          inputEl.parentNode.appendChild(errorEl);
        }
        errorEl.textContent = errorMsg;
        errorEl.style.display = "block";

        if (!firstErrorField) firstErrorField = inputEl;
      }
    }

    if (firstErrorField) {
      firstErrorField.focus();
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

  function showSuccessMessage(form) {
    if (form) {
      form.classList.add("hidden");
      form.style.setProperty("display", "none", "important");
    }

    const successBox1 = document.getElementById("form-success");
    if (successBox1) {
      successBox1.classList.remove("hidden");
      successBox1.style.setProperty("display", "flex", "important");
      successBox1.style.visibility = "visible";
      safeScrollIntoView(successBox1);
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
          Thank you! Your site assessment request has been received. A Suryavamshi solar specialist will contact you shortly.
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
    if (data.usage_value > 0) lines.push(data.usage_mode === "bill" ? `Monthly bill: ₹${data.usage_value}` : `Monthly units: ${data.usage_value}`);
    if (data.kseb_consumer_number) lines.push(`KSEB consumer no.: ${data.kseb_consumer_number}`);
    if (data.email) lines.push(`Email: ${data.email}`);
    if (data.preferred_contact_time) lines.push(`Best time to call: ${data.preferred_contact_time}`);
    if (data.rooftop_details) lines.push(`About my roof: ${data.rooftop_details}`);

    const waLink = document.getElementById("form-error-wa");
    if (waLink) waLink.href = "https://wa.me/919061626868?text=" + encodeURIComponent(lines.join("\n"));

    errorBox.classList.remove("hidden");
    errorBox.style.setProperty("display", "flex", "important");
    errorBox.style.visibility = "visible";
    safeScrollIntoView(errorBox);
  }

  /**
   * Populates fields if navigated from Solar Calculator or URL params
   */
  function handlePrepopulation() {
    try {
      const params = new URLSearchParams(window.location.search);
      const unitsInput = document.getElementById("client-consumption") || document.getElementById("contactUnits");
      const locInput = document.getElementById("client-location") || document.getElementById("contactLocation");
      const pinInput = document.getElementById("client-pin") || document.getElementById("contactPin");

      if (params.has("units") && unitsInput) { setUsageMode("units"); unitsInput.value = params.get("units"); }
      else if (params.has("bill") && unitsInput) { setUsageMode("bill"); unitsInput.value = params.get("bill"); }
      if (params.has("location") && locInput) locInput.value = params.get("location");
      if (params.has("pin") && pinInput) pinInput.value = params.get("pin");
    } catch (e) {}
  }
})();
