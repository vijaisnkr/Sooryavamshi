/**
 * Suryavamshi Solar Projects LLP - Solar Requirement Calculator
 * Cleanly separated calculation engine and reactive DOM controller.
 *
 * v6: the typed value always drives the result (units or bill) and the
 * typed bill can go up to Rs 2,00,000 a month.
 * v7: the slider covers everyday bills only (up to Rs 10,000 a month, or the
 * same amount in units) on a straight scale. A typed value above that is
 * still used in full; the slider just rests at its right end.
 * v8: the estimate travels with the visitor. Every booking link on the page
 * carries it (and opens the form on this page, prefilled), the result can be
 * sent on WhatsApp, savings never exceed 90% of the bill (fixed charges and
 * meter rent stay), and Bill <-> Units switching keeps the typed bill.
 */

window.SolarCalculator = (function() {
  const MAX_BILL = 200000;   // Rs per month, top of the typed range
  const SLIDER_MAX_BILL = 10000; // Rs per month, right end of the slider
  const MIN_UNITS = 50;      // left end of the slider
  const SLIDER_STEPS = 1000; // slider resolution (positions, not units)
  const WA_NUMBER = '919061626868';
  // Solar can clear up to about 90% of a KSEB bill: fixed charges and meter rent stay
  // (the same "up to 90%" the home page uses). Shown savings never go above this share of the bill.
  const SAVINGS_SHARE = 0.9;
  // Booking buttons on this page: header, phone menu, phone bottom bar, closing band and the result button
  const BOOKING_LINKS = '.header-cta, .drawer-foot a.btn-sun, .mobile-bar a.primary, .closing a.btn-sun, #calcAssessmentBtn';

  // Internal state
  let currentUnits = 400; // Default units
  let currentBill = null; // Exact bill typed in bill mode
  let currentStateIndex = 0; // Default Kerala
  let isBillMode = false;
  let billMemo = null;    // the bill typed before switching to Units, so switching back restores it exactly
  let userSet = false;    // true once the visitor brought a bill/units in the link or changed the calculator
  let formPrefilled = false; // the form on this page has been filled in from the calculator
  let ready = false;
  let summaryTimer = null;

  // Cache DOM elements
  let elements = {};

  function init() {
    elements = {
      slider: document.getElementById('calcUnitsSlider'),
      numberInput: document.getElementById('calcUnitsInput'),
      unitLabel: document.getElementById('calcUnitLabel'),
      currency: document.getElementById('calcCurrency'),
      hint: document.getElementById('calcInputHint'),
      ticks: document.getElementById('calcTicks'),
      modeSeg: document.getElementById('calcModeSeg'),
      fieldLabel: document.querySelector('.calc-field-label'),
      stateSelect: document.getElementById('calcStateSelect'),
      tabUnits: document.getElementById('tabUnitsMode'),
      tabBill: document.getElementById('tabBillMode'),
      presetPills: document.querySelectorAll('.preset-pill'),
      assessmentBtn: document.getElementById('calcAssessmentBtn'),
      waBtn: document.getElementById('calcWhatsAppBtn'),
      summary: document.getElementById('calcSummary'),

      // Results output elements
      heroKw: document.getElementById('resultHeroKw'),
      heroKwSub: document.getElementById('resultHeroSub'),
      gaugeFill: document.getElementById('resultGaugeFill'),
      monthlyUnits: document.getElementById('resultMonthlyUnits'),
      dailyUnits: document.getElementById('resultDailyUnits'),
      annualGen: document.getElementById('resultAnnualGen'),
      panelCount: document.getElementById('resultPanelCount'),
      roofSpace: document.getElementById('resultRoofSpace'),
      roofNote: document.getElementById('resultRoofNote'),
      inverterCap: document.getElementById('resultInverterCap'),
      inverterNote: document.getElementById('resultInverterNote'),
      annualSavings: document.getElementById('resultAnnualSavings'),
      savingsNote: document.getElementById('resultSavingsNote'),
      co2Offset: document.getElementById('resultCo2Offset'),
      panelGrid: document.getElementById('resultPanelGrid'),
      panelCountTag: document.getElementById('resultPanelCountTag'),

      // Formula breakdown items
      formulaDaily: document.getElementById('formulaDaily'),
      formulaSunHours: document.getElementById('formulaSunHours'),
      formulaDerate: document.getElementById('formulaDerate'),
      formulaResult: document.getElementById('formulaResult')
    };

    if (!elements.slider || !elements.numberInput) return;

    elements.slider.min = 0;
    elements.slider.max = SLIDER_STEPS;
    elements.slider.step = 1;

    populateStates();
    bindEvents();
    applyUrlParams();
    syncInputs();
    renderCalculations();
    ready = true;
    if (userSet) bringResultIntoView();
  }

  // calculator.html?bill=4500 or ?units=400 (from the homepage quick estimate)
  function applyUrlParams() {
    let params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
    const bill = params ? parseFloat(params.get('bill')) : NaN;
    const units = params ? parseFloat(params.get('units')) : NaN;
    if (bill > 0) {
      setMode(true);
      currentBill = Math.round(Math.min(bill, MAX_BILL));
      currentUnits = currentBill / getTariff();
      userSet = true;
      if (bill > MAX_BILL) setHint(`The calculator goes up to ₹${fmt(MAX_BILL)} a month, so we've used ₹${fmt(MAX_BILL)}.`, true);
      else setHint(defaultHint());
    } else if (units > 0) {
      setMode(false);
      currentUnits = Math.round(Math.min(units, maxUnits()));
      userSet = true;
      setHint(defaultHint());
    } else {
      // Monthly Bill is the default input
      setMode(true);
    }
  }

  /* ---------- Range helpers ---------- */

  function getTariff() {
    return getSelectedState().defaultTariff || SOORYAVAMSHI_CONFIG.calculator.averageTariffPerUnitInr;
  }

  // Highest monthly consumption the calculator covers: a Rs 2,00,000 bill
  function maxUnits() {
    return Math.round(MAX_BILL / getTariff());
  }

  // Right end of the slider in units: a Rs 10,000 bill at the selected tariff
  function sliderMaxUnits() {
    return Math.round(SLIDER_MAX_BILL / getTariff());
  }

  // Straight-line slider: position 0..SLIDER_STEPS <-> units MIN_UNITS..sliderMaxUnits()
  function unitsFromPosition(pos) {
    return MIN_UNITS + (sliderMaxUnits() - MIN_UNITS) * (pos / SLIDER_STEPS);
  }

  function positionFromUnits(units) {
    const p = (units - MIN_UNITS) / (sliderMaxUnits() - MIN_UNITS);
    return Math.round(Math.max(0, Math.min(1, p)) * SLIDER_STEPS);
  }

  // The monthly bill shown and used for savings: the typed bill, or units x tariff
  function monthlyBill() {
    return isBillMode && currentBill != null ? currentBill : currentUnits * getTariff();
  }

  // True when the typed value is beyond the slider's right end
  function isAboveSlider() {
    return isBillMode ? monthlyBill() > SLIDER_MAX_BILL : currentUnits > sliderMaxUnits();
  }

  // Round slider values to steps people would actually type
  function niceRound(n) {
    if (n < 1000) return Math.round(n / 10) * 10;
    if (n < 5000) return Math.round(n / 50) * 50;
    if (n < 20000) return Math.round(n / 100) * 100;
    return Math.round(n / 500) * 500;
  }

  function fmt(n) {
    return Math.round(n).toLocaleString('en-IN');
  }

  function fmtShortInr(n) {
    if (n >= 100000) return `₹${+(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${+(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return `₹${fmt(n)}`;
  }

  function updateSliderProgress() {
    if (!elements.slider) return;
    const percent = (parseFloat(elements.slider.value) / SLIDER_STEPS) * 100;
    elements.slider.style.setProperty('--slider-percent', `${Math.max(0, Math.min(100, percent))}%`);
  }

  function updateTicks() {
    if (!elements.ticks) return;
    const tariff = getTariff();
    const labels = [0, 1 / 3, 2 / 3, 1].map((t, i) => {
      const u = unitsFromPosition(t * SLIDER_STEPS);
      if (isBillMode) {
        const bill = i === 3 ? SLIDER_MAX_BILL : niceRound(u * tariff);
        return fmtShortInr(bill);
      }
      const val = i === 3 ? sliderMaxUnits() : niceRound(u);
      return i === 3 ? `${fmt(val)} Units` : fmt(val);
    });
    elements.ticks.innerHTML = labels.map(l => `<span>${l}</span>`).join('');
  }

  function setHint(text, warn) {
    if (!elements.hint) return;
    elements.hint.textContent = text;
    elements.hint.classList.toggle('warn', !!warn);
  }

  function defaultHint() {
    if (isAboveSlider()) {
      return isBillMode
        ? `Using your typed bill of ₹${fmt(monthlyBill())}. The slider stops at ₹${fmt(SLIDER_MAX_BILL)}; type any bill up to ₹${fmt(MAX_BILL)}.`
        : `Using your typed ${fmt(currentUnits)} units. The slider stops at ${fmt(sliderMaxUnits())} units; type up to ${fmt(maxUnits())}.`;
    }
    return isBillMode
      ? `Type any bill up to ₹${fmt(MAX_BILL)} a month, or drag the slider up to ₹${fmt(SLIDER_MAX_BILL)}.`
      : `Type any amount up to ${fmt(maxUnits())} units a month, or drag the slider.`;
  }

  // Push currentUnits / currentBill into the slider and the number box
  function syncInputs(skipNumberBox) {
    elements.slider.value = positionFromUnits(currentUnits);
    elements.slider.classList.toggle('over', isAboveSlider());
    // Screen readers hear the bill or units, not the slider's position number
    elements.slider.setAttribute('aria-label', isBillMode ? 'Monthly bill' : 'Monthly units');
    elements.slider.setAttribute('aria-valuetext', isBillMode
      ? `₹${fmt(monthlyBill())} a month`
      : `${fmt(currentUnits)} units a month`);
    updateSliderProgress();
    if (!skipNumberBox) {
      elements.numberInput.value = isBillMode ? Math.round(monthlyBill()) : Math.round(currentUnits);
    }
    elements.numberInput.max = isBillMode ? MAX_BILL : maxUnits();
    elements.presetPills.forEach(p => {
      const on = !isBillMode && parseInt(p.getAttribute('data-units'), 10) === Math.round(currentUnits);
      p.classList.toggle('active', on);
      p.setAttribute('aria-pressed', String(on));
    });
    updateTicks();
  }

  function populateStates() {
    if (!elements.stateSelect) return;
    elements.stateSelect.innerHTML = '';
    SOORYAVAMSHI_CONFIG.calculator.states.forEach((st, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${st.name} (Avg. ₹${st.defaultTariff}/unit)`;
      if (idx === 0) opt.selected = true;
      elements.stateSelect.appendChild(opt);
    });
  }

  // Something the visitor did changed the estimate
  function changed() {
    userSet = true;
    renderCalculations();
    scheduleSummary();
  }

  function bindEvents() {
    // Slider: straight-line position -> units
    const onSliderUpdate = function(e) {
      const pos = parseInt(e.target.value, 10);
      const units = niceRound(unitsFromPosition(pos));
      currentUnits = Math.max(MIN_UNITS, Math.min(sliderMaxUnits(), units));
      currentBill = isBillMode ? Math.min(SLIDER_MAX_BILL, niceRound(currentUnits * getTariff())) : null;
      billMemo = null;
      if (pos >= SLIDER_STEPS) {
        // The right end is exactly Rs 10,000 (or its units)
        if (isBillMode) { currentBill = SLIDER_MAX_BILL; currentUnits = SLIDER_MAX_BILL / getTariff(); }
        else currentUnits = sliderMaxUnits();
      } else if (isBillMode) {
        currentUnits = currentBill / getTariff();
      }
      setHint(defaultHint());
      syncInputs();
      changed();
    };
    elements.slider.addEventListener('input', onSliderUpdate);
    elements.slider.addEventListener('change', onSliderUpdate);

    // Number box: whatever is typed drives the result, up to the cap
    elements.numberInput.addEventListener('input', function(e) {
      const raw = String(e.target.value).replace(/[^\d.]/g, '');
      const val = parseFloat(raw);
      if (isNaN(val) || val <= 0) {
        setHint(isBillMode ? 'Enter your monthly bill in ₹.' : 'Enter your monthly units.', true);
        return;
      }
      const cap = isBillMode ? MAX_BILL : maxUnits();
      const used = Math.min(val, cap);
      billMemo = null;
      if (isBillMode) {
        currentBill = used;
        currentUnits = used / getTariff();
      } else {
        currentBill = null;
        currentUnits = used;
      }
      if (val > cap) {
        elements.slider.classList.add('over');
        setHint(isBillMode
          ? `The calculator goes up to ₹${fmt(MAX_BILL)} a month, so we've used ₹${fmt(MAX_BILL)}.`
          : `The calculator goes up to ${fmt(cap)} units a month, so we've used ${fmt(cap)}.`, true);
      } else {
        setHint(defaultHint());
      }
      syncInputs(true);
      changed();
    });

    // When the box loses focus, show the value actually used
    elements.numberInput.addEventListener('change', function() {
      syncInputs();
    });

    // State change: tariff and insolation change, the typed bill stays the same
    if (elements.stateSelect) elements.stateSelect.addEventListener('change', function(e) {
      currentStateIndex = parseInt(e.target.value, 10) || 0;
      if (isBillMode && currentBill != null) {
        currentUnits = currentBill / getTariff();
      }
      currentUnits = Math.min(currentUnits, maxUnits());
      billMemo = null;
      setHint(defaultHint());
      syncInputs();
      changed();
    });

    // Mode switch (Bill vs Units): a two-option radio group, arrow keys move between them
    elements.tabUnits.addEventListener('click', function() { if (isBillMode) { setMode(false); scheduleSummary(); } });
    elements.tabBill.addEventListener('click', function() { if (!isBillMode) { setMode(true); scheduleSummary(); } });
    if (elements.modeSeg) {
      elements.modeSeg.addEventListener('keydown', function(e) {
        if (!/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
        e.preventDefault();
        setMode(!isBillMode);
        scheduleSummary();
        (isBillMode ? elements.tabBill : elements.tabUnits).focus();
      });
    }

    // Preset pills (always in units)
    elements.presetPills.forEach(pill => {
      pill.addEventListener('click', function() {
        currentUnits = parseInt(this.getAttribute('data-units'), 10);
        currentBill = isBillMode ? Math.round(currentUnits * getTariff()) : null;
        if (isBillMode) currentUnits = currentBill / getTariff();
        billMemo = null;
        setHint(defaultHint());
        syncInputs();
        changed();
      });
    });

    // Booking buttons open the form on this page, filled in with the estimate.
    // A new-tab or modified click follows the link to contact.html, which carries the same estimate.
    document.addEventListener('click', function(e) {
      const a = e.target.closest && e.target.closest(BOOKING_LINKS);
      if (!a) return;
      updateBookingLinks();
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!document.getElementById('assessment-form')) return;
      e.preventDefault();
      openForm(a === elements.assessmentBtn || userSet);
    });

    // "Send this estimate on WhatsApp"
    if (elements.waBtn) {
      elements.waBtn.addEventListener('click', function() {
        this.href = whatsappLink();
        if (window.svTrack) window.svTrack('calculator_whatsapp');
      });
    }
  }

  function setMode(billMode) {
    const wasBill = isBillMode;
    isBillMode = billMode;
    [[elements.tabBill, isBillMode], [elements.tabUnits, !isBillMode]].forEach(([btn, on]) => {
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-checked', String(on));
      btn.tabIndex = on ? 0 : -1;
    });
    if (elements.modeSeg) elements.modeSeg.classList.toggle('bill', isBillMode);
    if (elements.currency) elements.currency.hidden = !isBillMode;

    if (isBillMode) {
      // Back from Units with the same units: give back the exact bill that was typed (3500, not 3499)
      if (billMemo && Math.round(currentUnits) === billMemo.units) currentBill = billMemo.bill;
      else currentBill = Math.round(currentUnits * getTariff());
      currentUnits = currentBill / getTariff();
      billMemo = null;
      elements.unitLabel.textContent = "/ month";
      if (elements.fieldLabel) elements.fieldLabel.textContent = "Average Monthly Electricity Bill";
    } else {
      if (wasBill && currentBill != null) billMemo = { bill: currentBill, units: Math.round(currentUnits) };
      currentBill = null;
      currentUnits = Math.round(currentUnits);
      elements.unitLabel.textContent = "Units";
      if (elements.fieldLabel) elements.fieldLabel.textContent = "Monthly Electricity Consumption";
    }
    setHint(defaultHint());
    syncInputs();
    renderCalculations();
  }

  function getSelectedState() {
    return SOORYAVAMSHI_CONFIG.calculator.states[currentStateIndex] || SOORYAVAMSHI_CONFIG.calculator.states[0];
  }

  /**
   * Pure engineering calculation engine
   */
  function compute(monthlyUnits, stateObj) {
    const config = SOORYAVAMSHI_CONFIG.calculator;
    const dailyUnits = monthlyUnits / 30;
    const effectiveSunHours = config.baseDailySunHours * stateObj.factor;
    const systemDerate = config.systemPerformanceRatio;

    // Required capacity in kWp = Daily Units / (Peak Sun Hours * Derate Factor)
    const rawKw = dailyUnits / (effectiveSunHours * systemDerate);
    // Round to realistic installer sizing (1 decimal)
    const recommendedKw = Math.max(1.0, Math.round(rawKw * 10) / 10);

    // Generation estimates
    const dailyGen = recommendedKw * effectiveSunHours * systemDerate;
    const annualGen = Math.round(dailyGen * 365);

    // Equipment sizing
    const panelCount = Math.ceil((recommendedKw * 1000) / config.standardPanelWattage);
    const roofSpaceSqFt = Math.round(recommendedKw * config.spaceRequiredPerKwSqFt);
    const roofSpaceSqM = Math.round(roofSpaceSqFt * 0.0929);

    // Inverter standard rating selection
    let inverterCap = "3.3 kW Single-Phase";
    let inverterKw = 3.3, inverterPhase = "single phase";
    if (recommendedKw > 3.3 && recommendedKw <= 5.5) {
      inverterCap = "5.0 kW Single/Three-Phase"; inverterKw = 5; inverterPhase = "single or three phase";
    } else if (recommendedKw > 5.5 && recommendedKw <= 8.5) {
      inverterCap = "8.0 kW Three-Phase"; inverterKw = 8; inverterPhase = "three phase";
    } else if (recommendedKw > 8.5 && recommendedKw <= 11.5) {
      inverterCap = "10.0 kW Three-Phase"; inverterKw = 10; inverterPhase = "three phase";
    } else if (recommendedKw > 11.5 && recommendedKw <= 16.0) {
      inverterCap = "15.0 kW Three-Phase"; inverterKw = 15; inverterPhase = "three phase";
    } else if (recommendedKw > 16.0) {
      inverterCap = `${Math.ceil(recommendedKw)} kW Commercial Array`; inverterKw = Math.ceil(recommendedKw); inverterPhase = "three phase, commercial";
    }

    // Financial & Environmental returns
    const tariff = stateObj.defaultTariff || config.averageTariffPerUnitInr;
    // Never more than 90% of the yearly bill for these units: fixed charges and meter rent stay on the bill
    const generationValue = annualGen * tariff;
    const annualSavings = Math.floor(Math.min(generationValue, monthlyUnits * 12 * tariff * SAVINGS_SHARE) / 100) * 100;
    const monthlySavings = Math.round(annualSavings / 12);
    const co2Offset = ((annualGen * config.co2OffsetPerKwhKg) / 1000).toFixed(1);

    return {
      monthlyUnits,
      dailyUnits: dailyUnits.toFixed(1),
      effectiveSunHours: effectiveSunHours.toFixed(1),
      systemDerate: (systemDerate * 100).toFixed(0),
      recommendedKw: recommendedKw.toFixed(1),
      annualGen: annualGen.toLocaleString('en-IN'),
      panelCount,
      roofSpaceSqFt,
      roofSpaceSqM,
      inverterCap,
      inverterKw,
      inverterPhase,
      generationValue,
      annualSavingsValue: annualSavings,
      annualSavings: `₹${annualSavings.toLocaleString('en-IN')}`,
      monthlySavings: `₹${monthlySavings.toLocaleString('en-IN')}`,
      co2Offset: `${co2Offset} Tons / yr`
    };
  }

  // The estimate as the visitor sees it (the typed bill wins over units x tariff)
  function currentEstimate() {
    const results = compute(Math.round(currentUnits), getSelectedState());
    const bill = monthlyBill();
    const yearlyBill = Math.round(bill * 12);
    // Savings: what the panels make at the tariff, but never above 90% of the bill the visitor gave
    const capped = results.generationValue >= yearlyBill * SAVINGS_SHARE;
    const savings = Math.floor(Math.min(results.generationValue, yearlyBill * SAVINGS_SHARE) / 100) * 100;
    // A bill worked out from units is shown to the nearest ₹10 (₹3,500, not ₹3,499)
    const shownBill = isBillMode ? Math.round(bill) : Math.round(bill / 10) * 10;
    return {
      results,
      kw: results.recommendedKw,
      panels: results.panelCount,
      units: results.monthlyUnits,
      bill: shownBill,
      mode: isBillMode ? 'bill' : 'units',
      yearlyBill: isBillMode ? yearlyBill : shownBill * 12,
      savings,
      share: capped ? Math.round(SAVINGS_SHARE * 100) : (yearlyBill > 0 ? Math.round(savings / yearlyBill * 100) : 0)
    };
  }

  function setText(el, text) { if (el) el.textContent = text; }

  function renderCalculations() {
    const est = currentEstimate();
    const results = est.results;

    // Update Hero badge
    setText(elements.heroKw, `${results.recommendedKw} kW`);
    setText(elements.heroKwSub, est.mode === 'bill'
      ? `For your ₹${fmt(est.bill)} monthly bill (about ${fmt(est.units)} units a month).`
      : `For your ${fmt(est.units)} units a month (a bill of about ₹${fmt(est.bill)}).`);

    // Circular gauge (log scale, so 3 kW homes and 250 kW plants both read clearly)
    if (elements.gaugeFill) {
      const circumference = 264;
      const kwVal = parseFloat(results.recommendedKw);
      const ratio = Math.min(1.0, Math.max(0.08, Math.log(1 + kwVal) / Math.log(1 + 300)));
      const offset = circumference - (circumference * ratio);
      elements.gaugeFill.style.strokeDashoffset = offset;
    }

    // Metric tiles: a short value, with any detail in the small line under it
    setText(elements.monthlyUnits, `${fmt(results.monthlyUnits)} kWh`);
    setText(elements.dailyUnits, `${results.dailyUnits} kWh`);
    setText(elements.annualGen, `${results.annualGen} kWh`);
    setText(elements.panelCount, `${fmt(results.panelCount)} panels`);
    setText(elements.roofSpace, `${fmt(results.roofSpaceSqFt)} sq ft`);
    setText(elements.roofNote, `about ${fmt(results.roofSpaceSqM)} m², free of shade`);
    setText(elements.inverterCap, `${results.inverterKw} kW`);
    setText(elements.inverterNote, results.inverterPhase);
    setText(elements.annualSavings, `₹${fmt(est.savings)}`);
    setText(elements.savingsNote, `up to ${est.share}% of your ₹${fmt(est.yearlyBill)} bill`);
    setText(elements.co2Offset, results.co2Offset);

    // Render interactive solar panel array
    renderPanelMatrix(results.panelCount);

    // Update formula breakdown
    setText(elements.formulaDaily, `${results.dailyUnits} kWh/day`);
    setText(elements.formulaSunHours, `${results.effectiveSunHours} hrs`);
    setText(elements.formulaDerate, `${results.systemDerate}%`);
    setText(elements.formulaResult, `${results.recommendedKw} kWp`);

    updateBookingLinks(est);
    updateWhatsAppLinks(est);
    // Keep the form in step: refill it while it is empty or still holds what we wrote,
    // and hide the estimate once the visitor has typed their own figure there
    if (window.svShowEstimate && (userSet || formPrefilled)) {
      const field = document.getElementById('client-consumption');
      if (field && (!field.value.trim() || field.value === field.dataset.autoValue)) prefillForm();
      else window.svShowEstimate(null);
    }
  }

  function renderPanelMatrix(count) {
    if (!elements.panelGrid) return;
    const wattage = (typeof SOORYAVAMSHI_CONFIG !== 'undefined' && SOORYAVAMSHI_CONFIG.calculator && SOORYAVAMSHI_CONFIG.calculator.standardPanelWattage) || 550;
    if (elements.panelCountTag) elements.panelCountTag.textContent = `${fmt(count)} x ${wattage}W Modules`;

    elements.panelGrid.innerHTML = '';
    // Cap visual display at 36 panels for UI cleanliness
    const displayCount = Math.min(count, 36);
    for (let i = 0; i < displayCount; i++) {
      const panel = document.createElement('div');
      panel.className = 'mini-panel-icon';
      panel.title = `Module #${i + 1}: ${wattage}W Mono PERC Bifacial`;
      panel.innerHTML = `
        <div class="mini-panel-cell"></div>
        <div class="mini-panel-cell"></div>
        <div class="mini-panel-cell"></div>
      `;
      elements.panelGrid.appendChild(panel);
    }

    if (count > 36) {
      const moreTag = document.createElement('div');
      moreTag.style.alignSelf = 'center';
      moreTag.style.fontSize = '0.75rem';
      moreTag.style.color = 'rgba(245, 239, 230, 0.75)';
      moreTag.style.fontWeight = '600';
      moreTag.textContent = `+${fmt(count - 36)} more`;
      elements.panelGrid.appendChild(moreTag);
    }
  }

  /* ---------- Screen reader summary: one short line, once the visitor pauses ---------- */
  function scheduleSummary() {
    if (!elements.summary) return;
    clearTimeout(summaryTimer);
    summaryTimer = setTimeout(function() {
      const est = currentEstimate();
      elements.summary.textContent = `${est.kw} kilowatt system, ${est.panels} panels, yearly savings up to ₹${fmt(est.savings)}.`;
    }, 900);
  }

  /* ---------- Booking links and WhatsApp ---------- */

  function fieldValue(id) {
    const el = document.getElementById(id);
    return el && el.value ? el.value.trim() : '';
  }

  function urlParam(name) {
    try { return new URLSearchParams(window.location.search).get(name) || ''; } catch (e) { return ''; }
  }

  // contact.html?bill=3500&kw=4.6 (or ?units=486&kw=4.6), plus the town and PIN when known
  function bookingHref(est) {
    const p = new URLSearchParams();
    if (est.mode === 'bill') p.set('bill', est.bill); else p.set('units', est.units);
    p.set('kw', est.kw);
    const loc = fieldValue('client-location') || urlParam('location');
    const pin = fieldValue('client-pin').replace(/\D/g, '') || urlParam('pin');
    if (loc) p.set('location', loc);
    if (pin) p.set('pin', pin);
    return 'contact.html?' + p.toString();
  }

  function updateBookingLinks(est) {
    if (!ready && !est) return;
    est = est || currentEstimate();
    const withEstimate = bookingHref(est);
    document.querySelectorAll(BOOKING_LINKS).forEach(a => {
      // Until the visitor gives a bill, the header and bar buttons stay plain links to the contact page
      a.setAttribute('href', userSet || a === elements.assessmentBtn ? withEstimate : 'contact.html');
    });
  }

  function whatsappText(est) {
    est = est || currentEstimate();
    const usage = est.mode === 'bill'
      ? `Monthly bill: ₹${fmt(est.bill)} (about ${fmt(est.units)} units)`
      : `Monthly use: ${fmt(est.units)} units (bill about ₹${fmt(est.bill)})`;
    return [
      'Hi, I used the solar calculator on suryavamshi.com.',
      usage,
      `Suggested system: ${est.kw} kW, ${est.panels} panels`,
      'Please help me book a free site visit.'
    ].join('\n');
  }

  function whatsappLink(est) {
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(whatsappText(est))}`;
  }

  // The result's WhatsApp button always sends this result; the floating button and the
  // phone bar's WhatsApp send it once the visitor has given their own bill or units
  function updateWhatsAppLinks(est) {
    const link = whatsappLink(est);
    if (elements.waBtn) elements.waBtn.href = link;
    if (!userSet) return;
    document.querySelectorAll('.fab-wa, .mobile-bar a.wa').forEach(a => { a.href = link; });
  }

  /* ---------- The form on this page ---------- */

  function estimateForForm(est) {
    est = est || currentEstimate();
    return { kw: est.kw, panels: est.panels, bill: est.mode === 'bill' ? est.bill : null, units: est.mode === 'units' ? est.units : null };
  }

  function prefillForm() {
    const est = currentEstimate();
    const monthlyInput = document.getElementById('client-consumption') || document.getElementById('contactUnits');
    const msgInput = document.getElementById('client-message') || document.getElementById('contactMessage');

    if (monthlyInput) {
      // Carry over whichever the visitor used: their bill, or their units
      if (window.svSetUsageMode) window.svSetUsageMode(est.mode);
      monthlyInput.value = est.mode === 'bill' ? est.bill : est.units;
      monthlyInput.dataset.autoValue = String(monthlyInput.value);
    }

    if (msgInput) {
      const usage = est.mode === 'bill'
        ? `my monthly bill of about ₹${fmt(est.bill)} (about ${fmt(est.units)} units)`
        : `my monthly use of ${fmt(est.units)} units (a bill of about ₹${fmt(est.bill)})`;
      const text = `I used the solar calculator: about ${est.kw} kW (${est.panels} panels, about ${fmt(est.results.roofSpaceSqFt)} sq ft of roof) for ${usage}. Please arrange a free site visit.`;
      // Don't overwrite something the visitor wrote themselves
      if (!msgInput.value.trim() || msgInput.value === msgInput.dataset.autoText) {
        msgInput.value = text;
        msgInput.dataset.autoText = text;
      }
    }

    formPrefilled = true;
    if (window.svShowEstimate) window.svShowEstimate(estimateForForm(est));
  }

  // Land on the form itself (clear of the header) with the name field ready to type in
  function openForm(prefill) {
    if (prefill) prefillForm();
    const form = document.getElementById('assessment-form');
    const success = document.getElementById('form-success');
    const shown = form && getComputedStyle(form).display !== 'none' ? form : (success || form);
    if (!shown) return;
    const smooth = document.documentElement.getAttribute('data-sv-motion') !== 'off';
    shown.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    const first = shown === form ? document.getElementById('client-name') : shown;
    if (first) {
      try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
    }
  }

  function handleAssessmentPrefill() {
    openForm(true);
  }

  /* ---------- Arriving with a bill: show the result, not the top of the page ---------- */
  function bringResultIntoView() {
    if (window.location.hash) return;
    const nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    if (nav && (nav.type === 'reload' || nav.type === 'back_forward')) return;
    // Phones and tablets stack the result under the inputs, so go to the result itself;
    // wider screens show both side by side, so go to the top of the calculator card
    const narrow = window.matchMedia && window.matchMedia('(max-width: 980px)').matches;
    const target = document.getElementById(narrow ? 'calc-result' : 'calc-card');
    if (!target) return;
    // premium.js opens a page at its #hash target (instantly), so name the target in the address
    try { history.replaceState(history.state, '', '#' + target.id); } catch (e) {}
    let touched = false;
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function(ev) {
      window.addEventListener(ev, function() { touched = true; }, { once: true, passive: true });
    });
    const go = function() {
      if (touched) return;
      try { target.scrollIntoView({ block: 'start', behavior: 'instant' }); } catch (e) { target.scrollIntoView(true); }
    };
    go();
    // Once fonts and images have settled, check it again
    window.addEventListener('load', function() { setTimeout(function() { requestAnimationFrame(go); }, 0); });
  }

  return {
    init,
    compute,
    getCurrentResults: function() {
      return compute(Math.round(currentUnits), getSelectedState());
    },
    // The visitor's estimate for the form's WhatsApp links, or null until they have given a bill or units
    getEstimate: function() {
      if (!ready || !(userSet || formPrefilled)) return null;
      const est = currentEstimate();
      return { kw: est.kw, panels: est.panels, bill: est.bill, units: est.units, mode: est.mode };
    },
    whatsappText: function() { return ready ? whatsappText() : ''; },
    openForm: function() { openForm(true); },
    handleAssessmentPrefill
  };
})();
