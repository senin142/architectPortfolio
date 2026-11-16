# Scroll House Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As the user scrolls, a pen line builds a contemporary Indian house in the background through 7 construction stages (Layout → Frame → Brickwork → Plumbing → Electrical → Plaster & Paint → Home). The motion is spring-driven and kinetic, and scrolling up deconstructs it.

**Architecture:**
- Pure math lives in `js/scroll-house-math.js`, which is both browser-global and Node-testable.
- The artwork lives in `images/scroll-house.svg`, with a fixed group/class contract.
- `js/scroll-house.js` fetches and inlines the SVG, then renders each stage by its *kind* (line / brick / pipe / wire / paint / finish) from a rAF spring loop that sleeps when idle.
- CSS lives in a new section of `css/style.css`.

**Tech Stack:** Vanilla JS (ES5-style IIFEs, like the rest of `js/`), SVG, CSS. Node 14 `assert` for unit tests. Headless Chrome (CDP) for visual checks.

**Spec:** `docs/superpowers/specs/2026-11-16-scroll-house-design.md`. Read it: the stage table, the house description and the research notes drive the art.

## Global Constraints

- No libraries, no build step, no ES modules.
- Animate only `stroke-dashoffset`, `transform`, `opacity` and `clip-path`. There are no layout reads in the rAF loop; lengths are measured once and again on resize.
- The rAF loop stops at rest; scroll listeners are passive.
- The layer is `aria-hidden="true"`, `pointer-events: none`, `z-index: 50`. It is absent without JS or if the SVG fetch fails.
- Stage names (exact): `Layout`, `Frame`, `Brickwork`, `Plumbing`, `Electrical`, `Plaster & Paint`, `Home`.
- Captions (exact):
  - "Marking the plot"
  - "Raising the RCC frame"
  - "Laying the walls, course by course"
  - "Water lines, before the plaster"
  - "Wiring every room"
  - "Plaster, then colour"
  - "Home."
- Label format: `0N / 07 — Name`.
- Stage weights: `[1, 1, 1.2, 1, 1, 1.2, 1.4]`. Front-loading: `ease(0.2) ≈ 0.5`, so stages 1–3 are done by about 20% scroll.
- Opacity: lines about 0.16 and paint washes about 0.10. Mobile is 0.8× those values.
- Blend: `multiply` in light mode, `screen` under `[data-theme="dark"]`.
- Colours use only site tokens:
  - lines: `--text-primary`
  - pipes: `--accent-secondary`
  - wires: `--accent-primary` / `--accent-gold`
  - paint: lime-white `#efe9dc` and ochre `#c9a46a` (dark theme: the same at reduced opacity)
  - glow: `--accent-gold`
- New CSS uses only the `--ease-*` tokens (the site rule: no default `ease`).
- Reduced motion shows the complete static house with no loop. Hidden in the hero and while `body.modal-open`. Print: `display: none`.

## Review Focus

1. **A nav-link jump (`#contact`) or a fast fling across several stages.** The spring catches up. Settle-shakes fire at most once per forward completion and at most 2 at once, never in a storm (Task 1 `distribute` test; Task 4 jump check).
2. **Resize or phone rotation while partly drawn.** Remeasure, and there are no gaps or stale offsets (Task 3 resize check).
3. **Theme toggle mid-build.** The blend and colours switch, and the drawing state is kept (Task 3 dark check).
4. **Loaded directly at `#project-3`, or already scrolled to the bottom on load.** It starts at the correct state with no replay from 0, and it is hidden behind the modal (Task 4 checks).
5. **Out-of-range scroll** (iOS rubber-band negative `scrollY`, overscroll, a zero range). The progress is clamped and is never NaN (Task 1 tests).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `js/scroll-house-math.js` (new) | `ease`, `springStep`, `isAtRest`, `distribute`, `stageIndex`, `scrollProgress` |
| `images/scroll-house.svg` (new) | The artwork, following the group/class contract |
| `js/scroll-house.js` (new) | Fetch and inline, measure, per-kind render, spring loop, kinetics, label, visibility |
| `css/style.css` (modify: new section "Scroll house" before "Responsive") | Layer, kinds, colours, keyframes, label, dark mode, reduced motion, print |
| `index.html` (modify) | `<script>` tags after `js/lightbox.js`: math first, then house |
| `tests/scroll-house-math.test.js` (new) | Node `assert` unit tests |
| `tools/shot.py` (new) | The CDP screenshot helper from the session scratchpad (`--url --eval --dark --reduced --noscroll --height`, `awaitPromise`, `--remote-allow-origins=*`), pointed at `http://127.0.0.1:8791/` |

---

### Task 1: Math core

**Files:** create `js/scroll-house-math.js`; test `tests/scroll-house-math.test.js`

**Interfaces (produces `window.ScrollHouseMath` / `module.exports`):**
- `ease(s) -> number`: `1 - Math.pow(1 - clamp01(s), 3.1)`.
- `springStep({x, v}, target, dt) -> {x, v}`: semi-implicit Euler with ω = 11, ζ = 0.72, and `dt` clamped to ≤ 1/30.
- `isAtRest({x, v}, target) -> boolean`: true when `|x - target| < 0.0005 && |v| < 0.001`.
- `distribute(t, weights: number[]) -> number[]`: per-stage fraction 0..1, filled sequentially in proportion to the weights, with `t` clamped.
- `stageIndex(fractions) -> number`: the first index with fraction < 1, else the last index.
- `scrollProgress(y, start, end) -> number`: clamped, and 0 when `end <= start` or the input is NaN.

- [ ] **Step 1: Write the failing tests.**

```js
const assert = require('assert'); const M = require('../js/scroll-house-math.js');
assert.strictEqual(M.ease(0), 0); assert.strictEqual(M.ease(1), 1);
assert.ok(Math.abs(M.ease(0.2) - 0.5) < 0.02);
assert.strictEqual(M.ease(-0.5), 0); assert.strictEqual(M.ease(2), 1);
for (let s = 0; s < 1; s += 0.01) assert.ok(M.ease(s + 0.01) >= M.ease(s));
let st = {x: 0, v: 0}, peak = 0, n = 0;
while (!M.isAtRest(st, 1) && n < 2000) { st = M.springStep(st, 1, 1/60); peak = Math.max(peak, st.x); n++; }
assert.ok(n < 240); assert.ok(peak > 1.005 && peak < 1.08);
assert.deepStrictEqual(M.springStep({x: 0, v: 0}, 1, 5), M.springStep({x: 0, v: 0}, 1, 1/30));
const W = [1, 1, 1.2, 1, 1, 1.2, 1.4];                     // sum 7.8
assert.deepStrictEqual(M.distribute(0, W), [0, 0, 0, 0, 0, 0, 0]);
assert.deepStrictEqual(M.distribute(1, W), [1, 1, 1, 1, 1, 1, 1]);
assert.deepStrictEqual(M.distribute(1.3, W), [1, 1, 1, 1, 1, 1, 1]);
assert.deepStrictEqual(M.distribute(-0.1, W), [0, 0, 0, 0, 0, 0, 0]);
const half = M.distribute(1.5 / 7.8, W); assert.strictEqual(half[0], 1); assert.ok(Math.abs(half[1] - 0.5) < 1e-9); assert.strictEqual(half[2], 0);
assert.ok(M.distribute(M.ease(0.2), W).slice(0, 3).every(f => f === 1));   // stages 1–3 done by ~20% scroll
assert.strictEqual(M.stageIndex([1, 0.5, 0]), 1); assert.strictEqual(M.stageIndex([1, 1]), 1);
assert.strictEqual(M.scrollProgress(-40, 0, 1000), 0); assert.strictEqual(M.scrollProgress(1200, 0, 1000), 1);
assert.strictEqual(M.scrollProgress(500, 800, 800), 0); assert.strictEqual(M.scrollProgress(NaN, 0, 1000), 0);
console.log('ok');
```

  Note: `ease(0.2) ≈ 0.50`, and stages 1–3 need `3.2 / 7.8 ≈ 0.41`, so that assertion holds.
- [ ] **Step 2: Run** `node tests/scroll-house-math.test.js`. Expected: FAIL with `Cannot find module`.
- [ ] **Step 3: Implement.** Use an IIFE that exports to `window.ScrollHouseMath` and/or `module.exports`. Spring: `a = -2ζω·v - ω²·(x - target)`, then `v += a·dt` and `x += v·dt`.
- [ ] **Step 4: Run** the test again. Expected: `ok`.
- [ ] **Step 5: Commit** with `git add js/scroll-house-math.js tests/ && git commit -m "feat(scroll-house): math core with tests"`.

### Task 2: Artwork, `images/scroll-house.svg`

The design-heavy task; dispatch it on the most capable creative model.

**Files:** create `images/scroll-house.svg`

**Interfaces (produces the SVG contract):**
- Root: `<svg xmlns viewBox="0 0 600 800" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">`. No inline colours on line kinds (CSS sets them); paint and glow shapes use `fill` set by CSS classes.
- 7 `<g class="sh-stage" data-stage="N" data-kind="K">` groups in order: 0 `line`, 1 `line`, 2 `brick`, 3 `pipe`, 4 `wire`, 5 `paint`, 6 `finish`.
- `line`, `pipe`, `wire`, `finish`: child `<path class="sh-path">` elements, drawn in document order.
  - **Stage 0:** a *single* path, i.e. the reference-style flowing curve that lands as the ground line and pulls the plot outline taut.
  - **Stage 1:** its first path starts where stage 0 ended.
- `brick`: child `<g class="sh-course">` rows ordered bottom row first, each containing short brick strokes (`<path>`) in alternating stagger bond. Leave the door and window openings empty.
- `pipe` and `wire` groups also carry the class `sh-services`.
  - Pipes: runs from the overhead tank, with small valve and tap symbols as part of the paths.
  - Wires: from the meter box, with switch boxes as small squares and light points as small circles, all as paths.
- `paint`: `<path class="sh-paint sh-paint--lime">` and `<path class="sh-paint sh-paint--ochre">` closed wall shapes (the upper box in lime-white, the ground floor accent wall in ochre). No stroke.
- `finish`: `sh-path`s for the sloped terracotta-tile roof (tile courses as short parallel strokes), the jaali lattice, the chhajja, the carved door, the courtyard tree, the tulsi planter and 3 verandah pillars, plus `<rect|path class="sh-glow">` window light shapes.

- [ ] **Step 1: Draw** the house exactly as described in the spec's "The house" section and stage table. Composition rules:
  - The house occupies about x 60–540 and y 180–760, with the ground line at about y 740.
  - The water tank sits on the flat roof, upper right.
  - Every element must read at 16% opacity, at about 300px wide.
  - Use smooth `C`/`Q` travel moves in stage 0, and clean orthogonal lines elsewhere.
  - Keep the total under 40 KB.
- [ ] **Step 2: Check the structure.** Run:
  `python3 -c "import xml.dom.minidom as m; d=m.parse('images/scroll-house.svg'); g=[x for x in d.getElementsByTagName('g') if 'sh-stage' in x.getAttribute('class')]; print([(x.getAttribute('data-stage'), x.getAttribute('data-kind')) for x in g])"`
  Expected: `[('0','line'),('1','line'),('2','brick'),('3','pipe'),('4','wire'),('5','paint'),('6','finish')]`.
- [ ] **Step 3: Check it visually.** Render a preview with every stage visible (a temporary HTML page in the scratchpad that inlines the SVG with test colours: pipes sage, wires terracotta, paint at 0.3 opacity), screenshot it at 600×800, and view it.
  - Expected: it reads clearly as a contemporary Indian house with a verandah, sloped tile roof, jaali, chhajja and water tank.
  - Then screenshot each stage alone and confirm each is recognisable from its caption.
- [ ] **Step 4: Commit** with `git add images/scroll-house.svg && git commit -m "feat(scroll-house): Indian house artwork, 7 stages"`.

### Task 3: Layer, per-kind render, CSS

**Files:** create `js/scroll-house.js` and `tools/shot.py`; modify `css/style.css` and `index.html`

**Interfaces:**
- Consumes: `ScrollHouseMath.distribute`, `stageIndex`; the SVG contract from Task 2.
- Produces:
  - `window.ScrollHouse = { ready: Promise, render(t), measure(), state }`.
  - DOM: `div.scroll-house-wrap` > the inlined `svg.scroll-house` (plus `circle.sh-dot`, r = 3.5, appended by JS); and `div.scroll-stage` > `span.scroll-stage-num` + `span.scroll-stage-name` + `span.scroll-stage-caption`.

- [ ] **Step 1: Fetch and inline.** Only when `html.js` is set, run `fetch('images/scroll-house.svg')`, insert the SVG, and append the dot. On failure, do nothing (the `ready` promise resolves to `false`).
- [ ] **Step 2: `measure()`.**
  - For line-kind paths, cache `getTotalLength()` and set `stroke-dasharray`.
  - For brick, cache the course nodes.
  - Debounce a remeasure on resize (150 ms), then re-render the current `x`.
- [ ] **Step 3: `render(t)`.** Compute `fractions = distribute(t, WEIGHTS)`, then apply the per-kind rules from the spec's "Per-kind render" list:
  - **line:** distribute across paths by length and set `dashoffset`.
  - **brick:** set courses to `opacity` 1 or 0, with the current course at `transform: scaleX(partial)`, `transform-box: fill-box`, origin left.
  - **paint:** `clip-path: inset(${(1-f)*100}% 0 0 0)` on the group, and `.sh-services` opacity `1 - 0.82f`.
  - **finish:** the line rule, with `.sh-glow` opacity `clamp01((f - 0.7) / 0.3)`.
  - **Dot:** position it at the active tip via `getPointAtLength`. For brick, use the right end of the current course's revealed part; for paint, use the wipe edge at the centre x with the roller morph.
  - **Label:** update the number, name and caption from `stageIndex`.
- [ ] **Step 4: CSS** (new section).
  - `.scroll-house-wrap`: fixed, `inset: 0`, `pointer-events: none`, `z-index: 50`.
  - `svg.scroll-house`: desktop (`min-width: 1025px`) `position: absolute; right: 2vw; top: 4vh; height: 92vh; width: auto`; below that, centred `height: 88svh`.
  - Line opacity and colours per Global Constraints, set via `.sh-stage[data-kind=…]` selectors.
  - `.scroll-stage`: fixed `left: 14px; bottom: 24px`. Number in `--font-display`, name in Inter 0.65rem uppercase with letter-spacing 0.2em, caption in Cormorant italic 0.95rem in `--text-secondary`.
  - Hide the caption at `max-width: 380px`.
  - Blend modes per theme; `@media print { display: none }`.
- [ ] **Step 5: Add the scripts** to `index.html` after `js/lightbox.js`: `js/scroll-house-math.js`, then `js/scroll-house.js`.
- [ ] **Step 6: Check it visually.** Serve with `python3 -m http.server 8791 --bind 127.0.0.1`. Run `python3 tools/shot.py out.png W --noscroll --eval "ScrollHouse.ready.then(()=>ScrollHouse.render(T))"` with T at each stage midpoint and 1, at W = 1440 and W = 375, plus `--dark` at T = 1.
  - Expected: each stage is recognisable with the correct label; the text stays readable; the dot sits at the tip.
  - Resize check: render 0.6, dispatch `resize`, wait 300 ms, screenshot. Expected: no gaps.
- [ ] **Step 7: Commit** with `git add js/scroll-house.js tools/ && git commit -am "feat(scroll-house): layer, per-kind render, styles"`.

### Task 4: Scroll driver, spring loop, visibility

**Files:** modify `js/scroll-house.js` and `css/style.css`

**Interfaces:**
- Consumes: `ease`, `springStep`, `isAtRest`, `scrollProgress`; `render`/`measure` from Task 3.
- Produces: the class `.scroll-house-wrap.is-hidden` (fades to opacity 0 over 0.4s `var(--ease-reveal)`; the label hides too); `ScrollHouse.state = { target, x, v, running }`.

- [ ] **Step 1: Progress.** In `measure()`: `start = hero.offsetTop + hero.offsetHeight - innerHeight * 0.5` and `end = scrollHeight - innerHeight`. On scroll: `target = ease(scrollProgress(scrollY, start, end))`, then wake the loop.
- [ ] **Step 2: Loop.** Use rAF with a timestamp `dt`: `springStep`, then `render(x)`. When `isAtRest`, snap to `target`, do a final render and stop. On first load, set `x = target` directly (no replay; Review Focus 4).
- [ ] **Step 3: Visibility.** Toggle `.is-hidden` when `scrollY < start` or `body.modal-open`, watching the modal via a `MutationObserver` on the body `class`.
- [ ] **Step 4: Reduced motion.** Call `render(1)` once and attach no loop. The visibility rules still apply.
- [ ] **Step 5: Checks.**
  - Default scroll pass with `--eval "JSON.stringify(ScrollHouse.state)"`. Expected: `"running":false`.
  - `--url "http://127.0.0.1:8791/#project-3" --noscroll --eval "document.querySelector('.scroll-house-wrap').classList.contains('is-hidden')"`. Expected: `true`.
  - `--reduced`. Expected: the full house.
- [ ] **Step 6: Commit** with `git commit -am "feat(scroll-house): spring scroll loop + visibility"`.

### Task 5: Kinetics and final verification

**Files:** modify `js/scroll-house.js`, `css/style.css`, `README.md` and `CONTENT-GUIDE.md`

**Interfaces:** produces the classes `.sh-stage.is-settling` (removed on `animationend`) and `.sh-stage.is-coming-apart`.

- [ ] **Step 1: Settle-shake.**
  - In `render`, add `.is-settling` on a stage's forward transition `<1 → 1`, unless it is already settling, and never on more than 2 stages at once.
  - Keyframe `sh-settle` over 420ms with `var(--ease-snap)`: translate `0 → (2,-1) → (-1.5,1) → (0.5,0) → 0` px with a ±0.4° rotate; `transform-box: fill-box; transform-origin: center`.
  - Brick stage: also a 1px vertical "thud" of the whole layer for 180ms.
- [ ] **Step 2: Deconstruct drift.**
  - On `1 → <1`, add `.is-coming-apart`: `translate(var(--dx), var(--dy))` over 0.5s `var(--ease-reveal)`.
  - JS sets per-stage `--dx`/`--dy` (4–8px, pointing away from the house centre).
  - Remove the class when the fraction returns to 1.
- [ ] **Step 3: Pen squash.** The dot scale is `1 + min(|v|·0.6, 0.5)`, set inline (it composes with the roller morph during paint).
- [ ] **Step 4: Label crossfade.** When the stage changes, use a 0.3s opacity and translateY(6px) swap.
- [ ] **Step 5: Docs.**
  - `README.md` effects table: add "Scroll house — a pen builds an Indian home through 7 construction stages as you scroll".
  - `CONTENT-GUIDE.md` §8:
    - Edit the stage names and captions in the `STAGES` array at the top of `js/scroll-house.js`.
    - Replace the artwork by keeping the SVG contract.
    - Turn the effect off by removing its two script tags.
- [ ] **Step 6: Full verification.**
  - `node tests/scroll-house-math.test.js` prints `ok`.
  - Screenshots at 1440 and 375, light and dark, at 0 / 10 / 20 / 35 / 50 / 65 / 80 / 100% scroll.
  - Scroll-up sequence (bottom → 30%, wait 0.15s, screenshot). Expected: later stages un-drawing and offset.
  - Jump: `location.hash='#contact'`, then count `.is-settling` at 50ms (≤ 2) and at 1s (0).
  - No console errors; `scrollWidth` equals the viewport width.
- [ ] **Step 7: Commit** with `git commit -am "feat(scroll-house): kinetics, label crossfade, docs"`.
