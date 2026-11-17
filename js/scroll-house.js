/* Scroll house — a pen draws an Indian home's floor plan, folds it up into the
   front elevation and builds it, behind the page, as you scroll.
   Artwork: images/scroll-house-plan.svg + images/scroll-house.svg (CONTENT-GUIDE.md §8). */
(function () {
  var root = document.documentElement;
  var M = window.ScrollHouseMath;
  if (!M || !root.classList.contains('js') || !window.fetch) return;

  // CONTENT: stage names + captions (order matches data-stage in the artwork)
  var STAGES = [
    ['Site & Grid', 'Setting out the structural grid'],
    ['Floor Plan', 'Walls, doors and the open aangan'],
    ['Services', 'Plumbing and electrical, planned'],
    ['Plan to Elevation', 'Turning the plan into a facade'],
    ['Frame', 'Raising the RCC frame'],
    ['Brickwork', 'Walls, with conduits laid in'],
    ['Plaster & Paint', 'Plaster, then colour'],
    ['Home', 'Home.']
  ];
  var WEIGHTS = [0.8, 1.1, 1.0, 0.9, 0.9, 1.2, 1.1, 1.6];
  var ROTATE = 3;
  var HINGE = (740 - 280) / 540;          // front wall / ground line, as a fraction of the drawing height
  var GLOW_FROM = M.ease(0.85);
  var SHAKE_MS = 320, SHAKE_PX = 1.4, SHAKE_DEG = 0.12;
  var DRIFT = [[0, 6], [-6, 0], [6, 0], [0, 0], [0, 6], [-6, 0], [0, -6], [0, 8]];
  var FLY_PER_STAGE = 8;
  var NS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqSmall = window.matchMedia('(max-width: 768px)');

  var wrap, box, planSvg, elevSvg, flySvg, pen, label, wipe, stages = [], flies = [];
  var boxRect = { left: 0, top: 0, k: 1 };
  var state = { target: 0, x: 0, v: 0, running: false, start: 0, end: 1, pauseStart: 0, pauseEnd: 0 };
  var complete = [], shakes = {}, lastStage = -1, lastRot = -1, rafId = 0, lastTs = 0, hiddenNow = true;
  var resolveReady;
  var api = window.ScrollHouse = { ready: new Promise(function (r) { resolveReady = r; }), state: state };

  function clamp01(n) { return n > 0 ? (n < 1 ? n : 1) : 0; }
  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* ---------- Build ---------- */
  function build(planMarkup, elevMarkup) {
    wrap = document.createElement('div');
    wrap.className = 'scroll-house-wrap is-hidden';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = '<div class="scroll-house">' + planMarkup + elevMarkup + '</div>';
    box = wrap.firstChild;
    var svgs = box.querySelectorAll('svg');
    planSvg = svgs[0]; elevSvg = svgs[1];
    planSvg.setAttribute('class', 'sh-view sh-view--plan');
    elevSvg.setAttribute('class', 'sh-view sh-view--elev');
    [planSvg, elevSvg].forEach(function (s) {
      s.setAttribute('viewBox', '0 280 600 540');
      s.setAttribute('focusable', 'false');
      s.style.transformOrigin = '50% ' + (HINGE * 100) + '%';
    });

    flySvg = el('svg', { 'class': 'sh-fly', focusable: 'false' });
    pen = el('g', { 'class': 'sh-pen' });
    pen.appendChild(el('circle', { 'class': 'sh-dot', cx: 0, cy: 0, r: 4.5 }));
    wrap.appendChild(flySvg);

    label = document.createElement('div');
    label.className = 'scroll-stage is-hidden';
    label.setAttribute('aria-hidden', 'true');
    label.innerHTML = '<span class="scroll-stage-num"></span><span class="scroll-stage-name"></span>' +
      '<span class="scroll-stage-caption"></span><span class="chapter-line"></span>' +
      '<span class="sh-ticks">' + new Array(STAGES.length + 1).join('<i></i>') + '</span>';

    document.body.appendChild(wrap);
    document.body.appendChild(label);
    wipe = elevSvg.querySelector('#sh-wipe rect');

    stages = STAGES.map(function (_, i) {
      var groups = Array.prototype.map.call(
        box.querySelectorAll('.sh-stage[data-stage="' + i + '"]'),
        function (g) {
          var kind = g.getAttribute('data-kind');
          return { g: g, kind: kind, w: kind === 'brick' ? 2 : 1,
            services: g.querySelector('.sh-services'), glows: g.querySelectorAll('.sh-glow') };
        });
      return { groups: groups, last: -1, tip: null, drift: { x: 0, v: 0, target: 0 }, driftDir: DRIFT[i] || [0, 0] };
    });

    for (var i = 0; i < STAGES.length; i++) {
      if (i === ROTATE) continue;
      for (var j = 0; j < FLY_PER_STAGE; j++) {
        var line = el('line', { 'class': 'sh-fly-line' });
        flySvg.appendChild(line);
        flies.push({ stage: i, j: j, el: line, on: true });
      }
    }
    flySvg.appendChild(pen);
  }

  /* ---------- Measure (once, plus on resize / crossing 768px) ---------- */
  function toScreen(p) {
    return { x: boxRect.left + p.x * boxRect.k, y: boxRect.top + (p.y - 280) * boxRect.k };
  }

  function measureBox() {
    var r = box.getBoundingClientRect();
    boxRect = { left: r.left, top: r.top, k: r.width / 600 };
  }

  function measure() {
    var small = mqSmall.matches;
    var saved = [planSvg.style.transform, elevSvg.style.transform, planSvg.style.visibility, elevSvg.style.visibility];
    planSvg.style.transform = elevSvg.style.transform = 'none';
    planSvg.style.visibility = elevSvg.style.visibility = 'visible';

    stages.forEach(function (st) {
      st.last = -1;
      var anchors = [];
      st.groups.forEach(function (gr) {
        var box0 = gr.g.getBBox();
        gr.cx = box0.x + box0.width / 2; gr.cy = box0.y + box0.height / 2;
        if (gr.kind === 'brick') {
          gr.bricks = Array.prototype.map.call(gr.g.querySelectorAll('.sh-brick'), function (b) {
            var bb = b.getBBox();
            return { el: b, x: bb.x + bb.width, y: bb.y + bb.height / 2, on: true };
          });
          gr.courses = Array.prototype.map.call(gr.g.querySelectorAll('.sh-course'), function (c) {
            var bb = c.getBBox();
            return { el: c, top: bb.y, bottom: bb.y + bb.height, o: 1 };
          });
          gr.bricks.forEach(function (b, k) { if (k % 23 === 0) anchors.push({ x: b.x, y: b.y }); });
        } else if (gr.kind === 'paint') {
          gr.top = box0.y; gr.bottom = box0.y + box0.height;
          [[box0.x, box0.y], [box0.x + box0.width, box0.y], [box0.x, box0.y + box0.height],
           [box0.x + box0.width, box0.y + box0.height]].forEach(function (c) { anchors.push({ x: c[0], y: c[1] }); });
        } else {
          gr.paths = []; gr.total = 0;
          Array.prototype.forEach.call(gr.g.querySelectorAll('.sh-path'), function (p) {
            if (small && p.classList.contains('sh-detail')) return;
            var L = p.getTotalLength();
            if (!(L > 0)) return;
            p.setAttribute('stroke-dasharray', L + ' ' + (L + 2));
            p.setAttribute('stroke-dashoffset', L + 1);
            gr.paths.push({ el: p, L: L, start: gr.total });
            gr.total += L;
            if (!p.classList.contains('sh-thin')) anchors.push(p.getPointAtLength(0));
          });
        }
      });
      st.anchors = anchors;
    });

    measureBox();
    measureFlies();
    planSvg.style.transform = saved[0]; elevSvg.style.transform = saved[1];
    planSvg.style.visibility = saved[2]; elevSvg.style.visibility = saved[3];
    measureScroll();
  }

  /* Each fly-in line starts beyond a screen edge (spread around all sides) and ends on a joint. */
  function measureFlies() {
    var W = window.innerWidth, H = window.innerHeight;
    flySvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    flies.forEach(function (fl) {
      var st = stages[fl.stage], a = st.anchors;
      if (!a.length) { fl.D = 0; return; }
      var p = toScreen(a[Math.floor((fl.j + 0.5) * a.length / FLY_PER_STAGE) % a.length]);
      var ang = (fl.j / FLY_PER_STAGE) * Math.PI * 2 + fl.stage * 0.7;
      var dx = Math.cos(ang), dy = Math.sin(ang);
      var tx = dx > 0 ? (W + 20 - p.x) / dx : dx < 0 ? (-20 - p.x) / dx : Infinity;
      var ty = dy > 0 ? (H + 20 - p.y) / dy : dy < 0 ? (-20 - p.y) / dy : Infinity;
      var t = Math.min(tx, ty);
      var sx = p.x + dx * t, sy = p.y + dy * t;
      fl.el.setAttribute('x1', sx.toFixed(1)); fl.el.setAttribute('y1', sy.toFixed(1));
      fl.el.setAttribute('x2', p.x.toFixed(1)); fl.el.setAttribute('y2', p.y.toFixed(1));
      fl.D = Math.sqrt((p.x - sx) * (p.x - sx) + (p.y - sy) * (p.y - sy));
      fl.last = -1;
    });
  }

  function pageTop(n) { return n.getBoundingClientRect().top + window.scrollY; }

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
  function renderLine(gr, f) {
    var drawn = f * gr.total, tip = null;
    gr.paths.forEach(function (p) {
      var fp = clamp01((drawn - p.start) / p.L);
      p.el.setAttribute('stroke-dashoffset', (p.L + 1) * (1 - fp));
      if (fp > 0 && fp < 1) tip = p.el.getPointAtLength(p.L * fp);
    });
    return tip;
  }

  function renderBrick(gr, f) {
    var n = Math.round(f * gr.bricks.length);
    gr.bricks.forEach(function (b, i) {
      var on = i < n;
      if (on !== b.on) { b.el.style.visibility = on ? '' : 'hidden'; b.on = on; }
    });
    var b = gr.bricks[n - 1];
    return f > 0 && f < 1 && b ? { x: b.x, y: b.y } : null;
  }

  function renderPaint(gr, f) {
    var edge = gr.bottom - (gr.bottom - gr.top) * f;
    wipe.setAttribute('y', edge);
    wipe.setAttribute('height', gr.bottom - edge + 1);
    stages.forEach(function (s, i) {
      if (i < ROTATE) return;
      s.groups.forEach(function (o) {
        if (o.services) o.services.style.opacity = 1 - 0.82 * f;
        if (o.kind !== 'brick') return;
        o.courses.forEach(function (c) {
          var k = clamp01((c.bottom - edge) / (c.bottom - c.top));
          var op = Math.round((1 - 0.75 * k) * 100) / 100;
          if (op !== c.o) { c.el.style.opacity = op; c.o = op; }
        });
      });
    });
    return f > 0 && f < 1 ? { x: 300, y: edge, roller: true } : null;
  }

  function renderStage(st, f) {
    var total = st.groups.reduce(function (s, g) { return s + g.w; }, 0), used = 0, tip = null;
    st.groups.forEach(function (gr) {
      var gf = clamp01((f * total - used) / gr.w);
      used += gr.w;
      var t = gr.kind === 'brick' ? renderBrick(gr, gf) : gr.kind === 'paint' ? renderPaint(gr, gf) : renderLine(gr, gf);
      if (t && !tip) tip = t;
      gr.g.classList.toggle('is-noted', gf >= 0.8);
    });
    st.tip = tip;
  }

  function renderRotation(r) {
    if (r === lastRot) return;
    lastRot = r;
    var e = r * r * (3 - 2 * r);                  // smoothstep: settle in, settle out
    planSvg.style.transform = 'rotateX(' + (e * 90).toFixed(2) + 'deg)';
    elevSvg.style.transform = 'rotateX(' + ((e - 1) * 90).toFixed(2) + 'deg)';
    planSvg.style.visibility = e >= 0.999 ? 'hidden' : '';
    elevSvg.style.visibility = e <= 0.001 ? 'hidden' : '';
  }

  function renderFlies(fr) {
    flies.forEach(function (fl) {
      var f = fr[fl.stage];
      var p = clamp01((f * 1.3 - fl.j * 0.035) / 0.8);
      if (p === fl.last) return;
      fl.last = p;
      var head = fl.D * clamp01(p / 0.7), tail = fl.D * clamp01((p - 0.3) / 0.7);
      var on = head - tail > 0.5;
      if (on !== fl.on) { fl.el.style.visibility = on ? '' : 'hidden'; fl.on = on; }
      if (on) {
        fl.el.setAttribute('stroke-dasharray', (head - tail).toFixed(1) + ' ' + (fl.D + 10).toFixed(0));
        fl.el.setAttribute('stroke-dashoffset', (-tail).toFixed(1));
      }
    });
  }

  function render(t) {
    var fr = M.distribute(t, WEIGHTS);
    var active = M.stageIndex(fr);
    stages.forEach(function (st, i) {
      var f = fr[i];
      if (Math.abs(f - st.last) <= 0.0005 && st.last >= 0) return;
      st.last = f;
      renderStage(st, f);
    });
    renderRotation(fr[ROTATE]);
    renderFlies(fr);

    var glow = clamp01((t - GLOW_FROM) / (1 - GLOW_FROM));
    stages[7].groups.forEach(function (gr) {
      for (var j = 0; j < gr.glows.length; j++) gr.glows[j].style.opacity = glow;
    });

    if (active !== lastStage) { setLabel(active); lastStage = active; }
    stages.forEach(function (st, i) {
      var on = i === active && fr[i] < 1;
      st.groups.forEach(function (gr) { gr.g.classList.toggle('is-active', on); });
    });

    var tip = stages[active].tip;
    var pt = tip ? toScreen(tip) : toScreen({ x: 300, y: 740 });
    var s = 1 + Math.min(Math.abs(state.v) * 0.6, 0.5);
    pen.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ') ' +
      (tip && tip.roller ? 'scale(' + (8 * boxRect.k).toFixed(2) + ' 0.5)' : 'scale(' + s.toFixed(3) + ')'));
    return fr;
  }
  api.render = function (t) { return render(t); };
  api.measure = function () { measure(); };
  api.measureScroll = function () { measureScroll(); };

  /* ---------- Label ---------- */
  var labelTimer;
  function setLabel(i) {
    var n = STAGES.length;
    var write = function () {
      label.querySelector('.scroll-stage-num').textContent = '0' + (i + 1) + ' / 0' + n;
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
      if (seed || was === now || i === ROTATE) return;
      var st = stages[i];
      if (now) {
        st.drift.target = 0;
        if (!shakes[i] && Object.keys(shakes).length < 2) {
          shakes[i] = performance.now();
          st.groups.forEach(function (gr) { gr.g.classList.add('is-settling'); });
        }
        if (st.groups.some(function (gr) { return gr.kind === 'brick'; })) {
          wrap.classList.add('is-thud');
          setTimeout(function () { wrap.classList.remove('is-thud'); }, 180);
        }
      } else {
        st.drift.target = 1;
        st.groups.forEach(function (gr) { gr.g.classList.add('is-coming-apart'); });
      }
    });
  }

  function composeTransform(st, i, now) {
    var d = st.drift.x, a = 0;
    if (shakes[i] !== undefined) {
      var p = (now - shakes[i]) / SHAKE_MS;
      if (p >= 1) {
        delete shakes[i];
        st.groups.forEach(function (gr) { gr.g.classList.remove('is-settling'); });
      } else {
        a = Math.sin(p * Math.PI * 5) * (1 - p) * (1 - p);
      }
    }
    st.groups.forEach(function (gr) {
      var parts = [];
      if (Math.abs(d) > 0.001) parts.push('translate(' + (st.driftDir[0] * d).toFixed(2) + ' ' + (st.driftDir[1] * d).toFixed(2) + ')');
      if (a) {
        parts.push('translate(' + (SHAKE_PX * a).toFixed(2) + ' ' + (-SHAKE_PX * 0.5 * a).toFixed(2) + ')');
        parts.push('rotate(' + (SHAKE_DEG * a).toFixed(3) + ' ' + gr.cx.toFixed(1) + ' ' + gr.cy.toFixed(1) + ')');
      }
      if (parts.length) gr.g.setAttribute('transform', parts.join(' '));
      else gr.g.removeAttribute('transform');
    });
  }

  function stepKinetics(dt, now) {
    var busy = false;
    stages.forEach(function (st, i) {
      if (i === ROTATE) return;
      var dr = st.drift;
      if (!M.isAtRest(dr, dr.target)) {
        var n = M.springStep(dr, dr.target, dt);
        dr.x = n.x; dr.v = n.v; busy = true;
      } else if (dr.x !== dr.target) {
        dr.x = dr.target; dr.v = 0;
        if (dr.target === 0) st.groups.forEach(function (gr) { gr.g.classList.remove('is-coming-apart'); });
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
    else if (!reduceMotion && state.x !== state.target) wake();
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
      document.querySelectorAll('[data-tone="dark"]').forEach(function (n) { io.observe(n); });
    }

    var timer, lastW = window.innerWidth, lastH = window.innerHeight;
    var remeasure = function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        measureScroll();
        if (window.innerWidth !== lastW || window.innerHeight !== lastH) {
          lastW = window.innerWidth; lastH = window.innerHeight;
          measureBox(); measureFlies(); render(state.x);
        }
        onScroll();
      }, 150);
    };
    window.addEventListener('resize', remeasure, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.querySelector('main') || document.body);
    var onBreakpoint = function () { measure(); render(state.x); };
    if (mqSmall.addEventListener) mqSmall.addEventListener('change', onBreakpoint);
    else if (mqSmall.addListener) mqSmall.addListener(onBreakpoint);
  }

  /* ---------- Start ---------- */
  function get(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
  }

  function start() {
    Promise.all([get('images/scroll-house-plan.svg'), get('images/scroll-house.svg')]).then(function (svgs) {
      build(svgs[0], svgs[1]);
      measure();
      state.target = state.x = reduceMotion ? 1 : computeTarget();   // no replay from 0 on load
      updateCompletion(render(state.x), true);                      // seed: no shake burst on load
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
