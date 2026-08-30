/**
 * Sooryavamshi Solar Projects LLP - Contact & Consultation Form Controller
 * 
 * Handles client-side validation, anti-spam honeypot, submission throttling,
 * Supabase database submission, and responsive success/error state handling.
 */

(function() {
  document.addEventListener("DOMContentLoaded", initContactForm);

  function initContactForm() {
    const form = document.getElementById("consultationForm");
    const successBox = document.getElementById("formSuccessMessage");
    const errorBox = document.getElementById("formErrorMessage");
    const submitBtn = document.getElementById("submitFormBtn");

    if (!form) return;

    // Prefill helper: If calculator passed units or location via session/hash
    handlePrepopulation();

    form.addEventListener("submit", async function(e) {
      e.preventDefault();

      // Reset previous messages
      hideMessages();
      clearInlineErrors();

      // 1. Anti-Spam Honeypot Check
      const honeypot = document.getElementById("contactHoneypot");
      if (honeypot && honeypot.value.trim() !== "") {
        console.warn("Spam submission intercepted by honeypot.");
        // Pretend success so bot does not retry
        form.reset();
        showSuccessMessage();
        return;
      }

      // 2. Submission Throttling (Debounce / Cooldown protection)
      const lastSubmitTs = parseInt(localStorage.getItem("sooryavamshi_last_submit_ts") || "0", 10);
      const now = Date.now();
      const COOLDOWN_MS = 30000; // 30 seconds

      if (now - lastSubmitTs < COOLDOWN_MS) {
        const remainingSec = Math.ceil((COOLDOWN_MS - (now - lastSubmitTs)) / 1000);
        showInlineError("submitFormBtn", `Please wait ${remainingSec} seconds before submitting another request.`);
        return;
      }

      // 3. Collect and Trim Form Values
      const rawData = {
        full_name: (document.getElementById("contactName")?.value || "").trim(),
        phone_number: (document.getElementById("contactPhone")?.value || "").trim(),
        email: (document.getElementById("contactEmail")?.value || "").trim(),
        pin_code: (document.getElementById("contactPin")?.value || "").trim(),
        city_location: (document.getElementById("contactLocation")?.value || "").trim(),
        monthly_consumption: (document.getElementById("contactUnits")?.value || "").trim(),
        kseb_consumer_number: (document.getElementById("contactKsebNo")?.value || "").trim(),
        rooftop_details: (document.getElementById("contactMessage")?.value || "").trim()
      };

      // 4. Client-side Validation
      const validationErrors = validateForm(rawData);
      if (Object.keys(validationErrors).length > 0) {
        displayInlineErrors(validationErrors);
        return;
      }

      // 5. Loading State: Disable button and show spinner
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 0.8s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        <span>Submitting Request...</span>
      `;

      try {
        // 6. Submit to Supabase Backend
        const result = await SooryavamshiSupabase.submitSiteAssessmentRequest({
          ...rawData,
          monthly_consumption: parseFloat(rawData.monthly_consumption)
        });

        if (result.success) {
          // Record throttling timestamp
          localStorage.setItem("sooryavamshi_last_submit_ts", Date.now().toString());

          // Clear form inputs
          form.reset();

          // Display designated success message
          showSuccessMessage();
        } else {
          // Failure: Preserve entered data, display designated failure message
          console.error("Submission failed:", result.error);
          showErrorMessage();
        }
      } catch (err) {
        console.error("Unexpected error during submission:", err);
        showErrorMessage();
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });

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
   * Validates form fields according to business rules
   */
  function validateForm(data) {
    const errors = {};

    // 1. Full Name (Required, at least 2 characters)
    if (!data.full_name || data.full_name.length < 2) {
      errors.contactName = "Please enter your full name (minimum 2 characters).";
    }

    // 2. Phone Number (Required, Indian mobile numbers)
    // Strip spaces, dashes, parentheses
    const cleanPhone = data.phone_number.replace(/[\s\-\(\)]/g, "");
    const phoneRegex = /^(?:\+?91|0)?[6-9]\d{9}$/;
    if (!cleanPhone) {
      errors.contactPhone = "Please enter your mobile phone number.";
    } else if (!phoneRegex.test(cleanPhone)) {
      errors.contactPhone = "Please enter a valid 10-digit mobile number (e.g. 9876543210).";
    }

    // 3. City / Location (Required)
    if (!data.city_location || data.city_location.length < 2) {
      errors.contactLocation = "Please enter your city or locality (e.g. Cherthala, Kochi).";
    }

    // 4. Monthly Electricity Consumption (Required, positive number)
    if (!data.monthly_consumption) {
      errors.contactUnits = "Please enter your average monthly consumption in units / kWh.";
    } else {
      const unitsNum = parseFloat(data.monthly_consumption);
      if (isNaN(unitsNum) || unitsNum <= 0) {
        errors.contactUnits = "Please enter a valid positive number for monthly units (e.g. 350).";
      } else if (unitsNum > 50000) {
        errors.contactUnits = "For utility scale (>50,000 units), please call our engineering desk.";
      }
    }

    // 5. Email Address (Optional, validated if provided)
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(data.email)) {
        errors.contactEmail = "Please enter a valid email address (or leave it blank).";
      }
    }

    // 6. PIN Code (Optional, 6 digits if provided)
    if (data.pin_code) {
      const pinRegex = /^[1-9][0-9]{5}$/;
      if (!pinRegex.test(data.pin_code)) {
        errors.contactPin = "Please enter a valid 6-digit Indian postal PIN code.";
      }
    }

    // 7. KSEB Consumer Number (Optional, 13 digits if provided)
    if (data.kseb_consumer_number) {
      const cleanKseb = data.kseb_consumer_number.replace(/\D/g, "");
      if (cleanKseb.length !== 13) {
        errors.contactKsebNo = "KSEB consumer number must be exactly 13 digits.";
      }
    }

    return errors;
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
          inputEl.parentNode.appendChild(errorEl);
        }
        errorEl.textContent = errorMsg;
        errorEl.style.display = "block";

        if (!firstErrorField) firstErrorField = inputEl;
      }
    }

    if (firstErrorField) {
      firstErrorField.focus();
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function showInlineError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    let err = document.getElementById(`${elementId}-global-error`);
    if (!err) {
      err = document.createElement("div");
      err.id = `${elementId}-global-error`;
      err.className = "field-error-msg";
      err.style.marginTop = "8px";
      err.style.textAlign = "center";
      el.parentNode.appendChild(err);
    }
    err.textContent = message;
    err.style.display = "block";
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

  function hideMessages() {
    const successBox = document.getElementById("formSuccessMessage");
    const errorBox = document.getElementById("formErrorMessage");
    if (successBox) successBox.style.display = "none";
    if (errorBox) errorBox.style.display = "none";
  }

  /**
   * Exact specified success message
   */
  function showSuccessMessage() {
    const successBox = document.getElementById("formSuccessMessage");
    if (!successBox) return;

    successBox.style.display = "block";
    successBox.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 8px;">☀️</div>
      <h4 style="color: #218739; font-size: 1.15rem; margin-bottom: 8px; font-weight: 700;">Request Submitted Successfully</h4>
      <p style="font-size: 0.96rem; line-height: 1.5; color: #155724; margin: 0; font-weight: 500;">
        Thank you! Your site assessment request has been received. A Sooryavamshi solar specialist will contact you shortly.
      </p>
    `;
    successBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /**
   * Exact specified failure message (preserves input fields)
   */
  function showErrorMessage() {
    const errorBox = document.getElementById("formErrorMessage");
    if (!errorBox) return;

    errorBox.style.display = "block";
    errorBox.innerHTML = `
      <div style="font-size: 1.6rem; margin-bottom: 6px;">⚠️</div>
      <h4 style="color: #BA1A1A; font-size: 1.05rem; margin-bottom: 6px; font-weight: 700;">Submission Notice</h4>
      <p style="font-size: 0.94rem; line-height: 1.5; color: #781010; margin: 0;">
        We couldn't submit your request right now. Please try again or call us at <a href="tel:9061626868" style="color: #073B6B; font-weight: 700; text-decoration: underline;">+91 9061626868</a>.
      </p>
    `;
    errorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /**
   * Populates fields if navigated from Solar Calculator or URL params
   */
  function handlePrepopulation() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("units")) {
        const unitsInput = document.getElementById("contactUnits");
        if (unitsInput) unitsInput.value = params.get("units");
      }
      if (params.has("location")) {
        const locInput = document.getElementById("contactLocation");
        if (locInput) locInput.value = params.get("location");
      }
      if (params.has("pin")) {
        const pinInput = document.getElementById("contactPin");
        if (pinInput) pinInput.value = params.get("pin");
      }
    } catch (e) {}
  }
})();
