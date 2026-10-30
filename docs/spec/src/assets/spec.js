/* Fisko specification documents: language switch, contents, filters, diagram zoom. No dependencies. */
(function () {
  'use strict';
  var root = document.documentElement;
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode: the page still works */ } }
  };

  /* language: ?lang=en, then the saved choice, then Thai */
  var params = new URLSearchParams(location.search);
  var lang = params.get('lang') || store.get('fisko-spec-lang') || 'th';
  if (lang !== 'th' && lang !== 'en') lang = 'th';
  function setLang(l, save) {
    lang = l;
    root.setAttribute('data-lang', l);
    root.lang = l;
    qsa('[data-set-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === l)); });
    qsa('input[data-filter], input[data-toc-filter]').forEach(function (i) {
      i.placeholder = l === 'th' ? 'ค้นหา รหัส หรือข้อความ' : 'Search by id or text';
    });
    qsa('[data-expand]').forEach(function (b) { b.setAttribute('aria-label', l === 'th' ? 'ขยายรูป' : 'Expand the figure'); });
    qsa('.menu').forEach(function (b) { b.setAttribute('aria-label', l === 'th' ? 'สารบัญ' : 'Contents'); });
    qsa('.toc').forEach(function (n) { n.setAttribute('aria-label', l === 'th' ? 'สารบัญ' : 'Contents'); });
    if (save) store.set('fisko-spec-lang', l);
    applyFilters();
  }
  qsa('[data-set-lang]').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang'), true); }); });

  /* contents: scroll spy, filter, mobile drawer */
  var tocLinks = qsa('.toc li a');
  var heads = tocLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  function spy() {
    var y = window.scrollY + 90, cur = 0;
    for (var i = 0; i < heads.length; i++) { if (heads[i] && heads[i].offsetTop <= y) cur = i; }
    tocLinks.forEach(function (a, i) { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    var active = tocLinks[cur];
    if (active && !qs('[data-toc-filter]').value) {
      var box = qs('.toc'), r = active.getBoundingClientRect(), b = box.getBoundingClientRect();
      if (r.top < b.top + 60 || r.bottom > b.bottom - 40) box.scrollTop += r.top - b.top - b.height / 3;
    }
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { spy(); ticking = false; }); } }, { passive: true });
  var tf = qs('[data-toc-filter]');
  if (tf) tf.addEventListener('input', function () {
    var q = tf.value.trim().toLowerCase();
    qsa('.toc li').forEach(function (li) {
      var t = li.querySelector('span[lang="' + lang + '"]');
      li.style.display = !q || (t && t.textContent.toLowerCase().indexOf(q) >= 0) || li.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none';
    });
  });
  var menu = qs('[data-menu]'), toc = qs('.toc');
  if (menu) menu.addEventListener('click', function () { var o = toc.classList.toggle('open'); menu.setAttribute('aria-expanded', String(o)); });
  toc.addEventListener('click', function (e) { if (e.target.closest('a')) { toc.classList.remove('open'); if (menu) menu.setAttribute('aria-expanded', 'false'); } });

  /* table filters: text box and, for the coverage table, a status select */
  function applyFilters() {
    qsa('.tfilter').forEach(function (bar) {
      var wrap = bar.nextElementSibling;
      while (wrap && !wrap.classList.contains('tw')) wrap = wrap.nextElementSibling;
      if (!wrap) return;
      var input = qs('input[data-filter]', bar), sel = qs('select[data-state-filter]', bar);
      var q = (input ? input.value : '').trim().toLowerCase(), st = sel ? sel.value : '';
      var rows = qsa('tbody tr', wrap), shown = 0;
      rows.forEach(function (tr) {
        var text = tr.textContent.toLowerCase();
        var ok = (!q || text.indexOf(q) >= 0) && (!st || tr.getAttribute('data-state') === st);
        tr.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      var c = qs('.count', bar);
      if (c) c.textContent = shown + ' / ' + rows.length;
    });
  }
  document.addEventListener('input', function (e) { if (e.target.matches('input[data-filter]')) applyFilters(); });
  document.addEventListener('change', function (e) { if (e.target.matches('select[data-state-filter]')) applyFilters(); });

  /* diagram zoom */
  var dlg = qs('#zoom');
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-expand]');
    if (b && dlg) {
      var wrap = qs('.svgwrap[lang="' + lang + '"] svg, .svgwrap[lang="' + lang + '"] img', b.parentNode);
      if (!wrap) return;
      qs('.zbody', dlg).innerHTML = '';
      qs('.zbody', dlg).appendChild(wrap.cloneNode(true));
      if (dlg.showModal) dlg.showModal();
    }
    if (e.target.closest('[data-close]') && dlg) dlg.close();
    if (e.target === dlg) dlg.close();
  });

  /* open the clause that the address points at, even inside a hidden language */
  if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) requestAnimationFrame(function () { t.scrollIntoView(); }); }

  setLang(lang, false);
  spy();
})();
