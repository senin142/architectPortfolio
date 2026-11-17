# Scroll House Implementation Plan (v4, reviewed by design + engineering)

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
- Animate only `stroke-dashoffset`, `transform`, `opacity`, and SVG attributes on the wipe `<rect>`. There are no layout reads in the rAF loop. Lengths and bboxes are measured **once** (plus once more only if the viewport crosses the 768px breakpoint, because `.sh-detail` strokes leave or join the length distribution; E10). Scroll `start`/`end` are recomputed by `measureScroll()` only (RT6).
- **One writer per attribute.** Each animated attribute has exactly one owner: the stage `<g transform>` is written only by `composeTransform(drift, shake)`; the stage `<g>` opacity is CSS-only (base / active); the concealment fade is written by JS to the inner `g.sh-services`; the pen position is JS on `g.sh-pen`, the breathe is CSS on `circle.sh-dot` (E6, D5, D12).
- The rAF loop stops at rest; scroll listeners are passive.
- The layer is `aria-hidden="true"`, `pointer-events: none`, `z-index: 50`, `contain: strict`. **Only photos and opaque cards are lifted** to `z-index: 51`: `.project-card`, `.about-image`, `.testimonial-card`. Everything else, including body text, headings, the stats row, the translucent service cards and the contact form, sits *under* the drawing by design; the lines are faint enough (0.16–0.26) to read through (RT2, D3, E3). The layer is absent without JS or if the SVG fetch fails, and the fetch is deferred to idle after `load` (RT7).
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
- Pacing (D2): `ease(s) = 1 - (1 - s)^2.2`, stage weights `[0.8, 0.9, 1.2, 1, 1, 1.2, 1.6]` (sum 7.7). Verified in node: `ease(0.2) = 0.388`; stage ends at raw scroll `s` = 0.049 / 0.107 / 0.193 / 0.275 / 0.369 / 0.510 / 1.0. So stages 1–3 are done by about 19% scroll and Home draws over the second half. Window glow is the last 15% of scroll (`t ≥ ease(0.85) = 0.9846`), so lights-on lands in Contact and the footer.
  - **Hold during Projects (client decision, C1):** scroll inside the pause window `[pauseStart, pauseEnd]` contributes nothing; `s` is *effective* scroll (`pausedProgress`). The window is `pauseStart = gridTop − 0.35·innerHeight`, `pauseEnd = gridBottom − 0.65·innerHeight` for `.project-grid`, recomputed with `start`/`end`. The stage ends above are in effective scroll and do not move. Measured at 1440×900 (start 450, end 6851, window 1280–1886, effective range 5795): Layout done at scrollY 732 (stats strip), Frame at 1071 (stats / Projects header), the hold begins with Brickwork 42% laid and the pen resting on the course, Brickwork finishes at 2176 as About arrives, Plumbing in About (2647), Electrical crossing into Services (3192), Paint inside Services (4014), Home draws over Process, Testimonials and Contact, glow from 5982 (Testimonials → Contact), finished at 6851 (Contact / footer). At 375×667 the hold (1293–2715) begins with Frame 83% raised. Section order is unchanged.
- Opacity: lines 0.16 base; the **active** (currently drawing) stage at 1.6× = 0.26 (services 0.30), crossfading to base over 0.4s on completion (D5). Paint washes: ochre 0.14 (0.10 on `.tone-dark`), lime-white only on `.tone-dark` at 0.12 and never on light paper (D1). Mobile is 0.8× those values.
- Stroke: root `stroke-width="1.5"`, `.sh-detail` 1.0. Linecaps: `square` everywhere (orthogonal line work and bricks), `round` only on stage 0 (D5, D12).
- **No `mix-blend-mode`** (RT1). Tone class `.tone-dark` on the wrap is driven by the section under the viewport centre (`[data-tone="dark"]`: `.hero`, `.services`, `.site-footer`) or by dark theme. Lines are `--text-primary` on light and `--text-on-dark` on dark.
- **Night & Gold (Task 0):** the dark theme is midnight navy + gold. `.tone-dark` must look right on *both* the light theme's warm-black sections (`--bg-dark` #1a1816: hero, Services, footer) and the navy dark theme. Ivory lines, gold dot and glow, lime 0.12 and ochre 0.10 washes hold on both; the only theme-sensitive colour is the wire terracotta, which Task 0 desaturates, so Task 5 checks wires stay distinguishable from lines in dark theme.
- Colours use only site tokens:
  - lines: `--text-primary` / `--text-on-dark`
  - pipes: `--accent-secondary`
  - wires: `--accent-primary` only (terracotta). **Gold is reserved for the dot and the glow** (D11).
  - paint: lime-white `#efe9dc` (dark tone only) and ochre `#c9a46a`
  - dot and glow: `--accent-gold`; the glow is a `radialGradient` 0.35 → 0, no filters (D4, D11)
- New CSS uses only the `--ease-*` tokens (the site rule: no default `ease`).
- Reduced motion shows the complete static house and a static label `07 / 07 — Home` with no loop (RT13). Hidden and paused in the hero, while `body.modal-open` and while `body.nav-open` (RT11). Print: `display: none`.
- Stage completion uses hysteresis: complete at `f ≥ 1`, incomplete at `f < 0.96` (RT3). `complete[]` is seeded from the first fractions so a load at `#contact` fires no shakes (E7).
- Scroll progress snaps to 1 at `s ≥ 0.995` so fractional `scrollY` and the iOS toolbar cannot leave Home a hair short (E12).
- Motif budget (RT10): verandah with pillars, sloped Mangalore-tile roof, jaali, chhajja (cast with the RCC frame, D10), overhead tank, tulsi planter, courtyard tree. Nothing else. The door is a plain double-leaf door with a threshold step, not carved (D10).

## Review Focus

1. **A nav-link jump (`#contact`) or a fast fling across several stages.** The spring catches up. Settle-shakes fire at most once per forward completion and at most 2 at once, never in a storm. Because `html { scroll-behavior: smooth }` animates hash jumps, the check uses `scrollTo({behavior: 'instant'})` and samples over the whole settle (Task 1 `distribute` test; Task 5 jump check; E8).
2. **Resize, phone rotation, or a content-height change while partly drawn** (project filter, lazy images, font swap). `measureScroll` re-runs from a debounced `ResizeObserver` on `main` as well as `resize`; there are no gaps or stale offsets (Task 3 resize check; E2).
3. **Theme toggle mid-build, or crossing from a light section into Services or the footer.** The line tone switches and the drawing state is kept (Task 4 tone check; Task 5 tone verification).
4. **Loaded directly at `#project-3`, or already scrolled to the bottom on load.** It starts at the correct state with no replay from 0 and no shake burst, and it is hidden behind the modal even though `main.js` sets `modal-open` before this script attaches (Task 4 checks; E5, E7).
5. **Out-of-range scroll** (iOS rubber-band negative `scrollY`, overscroll, a zero range, a `scrollY` that never quite reaches the end). The progress is clamped, never NaN, and snaps to 1 near the end (Task 1 tests; E12).
6. **Scrolling through Projects.** While `scrollY` is inside the pause window `ScrollHouse.state.target` does not change, the loop sleeps, the pen breathes and the label keeps showing the current stage; the build resumes seamlessly on either side, and a filter change that shrinks the grid shrinks the window (Task 1 `pausedProgress` tests; Task 5 hold check; C1).

## Red-Team Log (v2 → v3)

| # | Attack | Severity | Fix (folded into the tasks below) |
| --- | --- | --- | --- |
| RT1 | **Blend mode set per *theme* breaks on dark sections.** Services and the footer are `--bg-dark` even in light theme, so `multiply` turns ink lines invisible there. Blend modes also force costly compositing on mobile. | Critical | Drop `mix-blend-mode` entirely. Toggle a tone class (`.tone-dark`) from the section under the viewport centre (IntersectionObserver on `[data-tone="dark"]` sections: `.services`, `.site-footer`, plus everything in dark theme). Line colour crossfades over 0.4s. |
| RT2 | **The drawing smears across photos and cards.** The layer sits above `main` (z 50), so lines cross project images, service cards and the form. That looks dirty, not premium. | High | "Lift solid surfaces": `.project-card, .about-image, .service-card, .testimonial-card, .contact-form, .stats-inner` get `position: relative; z-index: 51`. The house passes *behind* cards and images but over plain backgrounds and text gaps. The cards are already opaque; the form gets `background: var(--bg-primary)`. *(v4: list cut to the three opaque surfaces; see D3/E3.)* |
| RT3 | **Spring overshoot flickers stage boundaries.** At a stage edge, overshoot crosses 1.0 and comes back, which fires a settle-shake and a "coming apart" drift on every small pause. | High | Hysteresis: a stage counts as complete at `f ≥ 1` and incomplete only at `f < 0.96`. Shake and drift fire only on those state flips. |
| RT4 | **Safari support.** CSS `clip-path: inset()` on SVG `<g>` and `transform-box` on groups are unreliable in Safari. | High | Paint wipe uses an SVG `<clipPath id="sh-wipe"><rect/></clipPath>`; JS sets the rect's `y`/`height` attributes. The brick partial reveal goes **brick by brick** (opacity per brick, left → right in each course) instead of `scaleX`, which also reads more like real brick-laying. Shake transforms go on the wrapping `<g>` via the SVG `transform` attribute set from JS keyframes, not CSS `transform-box`. |
| RT5 | **Repaint cost on mobile.** A full-viewport SVG repainting every frame (dashoffset and clip are paint, not composite) can jank cheap Android phones. | High | (a) Dirty-check: only touch stages whose fraction changed by more than 0.0005. (b) `.scroll-house-wrap { contain: strict; will-change: transform }` isolates repaints to its own layer. (c) The loop sleeps at rest. (d) Mobile skips `.sh-detail`-marked hatch strokes. (e) A target of 60fps at 4× CPU throttle (checked in Task 5). |
| RT6 | **Resize storms on mobile.** The address bar showing and hiding fires `resize` constantly. Remeasuring path lengths each time is wasted, because they are in viewBox units and never change. | Medium | Measure lengths and bboxes **once** after inlining. On resize, recompute only the scroll `start`/`end` (debounced 150ms). |
| RT7 | **The SVG fetch competes with first paint** (fonts, hero). | Medium | Fetch after `window.load` via `requestIdleCallback` (falling back to `setTimeout` 200ms). The hero hides the layer anyway, so nothing is lost. |
| RT8 | **The label collides with content.** Bottom-left on mobile overlaps body text and the form button; it also sits on top of the 2px progress line. | Medium | The label becomes a compact pill with `background: color-mix(in srgb, var(--bg-primary) 82%, transparent)` and a solid fallback, at `left: 12px; bottom: 16px`. Its max width is 60vw on mobile and the caption is hidden ≤ 480px. It is also hidden when `body.nav-open`. *(v4: the pill is mobile/tablet only; desktop gets a title block under the house, D9.)* |
| RT9 | **"Easy to understand" is untestable.** Self-review by the person who drew it is biased. | Medium | An art gate in Task 2: render the 7 stage-only snapshots *without* labels and have a fresh subagent (who has not seen the spec) name each stage and the house's style. Any stage it can't name gets redrawn, for at most 2 rounds. |
| RT10 | **Indian authenticity becomes cliché.** Too many motifs (toran, kalash, rangoli) turns it into clip-art. | Medium | Strict motif budget, exactly these: verandah with pillars, sloped Mangalore-tile roof, jaali, chhajja, overhead tank, tulsi planter, courtyard tree. Nothing else. |
| RT11 | **The nav menu or modal is open and the layer animates underneath.** Wasted work and visual noise. | Low | Treat `body.nav-open` like `modal-open`: hide and pause the loop. |
| RT12 | **Opening `index.html` as `file://`** makes the fetch fail silently, so a developer thinks the feature is broken. | Low | `console.info('[scroll-house] artwork not loaded (serve over http)')` on failure; documented in the CONTENT-GUIDE. |
| RT13 | **Reduced motion and the label.** A static full house with a changing label is inconsistent. | Low | Reduced motion shows `07 / 07 — Home` statically. |

## Review Log (v3 → v4)

Sources: **D** = design review, **E** = engineering review, **both** where they overlap, **N** = the Night & Gold client decision.

| # | Source | Decision | Why |
| --- | --- | --- | --- |
| D1 | design | accepted | Lime #efe9dc at 0.10 on #f5f0e8 paper is invisible; lime is now dark-tone only (0.12), ochre 0.14/0.10 carries the paint on light, and brick courses fade 1 → 0.25 under the wipe so "plaster over brick" still reads. |
| D2 | design | adapted | Exponent 2.2 and weights `[0.8,0.9,1.2,1,1,1.2,1.6]` taken; Task 1 asserts and notes recomputed and node-verified. The glow is expressed in `t`-space (`t ≥ ease(0.85) = 0.9846`) rather than passing raw `s` into `render`, so `render(t)` stays single-argument and the `--eval` checks stay simple; at rest the two are identical. Measured at 1440: stages 2–4 still overlap Projects; the spec's front-loading wins and the trade-off is written into Global Constraints. |
| D3 + E3 | both | accepted (merged) | Lift list cut to `.project-card, .about-image, .testimonial-card`. `.contact-form` is not lifted and gets no background (its rectangle would hide the finished house); `.stats-inner` and `.service-card` are transparent so lifting them did nothing. E3's "give opaque bg" alternative rejected: translucent service cards are part of the Services look. Constraint now says plainly that lines draw over body text. |
| D4 | design | accepted | Dot `--accent-gold`, opacity 1, r 4.5; gold is the hero accent on navy, and it reads on paper. |
| D5 | design | adapted | Stroke 1.5 / detail 1.0 and the 1.6× active stage taken. To keep one writer per attribute (E6), the concealment fade moves to an inner `g.sh-services` wrapper (SVG contract change) and the stage `<g>` opacity becomes CSS-only with `.is-active`. |
| D6 + E13 | both | accepted | `data-tone="dark"` on `.hero`; `start` stays `hero end − 0.5·innerHeight` because the tone now flips with the hero under the centre, so no gap appears. |
| D7 + E13 | both | accepted | Mobile (≤ 768px): `width: 100vw; height: auto; right: 0; bottom: 0` (375×500). Tablet keeps the centred `height: 88vh` then `88svh`. |
| D8 | design | accepted | Shake 1.4px / 0.12° / 320ms, brick thud y-only 1px: quieter, more "settle" than "wobble". Spec numbers updated. |
| D9 + E11 | both | accepted | Desktop title block at `right: 2vw; bottom: 3vh` with 60px gold `.chapter-line` and 7-tick strip; mobile keeps the pill. Wrap and label are both body children and JS toggles `.is-hidden` on both. |
| D10 | design | accepted | Chhajja is cast RCC → stage 2 Frame. Plain double-leaf door with threshold step. One dimension line with hero-style ticks in Layout. Spec updated. |
| D11 | design | accepted | Wires terracotta only; glow is a `radialGradient` at 0.35 with `stop-color` from CSS, no filters (cheap on mobile, RT5). |
| D12 | design | adapted | Square caps and roller `scaleX 8` taken. Breathe taken but on `circle.sh-dot` inside `g.sh-pen`, so CSS (breathe) and JS (position/squash/roller) never share a transform. |
| E1 | eng | accepted | Shake is JS-driven, so `.is-settling` is removed in the loop when the shake ends, not on `animationend`. |
| E2 | eng | accepted | Debounced `ResizeObserver` on `main` → `measureScroll()` (filter, lazy images, font swap change `scrollHeight`). Falls back to `resize` only. |
| E4 | eng | accepted | `stroke-dasharray="L L+2"`, `dashoffset = (L+1)·(1−f)`: no cap dot on undrawn paths, with either cap style. The "visibility hidden at 0" alternative rejected as an extra attribute toggle per frame. |
| E5 | eng | accepted | `main.js` runs `route()` synchronously, so `modal-open` can predate attach: visibility is evaluated from `body.classList` on `ready`, and the check awaits `ScrollHouse.ready`. |
| E6 | eng | accepted | Single `composeTransform(drift, shake)` per stage; shake and drift keep their own state and never write the attribute directly. |
| E7 | eng | accepted | `complete[]` seeded silently from the first fractions before the first render. |
| E8 | eng | accepted | Jump check uses `scrollTo({top, behavior: 'instant'})` and samples `.is-settling` every 50ms for 1.5s (max ≤ 2, final 0); a second smooth `location.hash` pass checks only "max ≤ 2". |
| E9 | eng | accepted | Task 4 now says `measureScroll()`. |
| E10 | eng | adapted | On mobile `.sh-detail` paths are excluded from the length distribution at measure time (`matchMedia('(max-width: 768px)')`), and a `change` on that query is the one allowed re-run of `measure()` (tablet rotation). `getBBox` is only called on bricks and stage groups, which are never `display: none`. |
| E12 | eng | accepted | Snap lives in `scrollProgress` (`p ≥ 0.995 → 1`) so it is unit-tested. |
| E13 | eng | accepted | `88vh` before `88svh`; `aria-hidden` on `.scroll-stage` (decorative; it would otherwise announce every stage); `tools/shot.py` copied from the absolute scratchpad path; caption breakpoint is **480px** in both plan and spec (phones always get number + name only). |
| N1 | client | accepted | Night & Gold replaces the dark theme (Task 0). The tone-dark palette works on navy as well as the light theme's warm-black sections; Task 5 adds a dark-theme stage-5 check that desaturated terracotta wires still separate from ivory lines. |
| C1 | client | accepted | "Pause during Projects" resolves the D2 trade-off: a pure `pausedProgress` (Task 1, node-verified) freezes effective scroll inside a window derived from `.project-grid` in `measureScroll()`. Weights and exponent unchanged: with the hold, the stage landings (Global Constraints) all fall on text sections and the glow still lands in Contact / footer. |

---

## File Structure

| File | Responsibility |
| --- | --- |
| `js/scroll-house-math.js` (new) | `ease`, `springStep`, `isAtRest`, `distribute`, `stageIndex`, `scrollProgress`, `pausedProgress` |
| `images/scroll-house.svg` (new) | The artwork, following the group/class contract |
| `js/scroll-house.js` (new) | Fetch and inline, measure, per-kind render, spring loop, kinetics, label, visibility |
| `css/style.css` (modify: new section "Scroll house" before "Responsive") | Layer, kinds, colours, keyframes, label, dark mode, reduced motion, print |
| `index.html` (modify) | `data-tone="dark"` on `.hero`, `.services`, `.site-footer`; `<script>` tags after `js/lightbox.js`: math first, then house |
| `tests/scroll-house-math.test.js` (new) | Node `assert` unit tests |
| `tools/shot.py` (new) | The CDP screenshot helper, copied from `/tmp/claude-1000/-media-shubhanshu-PortableSSD-work-arch/35e7d4b1-a7f3-459f-a038-944e97158e42/scratchpad/shot.py` (`--url --eval --dark --reduced --noscroll --height`, `awaitPromise`, `--remote-allow-origins=*`), pointed at `http://127.0.0.1:8791/` |

---

### Task 0: Night & Gold dark theme (replaces the warm-black dark theme)

The client asked for this on 2026-11-16: "colour theme need to add night and gold", choosing to replace the dark theme.

**Files:** modify `css/style.css` (the `[data-theme="dark"]` token block, plus hard-coded dark rgba values such as the `.site-header.scrolled` backgrounds), and the `theme-color` meta in `index.html` if one is present for dark.

- [ ] **Step 1: Retune the dark tokens** to a midnight-navy family with gold as the single hero accent.
  - Exact values are the builder's call, within these limits: `--bg-primary` is navy-black (about `#0b1020`–`#0e1426`), with `--bg-secondary` and `--bg-dark` stepping slightly lighter and darker.
  - `--accent-gold` is a warm, luminous gold (about `#d9b26a`–`#e3bd76`).
  - Text is warm ivory, and the muted text keeps WCAG AA contrast (≥ 4.5:1 for body text and the eyebrows).
  - Terracotta and sage stay as quiet secondary accents, desaturated so they sit well on navy. Keep terracotta (`--accent-primary`) clearly distinct from ivory at low opacity: the scroll house draws wires in it at 0.16–0.30 over navy (N1).
  - Mirror the same values in the `html.no-js:not([data-theme="light"])` block.
- [ ] **Step 2: Replace hard-coded warm-black colours.** Run `grep -n "rgba(26, 24, 22\|rgba(10, 9, 8\|#1a1816\|#121110" css/style.css index.html`. Route every hit under the dark theme through tokens (including `[data-theme="dark"] .btn-primary` and the `theme-color` meta). Retune the paper texture for dark so it still reads on navy.
- [ ] **Step 3: Check it.** Take `tools/shot.py` full-page screenshots at 1440 and 375 with `--dark`. Expected: navy everywhere (header, hero overlay, services, footer, modals, lightbox, mobile nav, form inputs), gold accents, no warm-black leftovers, and readable text. Check contrast for `--text-secondary` and the eyebrow colour on `--bg-primary` with a quick script.
- [ ] **Step 4: Commit** with `git commit -am "feat(theme): Night & Gold dark theme"`.

### Task 1: Math core

**Files:** create `js/scroll-house-math.js`; test `tests/scroll-house-math.test.js`

**Interfaces (produces `window.ScrollHouseMath` / `module.exports`):**
- `ease(s) -> number`: `1 - Math.pow(1 - clamp01(s), 2.2)` (D2).
- `springStep({x, v}, target, dt) -> {x, v}`: semi-implicit Euler with ω = 11, ζ = 0.72, and `dt` clamped to ≤ 1/30.
- `isAtRest({x, v}, target) -> boolean`: true when `|x - target| < 0.0005 && |v| < 0.001`.
- `distribute(t, weights: number[]) -> number[]`: per-stage fraction 0..1, filled sequentially in proportion to the weights, with `t` clamped.
- `stageIndex(fractions) -> number`: the first index with fraction < 1, else the last index.
- `scrollProgress(y, start, end) -> number`: clamped; 0 when `end <= start` or the input is NaN; **1 when the clamped value is ≥ 0.995** (E12).
- `pausedProgress(y, start, end, pauseStart, pauseEnd) -> number` (C1): like `scrollProgress`, but scroll inside `[pauseStart, pauseEnd]` contributes nothing. Clip the window to `[start, end]`, subtract the overlap of `[start, y]` with the window from the numerator and the window length from the denominator, clamp, snap at 0.995. It degenerates to `scrollProgress` when `pauseEnd <= pauseStart` (including NaN), and returns 0 when the range or the remaining denominator is not positive or `y` is NaN.

- [ ] **Step 1: Write the failing tests.**

```js
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
```

  Notes (node-verified against a reference implementation): `ease(0.2) = 0.3879`; stages 1–3 need `2.9 / 7.7 = 0.3766`, so they finish at `s ≈ 0.193`; `ease(0.2)` leaves plumbing at `f ≈ 0.07`. The spring settles in 50 frames at 60fps (26 at 30fps) with peak 1.0214. Sum the weights with `reduce` and never compare the sum to the literal `7.7` (float tail).
- [ ] **Step 2: Run** `node tests/scroll-house-math.test.js`. Expected: FAIL with `Cannot find module`.
- [ ] **Step 3: Implement.** Use an IIFE that exports to `window.ScrollHouseMath` and/or `module.exports`. Spring: `a = -2ζω·v - ω²·(x - target)`, then `v += a·dt` and `x += v·dt`.
- [ ] **Step 4: Run** the test again. Expected: `ok`.
- [ ] **Step 5: Commit** with `git add js/scroll-house-math.js tests/ && git commit -m "feat(scroll-house): math core with tests"`.

### Task 2: Artwork, `images/scroll-house.svg`

The design-heavy task; dispatch it on the most capable creative model.

**Files:** create `images/scroll-house.svg`

**Interfaces (produces the SVG contract):**
- Root: `<svg xmlns viewBox="0 0 600 800" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter">`. No inline colours on line kinds (CSS sets them); paint and glow shapes use `fill` set by CSS classes or the gradient below.
- `<defs>` holds:
  - `<clipPath id="sh-wipe"><rect x="0" y="800" width="600" height="0"/></clipPath>` (RT4).
  - `<radialGradient id="sh-glow-grad"><stop offset="0" class="sh-glow-stop"/><stop offset="1" class="sh-glow-stop sh-glow-stop--out"/></radialGradient>`; CSS sets `stop-color: var(--accent-gold)` and `stop-opacity` 0.35 → 0 (D11). No `<filter>`.
- 7 `<g class="sh-stage" data-stage="N" data-kind="K">` groups in order: 0 `line`, 1 `line`, 2 `brick`, 3 `pipe`, 4 `wire`, 5 `paint`, 6 `finish`.
- `line`, `pipe`, `wire`, `finish`: child `<path class="sh-path">` elements, drawn in document order.
  - **Stage 0:** `stroke-linecap="round"` on the group; a *single* path, i.e. the reference-style flowing curve that lands as the ground line, pulls the plot outline taut, and ends with **one dimension line** across the plot with hero-style end ticks (D10).
  - **Stage 1:** its first path starts where stage 0 ended. It includes the plinth, columns, beams, slabs **and the chhajja** (cast RCC; D10).
- `brick`: child `<g class="sh-course">` rows ordered bottom row first, each containing `<path class="sh-brick">` strokes ordered left → right in alternating stagger bond. Leave the door and window openings empty, and keep it to 160–240 bricks total. The course `<g>` opacity is written by the paint stage (fade under the wipe), the brick opacity by the brick stage: two different elements, one writer each.
- `pipe` and `wire` stage groups wrap their paths in an inner `<g class="sh-services">` (D5/E6: the stage `<g>` opacity is CSS-only, the inner wrapper is the JS-faded one).
  - Pipes: runs from the overhead tank, with small valve and tap symbols as part of the paths.
  - Wires: from the meter box, with switch boxes as small squares and light points as small circles, all as paths.
- `paint`: `<path class="sh-paint sh-paint--lime">` and `<path class="sh-paint sh-paint--ochre">` closed wall shapes (the upper box in lime-white, the ground floor accent wall in ochre). No stroke. The group has `clip-path="url(#sh-wipe)"`. Lime is shown only on `.tone-dark` (D1), so the ochre wall must carry the paint story by itself on light paper: make it the larger, lower, more visible wall.
- Optional `class="sh-detail"` on hatch and secondary strokes (stroke-width 1.0), which mobile hides (RT5). Never put `sh-detail` on a stage's only path.
- `finish`: `sh-path`s for the sloped terracotta-tile roof (tile courses as short parallel strokes), the jaali lattice, the plain double-leaf door with its threshold step, the courtyard tree, the tulsi planter and 3 verandah pillars, plus `<rect|ellipse class="sh-glow" fill="url(#sh-glow-grad)">` window light shapes.

- [ ] **Step 1: Draw** the house exactly as described in the spec's "The house" section and stage table. Composition rules:
  - The house occupies about x 60–540 and y 180–760, with the ground line at about y 740.
  - The water tank sits on the flat roof, upper right.
  - Every element must read at 16% opacity, at about 300px wide.
  - Use smooth `C`/`Q` travel moves in stage 0, and clean orthogonal lines elsewhere.
  - Keep the total under 40 KB.
- [ ] **Step 2: Check the structure.** Run:
  `python3 -c "import xml.dom.minidom as m; d=m.parse('images/scroll-house.svg'); g=[x for x in d.getElementsByTagName('g') if 'sh-stage' in x.getAttribute('class')]; print([(x.getAttribute('data-stage'), x.getAttribute('data-kind'), len([c for c in x.getElementsByTagName('g') if 'sh-services' in c.getAttribute('class')])) for x in g])"`
  Expected: `[('0','line',0),('1','line',0),('2','brick',0),('3','pipe',1),('4','wire',1),('5','paint',0),('6','finish',0)]`.
- [ ] **Step 3: Check it visually.** Render a preview with every stage visible (a temporary HTML page in the scratchpad that inlines the SVG with test colours: pipes sage, wires terracotta, paint at 0.3 opacity), screenshot it at 600×800 on paper **and on navy**, and view both.
  - Expected: it reads clearly as a contemporary Indian house with a verandah, sloped tile roof, jaali, chhajja and water tank.
  - Then screenshot each stage alone and confirm each is recognisable from its caption.
- [ ] **Step 4: Blind art gate (RT9).** Render the 7 cumulative stage snapshots with no labels and give them to a fresh subagent that has not seen the spec. Ask: "Name what construction step each image adds, and describe the house's architectural style."
  - Pass: all 7 named correctly (synonyms are fine) and the style is described as Indian / Indian-contemporary.
  - Redraw the failing stages, for at most 2 rounds.
- [ ] **Step 5: Commit** with `git add images/scroll-house.svg && git commit -m "feat(scroll-house): Indian house artwork, 7 stages"`.

### Task 3: Layer, per-kind render, CSS

**Files:** create `js/scroll-house.js` and `tools/shot.py`; modify `css/style.css` and `index.html`

**Interfaces:**
- Consumes: `ScrollHouseMath.distribute`, `stageIndex`, `ease`; the SVG contract from Task 2.
- Produces:
  - `window.ScrollHouse = { ready: Promise<boolean>, render(t), measure(), measureScroll(), state }`.
  - DOM, both appended to `body` (E11): `div.scroll-house-wrap[aria-hidden]` > the inlined `svg.scroll-house` (plus `g.sh-pen` > `circle.sh-dot[cx=0][cy=0][r=4.5]`, appended by JS; D4, D12); and `div.scroll-stage[aria-hidden]` > `span.scroll-stage-num` + `span.scroll-stage-name` + `span.scroll-stage-caption` + `span.chapter-line` + `span.sh-ticks` (7 `<i>`) (D9).

- [ ] **Step 1: Fetch and inline.** Only when `html.js` is set, after `load` plus `requestIdleCallback` (falling back to a 200ms timeout), run `fetch('images/scroll-house.svg')`, insert the SVG, and append the pen. On failure, call `console.info('[scroll-house] artwork not loaded (serve over http)')` and resolve `ready` to `false` (RT7, RT12).
- [ ] **Step 2: `measure()`.** This runs once after inlining, and again only on a `change` of `matchMedia('(max-width: 768px)')` (E10).
  - `detailHidden = matchMedia('(max-width: 768px)').matches`. For line-kind paths, skip `.sh-detail` paths when `detailHidden` (they get no length, no dasharray and no share of the fraction); otherwise cache `getTotalLength()` as `L` and set `stroke-dasharray="L L+2"` (E4).
  - For brick, cache the brick nodes in order with their `getBBox()` right-edge points (for the pen), and each course `<g>`'s bbox top/height (for the fade under the wipe; D1).
  - Cache each stage `<g>`'s bbox centre (for the shake pivot) and the wipe `<rect>`.
  - `measureScroll()` handles `start`/`end` and the pause window only (C1): `grid = document.querySelector('.project-grid')`, `pauseStart = gridTop − 0.35·innerHeight`, `pauseEnd = gridBottom − 0.65·innerHeight` (page coordinates from `getBoundingClientRect` + `scrollY`), the same rule on mobile where the grid is one tall column; if the grid is missing, `pauseStart = pauseEnd = 0` (no hold). It is re-run (debounced 150ms) on `resize` and from a `ResizeObserver` on `main` (E2; a project filter changes the grid height and so the window), with `resize` alone as the fallback.
- [ ] **Step 3: `render(t)`.** Compute `fractions = distribute(t, WEIGHTS)`, then apply the per-kind rules from the spec's "Per-kind render" list:
  - **line:** distribute `f` across the measured paths by length and set `stroke-dashoffset = (L + 1)·(1 − fp)` per path (E4: at 0 the dash sits entirely off the path, so no cap dot).
  - **brick:** reveal the first `round(f·N)` bricks (`opacity` 1, the rest 0), toggling only the bricks whose state changed (RT4, RT5).
  - **paint:** set the wipe rect `y = 800 − 800f` and `height = 800f`; `g.sh-services` (the inner wrapper, both stages) opacity is `1 − 0.82f`; each `g.sh-course` opacity goes `1 → 0.25` linearly as the wipe edge crosses that course's top → bottom (D1), touching only courses whose value changed.
  - **finish:** the line rule, with `.sh-glow` opacity `clamp01((t − G) / (1 − G))` where `G = ease(0.85) = 0.9846`, i.e. the last 15% of raw scroll (D2).
  - **All kinds:** skip a stage whose fraction changed by ≤ 0.0005 since the last render (RT5).
  - **Active stage:** toggle `.is-active` on the stage whose index is `stageIndex(fractions)`; CSS does the 1.6× opacity and the 0.4s crossfade (D5).
  - **Pen:** write `g.sh-pen`'s `transform` (translate only here; Task 5 composes the squash and roller into the same string) at the active tip via `getPointAtLength`. For brick, use the cached right edge of the last revealed brick; for paint, use the wipe edge at x = 300 with the roller morph.
  - **Label:** update the number, name, caption and the tick strip (gold up to the current stage) from `stageIndex`.
- [ ] **Step 4: CSS** (new section).
  - `.scroll-house-wrap`: fixed, `inset: 0`, `pointer-events: none`, `z-index: 50`, `contain: strict`, `will-change: transform`.
  - Lift opaque surfaces only (RT2, D3, E3): `.project-card, .about-image, .testimonial-card { position: relative; z-index: 51 }`. No lift and no background for `.contact-form`, `.stats-inner` or `.service-card`. Check that the existing hover, overlay and curtain stacking still works.
  - Tone (RT1): `.scroll-house-wrap.tone-dark` swaps the line colour to `--text-on-dark` with a 0.4s `var(--ease-out)` colour transition. Add `data-tone="dark"` to `section.hero`, `section.services` and `footer.site-footer` in `index.html` (D6/E13).
  - Mobile (`max-width: 768px`): `.sh-detail { display: none }`.
  - `svg.scroll-house`: desktop (`min-width: 1025px`) `position: absolute; right: 2vw; top: 4vh; height: 92vh; width: auto`; tablet (769–1024px) centred, `height: 88vh; height: 88svh`; mobile (≤ 768px) `position: absolute; right: 0; bottom: 0; width: 100vw; height: auto` (D7, E13).
  - Stage opacity via `.sh-stage[data-kind=…]`: lines 0.16, pipe/wire 0.19; `.sh-stage.is-active` 1.6× (0.26 / 0.30); `transition: opacity 0.4s var(--ease-out)`. Mobile 0.8×. `.sh-detail { stroke-width: 1 }`.
  - Paint: `.sh-paint--ochre { fill: #c9a46a; opacity: 0.14 }`, `.tone-dark .sh-paint--ochre { opacity: 0.10 }`, `.sh-paint--lime { fill: #efe9dc; opacity: 0 }`, `.tone-dark .sh-paint--lime { opacity: 0.12 }` (D1).
  - Pen and glow: `.sh-dot { fill: var(--accent-gold); opacity: 1 }`; `.sh-glow-stop { stop-color: var(--accent-gold); stop-opacity: 0.35 }`, `.sh-glow-stop--out { stop-opacity: 0 }` (D4, D11).
  - `.scroll-stage` (D9, RT8): `position: fixed; z-index: 60; aria-hidden`. **Desktop (`min-width: 1025px`)**: a title block at `right: 2vw; bottom: 3vh`, right-aligned, no background: number in `--font-display`, name in Inter 0.65rem uppercase with letter-spacing 0.2em, caption in Cormorant italic 0.95rem in `--text-secondary`, then `.chapter-line` (60px × 1px, `--accent-gold`) and `.sh-ticks` (7 ticks, 1px × 8px, gap 6px; `--border-light`, `.is-on` ones `--accent-gold`). **Below 1025px**: the compact pill at `left: 12px; bottom: 16px`, padding `6px 12px`, `background: var(--bg-primary)` then `background: color-mix(in srgb, var(--bg-primary) 82%, transparent)`, `border: 1px solid var(--border-light)`, max width 60vw; `.chapter-line` and `.sh-ticks` hidden.
  - Hide the caption at `max-width: 480px` (E13).
  - `.scroll-house-wrap.is-hidden, .scroll-stage.is-hidden { opacity: 0 }` with a 0.4s `var(--ease-reveal)` transition.
  - `@media print { .scroll-house-wrap, .scroll-stage { display: none } }`.
- [ ] **Step 5: Add the scripts** to `index.html` after `js/lightbox.js`: `js/scroll-house-math.js`, then `js/scroll-house.js`.
- [ ] **Step 6: Check it visually.** Serve with `python3 -m http.server 8791 --bind 127.0.0.1`. Run `python3 tools/shot.py out.png W --noscroll --eval "ScrollHouse.ready.then(()=>ScrollHouse.render(T))"` with T at each stage midpoint and 1, at W = 1440 and W = 375, plus `--dark` at T = 1.
  - Expected: each stage is recognisable with the correct label; the text stays readable; the pen sits at the tip; no stray dot at the start of undrawn paths at T = 0.02 (E4); the ochre wash is visible on light paper at the paint midpoint (D1).
  - Resize check: render 0.6, dispatch `resize`, wait 300 ms, screenshot. Expected: no gaps. Then click the "Commercial" filter button, wait 600 ms: `ScrollHouse.state.end` has decreased and `state.pauseEnd − state.pauseStart` has shrunk (E2, C1).
- [ ] **Step 7: Commit** with `git add js/scroll-house.js tools/ && git commit -am "feat(scroll-house): layer, per-kind render, styles"`.

### Task 4: Scroll driver, spring loop, visibility

**Files:** modify `js/scroll-house.js` and `css/style.css`

**Interfaces:**
- Consumes: `ease`, `springStep`, `isAtRest`, `pausedProgress`; `render` / `measure` / `measureScroll` from Task 3.
- Produces: the class `.is-hidden` toggled on **both** `.scroll-house-wrap` and `.scroll-stage` (E11); `ScrollHouse.state = { target, x, v, running, start, end, pauseStart, pauseEnd }`.

- [ ] **Step 1: Progress.** In `measureScroll()` (E9): `start = hero.offsetTop + hero.offsetHeight − innerHeight * 0.5`, `end = scrollHeight − innerHeight`, plus the pause window from Task 3. On scroll: `target = ease(pausedProgress(scrollY, start, end, pauseStart, pauseEnd))`, then wake the loop only if `target` changed (inside the hold it does not, so the loop stays asleep and the pen keeps breathing; C1). The label needs nothing special during the hold: it keeps showing the stage at the frozen `target`.
- [ ] **Step 2: Loop.** Use rAF with a timestamp `dt`: `springStep`, then `render(x)`. When `isAtRest`, snap to `target`, do a final render, add `.is-resting` to `g.sh-pen` (D12 breathe) and stop; remove `.is-resting` on wake. On first load, set `x = target` directly and seed the Task 5 `complete[]` flags from `distribute(target)` before the first render (no replay, no shake burst; Review Focus 4, E7).
- [ ] **Step 3: Visibility and tone.**
  - `updateVisibility()` toggles `.is-hidden` on the wrap and the label (and pauses the loop) when `scrollY < start`, `body.modal-open` or `body.nav-open`. Call it once on `ready` from the current `body.classList` (E5: `main.js` may have set `modal-open` before this script attached), then from a `MutationObserver` on the body `class` and from the scroll handler (RT11).
  - Tone: an IntersectionObserver with `rootMargin: '-50% 0px -50% 0px'` on `[data-tone="dark"]` toggles `.tone-dark`. It is forced on when `html[data-theme="dark"]` (watched via a MutationObserver on `<html>`) (RT1).
- [ ] **Step 4: Reduced motion.** Call `render(1)` once and attach no loop. The visibility rules still apply.
- [ ] **Step 5: Checks.**
  - Default scroll pass with `--eval "ScrollHouse.ready.then(()=>JSON.stringify(ScrollHouse.state))"`. Expected: `"running":false`.
  - `--url "http://127.0.0.1:8791/#project-3" --noscroll --eval "ScrollHouse.ready.then(()=>document.querySelector('.scroll-house-wrap').classList.contains('is-hidden') && document.querySelector('.scroll-stage').classList.contains('is-hidden'))"`. Expected: `true` (E5, E11).
  - `--url "http://127.0.0.1:8791/#contact" --noscroll --eval "ScrollHouse.ready.then(()=>new Promise(r=>setTimeout(()=>r(document.querySelectorAll('.is-settling').length),400)))"`. Expected: `0` (E7).
  - `--reduced`. Expected: the full house.
- [ ] **Step 6: Commit** with `git commit -am "feat(scroll-house): spring scroll loop + visibility"`.

### Task 5: Kinetics and final verification

**Files:** modify `js/scroll-house.js`, `css/style.css`, `README.md` and `CONTENT-GUIDE.md`

**Interfaces:** produces the classes `.sh-stage.is-settling` (added when a shake starts, **removed by the loop when that shake ends**; E1), `.sh-stage.is-coming-apart`, `.scroll-house-wrap.is-thud`, and `g.sh-pen.is-resting`. One internal `composeTransform(stage) -> string` builds `translate(drift) translate(shake) rotate(shake)` and is the only writer of a stage `<g transform>` (E6).

- [ ] **Step 1: Settle-shake.**
  - Track a `complete[]` flag per stage with hysteresis (on at `f ≥ 1`, off at `f < 0.96`; RT3), seeded on first load (E7).
  - On an off → on flip, start a shake unless that stage is already shaking, and never with more than 2 stages shaking at once.
  - The shake is JS-driven inside the existing loop (RT4): per stage keep `{shakeT0, driftTarget, driftX, driftV}`; each frame compute the shake as a decaying sine with amplitude **1.4px and 0.12° over 320ms** (D8) about the cached stage bbox centre, and write `composeTransform(stage)`. The loop stays awake until the shakes end; when one ends, clear its state and remove `.is-settling` (E1).
  - Brick stage completion also adds `.is-thud` to the wrap for 180ms (CSS keyframe, **`translateY` 1px only**, D8), removed by a `setTimeout`, not `animationend`.
- [ ] **Step 2: Deconstruct drift.**
  - On an on → off flip, add `.is-coming-apart` and set that stage's `driftTarget` to a per-stage offset (4–8px, pointing away from the house centre: stage 0 down, 1 left, 2 down, 3 right, 4 left, 5 up, 6 outward). The loop springs `driftX` toward it with `springStep` and writes through `composeTransform` (E6).
  - It returns to 0 (and `.is-coming-apart` is removed once at rest) on the next off → on flip.
- [ ] **Step 3: Pen squash and roller.** `g.sh-pen`'s transform is one string: `translate(x y) scale(sx sy)`, with the squash `1 + min(|v|·0.6, 0.5)` along the travel direction and, during paint, the roller `scaleX 8, scaleY 0.5` (D12) in its place. Breathe: `.sh-pen.is-resting .sh-dot { animation: sh-breathe 1.6s var(--ease-out) infinite alternate }`, `scale(1) → scale(1.12)`; the circle sits at `cx=0 cy=0`, so no `transform-origin` or `transform-box` is needed (RT4).
- [ ] **Step 4: Label crossfade.** When the stage changes, use a 0.3s opacity and translateY(6px) swap; the tick strip updates on the same change.
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
  - **Jump (E8):** `scrollTo({top: document.querySelector('#contact').offsetTop, behavior: 'instant'})`, then sample `document.querySelectorAll('.is-settling').length` every 50ms for 1.5s. Expected: max ≤ 2, final 0. Repeat with `location.hash = '#contact'` (smooth scroll). Expected: max ≤ 2.
  - **Hold (C1):** at 1440, read `ScrollHouse.state` at `scrollY = pauseStart`, then scroll in 100px steps to `pauseEnd` (each via `scrollTo({behavior: 'instant'})`, 50ms apart) sampling `state.target` and `state.running`. Expected: `target` identical at every sample and `running` false after the first settle; `target` strictly increases again from `pauseEnd + 100`. Screenshot mid-hold: the grid on screen, the pen resting on the half-laid course, label `03 / 07 — Brickwork`.
  - No console errors; `scrollWidth` equals the viewport width.
  - **Perf (RT5):** use CDP `Emulation.setCPUThrottlingRate {rate: 4}` at 375, scroll programmatically for 3s, and sample `requestAnimationFrame` deltas. Expected: median ≤ 17ms and p95 ≤ 33ms.
  - **Tone (RT1):** in the light theme, scroll so that Services is centred. Expected: the wrap has `.tone-dark` and the lines are visible in the screenshot. Also at `scrollY = start` (hero bottom at the viewport centre): the wrap is visible and already `.tone-dark` (D6).
  - **Night & Gold (N1):** `--dark` at the stage-5 midpoint and at 100%. Expected: wires read as terracotta, distinct from the ivory lines; the ochre and lime washes both show on navy; the gold glow is visible in the windows at 100%.
  - **Lift (RT2):** a screenshot over the project grid shows no lines crossing the card images; a screenshot over Contact at 100% shows the finished house through the form.
  - **Label (D9):** at 1440 the title block sits under the ground line at the right, with 7 gold ticks at 100%; at 375 the pill shows number + name only.
- [ ] **Step 7: Commit** with `git commit -am "feat(scroll-house): kinetics, label crossfade, docs"`.
