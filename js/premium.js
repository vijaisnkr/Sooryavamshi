/**
 * Suryavamshi Solar - Daylight UI layer
 * Theme setting (Light / Dark / System), scroll-driven animations,
 * parallax, header state, number counters, the hero bill estimate
 * the live sun-path arc, the sun cursor and click effects.
 */
(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0A1A2E' : '#FFFFFF');
  }
  function setPref(pref) {
    try { localStorage.setItem(THEME_KEY, pref); } catch (e) {}
    applyTheme(pref);
  }
  if (mql) {
    var onSys = function () { if (getPref() === 'system') applyTheme('system'); };
    mql.addEventListener ? mql.addEventListener('change', onSys) : mql.addListener(onSys);
  }

  function initSettings() {
    var backdrop = document.getElementById('settingsBackdrop');
    var openers = document.querySelectorAll('#settingsBtn, [data-open-settings]');
    var closeBtn = document.getElementById('settingsClose');
    if (!backdrop) return;
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      backdrop.classList.add('open');
      var cur = backdrop.querySelector('[aria-checked="true"]') || closeBtn;
      setTimeout(function () { cur && cur.focus(); }, 50);
    }
    function close() {
      backdrop.classList.remove('open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    openers.forEach(function (b) { b.addEventListener('click', open); });
    closeBtn && closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && backdrop.classList.contains('open')) close(); });

    var opts = Array.prototype.slice.call(backdrop.querySelectorAll('[data-theme-choice]'));
    opts.forEach(function (b, i) {
      b.addEventListener('click', function () { setPref(b.getAttribute('data-theme-choice')); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = opts[(i + d + opts.length) % opts.length];
        n.focus(); n.click();
      });
    });
    applyTheme(getPref());
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
    if (reduceMotion || !('IntersectionObserver' in window)) {
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
    if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
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

      if (!reduceMotion && hero && y < hero.offsetHeight + 100) {
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

      if (closing && !reduceMotion) {
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
      var sub = kw >= 3 ? 78000 : kw >= 2 ? 60000 : 30000;
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
    function pt(p) { var a = Math.PI * p; return [50 - 50 * Math.cos(a), 100 - 100 * Math.sin(a)]; }
    function draw(p) {
      var d = 'M0 100';
      for (var i = 1, n = Math.max(1, Math.round(p * 80)); i <= n; i++) { var q = pt(p * i / n); d += ' L' + q[0].toFixed(2) + ' ' + q[1].toFixed(2); }
      fill.setAttribute('d', d);
      var c = pt(p);
      sun.style.left = c[0] + '%'; sun.style.top = c[1] + '%';
    }
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
      if (!animate || reduceMotion) { draw(s.p); return; }
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
  function initCursor() {
    if (reduceMotion || !window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var ring = document.createElement('div'), dot = document.createElement('div');
    ring.className = 'cur-ring'; dot.className = 'cur-dot';
    ring.setAttribute('aria-hidden', 'true'); dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring); document.body.appendChild(dot);
    root.classList.add('has-cursor');
    var mx = -100, my = -100, rx = mx, ry = my, shown = false, openSelect = null;
    function place() { dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)'; }
    // Carry the pointer position across page switches so the sun cursor shows at once on the next page.
    try {
      var saved = JSON.parse(sessionStorage.getItem('sv-cursor') || 'null');
      if (saved && Date.now() - saved.t < 4000) { mx = rx = saved.x; my = ry = saved.y; place(); shown = true; root.classList.add('cursor-on'); }
    } catch (e) {}
    window.addEventListener('pagehide', function () {
      try { if (shown) sessionStorage.setItem('sv-cursor', JSON.stringify({ x: mx, y: my, t: Date.now() })); } catch (e) {}
    });
    var HOT = 'a, button, summary, label, select, [role="radio"], [role="button"], input[type="range"], input[type="checkbox"], input[type="radio"], input[type="submit"]';
    var TEXT = 'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable]';
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
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
    function hide() { shown = false; root.classList.remove('cursor-on'); }
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
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();

    // Gold buttons lean gently toward the pointer.
    document.querySelectorAll('.btn-sun').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = b.getBoundingClientRect();
        b.style.translate = ((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', function () { b.style.translate = ''; });
    });
  }

  /* ---------------- Click effects: sun burst + button ripple ---------------- */
  function initClickFx() {
    if (reduceMotion) return;
    document.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
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

  function init() {
    initScrollStart();
    initSettings();
    initDrawerClose();
    initReveal();
    initCounters();
    initScrollFx();
    initQuickEstimate();
    initSunArc();
    initClickFx();
  }
  // The cursor starts straight away (the body already exists here) instead of waiting for the page to finish loading.
  if (document.body) initCursor(); else document.addEventListener('DOMContentLoaded', initCursor);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
