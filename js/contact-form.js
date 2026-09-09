/**
 * Sooryavamshi Solar Projects LLP - Contact & Consultation Form Controller
 * 
 * Handles client-side validation, anti-spam honeypot, submission throttling,
 * Supabase database submission, and responsive success/error state handling.
 */

(function() {
  document.addEventListener("DOMContentLoaded", initContactForm);

  function initContactForm() {
    const form = document.getElementById("assessment-form") || document.getElementById("consultationForm");
    const submitBtn = document.getElementById("submitFormBtn") || (form ? form.querySelector('button[type="submit"]') : null);

    if (!form) return;

    // Prefill helper: If calculator passed units or location via session/hash
    handlePrepopulation();

    form.addEventListener("submit", async function(e) {
      e.preventDefault();

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

      // 2. Submission Throttling (Debounce / Cooldown protection - 2 seconds)
      const lastSubmitTs = parseInt(localStorage.getItem("sooryavamshi_last_submit_ts") || "0", 10);
      const now = Date.now();
      const COOLDOWN_MS = 2000; // 2 seconds

      if (now - lastSubmitTs < COOLDOWN_MS) {
        const remainingSec = Math.ceil((COOLDOWN_MS - (now - lastSubmitTs)) / 1000);
        showFormErrorMessage(`Please wait ${remainingSec} seconds before submitting again.`);
        return;
      }

      // 3. Collect and Trim Form Values (checking both ID conventions)
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
        preferred_contact_time: (document.getElementById("contactTime")?.value || document.getElementById("client-time")?.value || "").trim(),
        rooftop_photo_path: (document.getElementById("contactPhotoPath")?.value || document.getElementById("client-photo-path")?.value || "").trim()
      };

      // Clean monthly consumption value for number parsing
      const cleanedUnitsStr = rawData.monthly_consumption.replace(/[^\d.]/g, "");
      const numericUnits = parseFloat(cleanedUnitsStr) || 0;

      // Calculate estimated solar capacity dynamically if available
      let estCapacity = null;
      if (window.SolarCalculator && typeof window.SolarCalculator.getCurrentResults === "function") {
        try {
          const calcRes = window.SolarCalculator.getCurrentResults();
          if (calcRes && calcRes.recommendedKw) {
            estCapacity = parseFloat(calcRes.recommendedKw);
          }
        } catch (err) {}
      }
      if (!estCapacity && numericUnits > 0) {
        estCapacity = Math.max(1.0, Math.round((numericUnits / (30 * 4.2 * 0.82)) * 10) / 10);
      }
      rawData.estimated_solar_capacity = estCapacity;

      // 4. Client-side Validation
      const validationErrors = validateForm(rawData, numericUnits);
      if (Object.keys(validationErrors).length > 0) {
        displayInlineErrors(validationErrors);
        return;
      }

      // 5. Loading State: Disable button and show spinner
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
        // 6. Submit to Supabase Backend
        const result = await SooryavamshiSupabase.submitSiteAssessmentRequest({
          ...rawData,
          monthly_consumption: numericUnits
        });

        if (result.success) {
          // Record throttling timestamp
          localStorage.setItem("sooryavamshi_last_submit_ts", Date.now().toString());

          // Clear form inputs
          form.reset();

          // Display designated success message
          showSuccessMessage(form);
        } else {
          console.error("Submission failed:", result.error);
          showFormErrorMessage(`Could not submit your request. Error: ${result.error || 'Server error'}`);
        }
      } catch (err) {
        console.error("Unexpected error during submission:", err);
        showFormErrorMessage("Network error. Please check your internet connection or call +91 9061626868.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
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
  function validateForm(data, numericUnits) {
    const errors = {};

    // 1. Full Name (Required, at least 2 characters)
    if (!data.full_name || data.full_name.length < 2) {
      const fieldId = document.getElementById("client-name") ? "client-name" : "contactName";
      errors[fieldId] = "Please enter your full name (minimum 2 characters).";
    }

    // 2. Phone Number (Required, Indian mobile numbers)
    const cleanPhone = data.phone_number.replace(/[\s\-\(\)]/g, "");
    const phoneRegex = /^(?:\+?91|0)?[6-9]\d{9}$/;
    const phoneFieldId = document.getElementById("client-phone") ? "client-phone" : "contactPhone";
    if (!cleanPhone) {
      errors[phoneFieldId] = "Please enter your mobile phone number.";
    } else if (!phoneRegex.test(cleanPhone)) {
      errors[phoneFieldId] = "Please enter a valid 10-digit mobile number (e.g. 9876543210).";
    }

    // 3. City / Location (Required)
    if (!data.city_location || data.city_location.length < 2) {
      const locFieldId = document.getElementById("client-location") ? "client-location" : "contactLocation";
      errors[locFieldId] = "Please enter your city or locality (e.g. Cherthala, Kochi).";
    }

    // 4. Monthly Electricity Consumption (Required if present)
    if (data.monthly_consumption && (numericUnits === null || numericUnits <= 0)) {
      const unitsFieldId = document.getElementById("client-consumption") ? "client-consumption" : "contactUnits";
      errors[unitsFieldId] = "Please enter a valid number for monthly units (e.g. 350).";
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
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function hideMessages() {
    const successBox1 = document.getElementById("form-success");
    const successBox2 = document.getElementById("formSuccessMessage");
    const errorBox1 = document.getElementById("form-error");
    const errorBox2 = document.getElementById("formErrorMessage");

    if (successBox1) successBox1.classList.add("hidden");
    if (successBox2) successBox2.style.display = "none";
    if (errorBox1) errorBox1.classList.add("hidden");
    if (errorBox2) errorBox2.style.display = "none";
  }

  function showSuccessMessage(form) {
    if (form) {
      form.classList.add("hidden");
      form.style.display = "none";
    }

    const successBox1 = document.getElementById("form-success");
    if (successBox1) {
      successBox1.classList.remove("hidden");
      successBox1.style.display = "flex";
      successBox1.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    const successBox2 = document.getElementById("formSuccessMessage");
    if (successBox2) {
      successBox2.style.display = "block";
      successBox2.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 8px;">☀️</div>
        <h4 style="color: #218739; font-size: 1.15rem; margin-bottom: 8px; font-weight: 700;">Request Submitted Successfully</h4>
        <p style="font-size: 0.96rem; line-height: 1.5; color: #155724; margin: 0; font-weight: 500;">
          Thank you! Your site assessment request has been received. A Sooryavamshi solar specialist will contact you shortly.
        </p>
      `;
      successBox2.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function showFormErrorMessage(message) {
    const errorBox1 = document.getElementById("form-error");
    const errorMsgEl = document.getElementById("form-error-msg");
    if (errorBox1) {
      errorBox1.classList.remove("hidden");
      errorBox1.style.display = "flex";
      if (errorMsgEl) errorMsgEl.textContent = message;
      errorBox1.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    const errorBox2 = document.getElementById("formErrorMessage");
    if (errorBox2) {
      errorBox2.style.display = "block";
      errorBox2.innerHTML = `
        <div style="font-size: 1.6rem; margin-bottom: 6px;">⚠️</div>
        <h4 style="color: #BA1A1A; font-size: 1.05rem; margin-bottom: 6px; font-weight: 700;">Submission Notice</h4>
        <p style="font-size: 0.94rem; line-height: 1.5; color: #781010; margin: 0;">${message}</p>
      `;
      errorBox2.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
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

      if (params.has("units") && unitsInput) unitsInput.value = params.get("units");
      if (params.has("location") && locInput) locInput.value = params.get("location");
      if (params.has("pin") && pinInput) pinInput.value = params.get("pin");
    } catch (e) {}
  }
})();
