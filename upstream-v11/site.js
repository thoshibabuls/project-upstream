/* Upstream v11 · shared by every page.
   Navigation (tone, current page, phone menu), the numbered screen keys, workflow tabs, reveals and the request form.
   Each part looks for its own elements and does nothing on pages that do not have them. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var phone = window.matchMedia('(max-width: 640px)');
  var sideLayout = window.matchMedia('(min-width: 1181px)');
  var hoverable = window.matchMedia('(hover: hover) and (pointer: fine)');
  var menuLayout = window.matchMedia('(max-width: 960px)');
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function samePage(a) { return a.origin === location.origin && a.pathname === location.pathname; }
  function plainClick(e) { return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey; }
  function shown(el) { return el.getClientRects().length > 0; }

  /* smooth in-page scrolling only once the page has arrived, so a link to another page's section lands on it at once */
  window.addEventListener('load', function () { requestAnimationFrame(function () { root.classList.add('is-ready'); }); });

  /* ---------- Navigation: transparent at the top, then light or dark with the band beneath it ---------- */
  var nav = document.getElementById('site-nav');
  var menuBtn = document.getElementById('menu-btn'), links = document.getElementById('nav-links'), scrim = document.getElementById('nav-scrim');
  var darkBands = document.querySelectorAll('[data-tone="dark"]');
  /* Roadmap and FAQ share a page: there, the mark follows the section being read */
  var spy = [];
  each(links.querySelectorAll('a[data-spy]'), function (a) {
    var el = document.getElementById(a.getAttribute('data-spy'));
    if (el && samePage(a)) spy.push({ a: a, el: el });
  });
  var heroFrame = document.querySelector('.frame--hero');
  var tiltOK = window.matchMedia('(min-width: 961px) and (prefers-reduced-motion: no-preference)');
  var ticking = false;
  function paint() {
    ticking = false;
    var open = nav.classList.contains('is-open'), h = nav.offsetHeight, mid = h / 2, overDark = false;
    each(darkBands, function (band) { var r = band.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid) overDark = true; });
    var atTop = window.scrollY < 8 && overDark;
    nav.classList.toggle('is-light', open || (!atTop && !overDark));
    nav.classList.toggle('is-dark', !open && !atTop && overDark);
    if (spy.length) {
      var line = h + window.innerHeight * 0.3, current = spy[0].a;
      spy.forEach(function (s) { if (s.el.getBoundingClientRect().top <= line) current = s.a; });
      if (window.innerHeight + window.scrollY >= root.scrollHeight - 2) current = spy[spy.length - 1].a;
      spy.forEach(function (s) { if (s.a === current) s.a.setAttribute('aria-current', 'page'); else s.a.removeAttribute('aria-current'); });
    }
    if (heroFrame) {
      if (tiltOK.matches) {
        var p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.55)));
        heroFrame.style.setProperty('--tilt', ((1 - p) * 7).toFixed(2) + 'deg');
      } else heroFrame.style.removeProperty('--tilt');
    }
  }
  function queue() { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  paint();

  /* ---------- Phone menu: a disclosure over a dimmed page; Escape, the page, or a choice closes it ---------- */
  var backdrop = [document.getElementById('main'), document.querySelector('.footer')];
  function isOpen() { return nav.classList.contains('is-open'); }
  function setMenu(open, returnFocus) {
    if (open && !menuLayout.matches) open = false;
    var was = isOpen();
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    if (scrim) scrim.classList.toggle('is-on', open);
    backdrop.forEach(function (el) { if (el) el.inert = open; });
    if (was && !open && returnFocus) menuBtn.focus();
    paint();
  }
  menuBtn.addEventListener('click', function () { setMenu(!isOpen(), false); });
  links.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    /* a link on this page closes the menu now; a link to another page leaves it open until that page replaces this one */
    if (a && (samePage(a) || !plainClick(e))) setMenu(false, false);
  });
  if (scrim) scrim.addEventListener('click', function () { setMenu(false, false); });
  document.addEventListener('click', function (e) { if (isOpen() && !nav.contains(e.target)) setMenu(false, false); });
  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); setMenu(false, true); return; }
    if (e.key !== 'Tab') return;
    /* while open, focus moves through the bar and the menu only: brand, action, menu button, then each page */
    var bar = [nav.querySelector('.brand')].concat(Array.prototype.filter.call(nav.querySelectorAll('.nav-end a'), shown), [menuBtn]);
    var pages = Array.prototype.slice.call(links.querySelectorAll('a'));
    var items = bar.concat(pages), i = items.indexOf(document.activeElement);
    e.preventDefault();
    if (i < 0) (e.shiftKey ? pages[pages.length - 1] : pages[0]).focus();
    else items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
  });
  menuLayout.addEventListener('change', function (e) { if (!e.matches) setMenu(false, false); });
  /* returning with Back restores this page from memory: it comes back with the menu closed */
  window.addEventListener('pageshow', function (e) { if (e.persisted) setMenu(false, false); });

  /* a link to the page already open goes to its top instead of reloading it */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || !plainClick(e) || a.target || !samePage(a) || a.hash) return;
    e.preventDefault();
    if (location.hash) history.pushState(null, '', a.pathname + a.search);
    window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  /* ---------- Product screens: a key lights its region; on phones it also pans the screen to it ---------- */
  var figs = [];
  each(document.querySelectorAll('.fig[data-explain]'), function (fig) {
    var items = fig.querySelectorAll('.keys > li[data-n]');
    var markers = fig.querySelectorAll('.marker'), regions = fig.querySelectorAll('.region');
    var screen = fig.querySelector('.screen'), canvas = fig.querySelector('.canvas');
    var leader = fig.querySelector('.leader'), lpath = leader && leader.querySelector('path'), ldot = leader && leader.querySelector('circle');
    var pinned = null, shown = null;

    function region(n) { for (var i = 0; i < regions.length; i++) if (regions[i].getAttribute('data-n') === n) return regions[i]; return null; }
    function marker(n) { for (var i = 0; i < markers.length; i++) if (markers[i].getAttribute('data-n') === n) return markers[i]; return null; }
    function item(n) { for (var i = 0; i < items.length; i++) if (items[i].getAttribute('data-n') === n) return items[i]; return null; }

    function drawLeader(n) {
      if (!leader) return;
      if (!n || !sideLayout.matches) { leader.classList.remove('is-on'); return; }
      var fr = fig.getBoundingClientRect(), card = item(n).getBoundingClientRect(), disc = item(n).querySelector('.n').getBoundingClientRect(), mk = marker(n).getBoundingClientRect();
      var media = fig.querySelector('.fig-media').getBoundingClientRect(), aside = fig.querySelector('.fig-aside').getBoundingClientRect();
      var flip = fig.classList.contains('fig--flip');
      var sx = (flip ? card.right : card.left) - fr.left, sy = disc.top + disc.height / 2 - fr.top;
      var gx = (flip ? (aside.right + media.left) / 2 : (media.right + aside.left) / 2) - fr.left;
      var half = marker(n).offsetWidth / 2, mcx = mk.left + mk.width / 2;
      var ex = (flip ? mcx - half - 4 : mcx + half + 4) - fr.left, ey = mk.top + mk.height / 2 - fr.top;
      var r = Math.min(10, Math.abs(ey - sy) / 2), dy = ey > sy ? 1 : -1, dxs = flip ? 1 : -1;
      var d = 'M' + sx + ' ' + sy + ' H' + (gx - dxs * r) + ' Q' + gx + ' ' + sy + ' ' + gx + ' ' + (sy + dy * r) + ' V' + (ey - dy * r) + ' Q' + gx + ' ' + ey + ' ' + (gx + dxs * r) + ' ' + ey + ' H' + ex;
      if (Math.abs(ey - sy) < 2) d = 'M' + sx + ' ' + sy + ' H' + ex;
      lpath.setAttribute('d', d);
      ldot.setAttribute('cx', sx); ldot.setAttribute('cy', sy);
      leader.classList.add('is-on');
      if (!reduce.matches && lpath.getTotalLength) {
        var len = lpath.getTotalLength();
        lpath.style.transition = 'none'; lpath.style.strokeDasharray = len; lpath.style.strokeDashoffset = len;
        lpath.getBoundingClientRect();
        lpath.style.transition = 'stroke-dashoffset 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease';
        lpath.style.strokeDashoffset = 0;
      }
    }
    function panTo(n, smooth) {
      var rg = region(n);
      if (!rg || !phone.matches || !screen) return;
      var x = parseFloat(rg.style.getPropertyValue('--x')), w = parseFloat(rg.style.getPropertyValue('--w'));
      var cw = canvas.offsetWidth, view = screen.clientWidth, pad = canvas.offsetLeft;
      var left = (x / 100) * cw + pad, width = (w / 100) * cw;
      var target = width > view - 32 ? left - 20 : left + width / 2 - view / 2;
      screen.scrollTo({ left: Math.max(0, target), behavior: smooth && !reduce.matches ? 'smooth' : 'auto' });
    }
    function light(n, how) {
      if (n === shown && how === 'hover') return;
      shown = n;
      fig.classList.toggle('has-on', !!n);
      each(items, function (li) {
        var on = li.getAttribute('data-n') === n;
        li.classList.toggle('is-on', on);
        var b = li.querySelector('.key'); if (b) b.setAttribute('aria-pressed', String(on && pinned === n));
      });
      each(markers, function (m) { m.classList.toggle('is-on', m.getAttribute('data-n') === n); });
      each(regions, function (r) { r.classList.toggle('is-on', r.getAttribute('data-n') === n); });
      drawLeader(n);
      if (n && how !== 'hover') panTo(n, true);
    }
    function toggle(n) { pinned = pinned === n ? null : n; light(pinned, 'click'); }

    each(items, function (li) {
      var n = li.getAttribute('data-n'), b = li.querySelector('.key');
      b.addEventListener('click', function () { toggle(n); });
      li.addEventListener('mouseenter', function () { if (hoverable.matches) light(n, 'hover'); });
      li.addEventListener('mouseleave', function () { if (hoverable.matches) light(pinned, 'hover'); });
      b.addEventListener('focus', function () { if (b.matches(':focus-visible')) light(n, 'focus'); });
      b.addEventListener('blur', function () { light(pinned, 'hover'); });
    });
    each(markers, function (m) {
      var n = m.getAttribute('data-n');
      m.addEventListener('click', function (e) { e.preventDefault(); toggle(n); });
      m.addEventListener('mouseenter', function () { if (hoverable.matches) light(n, 'hover'); });
      m.addEventListener('mouseleave', function () { if (hoverable.matches) light(pinned, 'hover'); });
    });
    document.addEventListener('click', function (e) { if (pinned && !fig.contains(e.target)) { pinned = null; light(null, 'click'); } });
    if (screen) screen.addEventListener('scroll', function () { if (screen.scrollLeft > 24) fig.classList.add('was-panned'); }, { passive: true });

    var api = {
      fig: fig,
      start: function () { if (phone.matches) { fig.classList.remove('was-panned'); var first = regions[0]; if (first) panTo(first.getAttribute('data-n'), false); else if (screen) screen.scrollLeft = 0; } },
      redraw: function () { if (shown) drawLeader(shown); }
    };
    figs.push(api);
  });
  /* phones: the import screen pans too, from its left edge */
  each(document.querySelectorAll('.fig--import .screen'), function (screen) {
    screen.addEventListener('scroll', function () { if (screen.scrollLeft > 24) screen.closest('.fig').classList.add('was-panned'); }, { passive: true });
  });
  function startAll() { figs.forEach(function (f) { f.start(); }); }
  window.addEventListener('load', startAll);
  phone.addEventListener('change', startAll);
  window.addEventListener('resize', function () { figs.forEach(function (f) { f.redraw(); }); });

  if ('IntersectionObserver' in window) {
    var figIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); figIO.unobserve(e.target); } });
    }, { threshold: 0.2 });
    figs.forEach(function (f) { figIO.observe(f.fig); });
  } else figs.forEach(function (f) { f.fig.classList.add('is-in'); });

  /* ---------- Workflow tabs. Without script every panel stays visible, stacked. ---------- */
  var tabs = document.getElementById('tabs'), segWrap = document.getElementById('seg-wrap');
  if (tabs && segWrap) {
    var seg = segWrap.querySelector('.seg'), ind = segWrap.querySelector('.seg-ind');
    var tabEls = Array.prototype.slice.call(segWrap.querySelectorAll('[role="tab"]'));
    var moveInd = function (tab) { ind.style.width = tab.offsetWidth + 'px'; ind.style.transform = 'translateX(' + tab.offsetLeft + 'px)'; };
    var select = function (tab, focus, animate) {
      tabEls.forEach(function (t) {
        var on = t === tab, panel = document.getElementById(t.getAttribute('aria-controls'));
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panel.hidden = !on;
        if (on && animate) { panel.classList.remove('is-entering'); panel.getBoundingClientRect(); panel.classList.add('is-entering'); }
        if (on) {
          var f = panel.querySelector('.fig[data-explain]');
          figs.forEach(function (x) { if (x.fig === f) { f.classList.add('is-in'); x.start(); } });
        }
      });
      moveInd(tab);
      if (focus) tab.focus({ preventScroll: true });
      if (tab.offsetLeft < seg.scrollLeft) seg.scrollLeft = tab.offsetLeft - 8;
      else if (tab.offsetLeft + tab.offsetWidth > seg.scrollLeft + seg.clientWidth - 40) seg.scrollLeft = tab.offsetLeft + tab.offsetWidth - seg.clientWidth + 40;
    };
    var syncInd = function () { tabEls.forEach(function (t) { if (t.getAttribute('aria-selected') === 'true') moveInd(t); }); };
    var fade = function () { segWrap.classList.toggle('is-scrollable', seg.scrollWidth > seg.clientWidth + 1 && seg.scrollLeft + seg.clientWidth < seg.scrollWidth - 2); };
    seg.addEventListener('scroll', fade, { passive: true });
    tabs.classList.add('is-tabbed'); segWrap.classList.add('is-tabbed');
    select(tabEls[0], false, false);
    tabEls.forEach(function (t, i) {
      t.addEventListener('click', function () { if (t.getAttribute('aria-selected') !== 'true') select(t, false, true); });
      t.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabEls[(i + 1) % tabEls.length];
        else if (e.key === 'ArrowLeft') next = tabEls[(i - 1 + tabEls.length) % tabEls.length];
        else if (e.key === 'Home') next = tabEls[0];
        else if (e.key === 'End') next = tabEls[tabEls.length - 1];
        if (next) { e.preventDefault(); select(next, true, true); }
      });
    });
    window.addEventListener('resize', function () { syncInd(); fade(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { syncInd(); fade(); });
    fade();
  }

  /* ---------- Reveals, and the two relationship panels assembling once ---------- */
  var once = document.querySelectorAll('.rv, .viz');
  if ('IntersectionObserver' in window && !reduce.matches) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add(e.target.classList.contains('viz') ? 'is-in' : 'in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    each(once, function (el) { io.observe(el); });
  } else {
    each(once, function (el) { el.classList.add(el.classList.contains('viz') ? 'is-in' : 'in'); });
  }

  /* ---------- Every call to action leads to the request form. On the form's own page, it brings the form into view. ---------- */
  var formbox = document.getElementById('formbox');
  if (formbox) each(document.querySelectorAll('[data-open-form]'), function (el) {
    el.addEventListener('click', function (e) {
      if (!plainClick(e) || !samePage(el)) return;
      e.preventDefault();
      setMenu(false, false);
      var intent = el.getAttribute('data-intent') || 'walkthrough';
      var radio = document.querySelector('input[name="intent"][value="' + intent + '"]');
      if (radio) radio.checked = true;
      var r = formbox.getBoundingClientRect(), inView = r.top >= nav.offsetHeight && r.bottom <= window.innerHeight;
      if (!inView) formbox.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
      var name = document.getElementById('f-name');
      if (name && !name.closest('[hidden]')) setTimeout(function () { name.focus({ preventScroll: true }); }, inView || reduce.matches ? 0 : 700);
    });
  });

  /* ---------- Inline errors: shown on submit, cleared as each field becomes valid ---------- */
  var form = document.getElementById('pilot-form'), conf = document.getElementById('confirm');
  if (form) {
    var required = ['f-name', 'f-firm', 'f-email'].map(function (id) { return document.getElementById(id); });
    var showError = function (input, on) {
      var err = document.getElementById(input.id + '-err');
      err.hidden = !on;
      if (on) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', err.id); }
      else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    };
    required.forEach(function (input) {
      input.addEventListener('input', function () { if (input.getAttribute('aria-invalid') === 'true' && input.checkValidity()) showError(input, false); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      required.forEach(function (input) { var bad = !input.value.trim() || !input.checkValidity(); showError(input, bad); if (bad && !first) first = input; });
      if (first) { first.focus(); return; }
      form.hidden = true; conf.hidden = false; conf.tabIndex = -1; conf.focus();
    });
  }
})();
