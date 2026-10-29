/* Daniel Willy Waitz, portfolio. No dependencies. */
(function () {
  'use strict';
  var root = document.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = mqReduce.matches;
  if (reduce) root.classList.add('reduce');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var mod = function (a, n) { return ((a % n) + n) % n; };

  /* ---------------------------------------------------------- reveal */
  (function () {
    var els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
    function sweep() { els.forEach(function (e) { if (!e.classList.contains('in') && e.getBoundingClientRect().top < window.innerHeight * 0.96) { e.classList.add('in'); io.unobserve(e); } }); }
    window.addEventListener('scroll', sweep, { passive: true }); window.addEventListener('resize', sweep);
    setTimeout(sweep, 120);
  })();

  /* ---------------------------------------------------------- shared drag helper
     Hover (mouse) pauses, press and hold (touch) pauses, dragging moves the content. */
  function makeInteractive(el, h) {
    var down = false, dragging = false, sx = 0, lx = 0, lt = 0, vel = 0, holdT = 0, pid = null, startY = 0;
    el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') h.hover(true); });
    el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') h.hover(false); });
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true; dragging = false; sx = lx = e.clientX; startY = e.clientY; lt = performance.now(); vel = 0; pid = e.pointerId;
      if (e.pointerType !== 'mouse') { clearTimeout(holdT); holdT = setTimeout(function () { if (down) h.hold(true); }, 160); }
    });
    el.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== pid) return;
      var dx = e.clientX - lx;
      if (!dragging) {
        if (Math.abs(e.clientX - sx) < 6) return;
        if (Math.abs(e.clientY - startY) > Math.abs(e.clientX - sx) * 1.2 && e.pointerType !== 'mouse') { down = false; clearTimeout(holdT); h.hold(false); return; }
        dragging = true; try { el.setPointerCapture(e.pointerId); } catch (x) {}
        h.dragStart();
      }
      var now = performance.now(), dt = Math.max(1, now - lt);
      vel = vel * 0.6 + (dx / dt * 1000) * 0.4; lx = e.clientX; lt = now;
      h.drag(dx);
    });
    function end(e) {
      if (!down) return;
      down = false; clearTimeout(holdT); h.hold(false);
      if (dragging) { dragging = false; h.dragEnd(vel); try { el.releasePointerCapture(pid); } catch (x) {} }
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  /* ---------------------------------------------------------- shared tool-name tooltip */
  var tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('aria-hidden', 'true'); document.body.appendChild(tip);
  function tipShow(name, e) { tip.textContent = name; tipMove(e); tip.classList.add('is-on'); }
  function tipMove(e) { tip.style.transform = 'translate3d(' + (e.clientX + 16) + 'px,' + (e.clientY + 18) + 'px,0)'; }
  function tipHide() { tip.classList.remove('is-on'); }
  $$('[data-tip]').forEach(function (el) {
    el.addEventListener('mouseenter', function (e) { tipShow(el.getAttribute('data-tip'), e); });
    el.addEventListener('mousemove', tipMove);
    el.addEventListener('mouseleave', tipHide);
  });

  /* ---------------------------------------------------------- tools belt: three rows, alternating direction */
  (function () {
    var belt = $('#belt'), list = $('#tools-static');
    if (!belt || !list || reduce) return;
    var items = $$('li', list).map(function (li) {
      var imgs = $$('img', li);
      return { name: $('.sr-only', li).textContent, muted: imgs[0].getAttribute('src'), orig: imgs[1].getAttribute('src'), aspect: parseFloat(li.getAttribute('data-aspect')) || 1 };
    });
    var ROWS = 3, LOGO_H = 34, MAX_W = 200, ROW_H = 48, ROW_GAP = 14, BASE_GAP = 64, M = 120, SPEED = 34;
    belt.style.height = (ROW_H * ROWS + ROW_GAP * (ROWS - 1)) + 'px';
    var rows = []; for (var r = 0; r < ROWS; r++) rows.push({ els: [], L: 1, dir: r % 2 ? 1 : -1 });
    items.forEach(function (it, i) {
      var w = Math.min(it.aspect * LOGO_H, MAX_W), h = w / it.aspect;
      var d = document.createElement('div'); d.className = 'belt-logo'; d.style.width = w + 'px'; d.style.height = h + 'px';
      d.innerHTML = '<img class="tl-muted" alt="" src="' + it.muted + '"><img class="tl-orig" alt="" src="' + it.orig + '">';
      belt.appendChild(d);
      d.addEventListener('mouseenter', function (e) { if (!dragMoved) { d.classList.add('is-hover'); tipShow(it.name, e); } });
      d.addEventListener('mousemove', tipMove);
      d.addEventListener('mouseleave', function () { d.classList.remove('is-hover'); tipHide(); });
      rows[i % ROWS].els.push({ el: d, w: w, h: h, c: 0, vis: true });
    });
    var W = 0, offset = 0, extra = 0, hovering = false, holding = false, dragMoved = false, visible = true, last = 0;
    function layout() {
      W = belt.clientWidth; if (!W) return;
      rows.forEach(function (row) {
        var sumW = row.els.reduce(function (s, e) { return s + e.w; }, 0);
        var gap = Math.max(W < 600 ? 40 : BASE_GAP, (W + 2 * M - sumW) / row.els.length);
        var cum = 0; row.els.forEach(function (e) { e.c = cum + e.w / 2; cum += e.w + gap; }); row.L = cum;
      });
      render();
    }
    function render() {
      rows.forEach(function (row, ri) {
        var y0 = ri * (ROW_H + ROW_GAP);
        row.els.forEach(function (e) {
          var cx = mod(e.c + offset * row.dir, row.L) - M, vis = cx + e.w / 2 > 0 && cx - e.w / 2 < W;
          if (vis) {
            e.el.style.transform = 'translate3d(' + (cx - e.w / 2).toFixed(1) + 'px,' + (y0 + (ROW_H - e.h) / 2).toFixed(1) + 'px,0)';
            if (!e.vis) { e.el.style.visibility = 'visible'; e.vis = true; }
          } else if (e.vis) { e.el.style.visibility = 'hidden'; e.vis = false; }
        });
      });
    }
    function tick(t) {
      requestAnimationFrame(tick);
      var dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (!visible || !W) return;
      offset += (((hovering || holding) ? 0 : SPEED) + extra) * dt;
      extra *= Math.pow(0.04, dt); if (Math.abs(extra) < 1) extra = 0;
      render();
    }
    makeInteractive(belt, {
      hover: function (v) { hovering = v; if (!v) { tipHide(); rows.forEach(function (r) { r.els.forEach(function (e) { e.el.classList.remove('is-hover'); }); }); } },
      hold: function (v) { holding = v; },
      dragStart: function () { dragMoved = true; tipHide(); belt.classList.add('is-drag'); },
      drag: function (dx) { offset -= dx; render(); },
      dragEnd: function (v) { belt.classList.remove('is-drag'); extra = -v; setTimeout(function () { dragMoved = false; }, 50); }
    });
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(belt); else window.addEventListener('resize', layout);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { rootMargin: '120px' }).observe(belt);
    layout(); requestAnimationFrame(function (t) { last = t; tick(t); });
  })();

  /* ---------------------------------------------------------- what I do: dropdowns */
  $$('.band-btn').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.classList.toggle('is-open', open);
    });
  });

  /* ---------------------------------------------------------- projects tabs */
  (function () {
    var tabs = $$('.pj-tab'); if (!tabs.length) return;
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[mod(i + (e.key === 'ArrowRight' ? 1 : -1), tabs.length)], true); }
      });
    });
  })();

  /* ---------------------------------------------------------- testimonials marquee */
  (function () {
    var wrap = $('.tw-wrap'), track = $('#tw-track'), set = $('#tw-set');
    if (!wrap || !track || !set) return;
    if (reduce) return;
    var SPEED = 42, setW = 0, x = 0, extra = 0, hovering = false, holding = false, visible = true, last = 0;
    function build() {
      $$('.tw-clone', track).forEach(function (n) { n.remove(); });
      setW = set.getBoundingClientRect().width; if (!setW) return;
      var copies = Math.ceil(wrap.clientWidth / setW) + 1;
      for (var i = 0; i < copies; i++) {
        var c = set.cloneNode(true); c.removeAttribute('id'); c.classList.add('tw-clone'); c.setAttribute('aria-hidden', 'true'); track.appendChild(c);
      }
    }
    function apply() { track.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)'; }
    function tick(t) {
      requestAnimationFrame(tick);
      var dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (!visible || !setW) return;
      x += ((hovering || holding) ? 0 : SPEED) * dt + extra * dt;
      extra *= Math.pow(0.04, dt); if (Math.abs(extra) < 1) extra = 0;
      x = mod(x, setW); apply();
    }
    makeInteractive(wrap, {
      hover: function (v) { hovering = v; },
      hold: function (v) { holding = v; },
      dragStart: function () { wrap.classList.add('is-drag'); },
      drag: function (dx) { x = mod(x - dx, setW); apply(); },
      dragEnd: function (v) { wrap.classList.remove('is-drag'); extra = -v; }
    });
    build();
    if ('ResizeObserver' in window) new ResizeObserver(function () { build(); }).observe(wrap);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { rootMargin: '120px' }).observe(wrap);
    requestAnimationFrame(function (t) { last = t; tick(t); });
  })();

  /* ---------------------------------------------------------- experience timeline */
  (function () {
    var host = $('#tl'); if (!host) return;
    var steps = $$('[data-step]', host); if (!steps.length) return;
    var line = document.createElement('div'); line.className = 'tl-line'; line.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('i'); fill.className = 'tl-fill';
    var head = document.createElement('b'); head.className = 'tl-head';
    line.appendChild(fill); line.appendChild(head); host.appendChild(line);
    var FOCAL = 0.52, nodeY = [], total = 1, ticking = false;
    if (reduce) { fill.style.transform = 'scaleY(1)'; head.style.display = 'none'; }
    function measure() {
      var top = host.getBoundingClientRect().top + window.pageYOffset;
      nodeY = steps.map(function (s) { var h = $('h3', s).getBoundingClientRect(); return h.top + window.pageYOffset + Math.min(h.height / 2, 28); });
      total = Math.max(1, nodeY[nodeY.length - 1] - nodeY[0]);
      line.style.top = (nodeY[0] - top) + 'px'; line.style.height = total + 'px';
      update();
    }
    function update() {
      ticking = false;
      if (reduce) { steps.forEach(function (s) { s.classList.add('is-active'); }); return; }
      var focal = window.pageYOffset + window.innerHeight * FOCAL;
      var grown = Math.min(total, Math.max(0, focal - nodeY[0]));
      fill.style.transform = 'scaleY(' + (grown / total) + ')';
      head.style.transform = 'translateY(' + grown + 'px)';
      var idx = -1;
      for (var i = 0; i < nodeY.length; i++) if (focal >= nodeY[i]) idx = i;
      steps.forEach(function (s, i) {
        s.classList.toggle('is-active', i === idx);
        s.classList.toggle('is-past', i < idx);
      });
      // when the circle has not reached the first card yet, keep it readable once it is in view
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    (function () {
      var on = false, y0 = 0, s0 = 0;
      head.addEventListener('pointerdown', function (e) { on = true; y0 = e.clientY; s0 = window.pageYOffset; head.setPointerCapture(e.pointerId); document.documentElement.classList.add('is-dragging-line'); e.preventDefault(); });
      head.addEventListener('pointermove', function (e) { if (on) window.scrollTo({ top: s0 + (e.clientY - y0) * 1.6, behavior: 'instant' }); });
      function end() { if (!on) return; on = false; document.documentElement.classList.remove('is-dragging-line'); }
      head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
    })();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(host);
    // a card reached by a link or by keyboard focus is shown sharp straight away
    steps.forEach(function (s) { s.addEventListener('focusin', function () { s.classList.add('is-active'); }); });
    measure();
  })();

  /* ---------------------------------------------------------- shared: scroll holder with progress line + hover pill */
  function setupHolder(holder) {
    var scroller = $('.cf-scroll', holder), fillEl = $('.cf-fill', holder), headEl = $('.cf-head', holder), pill = $('.cf-pill', holder), grid = $('.cf-grid', holder);
    var mqMob = window.matchMedia('(max-width: 700px)'), finePtr = window.matchMedia('(hover:hover) and (pointer:fine)');
    function prog() {
      var max = Math.max(1, scroller.scrollHeight - scroller.clientHeight), p = Math.min(1, scroller.scrollTop / max);
      var lh = fillEl.parentNode.clientHeight;
      fillEl.style.transform = 'scaleY(' + p + ')'; headEl.style.transform = 'translateY(' + (p * lh) + 'px)';
      holder.classList.toggle('is-moved', scroller.scrollTop > 40);
      holder.classList.toggle('is-end', max - scroller.scrollTop < 8);
      holder.classList.toggle('no-scroll', scroller.scrollHeight - scroller.clientHeight < 24);
    }
    scroller.addEventListener('scroll', prog, { passive: true });
    var track = headEl.parentNode, on = false;
    function setFromY(y) {
      var r = track.getBoundingClientRect(), p = Math.min(1, Math.max(0, (y - r.top) / r.height));
      scroller.scrollTop = p * Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    }
    track.addEventListener('pointerdown', function (e) { on = true; track.setPointerCapture(e.pointerId); root.classList.add('is-dragging-line'); setFromY(e.clientY); e.preventDefault(); });
    track.addEventListener('pointermove', function (e) { if (on) setFromY(e.clientY); });
    function end() { if (!on) return; on = false; root.classList.remove('is-dragging-line'); }
    track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end);
    window.addEventListener('resize', prog);
    if (pill) grid.addEventListener('pointermove', function (e) {
      if (!finePtr.matches || mqMob.matches || e.pointerType !== 'mouse') return;
      var hit = !!e.target.closest('.cf-card');
      pill.classList.toggle('is-on', hit);
      if (hit) pill.style.transform = 'translate3d(' + (e.clientX - pill.offsetWidth / 2) + 'px,' + (e.clientY - pill.offsetHeight / 2) + 'px,0)';
    });
    if (pill) {
      grid.addEventListener('pointerleave', function () { pill.classList.remove('is-on'); });
      scroller.addEventListener('scroll', function () { pill.classList.remove('is-on'); }, { passive: true });
    }
    return { prog: prog, scroller: scroller };
  }
  // two cards per row; an odd card sits alone, centred, in the middle row
  function pairSpans(cards, shown, off) {
    cards.forEach(function (c) { c.style.gridColumn = ''; c.style.gridRow = ''; });
    if (off) return;
    var n = shown.length, pairs = Math.floor(n / 2), single = n % 2 === 1, singleAt = single ? Math.floor((pairs + 1) / 2) : -1;
    var row = 1, k = 0;
    for (var r = 0; r <= pairs; r++) {
      if (r === singleAt) { var c1 = cards[shown[k++]]; c1.style.gridColumn = '2 / span 2'; c1.style.gridRow = String(row++); continue; }
      if (r === pairs) break;
      var a1 = cards[shown[k++]], b1 = cards[shown[k++]];
      if (a1) { a1.style.gridColumn = '1 / span 2'; a1.style.gridRow = String(row); }
      if (b1) { b1.style.gridColumn = '3 / span 2'; b1.style.gridRow = String(row); }
      row++;
    }
  }
  // lock page scroll while any dialog is open
  (function () {
    var dialogs = $$('dialog');
    function sync() { root.classList.toggle('is-locked', dialogs.some(function (d) { return d.open; })); }
    if ('MutationObserver' in window) { var mo = new MutationObserver(sync); dialogs.forEach(function (d) { mo.observe(d, { attributes: true, attributeFilter: ['open'] }); }); }
    dialogs.forEach(function (d) { d.addEventListener('close', sync); });
  })();

  /* ---------------------------------------------------------- conference samples */
  (function () {
    var dataEl = $('#cf-data'); if (!dataEl) return;
    var data = JSON.parse(dataEl.textContent);
    var grid = $('#cf-grid'), cards = $$('.cf-card', grid), dots = $('#cf-dots'), count = $('#cf-count');
    var chips = $$('.cf-filters .chip');
    var modal = $('#cf-modal');
    var mqMobile = window.matchMedia('(max-width: 700px)');
    var filter = 'all', cur = 0, shown = [];
    var STEP = 0;

    function computeShown() { shown = cards.map(function (c, i) { return i; }).filter(function (i) { return filter === 'all' || data[i].group === filter; }); }
    function applyFilter() {
      computeShown();
      cards.forEach(function (c, i) { c.hidden = shown.indexOf(i) === -1; });
      cur = 0;
      count.textContent = 'Showing ' + shown.length + ' of ' + cards.length + ' samples.';
      buildDots(); layout(); if (scroller) { scroller.scrollTop = 0; prog(); }
    }
    function buildDots() {
      dots.innerHTML = '';
      shown.forEach(function (ci, k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'cf-dot';
        b.setAttribute('aria-label', 'Show ' + data[ci].name + ' ' + data[ci].year);
        b.addEventListener('click', function () { cur = k; layout(); });
        dots.appendChild(b);
      });
    }
    function signed(k) { var n = shown.length, d = mod(k - cur, n); return d > n / 2 ? d - n : d; }
    function layout() {
      var mob = mqMobile.matches;
      spans();
      cards.forEach(function (c) { c.classList.remove('is-side'); c.style.transform = ''; c.style.opacity = ''; c.style.zIndex = ''; c.style.pointerEvents = ''; c.removeAttribute('aria-hidden'); });
      if (!mob) return;
      var gw = grid.clientWidth, cw = Math.min(gw * 0.78, 320); STEP = cw * 0.84;
      shown.forEach(function (ci, k) {
        var c = cards[ci], o = signed(k), a = Math.abs(o);
        c.style.transform = 'translateX(' + (o * STEP).toFixed(1) + 'px) scale(' + (a === 0 ? 1 : 0.86) + ')';
        c.style.opacity = a === 0 ? '1' : (a === 1 ? '0.55' : '0');
        c.style.zIndex = String(10 - a);
        c.style.pointerEvents = a > 1 ? 'none' : '';
        c.classList.toggle('is-side', a !== 0);
        if (a > 1) c.setAttribute('aria-hidden', 'true');
      });
      $$('.cf-dot', dots).forEach(function (d, k) { if (k === cur) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    }
    function spans() { pairSpans(cards, shown, window.innerWidth <= 1100 || mqMobile.matches); }
    var H = setupHolder($('#cf-holder')), scroller = H.scroller, prog = H.prog;
    function go(d) { if (!shown.length) return; cur = mod(cur + d, shown.length); layout(); }

    chips.forEach(function (ch) {
      ch.addEventListener('click', function () {
        chips.forEach(function (o) { o.setAttribute('aria-pressed', o === ch ? 'true' : 'false'); });
        filter = ch.getAttribute('data-filter'); applyFilter();
      });
    });

    // swipe on the mobile carousel
    var sx = 0, sy = 0, swiped = false, swipeOn = false;
    grid.addEventListener('pointerdown', function (e) { if (!mqMobile.matches) return; sx = e.clientX; sy = e.clientY; swiped = false; swipeOn = true; });
    grid.addEventListener('pointerup', function (e) {
      if (!swipeOn) return; swipeOn = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; go(dx < 0 ? 1 : -1); }
    });
    grid.addEventListener('pointercancel', function () { swipeOn = false; });
    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.cf-open'); if (!btn) return;
      if (swiped) { swiped = false; e.preventDefault(); return; }
      var card = btn.closest('.cf-card'), ci = cards.indexOf(card), k = shown.indexOf(ci);
      if (!mqMobile.matches) { window.open(data[ci].url, '_blank', 'noopener'); return; }
      if (k !== cur) { cur = k; layout(); return; }
      openModal(ci, btn);
    });

    var modalIdx = 0, opener = null;
    function fill(ci) {
      var c = data[ci]; modalIdx = ci;
      $('#cf-m-title').textContent = c.name + ' ' + c.year + ' sample';
      $('#cf-m-facts').textContent = c.facts;
      var img = $('#cf-m-img'); img.src = c.img; img.alt = 'Preview of the ' + c.name + ' ' + c.year + ' sample workbook';
      var ul = $('#cf-m-tabs'); ul.innerHTML = '';
      c.tabs.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      $('#cf-m-link').href = c.url;
      $('.cf-m-body', modal).scrollTop = 0;
    }
    function openModal(ci, btn) { opener = btn; fill(ci); if (modal.showModal) modal.showModal(); else modal.setAttribute('open', ''); }
    function step(d) { var k = shown.indexOf(modalIdx); fill(shown[mod(k + d, shown.length)]); }
    $('#cf-close').addEventListener('click', function () { modal.close(); });
    $('#cf-prev').addEventListener('click', function () { step(-1); });
    $('#cf-next').addEventListener('click', function () { step(1); });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.close(); });
    modal.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); });
    modal.addEventListener('close', function () { var k = shown.indexOf(modalIdx); if (mqMobile.matches && k > -1) { cur = k; layout(); } });

    mqMobile.addEventListener ? mqMobile.addEventListener('change', layout) : mqMobile.addListener(layout);
    window.addEventListener('resize', layout);
    applyFilter();
  })();


  /* ---------------------------------------------------------- make scenarios */
  (function () {
    var dataEl = $('#mk-data'), holder = $('#mk-holder'); if (!dataEl || !holder) return;
    var data = JSON.parse(dataEl.textContent), cards = $$('.mk-card', holder), modal = $('#mk-modal'), shot = $('#mk-m-img');
    var H = setupHolder(holder), all = cards.map(function (c, i) { return i; });
    function lay() { pairSpans(cards, all, window.innerWidth <= 1100 || window.innerWidth <= 700); H.prog(); }
    window.addEventListener('resize', lay); lay();
    function open(i) {
      var d = data[i];
      $('#mk-m-title').textContent = d.name; $('#mk-m-facts').textContent = d.facts;
      $('#mk-m-side').innerHTML = d.side; $('#mk-m-link').href = d.url;
      shot.src = d.img; shot.width = d.w; shot.height = d.h; shot.alt = 'The ' + d.name + ' scenario in Make';
      if (modal.showModal) modal.showModal(); else modal.setAttribute('open', '');
      $('.mk-m-body', modal).scrollTop = 0;
    }
    cards.forEach(function (c, i) { $('.cf-open', c).addEventListener('click', function () { open(i); }); });
    $('#mk-close').addEventListener('click', function () { modal.close(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.close(); });
  })();

  /* ---------------------------------------------------------- nav letter roll */
  $$('[data-roll]').forEach(function (a) {
    var txt = a.textContent; a.setAttribute('aria-label', txt); a.textContent = '';
    txt.split('').forEach(function (ch, i) {
      var s = document.createElement('span'); s.className = 'ch'; s.setAttribute('aria-hidden', 'true'); s.style.setProperty('--i', i);
      var c = ch === ' ' ? ' ' : ch;
      s.innerHTML = '<span class="ch-a"></span><span class="ch-b"></span>';
      s.children[0].textContent = c; s.children[1].textContent = c; a.appendChild(s);
    });
  });

  /* ---------------------------------------------------------- hero intro
     0 to 1s: photo pops up from a slight right tilt, "Hi I am" and the first role slide in from the left,
     the name from the right. All land together at 1s, then the other roles slide out of the first one.
     1s to 2s: icons, the resume button and the three cards rise from below. */
  (function () {
    var els = $$('[data-intro]');
    if (reduce || !els.length || !els[0].animate) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var SNAP = 'cubic-bezier(.34,1.45,.55,1)', SOFT = 'cubic-bezier(.33,0,.2,1)';
    var FROM = { left: 'translateX(-70px)', right: 'translateX(70px)', up: 'translateY(46px)' };
    var upIdx = 0;
    els.forEach(function (el) {
      var k = el.getAttribute('data-intro'), kf, opt;
      if (k === 'pop') {
        kf = [{ transform: 'translateY(60%) rotate(9deg) scale(.82)', opacity: 0, offset: 0 },
              { transform: 'translateY(-4%) rotate(5deg) scale(1.01)', opacity: 1, offset: 0.55 },
              { transform: 'translateY(0) rotate(0deg) scale(1)', opacity: 1, offset: 1 }];
        opt = { duration: 1000, delay: 0, easing: SOFT, fill: 'backwards' };
      } else {
        var over = k === 'left' ? 'translateX(7px)' : k === 'right' ? 'translateX(-7px)' : 'translateY(-6px)';
        kf = [{ transform: FROM[k], opacity: 0, offset: 0 }, { transform: over, opacity: 1, offset: 0.8 }, { transform: 'none', opacity: 1, offset: 1 }];
        opt = { duration: 1000, delay: k === 'up' ? 1000 + (upIdx++) * 60 : 0, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'backwards' };
      }
      el.classList.add('is-in'); el.animate(kf, opt);
    });
    // the other two roles slide out of the first one once it has landed
    var wrap = $('#roles'); if (!wrap) return;
    var pills = $$('span', wrap); if (pills.length < 3) return;
    var r = pills.map(function (p) { return p.getBoundingClientRect(); });
    var sameRow = Math.abs(r[0].top - r[1].top) < 4 && Math.abs(r[1].top - r[2].top) < 4;
    [1, 2].forEach(function (i) {
      var from = sameRow ? (r[i - 1].left - r[i].left) : 0;
      pills[i].animate([{ transform: 'translateX(' + from + 'px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
        { duration: 700, delay: 1000 + (i - 1) * 450, easing: SNAP, fill: 'backwards' });
    });
  })();


  /* ---------------------------------------------------------- photo travels from the hero into About me
     Tied to the scroll. Going down it sets off once the icons and Resume button are out of view and lands
     when the About photo sits mid-screen. Going up it waits until the About cards drop out of view below,
     then heads home. On the way it does a card flip with a twist: the photo is cut into thin strips and
     the middle strips turn ahead of the top and bottom ones, so the picture bends through its middle. */
  (function () {
    var fly = $('#pic-fly'), slotA = $('#hero-pic'), slotB = $('#about-pic'), links = $('.hero-links'), deck = $('#deck');
    var inner = $('#hero-pic-in'), img = inner && $('img', inner);
    if (!fly || !slotA || !slotB || !links || !deck || !img || reduce) return;
    document.body.appendChild(fly);
    var N = 100, strips = [], wrap = document.createElement('div');
    wrap.className = 'pic-strips'; wrap.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < N; i++) {
      var st = document.createElement('i');
      st.style.backgroundImage = 'url(' + img.getAttribute('src') + ')';
      wrap.appendChild(st); strips.push(st);
    }
    inner.appendChild(wrap);
    // strips are sized in whole pixels and overlap their neighbour by 3px, so no seam can open between them
    function sizeStrips(W) {
      var h = W / N;
      strips.forEach(function (st, i) {
        var top = Math.floor(i * h);
        st.style.top = top + 'px';
        st.style.height = (Math.ceil((i + 1) * h) - top + (i < N - 1 ? 3 : 0)) + 'px';
        st.style.backgroundSize = W + 'px ' + W + 'px';
        st.style.backgroundPosition = '0 ' + (-top) + 'px';
      });
    }
    var A, B, S1 = 0, S2 = 1, E = 1, p = 0, lastY = window.pageYOffset, raf = 0;
    var bar = $('.bar');
    function rect(el) { var r = el.getBoundingClientRect(); return { x: r.left + window.pageXOffset, y: r.top + window.pageYOffset, w: r.width, h: r.height }; }
    function measure() {
      A = rect(slotA); B = rect(slotB); fly.style.width = A.w + 'px'; sizeStrips(A.w);
      var L = rect(links), D = rect(deck), barH = bar ? bar.offsetHeight : 0;
      S1 = L.y + L.h - barH;                               // icons have gone under the header
      E = Math.max(S1 + 1, B.y + B.w / 2 - window.innerHeight / 2);   // About photo mid-screen
      S2 = Math.max(S1 + 1, D.y - window.innerHeight);     // About cards have dropped below the screen
      onScroll(true);
    }
    function clamp(v) { return Math.min(1, Math.max(0, v)); }
    function onScroll(force) {
      var y = window.pageYOffset, down = y >= lastY;
      var pd = clamp((y - S1) / (E - S1)), pu = clamp((y - S1) / (S2 - S1));
      if (force === true) p = pd;                          // first paint: place it for where the reader is
      else if (down) p = Math.max(p, pd);
      else p = Math.min(p, pu);
      lastY = y;
      if (!raf) raf = requestAnimationFrame(render);
    }
    function render() {
      raf = 0; if (!A) return;
      var e = p * p * (3 - 2 * p), mid = Math.sin(Math.PI * e);
      var x = A.x + (B.x - A.x) * e, y = A.y + (B.y - A.y) * e, sc = 1 + (B.w / A.w - 1) * e;
      var tx = x - A.w * (1 - sc) / 2, ty = y - A.w * (1 - sc) / 2;
      fly.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + sc.toFixed(4) + ')';
      var moving = e > 0.002 && e < 0.998;
      inner.classList.toggle('is-flipping', moving);
      if (!moving) return;
      var flip = e * 360, bend = 60 * mid;
      for (var k = 0; k < N; k++) {
        var twist = bend * Math.sin(Math.PI * (k + 0.5) / N);   // the middle strips lead the turn
        strips[k].style.transform = 'rotateY(' + (flip + twist).toFixed(2) + 'deg)';
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure); window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
    measure();
  })();


  /* ---------------------------------------------------------- about: deck of highlight cards */
  (function () {
    var deck = $('#deck'); if (!deck) return;
    var cards = $$('.deck-card', deck), order = cards.map(function (c, i) { return i; }), busy = false;
    function render() {
      order.forEach(function (ci, k) {
        var c = cards[ci];
        c.style.setProperty('--k', k); c.style.zIndex = String(10 - k);
        c.classList.toggle('is-front', k === 0);
        $('.deck-btn', c).setAttribute('aria-current', k === 0 ? 'true' : 'false');
      });
    }
    cards.forEach(function (c, ci) {
      $('.deck-btn', c).addEventListener('click', function () {
        if (busy) return;
        if (order[0] === ci) {
          // the front card slides out, then tucks in at the back
          busy = true; c.classList.add('is-out');
          setTimeout(function () { c.classList.remove('is-out'); order.push(order.shift()); render(); busy = false; }, reduce ? 0 : 260);
          return;
        }
        order.splice(order.indexOf(ci), 1); order.unshift(ci); render();
        var f = cards[order[0]]; f.classList.add('is-lift'); setTimeout(function () { f.classList.remove('is-lift'); }, 320);
      });
    });
    render();
  })();

  /* ---------------------------------------------------------- hero photo follows the mouse */
  (function () {
    var pic = $('#pic-fly'), inner = $('#hero-pic-in'); if (!pic || !inner || reduce) return;
    var img = $('img', inner), fine = window.matchMedia('(hover:hover) and (pointer:fine)'), raf = 0, nx = 0, ny = 0;
    function apply() { raf = 0;
      inner.style.transform = 'rotateX(' + (-ny * 9).toFixed(2) + 'deg) rotateY(' + (nx * 11).toFixed(2) + 'deg) translate3d(' + (nx * 8).toFixed(1) + 'px,' + (ny * 8).toFixed(1) + 'px,0)';
      img.style.transform = 'scale(1.06) translate3d(' + (-nx * 10).toFixed(1) + 'px,' + (-ny * 10).toFixed(1) + 'px,0)';
    }
    pic.addEventListener('pointermove', function (e) {
      if (!fine.matches || e.pointerType !== 'mouse') return;
      var b = pic.getBoundingClientRect(); nx = (e.clientX - b.left) / b.width - 0.5; ny = (e.clientY - b.top) / b.height - 0.5;
      pic.classList.add('is-track'); if (!raf) raf = requestAnimationFrame(apply);
    });
    pic.addEventListener('pointerleave', function () { pic.classList.remove('is-track'); inner.style.transform = ''; img.style.transform = ''; });
  })();

  /* ---------------------------------------------------------- dashboard cards + modal */
  (function () {
    var cards = $$('[data-db]'); if (!cards.length) return;
    var DATA = {
      1: { title: 'Version 1: the Google Sheets report', lead: 'The first tracker, built from sheet tabs. It reports bookings, estimated and total sales by agent and lead provider.',
           list: ['Sales, estimated amounts and booked jobs per agent', 'Booking percentage by lead provider', 'Disputed leads and leads per agent'],
           url: 'https://docs.google.com/spreadsheets/d/1rQGVoy_NkKneiRyXL_A6paM5D2G_n2igstMhXViU5Ic/edit?usp=sharing',
           alt: ['Version 1, September: a gray and orange Google Sheets report with sales by agent, lead provider booking percentage, job status, dispute tracker and leads per agent.', 'Version 1, October: the same gray and orange report for October.'] },
      2: { title: 'Version 2: Sales Command Center', lead: 'A rebuilt, single-screen version with headline numbers, trends and a goal bar, so one look answers how the month is going.',
           list: ['Booked jobs, total and estimated sales, booking, cancel and dispute rates', 'Agent scoreboard, lead funnel and booking rate by provider', 'A dispute tracker that lists the leads to refund'],
           url: 'https://docs.google.com/spreadsheets/d/1T2lKg_xSsoC24v6E4LFxGpW1XTW8qBrTUuf3GxOStNM/edit?usp=sharing',
           alt: ['Version 2, September: the dark Sales Command Center with headline numbers, sales over time, agent scoreboard, lead funnel and dispute tracker.', 'Version 2, October: the Sales Command Center for October.'] }
    };
    var HOLD_MS = 3000;
    // a two-slide wipe player that never overlaps transitions
    function player(slides, opts) {
      var idx = 0, busy = false, queued = null, timer = 0, paused = false;
      function finish(to) {
        busy = false;
        slides.forEach(function (s, i) { s.classList.remove('is-in-fwd'); s.classList.toggle('is-on', i === to); });
        if (queued !== null && queued !== idx) { var q = queued; queued = null; go(q); return; }
        queued = null; schedule();
      }
      function go(to) {
        to = mod(to, slides.length);
        if (busy) { queued = to; return; }
        if (to === idx) { schedule(); return; }
        busy = true; idx = to; if (opts.onChange) opts.onChange(idx);
        var s = slides[to], fired = false;
        var done = function () { if (fired) return; fired = true; finish(to); };
        s.classList.add('is-in-fwd');
        s.addEventListener('animationend', done, { once: true }); setTimeout(done, 1000);
      }
      function schedule() {
        clearTimeout(timer);
        if (reduce || busy || paused || !opts.canPlay()) return;
        timer = setTimeout(function () { go(idx + 1); }, HOLD_MS);
      }
      function reset(i) { clearTimeout(timer); busy = false; queued = null; idx = i; slides.forEach(function (s, k) { s.classList.remove('is-in-fwd'); s.classList.toggle('is-on', k === i); }); if (opts.onChange) opts.onChange(i); }
      return { go: go, schedule: schedule, reset: reset, setPaused: function (p) { paused = p; schedule(); }, get idx() { return idx; } };
    }

    // cards in the grid
    var modalOpen = false;
    cards.forEach(function (card) {
      var inView = false, hov = false;
      var p = player($$('.dash-slide', card), { canPlay: function () { return inView && !hov && !modalOpen && !document.hidden; } });
      card.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hov = true; p.schedule(); } });
      card.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hov = false; p.schedule(); } });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; p.schedule(); }, { threshold: 0.3 }).observe(card);
      document.addEventListener('visibilitychange', p.schedule);
      card._player = p;
      $('.db-open', card).addEventListener('click', function () { openModal(Number(card.getAttribute('data-db')), card); });
    });

    // modal
    var modal = $('#db-modal'), mA = $('#db-m-a'), mB = $('#db-m-b'), frameEl = $('#db-m-frame');
    var months = $$('.db-m-ctrl [data-m]'), cur = 1, opener = null;
    var mp = player([mA, mB], {
      canPlay: function () { return modalOpen && !lbOpen; },
      onChange: function (i) { months.forEach(function (m, k) { m.setAttribute('aria-pressed', k === i ? 'true' : 'false'); }); }
    });
    function openModal(v, card) {
      cur = v; opener = card; var d = DATA[v];
      $('#db-m-title').textContent = d.title; $('#db-m-lead').textContent = d.lead;
      var ul = $('#db-m-list'); ul.innerHTML = ''; d.list.forEach(function (x) { var li = document.createElement('li'); li.textContent = x; ul.appendChild(li); });
      $('#db-m-link').href = d.url;
      mA.src = 'assets/img/dash-v' + v + '-sep.webp'; mA.alt = d.alt[0];
      mB.src = 'assets/img/dash-v' + v + '-oct.webp'; mB.alt = d.alt[1];
      frameEl.style.setProperty('--ar', v === 1 ? (1533 / 1141).toFixed(4) : (1209 / 1514).toFixed(4));
      modalOpen = true;
      mp.reset(0); mp.setPaused(false);
      if (modal.showModal) modal.showModal(); else modal.setAttribute('open', '');
    }
    months.forEach(function (m, k) { m.addEventListener('click', function () { mp.go(k); }); });
    $('#db-close').addEventListener('click', function () { modal.close(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.close(); });
    modal.addEventListener('close', function () { modalOpen = false; mp.setPaused(true); cards.forEach(function (c) { c._player.schedule(); }); });

    /* lightbox, opened from the modal image */
    var lb = $('#lightbox'), lbView = $('#lb-view'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
    var lbOpen = false, lbIdx = 0, zoomed = false, dragX = 0, dragY = 0, dragging = false;
    function lbSlides() { return [mA, mB]; }
    function showLb(i) {
      lbIdx = mod(i, 2); var s = lbSlides()[lbIdx];
      setZoom(false);
      lbImg.src = s.currentSrc || s.src; lbImg.alt = s.alt; lbCap.textContent = 'Version ' + cur + ', ' + (lbIdx === 0 ? 'September' : 'October') + ' (sample data)';
    }
    function setZoom(z) {
      if (z) { var r = lbView.getBoundingClientRect(); lbView.style.width = r.width + 'px'; lbView.style.height = r.height + 'px'; }
      zoomed = z; lbView.classList.toggle('is-zoom', z);
      if (z) { lbImg.style.width = lbImg.naturalWidth + 'px'; lbImg.style.height = lbImg.naturalHeight + 'px'; position(0.5, 0.5); }
      else { lbView.style.width = ''; lbView.style.height = ''; lbImg.style.width = ''; lbImg.style.height = ''; lbImg.style.left = ''; lbImg.style.top = ''; }
    }
    function position(fx, fy) {
      var vw = lbView.clientWidth, vh = lbView.clientHeight, iw = lbImg.naturalWidth, ih = lbImg.naturalHeight;
      lbImg.style.left = (iw > vw ? -(iw - vw) * fx : (vw - iw) / 2) + 'px';
      lbImg.style.top = (ih > vh ? -(ih - vh) * fy : (vh - ih) / 2) + 'px';
    }
    $('#db-m-zoom').addEventListener('click', function () { lbOpen = true; mp.schedule(); showLb(mp.idx); if (lb.showModal) lb.showModal(); else lb.setAttribute('open', ''); });
    lb.addEventListener('close', function () { lbOpen = false; setZoom(false); mp.schedule(); });
    // a click anywhere outside the picture and the buttons closes it
    lb.addEventListener('click', function (e) { if (!e.target.closest('.lb-view, .lb-arrow, .lb-x')) lb.close(); });
    lbView.addEventListener('click', function (e) { if (dragging) return; var r = lbView.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height; setZoom(!zoomed); if (zoomed) position(fx, fy); });
    lbView.addEventListener('pointermove', function (e) {
      if (!zoomed) return;
      var r = lbView.getBoundingClientRect();
      if (e.pointerType === 'mouse') { position((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }
      else if (e.buttons || e.pressure > 0) {
        var l = parseFloat(lbImg.style.left) || 0, t = parseFloat(lbImg.style.top) || 0;
        var vw = lbView.clientWidth, vh = lbView.clientHeight, iw = lbImg.naturalWidth, ih = lbImg.naturalHeight;
        if (dragX || dragY) {
          var nl = l + (e.clientX - dragX), nt = t + (e.clientY - dragY);
          if (iw > vw) nl = Math.min(0, Math.max(vw - iw, nl)); if (ih > vh) nt = Math.min(0, Math.max(vh - ih, nt));
          lbImg.style.left = nl + 'px'; lbImg.style.top = nt + 'px'; dragging = true;
        }
        dragX = e.clientX; dragY = e.clientY;
      }
    });
    lbView.addEventListener('pointerup', function () { dragX = dragY = 0; setTimeout(function () { dragging = false; }, 30); });
    $('#lb-close').addEventListener('click', function () { lb.close(); });
    $('#lb-prev').addEventListener('click', function () { showLb(lbIdx - 1); });
    $('#lb-next').addEventListener('click', function () { showLb(lbIdx + 1); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') showLb(lbIdx + 1); else if (e.key === 'ArrowLeft') showLb(lbIdx - 1); });
  })();
})();
