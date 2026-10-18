/**
 * Suryavamshi Solar - Daylight UI layer
 * Settings (theme, text size, animations, sun cursor), scroll-driven animations,
 * parallax, header state, number counters, the hero bill estimate
 * the live sun-path arc, the sun cursor and click effects.
 */
(function () {
  var root = document.documentElement;
  var sysReduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  function store(key, val) {
    try { if (val == null) localStorage.removeItem(key); else localStorage.setItem(key, val); } catch (e) {}
  }
  function stored(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  // Animations are off when the visitor turned them off in Settings, or (with no choice saved) when the device asks for less motion.
  function still() {
    var m = root.getAttribute('data-sv-motion');
    return m ? m === 'off' : sysReduce;
  }

  /* ---------------- Theme ---------------- */
  var THEME_KEY = 'sv-theme';
  var mql = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;

  function getPref() {
    try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return root.getAttribute('data-sv-pref') || 'light'; }
  }
  function applyTheme(pref) {
    var dark = pref === 'dark' || (pref === 'system' && mql && mql.matches);
    root.setAttribute('data-sv-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-sv-pref', pref);
    document.querySelectorAll('[data-theme-choice]').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-theme-choice') === pref ? 'true' : 'false');
    });
    syncThemeColor();
  }
  // The browser's toolbar colour (theme-color) follows the page background: white in Light, deep navy in Dark.
  function syncThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', root.getAttribute('data-sv-theme') === 'dark' ? '#0A1A2E' : '#FFFFFF');
  }
  syncThemeColor();
  function setPref(pref) {
    try { localStorage.setItem(THEME_KEY, pref); } catch (e) {}
    applyTheme(pref);
  }
  if (mql) {
    var onSys = function () { if (getPref() === 'system') applyTheme('system'); };
    mql.addEventListener ? mql.addEventListener('change', onSys) : mql.addListener(onSys);
  }

  /* ---------------- Modal layers (Settings, phone menu) ----------------
     While a layer is open, everything else on the page is inert: it can't take focus or clicks and
     screen readers skip it. Layers can stack (Settings opened from the phone menu); each one only
     undoes what it changed. js/app.js defines the same helper as window.svInert for the menu. */
  var lockPage = window.svInert || function (keep) {
    var changed = [];
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (keep.indexOf(el) > -1 || el.tagName === 'SCRIPT' || el.hasAttribute('inert')) return;
      el.setAttribute('inert', ''); changed.push(el);
    });
    return function () { changed.forEach(function (el) { el.removeAttribute('inert'); }); };
  };
  // Tab and Shift+Tab wrap around inside an open layer.
  function trapTab(e, box) {
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(box.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'), function (el) {
      return el.offsetWidth || el.offsetHeight || el.getClientRects().length;
    });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }

  function initSettings() {
    var backdrop = document.getElementById('settingsBackdrop');
    var openers = document.querySelectorAll('#settingsBtn, [data-open-settings]');
    var closeBtn = document.getElementById('settingsClose');
    if (!backdrop) return;
    var dialog = backdrop.querySelector('[role="dialog"]') || backdrop;
    var lastFocus = null, unlock = null;
    // Closed: out of the Tab order and hidden from screen readers (CSS also hides it after the fade).
    backdrop.setAttribute('inert', '');
    backdrop.setAttribute('aria-hidden', 'true');

    function open() {
      if (backdrop.classList.contains('open')) return;
      lastFocus = document.activeElement;
      backdrop.removeAttribute('inert');
      backdrop.removeAttribute('aria-hidden');
      backdrop.classList.add('open');
      unlock = lockPage([backdrop]);
      var cur = backdrop.querySelector('[aria-checked="true"]') || closeBtn;
      setTimeout(function () { cur && cur.focus(); }, 50);
    }
    function close() {
      if (!backdrop.classList.contains('open')) return;
      backdrop.classList.remove('open');
      if (unlock) { unlock(); unlock = null; }
      backdrop.setAttribute('inert', '');
      backdrop.setAttribute('aria-hidden', 'true');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    openers.forEach(function (b) { b.addEventListener('click', open); });
    closeBtn && closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', function (e) {
      if (!backdrop.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      trapTab(e, dialog);
    });

    // Radio groups (theme, text size): click to choose, arrow keys move the choice.
    function radios(attr, onPick) {
      var opts = Array.prototype.slice.call(backdrop.querySelectorAll('[' + attr + ']'));
      opts.forEach(function (b, i) {
        b.addEventListener('click', function () { onPick(b.getAttribute(attr)); });
        b.addEventListener('keydown', function (e) {
          var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          var n = opts[(i + d + opts.length) % opts.length];
          n.focus(); n.click();
        });
      });
    }
    radios('data-theme-choice', setPref);
    radios('data-text-choice', setText);

    var motionSw = document.getElementById('motionSwitch');
    var cursorSw = document.getElementById('cursorSwitch');
    motionSw && motionSw.addEventListener('click', function () { setMotion(still() ? 'on' : 'off'); });
    cursorSw && cursorSw.addEventListener('click', function () { setCursor(root.getAttribute('data-sv-cursor') === 'off' ? 'on' : 'off'); });

    var reset = document.getElementById('settingsReset');
    reset && reset.addEventListener('click', function () {
      store(THEME_KEY, null); store(TEXT_KEY, null); store(MOTION_KEY, null); store(CURSOR_KEY, null);
      applyTheme('light');
      applyText('normal');
      applyMotion(sysReduce ? 'off' : 'on');
      applyCursor('on');
      var label = reset.textContent;
      reset.textContent = 'Back to default';
      setTimeout(function () { reset.textContent = label; }, 1600);
    });

    syncSettingsUI();
  }

  /* ---------------- Text size, animations, sun cursor ---------------- */
  var TEXT_KEY = 'sv-text', MOTION_KEY = 'sv-motion', CURSOR_KEY = 'sv-sun-cursor';

  function syncSettingsUI() {
    var text = root.getAttribute('data-sv-text') || 'normal';
    document.querySelectorAll('[data-text-choice]').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-text-choice') === text ? 'true' : 'false');
    });
    var motionSw = document.getElementById('motionSwitch');
    if (motionSw) motionSw.setAttribute('aria-checked', still() ? 'false' : 'true');
    var cursorSw = document.getElementById('cursorSwitch');
    if (cursorSw) {
      cursorSw.setAttribute('aria-checked', !still() && root.getAttribute('data-sv-cursor') !== 'off' ? 'true' : 'false');
      cursorSw.disabled = still();
      var hint = document.getElementById('cursorHint');
      if (hint) hint.textContent = still() ? 'Turn animations on to use the sun cursor.' : 'A glowing sun follows your mouse.';
    }
  }
  function applyText(v) {
    root.setAttribute('data-sv-text', v === 'large' || v === 'larger' ? v : 'normal');
    syncSettingsUI();
  }
  function setText(v) { store(TEXT_KEY, v === 'normal' ? null : v); applyText(v); }

  function applyMotion(v) {
    root.setAttribute('data-sv-motion', v === 'off' ? 'off' : 'on');
    if (v === 'off') settleMotion();
    syncCursor();
    syncSettingsUI();
  }
  function setMotion(v) { store(MOTION_KEY, v); applyMotion(v); }

  function applyCursor(v) {
    root.setAttribute('data-sv-cursor', v === 'off' ? 'off' : 'on');
    syncCursor();
    syncSettingsUI();
  }
  function setCursor(v) { store(CURSOR_KEY, v === 'off' ? 'off' : null); applyCursor(v); }

  // Animations were just turned off: show everything that was waiting to slide in and put moved things back in place.
  function settleMotion() {
    document.querySelectorAll('[data-reveal], .pcard, #kseb-section .dtr').forEach(function (el) { el.classList.add('in'); });
    var heroMedia = document.querySelector('.hero-media');
    if (heroMedia) heroMedia.style.transform = '';
    var heroSun = document.querySelector('.hero-sun');
    if (heroSun) heroSun.style.removeProperty('--sun-y');
    var closing = document.querySelector('.closing');
    if (closing) closing.style.removeProperty('--rise');
    document.querySelectorAll('.btn-sun').forEach(function (b) { b.style.translate = ''; });
  }

  /* ---------------- Drawer close button ---------------- */
  function initDrawerClose() {
    var btn = document.getElementById('drawerClose');
    var backdrop = document.querySelector('.mobile-nav-backdrop');
    if (btn && backdrop) btn.addEventListener('click', function () { backdrop.click(); });
  }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    var els = document.querySelectorAll('[data-reveal], .pcard, #kseb-section .dtr');
    if (still() || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    root.classList.add('anim');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.95 && r.bottom > 0) el.classList.add('in');
      else io.observe(el);
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('loaded'); }); });
  }

  /* ---------------- Counters ---------------- */
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length || still() || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        if (still()) return;
        var el = en.target, target = parseFloat(el.getAttribute('data-count'));
        var pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
        var t0 = performance.now(), dur = 1600;
        (function step(now) {
          var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
          el.textContent = pre + Math.round(target * e).toLocaleString('en-IN') + suf;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Scroll-driven effects ---------------- */
  function initScrollFx() {
    var header = document.querySelector('.header-nav');
    var hero = document.querySelector('.hero, .page-hero');
    var heroMedia = document.querySelector('.hero-media');
    var heroSun = document.querySelector('.hero-sun');
    var progress = document.querySelector('.scroll-progress');
    var proc = document.getElementById('processTrack');
    var steps = proc ? proc.querySelectorAll('.pstep') : [];
    var flow = document.getElementById('eqFlow');
    var nodes = flow ? flow.querySelectorAll('.flow-node') : [];
    var closing = document.querySelector('.closing');
    var ticking = false;

    function sectionProgress(el, startAt, endAt) {
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      var start = vh * startAt, end = vh * endAt;
      return Math.max(0, Math.min(1, (start - r.top) / (r.height + start - end)));
    }

    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      var vh = window.innerHeight;
      var docH = document.documentElement.scrollHeight - vh;
      if (progress) progress.style.setProperty('--sp', docH > 0 ? (y / docH).toFixed(4) : 0);

      if (header && hero) {
        var past = y > hero.offsetHeight - 90;
        header.classList.toggle('on-hero', !past);
        if (!past && y <= 40) header.classList.remove('scrolled');
      }

      if (!still() && hero && y < hero.offsetHeight + 100) {
        var h = hero.offsetHeight || 1, p = y / h;
        if (heroMedia) heroMedia.style.transform = 'translate3d(0,' + (y * 0.28).toFixed(1) + 'px,0) scale(' + (1 + p * 0.06).toFixed(3) + ')';
        if (heroSun) heroSun.style.setProperty('--sun-y', (-y * 0.35).toFixed(1) + 'px');
      }

      if (proc) {
        var pp = sectionProgress(proc, 0.75, 0.35);
        proc.style.setProperty('--pp', pp.toFixed(3));
        steps.forEach(function (s, i) { s.classList.toggle('lit', pp >= (i / Math.max(1, steps.length - 1)) - 0.02); });
      }

      if (flow) {
        var fp = sectionProgress(flow, 0.9, 0.45);
        flow.style.setProperty('--flow', fp.toFixed(3));
        nodes.forEach(function (n, i) { n.classList.toggle('lit', fp >= i / Math.max(1, nodes.length - 1) - 0.02); });
      }

      if (closing && !still()) {
        var cp = sectionProgress(closing, 1, 0.2);
        closing.style.setProperty('--rise', (120 - cp * 160).toFixed(1) + 'px');
      }
    }

    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }


  /* ---------------- Hero bill estimate (live while typing) ---------------- */
  // Same sizing as the calculator's bill mode: about 1 kW per Rs 761.6 of monthly bill.
  function initQuickEstimate() {
    var input = document.getElementById('quickBill');
    var out = document.getElementById('quickOut');
    if (!input || !out) return;
    var MAX = 200000, PER_KW = 761.6;
    var idle = out.innerHTML;
    function inr(n) { return Math.round(n).toLocaleString('en-IN'); }
    function update() {
      var bill = parseFloat(input.value);
      var wrap = input.closest('.hero-quick');
      if (wrap) wrap.classList.toggle('has-value', bill > 0);
      if (!(bill > 0)) { out.innerHTML = idle; return; }
      var capped = Math.min(bill, MAX);
      var kw = Math.max(1, Math.round(capped / PER_KW * 10) / 10);
      var panels = Math.ceil(kw / 0.55);
      // PM Surya Ghar: Rs 30,000 per kW for the first 2 kW, Rs 18,000 per kW for the next 1 kW, Rs 78,000 at most
      var sub = Math.round(Math.min(78000, 30000 * Math.min(kw, 2) + 18000 * Math.max(0, Math.min(kw, 3) - 2)));
      out.innerHTML = 'Your home needs about <b>' + kw + ' kW</b> · ' + panels + ' panels · subsidy up to ₹' + inr(sub) +
        (bill > MAX ? ' <span>(bills above ₹2,00,000 are sized at ₹2,00,000)</span>' : '');
    }
    input.addEventListener('input', update);
  }

  /* ---------------- Sun path across the hero sky (Cherthala, IST) ---------------- */
  // The arc is a half ellipse in a 100 x 100 box: sunrise bottom-left, noon at the top, sunset bottom-right.
  function initSunArc() {
    var sun = document.getElementById('arcSun'), fill = document.getElementById('arcFill'), now = document.getElementById('arcNow');
    if (!sun || !fill) return;
    var RISE = 6 * 60 + 14, SET = 18 * 60 + 9;
    var sky = sun.parentNode, skyW = 0, skyH = 0, lastP = 0;
    function measure() { skyW = sky.clientWidth; skyH = sky.clientHeight; }
    function pt(p) { var a = Math.PI * p; return [50 - 50 * Math.cos(a), 100 - 100 * Math.sin(a)]; }
    // The sun moves with transform (measured in px from the sky box), so the browser never re-lays out the page while it travels.
    function draw(p) {
      lastP = p;
      var d = 'M0 100';
      for (var i = 1, n = Math.max(1, Math.round(p * 80)); i <= n; i++) { var q = pt(p * i / n); d += ' L' + q[0].toFixed(2) + ' ' + q[1].toFixed(2); }
      fill.setAttribute('d', d);
      var c = pt(p);
      sun.style.left = '0'; sun.style.top = '0';
      sun.style.transform = 'translate(' + (c[0] / 100 * skyW).toFixed(1) + 'px,' + (c[1] / 100 * skyH).toFixed(1) + 'px)';
    }
    measure();
    window.addEventListener('resize', function () { measure(); draw(lastP); });
    function state() {
      var d = new Date(), ist = new Date(d.getTime() + (d.getTimezoneOffset() + 330) * 60000);
      var m = ist.getHours() * 60 + ist.getMinutes(), day = m > RISE && m < SET;
      var t = ist.getHours() + ':' + ('0' + ist.getMinutes()).slice(-2) + ' IST';
      return { p: Math.max(0, Math.min(1, (m - RISE) / (SET - RISE))), day: day,
        label: day ? 'Generating now · ' + t : (m >= SET ? 'After sunset · ' + t : 'Before sunrise · ' + t) };
    }
    function apply(animate) {
      var s = state();
      sun.classList.toggle('night', !s.day);
      if (sun.parentNode) sun.parentNode.classList.toggle('is-night', !s.day);
      if (now) now.textContent = s.label;
      if (!animate || still()) { draw(s.p); return; }
      var t0 = performance.now(), dur = 2400;
      (function step(ts) {
        var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        draw(s.p * e);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }
    draw(0);
    setTimeout(function () { apply(true); }, 500);
    setInterval(function () { apply(false); }, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) apply(false); });
  }

  /* ---------------- Sun cursor (mouse and trackpad only) ---------------- */
  // It runs when animations are on and the visitor hasn't turned it off in Settings.
  var cursorOn = false, cursorBuilt = false, hideCursor = function () {};
  function cursorWanted() { return finePointer && !still() && root.getAttribute('data-sv-cursor') !== 'off'; }
  function syncCursor() {
    cursorOn = cursorWanted();
    if (cursorOn && !cursorBuilt) initCursor();
    root.classList.toggle('has-cursor', cursorOn);
    if (!cursorOn) hideCursor();
  }
  function initCursor() {
    if (cursorBuilt || !document.body) return;
    cursorBuilt = true;
    var ring = document.createElement('div'), dot = document.createElement('div');
    ring.className = 'cur-ring'; dot.className = 'cur-dot';
    ring.setAttribute('aria-hidden', 'true'); dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring); document.body.appendChild(dot);
    var mx = -100, my = -100, rx = mx, ry = my, shown = false, openSelect = null;
    function place() { dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)'; }
    // Carry the pointer position across page switches so the sun cursor shows at once on the next page.
    try {
      var saved = JSON.parse(sessionStorage.getItem('sv-cursor') || 'null');
      if (cursorOn && saved && Date.now() - saved.t < 4000) { mx = rx = saved.x; my = ry = saved.y; place(); shown = true; root.classList.add('cursor-on'); }
    } catch (e) {}
    window.addEventListener('pagehide', function () {
      try { if (shown) sessionStorage.setItem('sv-cursor', JSON.stringify({ x: mx, y: my, t: Date.now() })); } catch (e) {}
    });
    var HOT = 'a, button, summary, label, select, [role="radio"], [role="button"], input[type="range"], input[type="checkbox"], input[type="radio"], input[type="submit"]';
    var TEXT = 'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable]';
    document.addEventListener('pointermove', function (e) {
      if (!cursorOn || (e.pointerType && e.pointerType !== 'mouse')) return;
      mx = e.clientX; my = e.clientY;
      place();
      var t = e.target;
      if (t.tagName === 'IFRAME') return;
      // A dropdown list was just opened: keep the normal pointer until it closes.
      if (openSelect && t.closest && t.closest('select') === openSelect) return;
      openSelect = null;
      if (!shown) { shown = true; rx = mx; ry = my; root.classList.add('cursor-on'); }
      var text = t.closest && t.closest(TEXT), hot = !text && t.closest && t.closest(HOT);
      ring.classList.toggle('hover', !!hot); dot.classList.toggle('hover', !!hot);
      root.classList.toggle('cursor-text', !!text);
    }, { passive: true });
    // Hand back to the normal pointer wherever the page stops receiving mouse moves:
    // outside the window, inside an embedded map, over an open dropdown list or a right-click menu.
    // The sun cursor comes back on the next mouse move over the page.
    function hide() { shown = false; root.classList.remove('cursor-on', 'cursor-text'); }
    hideCursor = hide;
    document.addEventListener('mouseout', function (e) { if (!e.relatedTarget || e.relatedTarget.tagName === 'IFRAME') hide(); });
    document.addEventListener('mouseover', function (e) { if (e.target.tagName === 'IFRAME') hide(); });
    window.addEventListener('blur', hide);
    document.addEventListener('contextmenu', hide);
    document.addEventListener('pointerdown', function (e) {
      var sel = e.target.closest && e.target.closest('select');
      if (sel) { openSelect = sel; hide(); }
    }, true);
    document.addEventListener('change', function (e) { if (e.target.tagName === 'SELECT') { openSelect = null; hide(); } }, true);
    document.addEventListener('focusout', function (e) { if (e.target === openSelect) openSelect = null; }, true);
    document.addEventListener('pointerdown', function () { ring.classList.add('down'); });
    document.addEventListener('pointerup', function () { ring.classList.remove('down'); });
    (function loop() {
      rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
      if (cursorOn) ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();

    // Gold buttons lean gently toward the pointer.
    document.querySelectorAll('.btn-sun').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        if (!cursorOn || e.pointerType !== 'mouse') return;
        var r = b.getBoundingClientRect();
        b.style.translate = ((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', function () { b.style.translate = ''; });
    });
  }

  /* ---------------- Click effects: sun burst + button ripple ---------------- */
  function initClickFx() {
    document.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || still()) return;
      var burst = document.createElement('div');
      burst.className = 'click-burst';
      burst.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      for (var i = 0; i < 8; i++) { var ray = document.createElement('i'); ray.style.setProperty('--a', (i * 45) + 'deg'); burst.appendChild(ray); }
      document.body.appendChild(burst);
      setTimeout(function () { burst.remove(); }, 700);

      var b = e.target.closest && e.target.closest('.btn, .icon-btn');
      if (!b) return;
      var r = b.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2;
      var rip = document.createElement('span');
      rip.className = 'ripple';
      rip.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px';
      b.appendChild(rip);
      setTimeout(function () { rip.remove(); }, 750);
    }, { passive: true });
  }

  /* ---------------- New pages open at the top ----------------
     A browser already opens a new page at the top. When the site is shown inside a taller frame
     (like the preview viewer), the outer page keeps its old scroll position, so bring the top of
     the page, or the linked section, into view. Back/forward and reload keep their position. */
  function initScrollStart() {
    var nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    if (nav && (nav.type === 'back_forward' || nav.type === 'reload')) return;
    var touched = false;
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
      window.addEventListener(ev, function () { touched = true; }, { once: true, passive: true });
    });
    function go() {
      if (touched) return;
      var id = location.hash ? decodeURIComponent(location.hash.slice(1)) : '';
      var el = id && document.getElementById(id);
      try {
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
        else {
          window.scrollTo(0, 0);
          // the header's scroll-padding would push the frame past its top edge, so drop it for this jump
          root.style.scrollPaddingTop = '0px';
          root.scrollIntoView({ block: 'start', behavior: 'instant' });
          root.style.scrollPaddingTop = '';
        }
      } catch (e) {}
    }
    go();
    window.addEventListener('load', function () { requestAnimationFrame(go); });
  }

  /* ---------------- Skip link ----------------
     "Skip to content" is the first thing a keyboard user reaches; it shows on focus and jumps to <main>. */
  function initSkipLink() {
    var main = document.querySelector('main');
    if (!main || document.querySelector('.skip-link')) return;
    if (!main.id) main.id = 'main';
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    var a = document.createElement('a');
    a.className = 'skip-link';
    a.href = '#' + main.id;
    a.textContent = 'Skip to content';
    if (root.lang && root.lang !== 'en') a.lang = 'en';
    document.body.insertBefore(a, document.body.firstChild);
  }

  /* ---------------- Typing on a phone ----------------
     While a text field has focus the bottom bar slides away (CSS: html.sv-typing, phones only),
     so the bar never sits over the field the visitor is typing in. It comes back when they leave the field. */
  function initTypingState() {
    var TEXT = 'input:not([type]), input[type="text"], input[type="tel"], input[type="email"], input[type="number"], input[type="search"], input[type="url"], input[type="password"], textarea, [contenteditable="true"]';
    function isText(el) { return !!(el && el.matches && el.matches(TEXT) && !el.readOnly); }
    document.addEventListener('focusin', function (e) { if (isText(e.target)) root.classList.add('sv-typing'); });
    document.addEventListener('focusout', function () {
      setTimeout(function () { if (!isText(document.activeElement)) root.classList.remove('sv-typing'); }, 80);
    });
  }

  /* ---------------- Endless animations rest when nobody can see them ----------------
     The hero photo drift, the sun glow, the marquee, the rings on the gold band, the equipment spark and the
     live dots pause while their part of the page is off screen, and everything pauses while the tab is hidden. */
  function initMotionPause() {
    function vis() { root.classList.toggle('sv-hidden', !!document.hidden); }
    document.addEventListener('visibilitychange', vis);
    vis();
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('sv-paused', !en.isIntersecting); });
    }, { rootMargin: '80px 0px' });
    document.querySelectorAll('.hero, .marquee, .cta-band, .flow, .live, .gauge').forEach(function (el) { io.observe(el); });
  }

  function init() {
    applyTheme(getPref());
    initSkipLink();
    initScrollStart();
    initSettings();
    initTypingState();
    initMotionPause();
    initDrawerClose();
    initReveal();
    initCounters();
    initScrollFx();
    initQuickEstimate();
    initSunArc();
    initClickFx();
  }
  // The cursor starts straight away (the body already exists here) instead of waiting for the page to finish loading.
  if (document.body) syncCursor(); else document.addEventListener('DOMContentLoaded', syncCursor);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
