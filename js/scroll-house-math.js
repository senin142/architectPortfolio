/* Scroll house — pure math core. No DOM. Browser global (window.ScrollHouseMath)
   and Node module (module.exports) so the same file is unit-tested in Node. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ScrollHouseMath = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var EASE_EXP = 2.2;
  var OMEGA = 11;        // spring angular frequency
  var ZETA = 0.72;       // damping ratio (slight overshoot)
  var MAX_DT = 1 / 30;   // clamp: a long frame never explodes the spring
  var REST_X = 0.0005;
  var REST_V = 0.001;
  var SNAP = 0.995;      // scroll progress snaps to 1 from here (E12)

  function clamp01(n) {
    if (!(n > 0)) return 0;   // NaN and negatives → 0
    return n > 1 ? 1 : n;
  }

  /* Front-loaded pacing: 1 - (1 - s)^2.2 (D2). */
  function ease(s) {
    return 1 - Math.pow(1 - clamp01(s), EASE_EXP);
  }

  /* Semi-implicit Euler damped spring toward `target`. */
  function springStep(state, target, dt) {
    if (!(dt > 0)) dt = 0;
    if (dt > MAX_DT) dt = MAX_DT;
    var x = state.x, v = state.v;
    var a = -2 * ZETA * OMEGA * v - OMEGA * OMEGA * (x - target);
    v += a * dt;
    x += v * dt;
    return { x: x, v: v };
  }

  function isAtRest(state, target) {
    return Math.abs(state.x - target) < REST_X && Math.abs(state.v) < REST_V;
  }

  /* Split a 0..1 progress into per-stage fractions, filled in order by weight. */
  function distribute(t, weights) {
    t = clamp01(t);
    var total = weights.reduce(function (s, w) { return s + w; }, 0);
    var budget = t * total;
    var out = [];
    for (var i = 0; i < weights.length; i++) {
      var w = weights[i];
      var f;
      if (budget >= w) f = 1;
      else if (budget <= 0) f = 0;
      else f = budget / w;
      out.push(f);
      budget -= w;
    }
    return out;
  }

  /* The stage currently drawing: first fraction < 1, else the last stage. */
  function stageIndex(fractions) {
    for (var i = 0; i < fractions.length; i++) {
      if (fractions[i] < 1) return i;
    }
    return fractions.length - 1;
  }

  function snap(p) {
    p = clamp01(p);
    return p >= SNAP ? 1 : p;
  }

  /* Clamped progress of y across [start, end]; 0 for a bad range or NaN. */
  function scrollProgress(y, start, end) {
    var range = end - start;
    if (!(range > 0) || y !== y) return 0;
    return snap((y - start) / range);
  }

  /* Like scrollProgress, but scroll inside [pauseStart, pauseEnd] contributes
     nothing: the window is removed from both numerator and denominator (C1). */
  function pausedProgress(y, start, end, pauseStart, pauseEnd) {
    var range = end - start;
    if (!(range > 0) || y !== y) return 0;
    if (!(pauseEnd > pauseStart)) return scrollProgress(y, start, end);
    // Clip the window to the scroll range.
    var ws = Math.max(pauseStart, start);
    var we = Math.min(pauseEnd, end);
    if (!(we > ws)) return scrollProgress(y, start, end);
    var denom = range - (we - ws);
    if (!(denom > 0)) return 0;
    // Overlap of [start, y] with the window.
    var overlap = Math.min(Math.max(y, ws), we) - ws;
    if (overlap < 0) overlap = 0;
    return snap((y - start - overlap) / denom);
  }

  return {
    ease: ease,
    springStep: springStep,
    isAtRest: isAtRest,
    distribute: distribute,
    stageIndex: stageIndex,
    scrollProgress: scrollProgress,
    pausedProgress: pausedProgress
  };
});
