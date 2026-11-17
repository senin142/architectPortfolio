/* Scroll house — a pen builds an Indian home behind the page as you scroll.
   Artwork: images/scroll-house.svg (see CONTENT-GUIDE.md §8 for its contract). */
(function () {
  var root = document.documentElement;
  var M = window.ScrollHouseMath;
  if (!M || !root.classList.contains('js') || !window.fetch) return;

  // CONTENT: stage names + captions (order must match the artwork's 7 stages)
  var STAGES = [
    ['Layout', 'Marking the plot'],
    ['Frame', 'Raising the RCC frame'],
    ['Brickwork', 'Laying the walls, course by course'],
    ['Plumbing', 'Water lines, before the plaster'],
    ['Electrical', 'Wiring every room'],
    ['Plaster & Paint', 'Plaster, then colour'],
    ['Home', 'Home.']
  ];
  var WEIGHTS = [0.8, 0.9, 1.2, 1, 1, 1.2, 1.6];
  var GLOW_FROM = M.ease(0.85);            // lights-on over the last 15% of scroll
  var SHAKE_MS = 320, SHAKE_PX = 1.4, SHAKE_DEG = 0.12;
  var DRIFT = [[0, 6], [-6, 0], [0, 5], [6, 0], [-5, 0], [0, -6], [0, 8]];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqSmall = window.matchMedia('(max-width: 768px)');

  var wrap, svg, pen, label, wipe, stages = [], state = {
    target: 0, x: 0, v: 0, running: false, start: 0, end: 1, pauseStart: 0, pauseEnd: 0
  };
  var complete = [], shakes = {}, lastStage = -1, rafId = 0, lastTs = 0, hiddenNow = true;
  var resolveReady;
  var api = window.ScrollHouse = {
    ready: new Promise(function (r) { resolveReady = r; }),
    state: state
  };

  /* ---------- Build ---------- */
  function build(markup) {
    wrap = document.createElement('div');
    wrap.className = 'scroll-house-wrap is-hidden';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = markup;
    svg = wrap.querySelector('svg');
    svg.classList.add('scroll-house');
    svg.setAttribute('viewBox', '0 280 600 520');     // crop the empty sky above the tank
    svg.setAttribute('focusable', 'false');

    var NS = 'http://www.w3.org/2000/svg';
    pen = document.createElementNS(NS, 'g');
    pen.setAttribute('class', 'sh-pen');
    var dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('class', 'sh-dot');
    dot.setAttribute('cx', '0'); dot.setAttribute('cy', '0'); dot.setAttribute('r', '4.5');
    pen.appendChild(dot);
    svg.appendChild(pen);

    label = document.createElement('div');
    label.className = 'scroll-stage is-hidden';
    label.setAttribute('aria-hidden', 'true');
    label.innerHTML = '<span class="scroll-stage-num"></span><span class="scroll-stage-name"></span>' +
      '<span class="scroll-stage-caption"></span><span class="chapter-line"></span>' +
      '<span class="sh-ticks">' + new Array(STAGES.length + 1).join('<i></i>') + '</span>';

    document.body.appendChild(wrap);
    document.body.appendChild(label);
    wipe = svg.querySelector('#sh-wipe rect');

    stages = Array.prototype.map.call(svg.querySelectorAll('.sh-stage'), function (g) {
      return {
        g: g, kind: g.getAttribute('data-kind'), last: -1,
        services: g.querySelector('.sh-services'),
        glows: g.querySelectorAll('.sh-glow'),
        drift: { x: 0, v: 0, target: 0 }, driftDir: null
      };
    });
  }

  /* ---------- Measure (once, plus on crossing the 768px breakpoint) ---------- */
  function measure() {
    var small = mqSmall.matches;
    stages.forEach(function (st, i) {
      var box = st.g.getBBox();
      st.cx = box.x + box.width / 2; st.cy = box.y + box.height / 2;
      st.driftDir = DRIFT[i] || [0, 0];
      st.last = -1;

      if (st.kind === 'brick') {
        st.bricks = Array.prototype.map.call(st.g.querySelectorAll('.sh-brick'), function (b) {
          var bb = b.getBBox();
          return { el: b, x: bb.x + bb.width, y: bb.y + bb.height / 2, on: true };
        });
        st.courses = Array.prototype.map.call(st.g.querySelectorAll('.sh-course'), function (c) {
          var bb = c.getBBox();
          return { el: c, top: bb.y, bottom: bb.y + bb.height, o: 1 };
        });
      } else if (st.kind === 'paint') {
        st.top = box.y; st.bottom = box.y + box.height;
      } else {
        st.paths = [];
        st.total = 0;
        Array.prototype.forEach.call(st.g.querySelectorAll('.sh-path'), function (p) {
          if (small && p.classList.contains('sh-detail')) return;
          var L = p.getTotalLength();
          p.setAttribute('stroke-dasharray', L + ' ' + (L + 2));
          p.setAttribute('stroke-dashoffset', L + 1);
          st.paths.push({ el: p, L: L, start: st.total });
          st.total += L;
        });
      }
    });
    measureScroll();
  }

  function pageTop(el) { return el.getBoundingClientRect().top + window.scrollY; }

  function measureScroll() {
    var hero = document.querySelector('.hero');
    var grid = document.querySelector('.project-grid');
    var vh = window.innerHeight;
    state.start = hero ? hero.offsetTop + hero.offsetHeight - vh * 0.5 : 0;
    state.end = document.documentElement.scrollHeight - vh;
    if (grid) {
      var top = pageTop(grid);
      state.pauseStart = top - 0.35 * vh;
      state.pauseEnd = top + grid.offsetHeight - 0.65 * vh;
    } else {
      state.pauseStart = state.pauseEnd = 0;
    }
  }

  /* ---------- Render ---------- */
  function renderLine(st, f) {
    var drawn = f * st.total, tip = null;
    st.paths.forEach(function (p) {
      var fp = Math.max(0, Math.min(1, (drawn - p.start) / p.L));
      p.el.setAttribute('stroke-dashoffset', (p.L + 1) * (1 - fp));
      if (fp > 0 && fp < 1) tip = p.el.getPointAtLength(p.L * fp);
    });
    if (!tip && st.paths.length) {
      var p = f >= 1 ? st.paths[st.paths.length - 1] : st.paths[0];
      tip = p.el.getPointAtLength(f >= 1 ? p.L : 0);
    }
    st.tip = tip;
  }

  function renderBrick(st, f) {
    var n = Math.round(f * st.bricks.length);
    st.bricks.forEach(function (b, i) {
      var on = i < n;
      if (on !== b.on) { b.el.style.visibility = on ? '' : 'hidden'; b.on = on; }
    });
    var last = st.bricks[Math.max(0, n - 1)];
    st.tip = last ? { x: last.x, y: last.y } : null;
  }

  function renderPaint(st, f) {
    var edge = st.bottom - (st.bottom - st.top) * f;
    wipe.setAttribute('y', edge);
    wipe.setAttribute('height', st.bottom - edge + 1);
    stages.forEach(function (s) {
      if (s.services) s.services.style.opacity = 1 - 0.82 * f;
      if (s.kind !== 'brick') return;
      s.courses.forEach(function (c) {
        var k = Math.max(0, Math.min(1, (c.bottom - edge) / (c.bottom - c.top)));
        var o = Math.round((1 - 0.75 * k) * 100) / 100;
        if (o !== c.o) { c.el.style.opacity = o; c.o = o; }
      });
    });
    st.tip = { x: 300, y: edge, roller: f > 0 && f < 1 };
  }

  function render(t) {
    var fr = M.distribute(t, WEIGHTS);
    var active = M.stageIndex(fr);
    stages.forEach(function (st, i) {
      var f = fr[i];
      if (Math.abs(f - st.last) <= 0.0005 && st.tip) return;
      st.last = f;
      if (st.kind === 'brick') renderBrick(st, f);
      else if (st.kind === 'paint') renderPaint(st, f);
      else renderLine(st, f);
    });
    var glow = Math.max(0, Math.min(1, (t - GLOW_FROM) / (1 - GLOW_FROM)));
    stages.forEach(function (st) {
      for (var j = 0; j < st.glows.length; j++) st.glows[j].style.opacity = glow;
    });

    if (active !== lastStage) {
      stages.forEach(function (st, i) { st.g.classList.toggle('is-active', i === active && fr[i] < 1); });
      setLabel(active);
      lastStage = active;
    }
    stages[active].g.classList.toggle('is-active', fr[active] < 1);
    if (stages[0]) stages[0].g.classList.toggle('is-lead-done', fr[0] >= 1);

    var tip = stages[active].tip || { x: 300, y: 740 };
    var s = 1 + Math.min(Math.abs(state.v) * 0.6, 0.5);
    pen.setAttribute('transform', 'translate(' + tip.x.toFixed(1) + ' ' + tip.y.toFixed(1) + ') ' +
      (tip.roller ? 'scale(8 0.5)' : 'scale(' + s.toFixed(3) + ')'));
    return fr;
  }
  api.render = function (t) { return render(t); };
  api.measure = function () { measure(); };
  api.measureScroll = function () { measureScroll(); };

  /* ---------- Label ---------- */
  var labelTimer;
  function setLabel(i) {
    var write = function () {
      label.querySelector('.scroll-stage-num').textContent = '0' + (i + 1) + ' / 0' + STAGES.length;
      label.querySelector('.scroll-stage-name').textContent = '— ' + STAGES[i][0];
      label.querySelector('.scroll-stage-caption').textContent = STAGES[i][1];
      Array.prototype.forEach.call(label.querySelectorAll('.sh-ticks i'), function (tick, k) {
        tick.classList.toggle('is-on', k <= i);
      });
    };
    if (lastStage < 0 || reduceMotion) { write(); return; }
    clearTimeout(labelTimer);
    label.classList.add('is-swapping');
    labelTimer = setTimeout(function () { write(); label.classList.remove('is-swapping'); }, 150);
  }

  /* ---------- Kinetics: settle-shake + deconstruct drift ---------- */
  function updateCompletion(fr, seed) {
    fr.forEach(function (f, i) {
      var was = complete[i];
      var now = was ? f >= 0.96 : f >= 1;
      complete[i] = now;
      if (seed || was === now) return;
      var st = stages[i];
      if (now) {
        st.drift.target = 0;
        if (!shakes[i] && Object.keys(shakes).length < 2) {
          shakes[i] = performance.now();
          st.g.classList.add('is-settling');
        }
        if (st.kind === 'brick') {
          wrap.classList.add('is-thud');
          setTimeout(function () { wrap.classList.remove('is-thud'); }, 180);
        }
      } else {
        st.drift.target = 1;
        st.g.classList.add('is-coming-apart');
      }
    });
  }

  function composeTransform(st, i, now) {
    var d = st.drift.x, parts = [];
    if (Math.abs(d) > 0.001) parts.push('translate(' + (st.driftDir[0] * d).toFixed(2) + ' ' + (st.driftDir[1] * d).toFixed(2) + ')');
    if (shakes[i] !== undefined) {
      var p = (now - shakes[i]) / SHAKE_MS;
      if (p >= 1) {
        delete shakes[i];
        st.g.classList.remove('is-settling');
      } else {
        var a = Math.sin(p * Math.PI * 5) * (1 - p) * (1 - p);
        parts.push('translate(' + (SHAKE_PX * a).toFixed(2) + ' ' + (-SHAKE_PX * 0.5 * a).toFixed(2) + ')');
        parts.push('rotate(' + (SHAKE_DEG * a).toFixed(3) + ' ' + st.cx.toFixed(1) + ' ' + st.cy.toFixed(1) + ')');
      }
    }
    if (parts.length) st.g.setAttribute('transform', parts.join(' '));
    else st.g.removeAttribute('transform');
  }

  function stepKinetics(dt, now) {
    var busy = false;
    stages.forEach(function (st, i) {
      var dr = st.drift;
      if (!M.isAtRest(dr, dr.target)) {
        var n = M.springStep(dr, dr.target, dt);
        dr.x = n.x; dr.v = n.v; busy = true;
      } else if (dr.x !== dr.target) {
        dr.x = dr.target; dr.v = 0;
        if (dr.target === 0) st.g.classList.remove('is-coming-apart');
      }
      if (shakes[i] !== undefined) busy = true;
      composeTransform(st, i, now);
    });
    return busy;
  }

  /* ---------- Loop ---------- */
  function frame(ts) {
    var dt = lastTs ? (ts - lastTs) / 1000 : 1 / 60;
    lastTs = ts;
    var n = M.springStep(state, state.target, dt);
    state.x = n.x; state.v = n.v;
    var settled = M.isAtRest(state, state.target);
    if (settled) { state.x = state.target; state.v = 0; }
    updateCompletion(render(state.x), false);
    var busy = stepKinetics(dt, performance.now());
    if (settled && !busy) {
      state.running = false; lastTs = 0;
      pen.classList.add('is-resting');
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  function wake() {
    if (state.running || hiddenNow) return;
    state.running = true;
    pen.classList.remove('is-resting');
    rafId = requestAnimationFrame(frame);
  }

  function computeTarget() {
    return M.ease(M.pausedProgress(window.scrollY, state.start, state.end, state.pauseStart, state.pauseEnd));
  }

  function onScroll() {
    updateVisibility();
    if (reduceMotion) return;
    var t = computeTarget();
    if (t !== state.target) { state.target = t; wake(); }
  }

  /* ---------- Visibility + tone ---------- */
  function updateVisibility() {
    var b = document.body.classList;
    var hide = window.scrollY < state.start || b.contains('modal-open') || b.contains('nav-open');
    if (hide === hiddenNow) return;
    hiddenNow = hide;
    wrap.classList.toggle('is-hidden', hide);
    label.classList.toggle('is-hidden', hide);
    if (hide) { cancelAnimationFrame(rafId); state.running = false; lastTs = 0; }
    else if (!reduceMotion && (state.x !== state.target)) wake();
  }

  var darkSections = new Set();
  function updateTone() {
    wrap.classList.toggle('tone-dark', root.getAttribute('data-theme') === 'dark' || darkSections.size > 0);
  }

  function watch() {
    window.addEventListener('scroll', onScroll, { passive: true });
    new MutationObserver(updateVisibility).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(updateTone).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) darkSections.add(e.target); else darkSections.delete(e.target);
        });
        updateTone();
      }, { rootMargin: '-50% 0px -50% 0px' });
      document.querySelectorAll('[data-tone="dark"]').forEach(function (el) { io.observe(el); });
    }

    var timer;
    var remeasure = function () {
      clearTimeout(timer);
      timer = setTimeout(function () { measureScroll(); onScroll(); }, 150);
    };
    window.addEventListener('resize', remeasure, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.querySelector('main') || document.body);
    var onBreakpoint = function () { measure(); render(state.x); };
    if (mqSmall.addEventListener) mqSmall.addEventListener('change', onBreakpoint);
    else if (mqSmall.addListener) mqSmall.addListener(onBreakpoint);
  }

  /* ---------- Start ---------- */
  function start() {
    fetch('images/scroll-house.svg').then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (markup) {
      build(markup);
      measure();
      if (reduceMotion) {
        state.target = state.x = 1;
      } else {
        state.target = state.x = computeTarget();     // no replay from 0 on load
      }
      updateCompletion(render(state.x), true);        // seed: no shake burst on load
      pen.classList.add('is-resting');
      updateTone();
      updateVisibility();
      watch();
      resolveReady(true);
    }).catch(function () {
      console.info('[scroll-house] artwork not loaded (serve over http)');
      resolveReady(false);
    });
  }

  function idle() {
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1500 });
    else setTimeout(start, 200);
  }
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle);
})();
