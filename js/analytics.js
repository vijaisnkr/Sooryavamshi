/**
 * Visitor tracking for suryavamshi.com
 *
 * Paste a Microsoft Clarity project ID and/or a Google Analytics 4 measurement ID below to switch tracking on.
 * PostHog is on whenever POSTHOG_KEY is set. With Clarity, GA4 and PostHog all empty, nothing loads.
 * Before setting GA4_ID: the cookie banner and privacy.html name Microsoft Clarity and PostHog, and stop() only stops Clarity.
 * Add Google Analytics to the banner TEXT (English and Malayalam), to the Settings switch text in addSettingsSwitch(),
 * and to privacy.html (including its switch label), and make stop() turn it off
 * (window['ga-disable-' + GA4_ID] = true, delete the _ga cookies), or GA4 would run under a consent that doesn't name it.
 *
 * Clarity / GA4 events (only after Accept; svTrack):
 *   call_click          a phone number was tapped        (link_location: where on the page)
 *   whatsapp_click      a WhatsApp link was tapped       (link_location)
 *   email_click         the email address was tapped     (link_location)
 *   proposal_download   the sample proposal PDF was opened or downloaded
 *   calculator_use      first time someone types a bill, moves the slider or picks a preset (calculator: full | home_quick)
 *   calculator_quote    the calculator's "Request Free Site Assessment" button was pressed
 *   calculator_whatsapp the calculator's "Send this estimate on WhatsApp" button
 *   no_bill_whatsapp    the form's "No bill handy? Send your details on WhatsApp" link
 *   generate_lead       the site assessment form was sent  (sent by contact-form.js)
 *   lead_submit_failed  the form could not reach the database (sent by contact-form.js)
 *
 * PostHog events (svCapture). Sent on every visit until the visitor taps Reject. No name, phone or email.
 *   $pageview           a page opened, including UTM parameters on the address
 *   enquiry_submitted   the site assessment form was saved (contact-form.js, only after a real success)
 *   whatsapp_click      a WhatsApp link was tapped       (link_location)
 *   call_click          a phone link was tapped          (link_location)
 *   calculator_used     first calculator use on this page (calculator: full | home_quick)
 * Every one of those also carries first-touch and last-touch utm_source / utm_medium / utm_campaign / utm_content
 * and ref (from ?ref=CODE). See attributionProps().
 *
 * Not loaded on admin.html, login.html or set-password.html. Form cards are masked in Clarity recordings (data-clarity-mask),
 * and each typed form field has data-sv-clarity="hidden": an attribute value containing "hidden" makes Clarity treat the
 * field as excluded, so it also drops the short code (checksum) it otherwise sends for every changed value of 5+ characters.
 * Keep that attribute on any new form field. PostHog session replay masks every input and those same form regions.
 *
 * Consent:
 *   No answer yet — PostHog counts pages and enquiry taps for this tab only (sessionStorage, no cookie, no recording).
 *   Accept — Clarity starts; PostHog keeps a cookie, remembers the first advert for about a year, and may record the visit.
 *   Reject — Clarity stops and PostHog sends nothing further. Its cookie and the saved first advert are deleted.
 * The answer is kept in this browser as sv-analytics = "on" or "off"; with no answer the banner shows on each page.
 * The same answer can be changed at any time with the switch this file adds to the Settings dialog, and with the
 * switch on privacy.html (through window.svAnalytics). Both re-render on the "sv-consent" event.
 * Reject (or a switch off) stops a running Clarity on this page, keeps a still-downloading Clarity from starting,
 * blocks it restarting on Back/Forward or in other open tabs, and deletes its _clck/_clsk cookies and _cltk tab ID.
 * Clarity cookies left from before the banner are deleted until Accept.
 * Clarity is told not to share data with Microsoft Advertising (consentv2 ad_Storage "denied").
 * privacy.html describes all of this, so update it if this file changes what is collected.
 */
(function () {
  'use strict';

  var CLARITY_ID = 'yy9ld9rhex';   // e.g. 'abcd1234ef'  (clarity.microsoft.com > Settings > Overview > Project ID)
  var GA4_ID = '';       // e.g. 'G-ABC123XYZ9' (analytics.google.com > Admin > Data streams > Measurement ID)
  // Public project key (safe in client JS). Empty string switches PostHog off.
  var POSTHOG_KEY = 'phc_zBTKEiVKqoJEWmRDnu3oCS3uHy4ViYCCsscX7TB5ah7d';
  var POSTHOG_HOST = 'https://us.i.posthog.com';

  var KEY = 'sv-analytics';   // "on" = Accept, "off" = Reject; missing = not asked yet
  var configured = !!(CLARITY_ID || GA4_ID || POSTHOG_KEY);
  var memo = null;            // the answer on this page, for browsers that won't save it

  function answer() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) {}
    return v === 'on' || v === 'off' ? v : memo;
  }
  function save(v) {
    memo = v;
    try { localStorage.setItem(KEY, v); return localStorage.getItem(KEY) === v; } catch (e) { return false; }
  }
  var on = false;      // Clarity (or GA4) is allowed and started on this page
  var started = false;

  // Clarity's own first-party cookies (set on the main domain, e.g. .suryavamshi.com) and its tab ID in session storage
  function dropClarityCookies() {
    ['_clck', '_clsk'].forEach(function (name) {
      var host = location.hostname, parts = host.split('.');
      var domains = ['', host];
      if (parts.length > 1) domains.push('.' + parts.slice(-2).join('.'));
      domains.forEach(function (d) { document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : ''); });
    });
    try { sessionStorage.removeItem('_cltk'); } catch (e) {}
  }

  // Clarity checks Global Privacy Control before every start (clarity-js 0.8.72 core.check()). While the answer
  // is Off, this page sets it, so Clarity can't start again by itself: after 5 idle minutes it suspends and
  // restarts on the next mouse move or scroll, and after Back/Forward on pageshow, without going through window.clarity.
  function blockStarts(yes) {
    try {
      if (yes) Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
      else if (Object.prototype.hasOwnProperty.call(navigator, 'globalPrivacyControl')) delete navigator.globalPrivacyControl;
    } catch (e) {}
  }

  // Turn Clarity off on this page. window.clarity.v is set once clarity.js has loaded; a stopped or suspended
  // Clarity puts back its own queueing stub without .v (queue.ts). This file's stub is marked .sv.
  var held = null;   // the tag's own clarity('start', config), taken out of the queue so it can't run
  var blocked = false;
  function isDup(x) { return x && x[0] === 'event' && x[1] === 'clarity'; }   // queued by a tag that bailed out
  function stopClarity() {
    var c = window.clarity;
    blockStarts(true);
    try {
      // Loaded: just stop it (a no-op if it never started). consentv2 "denied" would make Clarity restart
      // itself without cookies 250 ms later and send one more upload.
      if (c && c.v) c('stop');
      else if (c) {
        // The tag or clarity.js is still downloading, or Clarity stopped or suspended earlier. Make sure nothing
        // starts: a tag that hasn't run yet bails out when it sees .t, and a start already queued is taken out.
        // (Queueing "stop" behind the tag's start would let Clarity start and upload first.) Only the tag's
        // start carries the project settings, so that is the one kept for a later Accept.
        if (!c.t) { c.t = true; blocked = true; }
        var q = c.q || [];
        for (var i = q.length - 1; i >= 0; i--) {
          if (q[i] && q[i][0] === 'start') { if (q[i][1]) held = q[i]; q.splice(i, 1); }
        }
      }
    } catch (e) {}
    dropClarityCookies();
  }

  function track(name, params) {
    if (!on) return;
    try {
      if (GA4_ID && window.gtag) window.gtag('event', name, params || {});
      if (CLARITY_ID && window.clarity) window.clarity('event', name);
    } catch (e) {}
  }
  window.svTrack = track;

  /* ---------- Campaign attribution (posters, ads, referral partners) ----------
   * This visit (any consent state, until the tab closes): sessionStorage sv-attr-visit.
   * First advert, only after Accept, for about 400 days: localStorage sv-attr-first.
   * Neither is a cookie. Last-touch updates when a later page in this tab has new utm_* or ?ref=.
   * First-touch is whatever this tab landed with, unless Accept has an older saved first advert.
   */
  var VISIT_KEY = 'sv-attr-visit';
  var FIRST_KEY = 'sv-attr-first';
  var FIRST_DAYS = 400;
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

  function clip(value, max) {
    if (value == null) return null;
    var s = String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim();
    if (!s) return null;
    return s.length > max ? s.slice(0, max) : s;
  }
  function readStore(store, key) {
    try {
      var raw = store.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeStore(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function campaignFromUrl() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return null; }
    var touch = {};
    var any = false;
    UTM_KEYS.forEach(function (k) {
      touch[k] = clip(q.get(k), 80);
      if (touch[k]) any = true;
    });
    touch.ref = clip(q.get('ref'), 64);
    if (touch.ref) any = true;
    return any ? touch : null;
  }
  function landingOfThisPage() {
    var path = location.pathname + location.search;
    return clip(path, 300);
  }
  function referrerOfThisPage() {
    if (!document.referrer) return null;
    try {
      var u = new URL(document.referrer);
      if (u.origin === location.origin) return null;
    } catch (e) { return null; }
    return clip(document.referrer, 300);
  }
  function blankTouch() {
    return { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, ref: null, landing_page: null, referrer: null };
  }
  function rememberVisit() {
    var visit = readStore(sessionStorage, VISIT_KEY);
    var incoming = campaignFromUrl();
    if (!visit || !visit.first) {
      var first = blankTouch();
      if (incoming) UTM_KEYS.concat(['ref']).forEach(function (k) { first[k] = incoming[k]; });
      first.landing_page = landingOfThisPage();
      first.referrer = referrerOfThisPage();
      visit = { first: first, last: incoming };
    } else if (incoming) {
      visit.last = incoming;
    }
    writeStore(sessionStorage, VISIT_KEY, visit);
    return visit;
  }
  function readLastingFirst() {
    var saved = readStore(localStorage, FIRST_KEY);
    if (!saved || !saved.saved_at) return null;
    if (Date.now() - saved.saved_at > FIRST_DAYS * 24 * 60 * 60 * 1000) {
      try { localStorage.removeItem(FIRST_KEY); } catch (e) {}
      return null;
    }
    return saved;
  }
  function saveLastingFirst() {
    if (readLastingFirst()) return;
    var visit = readStore(sessionStorage, VISIT_KEY) || rememberVisit();
    var first = visit && visit.first ? visit.first : blankTouch();
    first.saved_at = Date.now();
    writeStore(localStorage, FIRST_KEY, first);
  }
  function clearLastingFirst() {
    try { localStorage.removeItem(FIRST_KEY); } catch (e) {}
  }
  function attributionProps() {
    var visit = readStore(sessionStorage, VISIT_KEY) || rememberVisit();
    var lasting = answer() === 'on' ? readLastingFirst() : null;
    var first = lasting || (visit && visit.first) || blankTouch();
    var last = (visit && visit.last) || {};
    function pick(obj, key) { return obj && obj[key] ? obj[key] : null; }
    return {
      first_touch_utm_source: pick(first, 'utm_source'),
      first_touch_utm_medium: pick(first, 'utm_medium'),
      first_touch_utm_campaign: pick(first, 'utm_campaign'),
      first_touch_utm_content: pick(first, 'utm_content'),
      first_touch_ref: pick(first, 'ref'),
      first_touch_landing_page: pick(first, 'landing_page'),
      first_touch_referrer: pick(first, 'referrer'),
      last_touch_utm_source: pick(last, 'utm_source'),
      last_touch_utm_medium: pick(last, 'utm_medium'),
      last_touch_utm_campaign: pick(last, 'utm_campaign'),
      last_touch_utm_content: pick(last, 'utm_content'),
      last_touch_ref: pick(last, 'ref'),
      attribution_window: lasting ? 'first_touch_saved' : 'this_visit',
      page: location.pathname
    };
  }
  window.svAttribution = {
    properties: attributionProps
  };

  /* ---------- PostHog ----------
   * Loaded async. Until Accept: sessionStorage only, so one tab is one visit and no cookie is set.
   * After Accept: localStorage+cookie, session replay and click heatmaps, inputs masked.
   * After Reject: opted out, cookie deleted, nothing else is sent.
   */
  var phFull = false;
  function isDebugHost() {
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1' ||
      /(?:\?|&)__posthog_debug=true(?:&|$)/.test(location.search);
  }
  function posthogCookieName() { return 'ph_' + POSTHOG_KEY + '_posthog'; }
  function clearDurablePosthog() {
    var name = posthogCookieName();
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      keys.forEach(function (k) {
        if (!k) return;
        if (k === name || k.indexOf('ph_' + POSTHOG_KEY) !== -1 || k.indexOf('__ph_opt_in_out') === 0 || k === 'ph_debug') {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {}
    var host = location.hostname, parts = host.split('.');
    var domains = ['', host];
    if (parts.length > 1) domains.push('.' + parts.slice(-2).join('.'));
    domains.forEach(function (d) {
      document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
    });
  }
  function clearSessionPosthog() {
    try { sessionStorage.removeItem(posthogCookieName()); } catch (e) {}
  }
  var KEEP_PHONE = /^(first_touch_|last_touch_|utm_|\$initial_|ref$|\$current_url$|\$referrer$|\$referring_domain$|\$pathname$|\$host$|page$)/;
  function redactValue(key, value) {
    if (typeof value === 'string') {
      var out = value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]');
      if (!KEEP_PHONE.test(key)) out = out.replace(/(?:\+?\d[\d\s().-]{8,}\d)/g, '[redacted]');
      return out;
    }
    if (!value || typeof value !== 'object') return value;
    if (Object.prototype.toString.call(value) === '[object Array]') {
      return value.map(function (v) { return redactValue(key, v); });
    }
    var copy = {};
    for (var k in value) if (Object.prototype.hasOwnProperty.call(value, k)) copy[k] = redactValue(k, value[k]);
    return copy;
  }
  function beforeSend(event) {
    try {
      if (!event) return event;
      if (answer() === 'off' || window.__svPhReject) return null;
      if (event.properties) event.properties = redactValue('', event.properties);
      if (isDebugHost()) {
        window.__svPhEvents = window.__svPhEvents || [];
        window.__svPhEvents.push(event.event || 'unknown');
        if (window.__svPhEvents.length > 50) window.__svPhEvents.shift();
      }
      return event;
    } catch (e) { return event; }
  }
  function installPosthogStub() {
    if (window.posthog && window.posthog.__SV) return;
    // Official async loader. array.js is fetched from PostHog's asset host and does not block the page.
    (function (t, e) {
      var o, n, p, r;
      if (e.__SV) return;
      window.posthog = e;
      e._i = [];
      e.init = function (i, s, a) {
        function g(tt, ee) {
          var oo = ee.split('.');
          if (oo.length === 2) { tt = tt[oo[0]]; ee = oo[1]; }
          tt[ee] = function () { tt.push([ee].concat(Array.prototype.slice.call(arguments, 0))); };
        }
        p = t.createElement('script');
        p.type = 'text/javascript';
        p.crossOrigin = 'anonymous';
        p.async = true;
        p.src = s.api_host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js';
        r = t.getElementsByTagName('script')[0];
        r.parentNode.insertBefore(p, r);
        var u = e;
        if (a !== undefined) u = e[a] = [];
        else a = 'posthog';
        u.people = u.people || [];
        u.toString = function (x) {
          var name = 'posthog';
          if (a !== 'posthog') name += '.' + a;
          if (!x) name += ' (stub)';
          return name;
        };
        u.people.toString = function () { return u.toString(1) + '.people (stub)'; };
        o = 'init capture register register_once unregister get_distinct_id get_session_id set_config startSessionRecording stopSessionRecording sessionRecordingStarted opt_in_capturing opt_out_capturing has_opted_out_capturing clear_opt_in_out_capturing debug'.split(' ');
        for (n = 0; n < o.length; n++) g(u, o[n]);
        e._i.push([i, s, a]);
      };
      e.__SV = 1;
    })(document, window.posthog || []);
  }
  function posthogOptions(full) {
    return {
      api_host: POSTHOG_HOST,
      ui_host: 'https://us.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: full ? 'localStorage+cookie' : 'sessionStorage',
      disable_session_recording: !full,
      autocapture: !!full,
      capture_heatmaps: !!full,
      capture_exceptions: false,
      disable_surveys: true,
      enable_recording_console_log: false,
      person_profiles: 'identified_only',
      custom_campaign_params: ['ref'],
      save_campaign_params: true,
      advanced_disable_feature_flags: true,
      cookie_expiration: 365,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-clarity-mask], [data-ph-mask], [data-sv-clarity="hidden"]'
      },
      debug: isDebugHost(),
      loaded: function (ph) {
        if (answer() === 'off' || window.__svPhReject) {
          try { ph.opt_out_capturing(); ph.stopSessionRecording(); } catch (err) {}
          return;
        }
        try { ph.register(attributionProps()); } catch (err) {}
        if (full || answer() === 'on') {
          try { ph.startSessionRecording(true); } catch (err) {}
          saveLastingFirst();
        }
        try { ph.capture('$pageview', attributionProps()); } catch (err) {}
      },
      before_send: beforeSend
    };
  }
  function syncAttribution() {
    try {
      if (window.posthog && window.posthog.register && answer() !== 'off') window.posthog.register(attributionProps());
    } catch (e) {}
  }
  function capture(name, params) {
    if (!POSTHOG_KEY || answer() === 'off' || window.__svPhReject) return;
    var props = attributionProps();
    if (params) {
      for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) props[k] = params[k];
    }
    try {
      if (window.posthog && window.posthog.capture) {
        window.posthog.register(attributionProps());
        window.posthog.capture(name, props);
      }
    } catch (e) {}
  }
  window.svCapture = capture;

  function ensurePosthog(full) {
    if (!POSTHOG_KEY) return;
    installPosthogStub();
    if (!window.__svPhInited) {
      window.__svPhInited = true;
      phFull = !!full;
      window.posthog.init(POSTHOG_KEY, posthogOptions(phFull));
      return;
    }
    var ph = window.posthog;
    try {
      if (ph.has_opted_out_capturing && ph.has_opted_out_capturing()) ph.opt_in_capturing();
    } catch (e) {}
    if (full && !phFull) {
      try {
        ph.set_config({
          persistence: 'localStorage+cookie',
          disable_session_recording: false,
          autocapture: true,
          capture_heatmaps: true
        });
        ph.startSessionRecording(true);
      } catch (e) {}
      saveLastingFirst();
      phFull = true;
    } else if (!full && phFull) {
      try { ph.stopSessionRecording(); } catch (e) {}
      try {
        ph.set_config({
          persistence: 'sessionStorage',
          disable_session_recording: true,
          autocapture: false,
          capture_heatmaps: false
        });
      } catch (e) {}
      clearDurablePosthog();
      clearLastingFirst();
      phFull = false;
    }
    syncAttribution();
  }
  // Match the cookie-banner answer. Called on load, Accept, Reject, Reset, and when another tab changes it.
  function applyPosthogConsent() {
    if (!POSTHOG_KEY) return;
    rememberVisit();
    if (answer() === 'off') {
      window.__svPhReject = true;
      if (window.__svPhInited && window.posthog) {
        try { window.posthog.stopSessionRecording(); } catch (e) {}
      }
      // Drop the cookie and the saved advert first, then record the opt-out.
      // Opt-out is stored apart from the tracking cookie; doing it after the wipe
      // keeps it from being deleted with that cookie.
      clearDurablePosthog();
      clearSessionPosthog();
      clearLastingFirst();
      if (window.__svPhInited && window.posthog) {
        try { window.posthog.opt_out_capturing(); } catch (e) {}
      }
      phFull = false;
      return;
    }
    window.__svPhReject = false;
    if (answer() === 'on') saveLastingFirst();
    ensurePosthog(answer() === 'on');
  }

  function load(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function start() {
    on = true;
    // An earlier Reject or Off on this page may have blocked Clarity from starting; lift that first
    blockStarts(false);
    if (started) {
      // Accepted again after an Off on this same page
      var c = window.clarity;
      try {
        if (!CLARITY_ID || !c) return;
        if (blocked) { blocked = false; c.t = false; }
        if (c.q && c.q.some(isDup)) {
          // The tag bailed out (it saw .t), so run it again
          c.q = c.q.filter(function (x) { return !isDup(x); });
          held = null;
          load('https://www.clarity.ms/tag/' + encodeURIComponent(CLARITY_ID));
        } else if (held) {
          // Put the tag's start back at the front of the queue (or run it, if clarity.js is already here)
          var a = held; held = null;
          c.apply(null, a);
          if (!c.v && c.q && c.q.length > 1) c.q.unshift(c.q.pop());
          // clarity.js ignores a consentv2 it handles while Clarity isn't running, so send it again
          c('consentv2', { ad_Storage: 'denied' });
        } else if (!c.v && !c.sv) {
          // Stopped or suspended: Clarity's own stub starts it again with the same settings
          // ({} rather than nothing, which would process its queue twice and log "CL001 Multiple Clarity tags")
          c('start', {});
        }
        // Otherwise the tag is still downloading and starts Clarity when it arrives
      } catch (e) {}
      return;
    }
    started = true;
    if (CLARITY_ID) {
      if (!window.clarity) {
        window.clarity = function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
        window.clarity.sv = true;
      }
      // Nothing is shared with Microsoft Advertising (the privacy page says so). analytics_Storage is left out on purpose,
      // so Clarity keeps its own default (the project's cookie setting; no cookies for EEA/UK/CH visitors).
      // Microsoft's docs list both keys as required; a missing key keeps its current value (checked in clarity-js 0.8.72).
      window.clarity('consentv2', { ad_Storage: 'denied' });
      load('https://www.clarity.ms/tag/' + encodeURIComponent(CLARITY_ID));
    }
    if (GA4_ID) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', GA4_ID);
      load('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID));
    }
  }
  function stop() {
    on = false;
    if (CLARITY_ID) stopClarity();
  }

  /* ---------- Cookie banner ---------- */
  var ML = document.documentElement.lang === 'ml';
  var TEXT = ML ? {
    label: 'കുക്കി സമ്മതം',
    title: 'ഞങ്ങളുടെ സൈറ്റിലെ കുക്കികൾ',
    body: 'നിങ്ങൾ തീരുമാനിക്കുന്നതിന് മുമ്പ്, ഏത് പേജ് തുറന്നു, ഏത് പരസ്യമോ പങ്കാളി ലിങ്കോ വഴി വന്നു എന്ന് ഞങ്ങൾ PostHog-നോട് പറയും. ഇതിന് കുക്കി വേണ്ട, ഈ ടാബ് അടച്ചാൽ അവസാനിക്കും. \u201Cസമ്മതം\u201D അമർത്തിയാൽ Microsoft Clarityയും PostHog-ഉം ഒരു കുക്കി സൂക്ഷിച്ച് നിങ്ങളുടെ സന്ദർശനം (ടാപ്പുകൾ, സ്ക്രോൾ, പേജുകൾ) രേഖപ്പെടുത്തും. ഫോമിൽ ടൈപ്പ് ചെയ്യുന്ന ഫോൺ നമ്പറോ ഇമെയിലോ അവ കാണില്ല. \u201Cവേണ്ട\u201D അമർത്തിയാൽ ഈ എണ്ണലും റെക്കോർഡിംഗും നിർത്തും. Settings-ൽ എപ്പോൾ വേണമെങ്കിലും മാറ്റാം.',
    link: 'സ്വകാര്യതാ അറിയിപ്പ് (ഇംഗ്ലീഷിൽ)',
    yes: 'സമ്മതം',
    no: 'വേണ്ട'
  } : {
    label: 'Cookie choice',
    title: 'Cookies on our site',
    body: 'Before you choose, we tell PostHog which page you opened and which advert or partner link brought you here. That uses no cookie and ends when you close this tab. If you tap Accept, Microsoft Clarity and PostHog also store a cookie and record how you move around the site (taps, scrolling and pages), with your device and rough location. They can\u2019t see phone numbers or emails you type into our form. Reject stops this counting and those recordings. You can change your answer any time in Settings.',
    link: 'Privacy notice',
    yes: 'Accept',
    no: 'Reject'
  };
  // The privacy notice sits next to the js/ folder. Resolved from this script's own address, so the link also
  // works on 404.html, which GitHub Pages shows at whatever (possibly nested) address was asked for.
  var PRIVACY = 'privacy.html#analytics';
  try { if (document.currentScript && document.currentScript.src) PRIVACY = new URL('../privacy.html#analytics', document.currentScript.src).href; } catch (e) {}
  var banner = null;
  var settingsSw = null;

  // Room under the page for the open banner, so the last footer links can scroll clear of it (--sv-consent-space),
  // and focus room for links and buttons (--sv-consent-scroll), capped so a strip of page stays visible under the header
  function fitSpace() {
    if (!banner) return;
    var root = document.documentElement;
    var bottom = parseFloat(getComputedStyle(banner).bottom) || 0;
    var space = Math.ceil(banner.offsetHeight + bottom + 12);
    var top = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    root.style.setProperty('--sv-consent-space', space + 'px');
    root.style.setProperty('--sv-consent-scroll', Math.max(0, Math.min(space, innerHeight - top - 56)) + 'px');
    fade();
  }
  // When the text has to scroll inside the banner, fade its last line so it looks scrollable
  function fade() {
    if (!banner) return;
    var t = banner.querySelector('.sv-consent-text');
    var scroll = t.scrollHeight > t.clientHeight + 1;
    banner.classList.toggle('is-scroll', scroll);
    banner.classList.toggle('at-end', scroll && t.scrollTop + t.clientHeight >= t.scrollHeight - 2);
  }

  function showBanner() {
    if (banner || !document.body) return;
    banner = document.createElement('section');
    banner.className = 'sv-consent';
    banner.setAttribute('aria-label', TEXT.label);
    if (ML) banner.setAttribute('lang', 'ml');
    banner.innerHTML =
      '<div class="sv-consent-text"><strong class="sv-consent-title"></strong> <span class="sv-consent-body"></span> ' +
      '<a class="sv-consent-link"' + (ML ? ' hreflang="en"' : '') + '></a></div>' +
      '<div class="sv-consent-btns"><button type="button" class="btn btn-ink" data-consent="on"></button>' +
      '<button type="button" class="btn btn-ink" data-consent="off"></button></div>';
    banner.querySelector('.sv-consent-title').textContent = TEXT.title;
    banner.querySelector('.sv-consent-body').textContent = TEXT.body;
    var link = banner.querySelector('.sv-consent-link');
    link.textContent = TEXT.link;
    link.href = PRIVACY;
    banner.querySelector('[data-consent="on"]').textContent = TEXT.yes;
    banner.querySelector('[data-consent="off"]').textContent = TEXT.no;
    banner.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-consent]');
      if (b) choose(b.getAttribute('data-consent') === 'on');
    });
    banner.querySelector('.sv-consent-text').addEventListener('scroll', fade, { passive: true });
    // After the page content, before the scripts, so it comes last when tabbing through the page
    document.body.appendChild(banner);
    document.documentElement.classList.add('sv-consent-open');
    fitSpace();
    if (window.ResizeObserver) new ResizeObserver(fitSpace).observe(banner);
    requestAnimationFrame(function () { requestAnimationFrame(function () { banner && banner.classList.add('in'); }); });
  }
  window.addEventListener('resize', fitSpace);
  function hideBanner() {
    if (!banner) return;
    var b = banner;
    banner = null;
    document.documentElement.classList.remove('sv-consent-open');
    document.documentElement.style.removeProperty('--sv-consent-space');
    document.documentElement.style.removeProperty('--sv-consent-scroll');
    // If the visitor was on a banner button, keep keyboard focus at the end of the page instead of losing it
    var hadFocus = b.contains(document.activeElement);
    b.remove();
    if (hadFocus && document.body) { document.body.setAttribute('tabindex', '-1'); document.body.focus({ preventScroll: true }); document.body.removeAttribute('tabindex'); }
  }
  // Every change of answer on this page: refresh the Settings switch and tell privacy.html's switch
  function changed() {
    if (settingsSw) {
      settingsSw.setAttribute('aria-checked', on ? 'true' : 'false');
      var h = document.getElementById('clarityHint');
      if (h) h.textContent = SET.hint;
      var m = document.getElementById('claritySaveMsg');
      if (m) m.textContent = '';
    }
    document.dispatchEvent(new CustomEvent('sv-consent', { detail: { on: on } }));
  }
  function choose(yes) {
    var saved = save(yes ? 'on' : 'off');
    if (yes) start(); else stop();
    applyPosthogConsent();
    hideBanner();
    changed();
    return saved;
  }

  // A switch in the Settings dialog on every page, so changing the answer is as easy as giving it
  var SET = ML ? {
    hint: 'ഇത് ഓണാണെങ്കിൽ Microsoft Clarityയും PostHog-ഉം ടാപ്പുകൾ, സ്ക്രോൾ, പേജുകൾ രേഖപ്പെടുത്തുകയും ഒരു കുക്കി അടുത്ത തവണ നിങ്ങളെ തിരിച്ചറിയുകയും ചെയ്യും. മറുപടി നൽകിയിട്ടില്ലെങ്കിൽ ഈ ടാബിലെ പേജുകൾ മാത്രം എണ്ണും, കുക്കി ഇല്ല. കുക്കി ബാനറിലെ മറുപടി തന്നെ.',
    onOnly: 'ഈ പേജിൽ മാത്രം ഓൺ: നിങ്ങളുടെ ബ്രൗസർ ഈ തീരുമാനം സേവ് ചെയ്യാൻ അനുവദിച്ചില്ല.',
    offOnly: 'ഈ പേജിൽ ഓഫ്, പക്ഷേ നിങ്ങളുടെ ബ്രൗസർ ഈ തീരുമാനം സേവ് ചെയ്യാൻ അനുവദിച്ചില്ല.'
  } : {
    hint: 'When this is on, Microsoft Clarity and PostHog record taps, scrolling and pages, and a cookie recognises you next time. If you have not answered, we only count pages for this tab, with no cookie. Same as your answer on our cookie banner.',
    onOnly: 'On for this page only: your browser didn\u2019t let us save your choice.',
    offOnly: 'Off on this page, but your browser didn\u2019t let us save your choice.'
  };
  function addSettingsSwitch() {
    var body = document.querySelector('#settingsBackdrop .settings-body');
    if (!body || document.getElementById('claritySwitch')) return;
    var row = document.createElement('div');
    row.className = 'set-row set-clarity';
    if (ML) row.setAttribute('lang', 'ml');
    row.innerHTML =
      '<div><span class="lbl" id="clarityLbl" lang="en">Clarity & PostHog</span>' +
      '<p class="muted" id="clarityHint"></p><p class="muted sv-save-msg" id="claritySaveMsg" role="status"></p></div>' +
      '<button class="switch" type="button" role="switch" id="claritySwitch" aria-checked="false" aria-labelledby="clarityLbl" aria-describedby="clarityHint"><span></span></button>';
    var hint = row.querySelector('#clarityHint');
    var saveMsg = row.querySelector('#claritySaveMsg');
    hint.textContent = SET.hint;
    body.appendChild(row);
    settingsSw = row.querySelector('#claritySwitch');
    settingsSw.addEventListener('click', function () {
      var yes = settingsSw.getAttribute('aria-checked') !== 'true';
      var saved = choose(yes);
      // choose() clears this message; say so (and have screen readers announce it) when the browser
      // wouldn't keep the choice for other pages
      if (!saved) saveMsg.textContent = yes ? SET.onOnly : SET.offOnly;
    });
    changed();
  }

  // Used by the switch on privacy.html. setOn returns false when the browser won't save the choice.
  window.svAnalytics = {
    configured: configured,
    isOn: function () { return configured && answer() === 'on'; },
    answered: function () { return answer() !== null; },
    setOn: function (yes) { return configured ? choose(!!yes) : false; },
    // Settings > Reset to default: forget the answer, so Clarity stops and the banner asks again
    reset: function () {
      if (!configured) return;
      var had = answer();
      memo = null;
      try { localStorage.removeItem(KEY); } catch (e) {}
      if (on) stop();
      applyPosthogConsent();
      if (had !== null) showBanner();
      changed();
    }
  };
  if (!configured) return;

  if (answer() === 'on') start();
  else {
    dropClarityCookies();
    clearDurablePosthog();
    if (answer() === null) showBanner();
  }
  applyPosthogConsent();
  addSettingsSwitch();

  // Back/Forward can restore this page from the browser's memory, and Clarity then restarts itself.
  // Match whatever was chosen since (on another page or in another tab).
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var a = answer();
    if (a !== 'on') { if (on || started) { on = false; e.stopImmediatePropagation(); stopClarity(); } }
    else if (!on) start();
    if (a !== null) hideBanner(); else showBanner();
    applyPosthogConsent();
    changed();
  }, true);
  // Answered in another tab: do the same here
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    if (e.newValue === 'on') { if (!on) start(); hideBanner(); }
    else if (e.newValue === 'off') { if (on) stop(); hideBanner(); }
    else if (e.newValue === null) { if (on) stop(); memo = null; showBanner(); }   // reset in another tab
    applyPosthogConsent();
    changed();
  });

  // Where on the page a link sits, so call and WhatsApp taps can be compared by position
  function where(el) {
    if (el.closest('.fab-wa')) return 'floating_button';
    if (el.closest('.mobile-bar')) return 'mobile_bar';
    if (el.closest('.mobile-nav-drawer')) return 'menu';
    if (el.closest('header')) return 'header';
    if (el.closest('footer')) return 'footer';
    if (el.closest('#form-success')) return 'after_form';
    if (el.closest('.contact-points')) return 'contact_card';
    if (el.closest('.page-hero, .hero')) return 'hero';
    if (el.closest('.closing')) return 'closing';
    if (el.closest('#calc-result')) return 'calculator_result';
    if (el.closest('#client-kseb-wa')) return 'form_no_bill';
    return 'page';
  }

  var used = {};
  function firstUse(kind) {
    if (used[kind]) return;
    used[kind] = true;
    track('calculator_use', { calculator: kind });
    capture('calculator_used', { calculator: kind });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#calcAssessmentBtn')) { track('calculator_quote'); return; }
    if (t.closest('#solar-calculator-section .preset-pill')) { firstUse('full'); return; }
    var a = t.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/^tel:/i.test(href)) {
      track('call_click', { link_location: where(a) });
      capture('call_click', { link_location: where(a) });
    } else if (/wa\.me\/|whatsapp\.com/i.test(href)) {
      track('whatsapp_click', { link_location: where(a) });
      capture('whatsapp_click', { link_location: where(a) });
    }
    else if (/^mailto:/i.test(href)) track('email_click', { link_location: where(a) });
    else if (/sample-3kw-proposal\.pdf/i.test(href)) track('proposal_download', { link_location: where(a) });
  }, true);

  // First calculator interaction on each page view: typing, the slider or a preset
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.id === 'quickBill') firstUse('home_quick');
    else if (t.closest('#solar-calculator-section')) firstUse('full');
  }, true);
})();
