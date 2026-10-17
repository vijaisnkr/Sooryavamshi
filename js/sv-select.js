/**
 * Suryavamshi Solar - styled dropdowns
 * Swaps the browser's plain dropdown list for a branded menu. The real
 * <select> stays in the page (hidden) and keeps its value, its form name and
 * its "change" events, so existing code and forms work unchanged.
 * Every <select> is upgraded on load; add data-native to keep one plain.
 * Pages that draw selects later call SvSelect.enhanceAll(container).
 */
(function () {
  var uid = 0;
  var current = null;
  var typed = "", typedTimer = null;
  var CHEV = '<svg class="svs-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var TICK = '<svg class="svs-tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function enhance(sel) {
    if (!sel || sel._svs || sel.multiple || sel.hasAttribute("data-native")) return;
    var st = { sel: sel, id: "svs-" + (++uid), list: null, active: -1 };
    sel._svs = st;

    var name = sel.getAttribute("aria-label") || "";
    if (!name && sel.labels && sel.labels[0]) {
      var copy = sel.labels[0].cloneNode(true);
      var inner = copy.querySelectorAll("select, button");
      for (var k = 0; k < inner.length; k++) inner[k].parentNode.removeChild(inner[k]);
      name = copy.textContent.replace(/\s+/g, " ").trim();
    }
    st.name = name;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = st.id + "-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="svs-dot" aria-hidden="true"></span><span class="svs-label"></span>' + CHEV;
    st.btn = btn;
    sel.parentNode.insertBefore(btn, sel.nextSibling);

    sel.classList.add("svs-native");
    sel.tabIndex = -1;
    sel.setAttribute("aria-hidden", "true");
    // A <label for> click focuses the hidden select: pass that on to the button
    sel.addEventListener("focus", function () { btn.focus(); });
    sel.addEventListener("change", function () { refresh(st); });
    watchValue(sel, function () { refresh(st); });
    if (window.MutationObserver) {
      new MutationObserver(function () { refresh(st); }).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "disabled"] });
    }

    btn.addEventListener("click", function () {
      if (current === st) close(true);
      else open(st);
    });
    btn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(st);
      }
    });

    refresh(st);
  }

  function enhanceAll(root) {
    var list = (root || document).querySelectorAll("select");
    for (var i = 0; i < list.length; i++) enhance(list[i]);
  }

  // Code that sets select.value or selectedIndex directly also updates the button
  function watchValue(sel, cb) {
    ["value", "selectedIndex"].forEach(function (prop) {
      var d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
      if (!d || !d.set) return;
      try {
        Object.defineProperty(sel, prop, {
          configurable: true,
          get: function () { return d.get.call(this); },
          set: function (v) { d.set.call(this, v); cb(); }
        });
      } catch (e) {}
    });
  }

  function refresh(st) {
    var sel = st.sel, btn = st.btn;
    var o = sel.options[sel.selectedIndex];
    var text = o ? o.textContent : "";
    btn.className = (sel.className.replace(/\bsvs-native\b/g, "") + " svs-btn").replace(/\s+/g, " ").trim();
    btn.querySelector(".svs-label").textContent = text;
    btn.disabled = sel.disabled;
    btn.setAttribute("aria-label", (st.name ? st.name + ": " : "") + text);
    if (current === st) drawOptions(st);
  }

  function cleanClass(s) {
    return String(s || "").replace(/[^\w -]/g, "");
  }

  function drawOptions(st) {
    var sel = st.sel, html = "";
    for (var i = 0; i < sel.options.length; i++) {
      var o = sel.options[i];
      var cls = cleanClass(o.getAttribute("data-cls"));
      html += '<li role="option" id="' + st.id + "-o" + i + '" data-i="' + i + '" class="svs-opt' + (cls ? " has-dot " + cls : "") + '"' +
        ' aria-selected="' + (i === sel.selectedIndex) + '"' + (o.disabled ? ' aria-disabled="true"' : "") +
        '><span class="svs-dot" aria-hidden="true"></span><span class="svs-text"></span>' + TICK + "</li>";
    }
    st.list.innerHTML = html;
    var texts = st.list.querySelectorAll(".svs-text");
    for (var j = 0; j < texts.length; j++) texts[j].textContent = sel.options[j].textContent;
    if (st.active >= 0) setActive(st, st.active, true);
  }

  function open(st) {
    if (current) close(false);
    if (st.btn.disabled) return;
    var list = document.createElement("ul");
    list.className = "svs-list";
    list.id = st.id + "-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("tabindex", "-1");
    if (st.name) list.setAttribute("aria-label", st.name);
    var extra = cleanClass(st.sel.getAttribute("data-svs-class"));
    if (extra) list.className += " " + extra;
    st.list = list;
    current = st;
    st.active = -1;
    drawOptions(st);
    document.body.appendChild(list);

    list.addEventListener("pointermove", function (e) {
      list.classList.remove("kbd");
      var li = e.target.closest(".svs-opt");
      if (li) setActive(st, +li.getAttribute("data-i"), true);
    });
    list.addEventListener("click", function (e) {
      var li = e.target.closest(".svs-opt");
      if (li) choose(st, +li.getAttribute("data-i"));
    });
    list.addEventListener("keydown", function (e) { onKey(st, e); });
    list.addEventListener("focusout", function (e) {
      if (current === st && (!e.relatedTarget || (e.relatedTarget !== st.btn && !list.contains(e.relatedTarget)))) close(false);
    });

    st.btn.setAttribute("aria-expanded", "true");
    st.btn.setAttribute("aria-controls", list.id);
    place(st);
    setActive(st, Math.max(0, st.sel.selectedIndex), false);
    try { list.focus({ preventScroll: true }); } catch (e) { list.focus(); }
    requestAnimationFrame(function () { list.classList.add("open"); });
  }

  function close(focusButton) {
    var st = current;
    if (!st) return;
    current = null;
    if (st.list && st.list.parentNode) st.list.parentNode.removeChild(st.list);
    st.list = null;
    st.btn.setAttribute("aria-expanded", "false");
    st.btn.removeAttribute("aria-controls");
    if (focusButton && document.body.contains(st.btn)) st.btn.focus();
  }

  function choose(st, i) {
    var sel = st.sel, o = sel.options[i];
    if (!o || o.disabled) return;
    var changed = sel.selectedIndex !== i;
    sel.selectedIndex = i;
    close(true);
    if (changed) {
      sel.dispatchEvent(new Event("input", { bubbles: true }));
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function setActive(st, i, keepScroll) {
    var items = st.list.querySelectorAll(".svs-opt");
    if (!items.length) return;
    i = Math.max(0, Math.min(items.length - 1, i));
    st.active = i;
    for (var k = 0; k < items.length; k++) items[k].classList.toggle("active", k === i);
    st.list.setAttribute("aria-activedescendant", items[i].id);
    if (!keepScroll) {
      var li = items[i], top = li.offsetTop, bottom = top + li.offsetHeight;
      if (top < st.list.scrollTop) st.list.scrollTop = top - 6;
      else if (bottom > st.list.scrollTop + st.list.clientHeight) st.list.scrollTop = bottom - st.list.clientHeight + 6;
    }
  }

  function step(st, from, dir) {
    var opts = st.sel.options, i = from;
    for (var n = 0; n < opts.length; n++) {
      i += dir;
      if (i < 0 || i >= opts.length) return from;
      if (!opts[i].disabled) return i;
    }
    return from;
  }

  function onKey(st, e) {
    var handled = true, last = st.sel.options.length - 1;
    st.list.classList.add("kbd");
    switch (e.key) {
      case "ArrowDown": setActive(st, step(st, st.active, 1)); break;
      case "ArrowUp": setActive(st, step(st, st.active, -1)); break;
      case "Home": setActive(st, step(st, -1, 1)); break;
      case "End": setActive(st, step(st, last + 1, -1)); break;
      case "PageDown": setActive(st, Math.min(last, st.active + 5)); break;
      case "PageUp": setActive(st, Math.max(0, st.active - 5)); break;
      case "Enter":
      case " ": choose(st, st.active); break;
      case "Escape": close(true); break;
      case "Tab": close(true); handled = false; break;
      default:
        handled = false;
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          typed += e.key.toLowerCase();
          clearTimeout(typedTimer);
          typedTimer = setTimeout(function () { typed = ""; }, 600);
          var opts = st.sel.options;
          for (var k = 0; k < opts.length; k++) {
            var idx = (st.active + (typed.length === 1 ? 1 : 0) + k) % opts.length;
            if (!opts[idx].disabled && opts[idx].textContent.trim().toLowerCase().indexOf(typed) === 0) { setActive(st, idx); break; }
          }
          handled = true;
        }
    }
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // Opens below the button, or above it when there's more room there
  function place(st) {
    var list = st.list, r = st.btn.getBoundingClientRect();
    var vw = document.documentElement.clientWidth, vh = window.innerHeight, gap = 6, edge = 8;
    list.style.minWidth = Math.round(r.width) + "px";
    list.style.maxWidth = (vw - edge * 2) + "px";
    list.style.maxHeight = "none";
    var natural = list.scrollHeight + 2;
    var below = vh - r.bottom - gap - edge, above = r.top - gap - edge;
    var up = natural > below && above > below;
    var maxH = Math.max(120, Math.min(340, up ? above : below));
    var h = Math.min(natural, maxH);
    list.style.maxHeight = maxH + "px";
    list.style.top = Math.round(up ? r.top - gap - h : r.bottom + gap) + "px";
    var left = Math.min(r.left, vw - list.offsetWidth - edge);
    list.style.left = Math.round(Math.max(edge, left)) + "px";
    list.classList.toggle("up", up);
  }

  document.addEventListener("pointerdown", function (e) {
    if (!current) return;
    if (current.list.contains(e.target) || current.btn.contains(e.target)) return;
    close(false);
  }, true);
  window.addEventListener("resize", function () { if (current) close(false); });
  window.addEventListener("scroll", function (e) {
    if (!current || (e.target && e.target === current.list)) return;
    var r = current.btn.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) close(false);
    else place(current);
  }, true);

  window.SvSelect = { enhance: enhance, enhanceAll: enhanceAll, close: close };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { enhanceAll(document); });
  else enhanceAll(document);
})();
