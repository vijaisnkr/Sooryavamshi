/**
 * Sooryavamshi Solar Projects LLP - Solar Requirement Calculator
 * Cleanly separated calculation engine and reactive DOM controller.
 *
 * v6: the typed value always drives the result (units or bill) and the
 * typed bill can go up to Rs 2,00,000 a month.
 * v7: the slider covers everyday bills only (up to Rs 10,000 a month, or the
 * same amount in units) on a straight scale. A typed value above that is
 * still used in full; the slider just rests at its right end.
 */

window.SolarCalculator = (function() {
  const MAX_BILL = 200000;   // Rs per month, top of the typed range
  const SLIDER_MAX_BILL = 10000; // Rs per month, right end of the slider
  const MIN_UNITS = 50;      // left end of the slider
  const SLIDER_STEPS = 1000; // slider resolution (positions, not units)

  // Internal state
  let currentUnits = 400; // Default units
  let currentBill = null; // Exact bill typed in bill mode
  let currentStateIndex = 0; // Default Kerala
  let isBillMode = false;

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

      // Results output elements
      heroKw: document.getElementById('resultHeroKw'),
      heroKwSub: document.getElementById('resultHeroSub'),
      gaugeFill: document.getElementById('resultGaugeFill'),
      monthlyUnits: document.getElementById('resultMonthlyUnits'),
      dailyUnits: document.getElementById('resultDailyUnits'),
      annualGen: document.getElementById('resultAnnualGen'),
      panelCount: document.getElementById('resultPanelCount'),
      roofSpace: document.getElementById('resultRoofSpace'),
      inverterCap: document.getElementById('resultInverterCap'),
      annualSavings: document.getElementById('resultAnnualSavings'),
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
  }

  // calculator.html?bill=4500 or ?units=400 (from the homepage quick estimate)
  function applyUrlParams() {
    let params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
    const bill = parseFloat(params.get('bill'));
    const units = parseFloat(params.get('units'));
    if (bill > 0) {
      setMode(true);
      currentBill = Math.min(bill, MAX_BILL);
      currentUnits = currentBill / getTariff();
      if (bill > MAX_BILL) setHint(`The calculator goes up to ₹${fmt(MAX_BILL)} a month, so we've used ₹${fmt(MAX_BILL)}.`, true);
    } else if (units > 0) {
      currentUnits = Math.min(units, maxUnits());
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

  // True when the typed value is beyond the slider's right end
  function isAboveSlider() {
    return isBillMode
      ? (currentBill != null ? currentBill : currentUnits * getTariff()) > SLIDER_MAX_BILL
      : currentUnits > sliderMaxUnits();
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
        ? `Using your typed bill of ₹${fmt(currentBill != null ? currentBill : currentUnits * getTariff())}. The slider stops at ₹${fmt(SLIDER_MAX_BILL)}; type any bill up to ₹${fmt(MAX_BILL)}.`
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
    updateSliderProgress();
    if (!skipNumberBox) {
      elements.numberInput.value = isBillMode
        ? Math.round(currentBill != null ? currentBill : currentUnits * getTariff())
        : Math.round(currentUnits);
    }
    elements.numberInput.max = isBillMode ? MAX_BILL : maxUnits();
    elements.presetPills.forEach(p => {
      p.classList.toggle('active', !isBillMode && parseInt(p.getAttribute('data-units'), 10) === Math.round(currentUnits));
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

  function bindEvents() {
    // Slider: logarithmic position -> units
    const onSliderUpdate = function(e) {
      const pos = parseInt(e.target.value, 10);
      const units = niceRound(unitsFromPosition(pos));
      currentUnits = Math.max(MIN_UNITS, Math.min(sliderMaxUnits(), units));
      currentBill = isBillMode ? Math.min(SLIDER_MAX_BILL, niceRound(currentUnits * getTariff())) : null;
      if (pos >= SLIDER_STEPS) {
        // The right end is exactly Rs 10,000 (or its units)
        if (isBillMode) { currentBill = SLIDER_MAX_BILL; currentUnits = SLIDER_MAX_BILL / getTariff(); }
        else currentUnits = sliderMaxUnits();
      } else if (isBillMode) {
        currentUnits = currentBill / getTariff();
      }
      setHint(defaultHint());
      syncInputs();
      renderCalculations();
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
      renderCalculations();
    });

    // When the box loses focus, show the value actually used
    elements.numberInput.addEventListener('change', function() {
      syncInputs();
    });

    // State change: tariff and insolation change, the typed bill stays the same
    elements.stateSelect.addEventListener('change', function(e) {
      currentStateIndex = parseInt(e.target.value, 10);
      if (isBillMode && currentBill != null) {
        currentUnits = currentBill / getTariff();
      }
      currentUnits = Math.min(currentUnits, maxUnits());
      setHint(defaultHint());
      syncInputs();
      renderCalculations();
    });

    // Tab mode toggle (Units vs Bill)
    elements.tabUnits.addEventListener('click', function() { setMode(false); });
    elements.tabBill.addEventListener('click', function() { setMode(true); });

    // Preset pills (always in units)
    elements.presetPills.forEach(pill => {
      pill.addEventListener('click', function() {
        currentUnits = parseInt(this.getAttribute('data-units'), 10);
        currentBill = isBillMode ? Math.round(currentUnits * getTariff()) : null;
        setHint(defaultHint());
        syncInputs();
        renderCalculations();
      });
    });

    // Get a Free Site Assessment button
    if (elements.assessmentBtn) {
      elements.assessmentBtn.addEventListener('click', function(e) {
        e.preventDefault();
        handleAssessmentPrefill();
      });
    }
  }

  function setMode(billMode) {
    isBillMode = billMode;
    elements.tabUnits.classList.toggle('active', !isBillMode);
    elements.tabBill.classList.toggle('active', isBillMode);
    elements.tabUnits.setAttribute('aria-selected', String(!isBillMode));
    elements.tabBill.setAttribute('aria-selected', String(isBillMode));
    if (elements.modeSeg) elements.modeSeg.classList.toggle('bill', isBillMode);
    if (elements.currency) elements.currency.hidden = !isBillMode;

    if (isBillMode) {
      currentBill = Math.round(currentUnits * getTariff());
      elements.unitLabel.textContent = "/ month";
      if (elements.fieldLabel) elements.fieldLabel.textContent = "Average Monthly Electricity Bill";
    } else {
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
    if (recommendedKw > 3.3 && recommendedKw <= 5.5) {
      inverterCap = "5.0 kW Single/Three-Phase";
    } else if (recommendedKw > 5.5 && recommendedKw <= 8.5) {
      inverterCap = "8.0 kW Three-Phase";
    } else if (recommendedKw > 8.5 && recommendedKw <= 11.5) {
      inverterCap = "10.0 kW Three-Phase";
    } else if (recommendedKw > 11.5 && recommendedKw <= 16.0) {
      inverterCap = "15.0 kW Three-Phase";
    } else if (recommendedKw > 16.0) {
      inverterCap = `${Math.ceil(recommendedKw)} kW Commercial Array`;
    }

    // Financial & Environmental returns
    const tariff = stateObj.defaultTariff || config.averageTariffPerUnitInr;
    const annualSavings = Math.round(annualGen * tariff);
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
      annualSavings: `₹${annualSavings.toLocaleString('en-IN')}`,
      monthlySavings: `₹${monthlySavings.toLocaleString('en-IN')}`,
      co2Offset: `${co2Offset} Tons / yr`
    };
  }

  function renderCalculations(animate = false) {
    const stateObj = getSelectedState();
    const results = compute(Math.round(currentUnits), stateObj);

    // Update Hero badge
    if (elements.heroKw) elements.heroKw.textContent = `${results.recommendedKw} kW`;
    if (elements.heroKwSub) elements.heroKwSub.textContent = `Powers 100% of ~${fmt(results.monthlyUnits)} units/month requirement`;

    // Circular gauge (log scale, so 3 kW homes and 250 kW plants both read clearly)
    if (elements.gaugeFill) {
      const circumference = 264;
      const kwVal = parseFloat(results.recommendedKw);
      const ratio = Math.min(1.0, Math.max(0.08, Math.log(1 + kwVal) / Math.log(1 + 300)));
      const offset = circumference - (circumference * ratio);
      elements.gaugeFill.style.strokeDashoffset = offset;
    }

    // Update metrics grid
    if (elements.monthlyUnits) elements.monthlyUnits.textContent = `${fmt(results.monthlyUnits)} kWh`;
    if (elements.dailyUnits) elements.dailyUnits.textContent = `${results.dailyUnits} kWh/day`;
    if (elements.annualGen) elements.annualGen.textContent = `${results.annualGen} kWh`;
    if (elements.panelCount) elements.panelCount.textContent = `${fmt(results.panelCount)} Panels`;
    if (elements.roofSpace) elements.roofSpace.textContent = `${fmt(results.roofSpaceSqFt)} sq.ft (${fmt(results.roofSpaceSqM)} m²)`;
    if (elements.inverterCap) elements.inverterCap.textContent = results.inverterCap;
    if (elements.annualSavings) elements.annualSavings.textContent = `${results.annualSavings}/yr`;
    if (elements.co2Offset) elements.co2Offset.textContent = results.co2Offset;

    // Render interactive solar panel array
    renderPanelMatrix(results.panelCount);

    // Update formula breakdown
    if (elements.formulaDaily) elements.formulaDaily.textContent = `${results.dailyUnits} kWh/day`;
    if (elements.formulaSunHours) elements.formulaSunHours.textContent = `${results.effectiveSunHours} hrs`;
    if (elements.formulaDerate) elements.formulaDerate.textContent = `${results.systemDerate}%`;
    if (elements.formulaResult) elements.formulaResult.textContent = `${results.recommendedKw} kWp`;
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

  function handleAssessmentPrefill() {
    const stateObj = getSelectedState();
    const results = compute(Math.round(currentUnits), stateObj);

    // Scroll to contact section
    const contactSection = document.getElementById('site-assessment-form') || document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Prefill form inputs
    const monthlyInput = document.getElementById('client-consumption') || document.getElementById('contactUnits');
    const msgInput = document.getElementById('client-message') || document.getElementById('contactMessage');

    if (monthlyInput) {
      monthlyInput.value = results.monthlyUnits;
    }

    if (msgInput) {
      const billNote = isBillMode && currentBill != null ? ` (monthly bill about ₹${fmt(currentBill)})` : '';
      msgInput.value = `Hello Sooryavamshi team, I calculated my home solar requirement as ${results.recommendedKw} kW (${results.panelCount} panels, ~${results.roofSpaceSqFt} sq.ft) for my monthly consumption of ${results.monthlyUnits} units${billNote} in ${stateObj.name}. Please arrange a site assessment.`;
      msgInput.focus();
    }
  }

  return {
    init,
    compute,
    getCurrentResults: function() {
      return compute(Math.round(currentUnits), getSelectedState());
    }
  };
})();
