/* Unit tests for js/scroll-house-math.js. Run: node tests/scroll-house-math.test.js */
const assert = require('assert'); const M = require('../js/scroll-house-math.js');
assert.strictEqual(M.ease(0), 0); assert.strictEqual(M.ease(1), 1);
assert.ok(Math.abs(M.ease(0.2) - 0.388) < 0.005);
assert.strictEqual(M.ease(-0.5), 0); assert.strictEqual(M.ease(2), 1);
for (let s = 0; s < 1; s += 0.01) assert.ok(M.ease(s + 0.01) >= M.ease(s));
let st = {x: 0, v: 0}, peak = 0, n = 0;
while (!M.isAtRest(st, 1) && n < 2000) { st = M.springStep(st, 1, 1/60); peak = Math.max(peak, st.x); n++; }
assert.ok(n < 240); assert.ok(peak > 1.005 && peak < 1.08);
assert.deepStrictEqual(M.springStep({x: 0, v: 0}, 1, 5), M.springStep({x: 0, v: 0}, 1, 1/30));
const W = [0.8, 0.9, 1.2, 1, 1, 1.2, 1.6];                 // sum 7.7
assert.deepStrictEqual(M.distribute(0, W), [0, 0, 0, 0, 0, 0, 0]);
assert.deepStrictEqual(M.distribute(1, W), [1, 1, 1, 1, 1, 1, 1]);
assert.deepStrictEqual(M.distribute(1.3, W), [1, 1, 1, 1, 1, 1, 1]);
assert.deepStrictEqual(M.distribute(-0.1, W), [0, 0, 0, 0, 0, 0, 0]);
const half = M.distribute(1.25 / 7.7, W); assert.strictEqual(half[0], 1); assert.ok(Math.abs(half[1] - 0.5) < 1e-9); assert.strictEqual(half[2], 0);
assert.ok(M.distribute(M.ease(0.2), W).slice(0, 3).every(f => f === 1));   // stages 1–3 done by ~20% scroll
assert.ok(M.distribute(M.ease(0.2), W)[3] < 0.5);                           // ...but plumbing is not yet half done
assert.strictEqual(M.stageIndex([1, 0.5, 0]), 1); assert.strictEqual(M.stageIndex([1, 1]), 1);
assert.strictEqual(M.scrollProgress(-40, 0, 1000), 0); assert.strictEqual(M.scrollProgress(1200, 0, 1000), 1);
assert.strictEqual(M.scrollProgress(500, 800, 800), 0); assert.strictEqual(M.scrollProgress(NaN, 0, 1000), 0);
assert.strictEqual(M.scrollProgress(996, 0, 1000), 1); assert.strictEqual(M.scrollProgress(994, 0, 1000), 0.994);
const P = M.pausedProgress;
assert.strictEqual(P(500, 0, 1000, 0, 0), 0.5);                 // no window → scrollProgress
assert.strictEqual(P(500, 0, 1000, 600, 400), 0.5);             // inverted window → ignored
assert.strictEqual(P(200, 0, 1000, 400, 600), 0.25);            // before the hold: 200 / 800
assert.strictEqual(P(400, 0, 1000, 400, 600), 0.5);             // hold start
assert.strictEqual(P(500, 0, 1000, 400, 600), 0.5);             // inside: frozen
assert.strictEqual(P(600, 0, 1000, 400, 600), 0.5);             // hold end
assert.strictEqual(P(800, 0, 1000, 400, 600), 0.75);            // after: 600 / 800
assert.strictEqual(P(1000, 0, 1000, 400, 600), 1);
assert.strictEqual(P(-50, 0, 1000, 400, 600), 0); assert.strictEqual(P(1500, 0, 1000, 400, 600), 1);
assert.strictEqual(P(997, 0, 1000, 400, 600), 1);               // 797 / 800 = 0.996 → snap
assert.strictEqual(P(NaN, 0, 1000, 400, 600), 0); assert.strictEqual(P(500, 0, 1000, NaN, 600), 0.5);
assert.strictEqual(P(500, 800, 800, 400, 600), 0);
assert.strictEqual(P(900, 0, 1000, 800, 1200), 1);              // window past the end is clipped: 800 / 800
console.log('ok');
