/**
 * Sooryavamshi Solar Projects LLP - Solar Requirement Calculator
 * Cleanly separated calculation engine and reactive DOM controller.
 */

const SolarCalculator = (function() {
  // Internal state
  let currentUnits = 400; // Default units
  let currentStateIndex = 0; // Default Karnataka
  let isBillMode = false;

  // Cache DOM elements
  let elements = {};

  function init() {
    elements = {
      slider: document.getElementById('calcUnitsSlider'),
      numberInput: document.getElementById('calcUnitsInput'),
      unitLabel: document.getElementById('calcUnitLabel'),
      stateSelect: document.getElementById('calcStateSelect'),
      tabUnits: document.getElementById('tabUnitsMode'),
      tabBill: document.getElementById('tabBillMode'),
      presetPills: document.querySelectorAll('.preset-pill'),
      formulaToggle: document.getElementById('calcFormulaToggle'),
      formulaContent: document.getElementById('calcFormulaContent'),
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

    populateStates();
    bindEvents();
    updateSliderProgress();
    renderCalculations();
  }

  function updateSliderProgress() {
    if (!elements.slider) return;
    const min = parseFloat(elements.slider.min) || 50;
    const max = parseFloat(elements.slider.max) || 1500;
    const val = parseFloat(elements.slider.value) || 400;
    const percent = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    elements.slider.style.setProperty('--slider-percent', `${percent}%`);
  }

  function setupMobileTouchSupport(slider) {
    if (!slider) return;
    let isDragging = false;

    function handleTouch(e) {
      const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : null);
      if (!touch) return;
      
      const rect = slider.getBoundingClientRect();
      if (rect.width <= 0) return;
      
      const touchX = touch.clientX;
      const offsetX = Math.max(0, Math.min(rect.width, touchX - rect.left));
      const ratio = offsetX / rect.width;
      const min = parseFloat(slider.min) || 50;
      const max = parseFloat(slider.max) || 1500;
      const step = parseFloat(slider.step) || 10;
      
      const rawVal = min + ratio * (max - min);
      const snapped = Math.max(min, Math.min(max, Math.round(rawVal / step) * step));
      
      if (parseInt(slider.value, 10) !== snapped) {
        slider.value = snapped;
        updateInputValue(snapped);
        renderCalculations();
      }
    }

    slider.addEventListener('touchstart', function(e) {
      if (e.touches && e.touches.length === 1) {
        isDragging = true;
        handleTouch(e);
      }
    }, { passive: true });

    slider.addEventListener('touchmove', function(e) {
      if (isDragging && e.touches && e.touches.length === 1) {
        // Prevent viewport vertical scroll from canceling horizontal slider drag
        if (e.cancelable) e.preventDefault();
        handleTouch(e);
      }
    }, { passive: false });

    const stopDragging = function(e) {
      if (isDragging) {
        isDragging = false;
        if (e && e.changedTouches) handleTouch(e);
      }
    };

    slider.addEventListener('touchend', stopDragging, { passive: true });
    slider.addEventListener('touchcancel', stopDragging, { passive: true });
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
    // Slider input and change events with live reactive rendering
    const onSliderUpdate = function(e) {
      const val = parseInt(e.target.value, 10);
      updateInputValue(val);
      renderCalculations();
    };

    elements.slider.addEventListener('input', onSliderUpdate);
    elements.slider.addEventListener('change', onSliderUpdate);
    setupMobileTouchSupport(elements.slider);

    // Number input manual typing
    elements.numberInput.addEventListener('input', function(e) {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 50) val = 50;
      if (val > 2500) val = 2500;
      
      if (isBillMode) {
        // Convert bill to units
        const tariff = getSelectedState().defaultTariff;
        currentUnits = Math.round(val / tariff);
      } else {
        currentUnits = val;
      }
      elements.slider.value = currentUnits;
      updateSliderProgress();
      renderCalculations();
    });

    // State change
    elements.stateSelect.addEventListener('change', function(e) {
      currentStateIndex = parseInt(e.target.value, 10);
      renderCalculations();
    });

    // Tab mode toggle (Units vs Bill)
    elements.tabUnits.addEventListener('click', function() {
      setMode(false);
    });

    elements.tabBill.addEventListener('click', function() {
      setMode(true);
    });

    // Preset pills
    elements.presetPills.forEach(pill => {
      pill.addEventListener('click', function() {
        elements.presetPills.forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        const presetVal = parseInt(this.getAttribute('data-units'), 10);
        currentUnits = presetVal;
        updateInputValue(presetVal);
        renderCalculations();
      });
    });

    // Formula Breakdown toggle
    if (elements.formulaToggle && elements.formulaContent) {
      elements.formulaToggle.addEventListener('click', function() {
        const isOpen = elements.formulaContent.classList.contains('expanded');
        elements.formulaContent.classList.toggle('expanded');
        elements.formulaToggle.innerHTML = isOpen ? 
          `<span>View Engineering Calculation Formula</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>` :
          `<span>Hide Calculation Formula</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
      });
    }

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

    const tariff = getSelectedState().defaultTariff;
    if (isBillMode) {
      elements.unitLabel.textContent = "₹";
      const billVal = Math.round(currentUnits * tariff);
      elements.numberInput.value = billVal;
      document.querySelector('.calc-field-label').textContent = "Average Monthly Electricity Bill";
    } else {
      elements.unitLabel.textContent = "Units";
      elements.numberInput.value = currentUnits;
      document.querySelector('.calc-field-label').textContent = "Monthly Electricity Consumption";
    }
  }

  function updateInputValue(units) {
    currentUnits = units;
    elements.slider.value = units;
    updateSliderProgress();
    const tariff = getSelectedState().defaultTariff;
    if (isBillMode) {
      elements.numberInput.value = Math.round(units * tariff);
    } else {
      elements.numberInput.value = units;
    }
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
    const results = compute(currentUnits, stateObj);

    // Update Hero badge
    if (elements.heroKw) elements.heroKw.textContent = `${results.recommendedKw} kW`;
    if (elements.heroKwSub) elements.heroKwSub.textContent = `Powers 100% of ~${results.monthlyUnits} units/month requirement`;

    // Circular gauge stroke animation (relative to a 15kW scale, min 20%, max 95%)
    if (elements.gaugeFill) {
      const circumference = 264;
      const kwVal = parseFloat(results.recommendedKw);
      const ratio = Math.min(1.0, Math.max(0.1, kwVal / 15));
      const offset = circumference - (circumference * ratio);
      elements.gaugeFill.style.strokeDashoffset = offset;
    }

    // Update metrics grid
    if (elements.monthlyUnits) elements.monthlyUnits.textContent = `${results.monthlyUnits} kWh`;
    if (elements.dailyUnits) elements.dailyUnits.textContent = `${results.dailyUnits} kWh/day`;
    if (elements.annualGen) elements.annualGen.textContent = `${results.annualGen} kWh`;
    if (elements.panelCount) elements.panelCount.textContent = `${results.panelCount} Panels`;
    if (elements.roofSpace) elements.roofSpace.textContent = `${results.roofSpaceSqFt} sq.ft (${results.roofSpaceSqM} m²)`;
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
    if (elements.panelCountTag) elements.panelCountTag.textContent = `${count} x ${wattage}W Modules`;

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
      moreTag.style.color = '#5C6E8C';
      moreTag.style.fontWeight = '600';
      moreTag.textContent = `+${count - 36} more`;
      elements.panelGrid.appendChild(moreTag);
    }
  }

  function handleAssessmentPrefill() {
    const stateObj = getSelectedState();
    const results = compute(currentUnits, stateObj);

    // Scroll to contact section
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Prefill form inputs
    const monthlyInput = document.getElementById('contactUnits');
    const msgInput = document.getElementById('contactMessage');

    if (monthlyInput) {
      monthlyInput.value = results.monthlyUnits;
    }

    if (msgInput) {
      msgInput.value = `Hello Sooryavamshi team, I calculated my home solar requirement as ${results.recommendedKw} kW (${results.panelCount} panels, ~${results.roofSpaceSqFt} sq.ft) for my monthly consumption of ${results.monthlyUnits} units in ${stateObj.name}. Please arrange a site assessment.`;
      msgInput.focus();
    }
  }

  return {
    init,
    compute,
    getCurrentResults: function() {
      return compute(currentUnits, getSelectedState());
    }
  };
})();
