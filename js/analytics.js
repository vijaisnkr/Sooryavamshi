/**
 * Visitor tracking for suryavamshi.com
 *
 * Paste a Microsoft Clarity project ID and/or a Google Analytics 4 measurement ID below to switch tracking on.
 * With both left empty, nothing loads and nothing is tracked.
 *
 * Events sent (same names in both tools):
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
 * Not loaded on admin.html or login.html, and form fields are masked in Clarity recordings (data-clarity-mask).
 */
(function () {
  'use strict';

  var CLARITY_ID = 'yy9ld9rhex';   // e.g. 'abcd1234ef'  (clarity.microsoft.com > Settings > Overview > Project ID)
  var GA4_ID = '';       // e.g. 'G-ABC123XYZ9' (analytics.google.com > Admin > Data streams > Measurement ID)

  var on = !!(CLARITY_ID || GA4_ID);

  function track(name, params) {
    if (!on) return;
    try {
      if (GA4_ID && window.gtag) window.gtag('event', name, params || {});
      if (CLARITY_ID && window.clarity) window.clarity('event', name);
    } catch (e) {}
  }
  window.svTrack = track;
  if (!on) return;

  function load(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  if (CLARITY_ID) {
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    load('https://www.clarity.ms/tag/' + encodeURIComponent(CLARITY_ID));
  }
  if (GA4_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
    load('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID));
  }

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
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#calcAssessmentBtn')) { track('calculator_quote'); return; }
    if (t.closest('#solar-calculator-section .preset-pill')) { firstUse('full'); return; }
    var a = t.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/^tel:/i.test(href)) track('call_click', { link_location: where(a) });
    else if (/wa\.me\/|whatsapp\.com/i.test(href)) track('whatsapp_click', { link_location: where(a) });
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
