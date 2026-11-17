# Scroll House: Design (v4, reviewed by design + engineering; see the Red-Team Log and Review Log in the plan)

## Intent

As the user scrolls, a pen line builds a **contemporary Indian house (traditional but modern)** in the page background. It shows the **whole construction story**: layout line → frame → brick → plumbing → electrical → plaster and paint → the finished, lit house. Scrolling up takes it apart in reverse.

The goals:
- Hook visitors at the top and reward them for scrolling to the end.
- Let clients *feel* the architect's process.
- Extend the site's "Drawn Into Being" identity.

Reference style: minimal line motion graphics, i.e. a single smooth curve with a dot riding its tip.

**User requirements (verbatim intent):**
- An Indian house, traditional but modern.
- It shows every step from line to brick to plumbing to electrical to paint, then the full house.
- Detailed, but easy enough to understand.
- Fast at the top so users get interested; smooth and pleasing.
- Kinetic shakes.
- Works on mobile and desktop.
- Progress visible.

## Research basis

- **Contemporary Indian elevation:** Indian logic for shading, threshold and material (verandah/*osari*, jaali screens, deep *chhajja* overhangs, sloped terracotta-tile roofs, courtyard), combined with contemporary proportion and restraint. Sources: ongrid.design "contemporary indian elevation design", kaarwan.com "elements of traditional indian house design", luxe.outlookindia.com (courtyards, jaalis, verandahs).
- **Indian construction sequence:** excavation and foundation → plinth, columns and beams (RCC frame) → brick/AAC masonry → lintel and roof slab → electrical conduits and plumbing lines (concealed, *before* plaster) → plaster → paint → fixtures and quality check. Sources: jkcement.com step-by-step house construction; bricknbolt.com 10-step process.
- **Technique precedent:** the scroll-driven `stroke-dashoffset` draw is a proven pattern (bradwoods.io draw-on-scroll; Codrops scroll-driven SVG). We implement it without GSAP.

## The house

A single-storey-plus-one contemporary Indian home, in elevation (front view):

- **Ground floor:** a front **verandah** with 3 slim pillars and a stepped plinth (3 steps); a plain double-leaf main door with a threshold step; one window with a deep **chhajja** (cast RCC, so it appears with the frame, not the finish).
- **Upper floor:** a modern flat-roof box with a horizontal ribbon window and a **jaali** screen panel (a simple geometric lattice).
- **Roof:** a **sloped terracotta-tile roof** over the verandah wing. Tile courses are drawn as short parallel strokes.
- On the flat roof: the **overhead water tank** (Sintex-style cylinder), which the plumbing stage connects to.
- **Landscaping:** a courtyard tree (frangipani/neem silhouette), a tulsi planter by the steps, and the ground line.
- **Readable at a glance:** about 20% of the detail of a real drawing. Every element must be recognisable at 12–18% opacity and at a 375px width. No tiny text inside the drawing.

## The 7 stages

The label shows `0N / 07 — Name` plus one short caption, so the story is easy to follow.

| # | Name | What appears | Caption | Visual treatment |
| --- | --- | --- | --- | --- |
| 1 | Layout | Ground line, plot pegs, the plan line pulled taut, one dimension line with hero-style ticks | "Marking the plot" | Single continuous pen line (the reference curve, round caps), gold dot at tip |
| 2 | Frame | Plinth, columns, beams, slabs, chhajja | "Raising the RCC frame" | Pen line continues (square caps from here on) |
| 3 | Brickwork | Brick courses fill the walls row by row; window and door openings stay empty | "Laying the walls, course by course" | Short brick strokes, rows revealed bottom-up; the dot runs along the current course |
| 4 | Plumbing | Water tank, down-pipe, lines to kitchen and bath, small valve/tap symbols | "Water lines, before the plaster" | Sage-green dashed runs draw from the tank down |
| 5 | Electrical | Meter box, conduit runs, switch boxes, light points | "Wiring every room" | Terracotta conduit runs with small square boxes and dot points (gold is reserved for the dot and the glow) |
| 6 | Plaster & Paint | The ochre accent wall washes in (lime-white on dark tones only); brick strokes fade under the wipe; the pipes and wires fade *under* the paint (concealed) | "Plaster, then colour" | A paint "roller wipe" (clip reveal) upward; the dot becomes a roller bar spanning the wall |
| 7 | Home | Sloped tile roof, jaali, door, tree, tulsi; window lights glow on | "Home." | Final line work, then a warm gold glow in the windows over the last 15% of scroll (payoff for electrical) |

## Goals

- **Front-loaded speed:** about 20% of the *effective* scroll completes stages 1–3 (measured: 19%), so the house visibly exists quickly. Plumbing ends near 28%, electrical near 37%, paint near 51%, and Home draws over the second half with the lights coming on in the last 15% (Contact and the footer).
- **Pause during Projects (client decision):** the house builds fast over the stats strip, holds still while the Projects grid fills the viewport (the pen rests and breathes, the label keeps its stage), then continues from About onwards. Scroll inside the hold window contributes nothing to progress; the window follows the grid's height, so filtering shortens it. At 1440×900 the hold begins with the brick courses 42% laid and ends as About arrives; Plumbing lands in About, Electrical crossing into Services, Paint in Services, Home over Process, Testimonials and Contact.
- **Kinetic feel:**
  - The pen follows scroll on a spring with slight lag and overshoot.
  - Each completed stage settle-shakes (about 1.4px and 0.12°, 320ms): a settle, not a wobble.
  - When the brick courses finish they give one small vertical "thud" (1px).
  - Scrolling up deconstructs: the stage un-draws, and completed stages drift 4–8px apart as they come off.
  - Everything is at rest when scrolling stops; the resting dot breathes gently.
- **Progress visible:** the existing gold left-edge line, plus the stage label. On desktop it is a small title block under the house (bottom right): number, name, caption, a 60px gold rule and a 7-tick strip that fills gold stage by stage. On tablet and mobile it is a compact pill bottom-left.
- **Mobile and desktop:** the same drawing.
  - Desktop: right side, 92vh tall.
  - Tablet: centred, 88vh tall.
  - Mobile: full viewport width anchored bottom-right (375×500 at 375px), slightly lower opacity behind text. The caption is hidden on screens ≤ 480px.

## Non-goals and anti-goals

- No libraries (no GSAP) and no build step.
- **Text readability comes first.** Lines at about 16% opacity (the stage currently drawing at about 26%), paint washes at 10–14%. Lines do draw over body text and transparent cards by design; only photos and opaque cards sit above them. If it competes with the content, that is a failure.
- No mobile jank: no layout reads in the loop, and no work while idle.
- No cartoonishness. It must stay architectural line art with restrained colour (the site palette only: ink or ivory lines, terracotta wires, sage pipes, ochre and lime-white washes; gold only for the dot and the window glow). It must sit as well on the Night & Gold dark theme (midnight navy) as on paper.

## Approaches considered

1. **SVG with per-stage reveal techniques + JS spring (chosen).** Line stages use `stroke-dashoffset`; brick uses per-row reveal; paint uses a `clip-path` wipe; glow uses opacity. It is precise and cheap, and it matches the existing `.draw-path` technique.
2. **Canvas redraw per frame.** Needs a full repaint every frame and duplicates the SVG line language, so it was rejected.
3. **CSS `animation-timeline: scroll()`.** It has no spring, no tip-following dot, and patchy Safari/Firefox support, so it was rejected.

## Design (implementation shape)

- **Artwork:** `images/scroll-house.svg` (viewBox `0 0 600 800`). It is fetched and inlined by JS, so without JS it is absent, and if the fetch fails the site is unaffected. Its structure is the contract:
  - `g.sh-stage[data-stage="0..6"][data-kind]`, where kind is one of `line | brick | pipe | wire | paint | finish`.
  - Line kinds (`line`, `pipe`, `wire`, `finish`) contain `path.sh-path` elements, drawn in document order.
  - `brick` contains `g.sh-course` rows, bottom row first.
  - `paint` contains `.sh-paint` filled shapes.
  - `finish` may also contain `.sh-glow` shapes filled by a `radialGradient` (gold, 0.35 → 0; no filters).
  - The `pipe` and `wire` stages wrap their paths in an inner `g.sh-services`, so paint can fade them without touching the stage group's own opacity (one writer per attribute).
- **Mapping:**
  - Scroll progress `s` runs from the end of the hero to the bottom of the page, snapping to 1 at `s ≥ 0.995`. It is *effective* scroll: the hold window over the Projects grid (`gridTop − 0.35·innerHeight` to `gridBottom − 0.65·innerHeight`) is removed from both numerator and denominator (`pausedProgress`).
  - `target = ease(s) = 1 − (1 − s)^2.2` is front-loaded.
  - A spring drives `x` toward `target`.
  - `x` is distributed across the 7 stages by weight (not by raw length): weights `[0.8, 0.9, 1.2, 1, 1, 1.2, 1.6]`.
- **Per-kind render of stage fraction `f`:**
  - **line:** distribute `f` across the paths by length and set `dashoffset` (dasharray `L L+2`, offset `(L+1)(1−f)`, so an undrawn path shows no cap dot).
  - **brick:** reveal bricks one by one, left → right within each course and bottom course first (`round(f·N)` bricks visible).
  - **paint:** an SVG `<clipPath>` rect rises from the bottom (its attributes are set by JS, which is Safari-safe); `g.sh-services` opacity goes `1 → 0.18` and each brick course fades `1 → 0.25` as the wipe passes it. The ochre accent wall carries the paint on light paper (0.14); lime-white appears only on dark tones (0.12).
  - **finish:** line rule for its paths, with `.sh-glow` opacity ramping in over the last 15% of raw scroll (`t ≥ ease(0.85)`).
  - **active stage:** the stage currently drawing is 1.6× its base opacity and crossfades to base on completion.
- **Pen dot:** `g.sh-pen > circle.sh-dot` (gold, r 4.5, opaque) sits at the active tip. During paint it morphs (`scaleX` 8, `scaleY` 0.5) into a roller bar riding the wipe edge. At rest it breathes (scale 1 → 1.12, 1.6s).
- **Layer:**
  - `svg.scroll-house`: fixed, `pointer-events: none`, `aria-hidden`, `z-index: 50` (under the header and modals).
  - No blend modes. Line colour follows the *tone* of the section under the viewport centre (dark sections: the hero, Services and the footer; or dark theme → light lines).
  - Photos and opaque cards (project cards, the about image, testimonial cards) sit above the layer, so lines never cross photos. The contact form, stats and translucent service cards are not lifted: the finished house shows through them.
  - Hidden while the hero is on screen, while `body.modal-open` and while `body.nav-open`; visibility is evaluated from the body class as soon as the layer is ready.
  - Scroll range is remeasured on resize and whenever `main` changes height (project filter, lazy images, font swap); path lengths are measured once.
- **Accessibility:** under `prefers-reduced-motion`, show the complete static house. Print hides it.

## Left to the builder

Exact path geometry, spring constants within the plan's ranges, opacity tuning per theme, and caption visibility on the smallest screens.

## Verification

- Screenshots at each stage midpoint and at 100% scroll, in light and dark, at 1440 and 375.
- A person unfamiliar with it can name the stage from the drawing alone (self-check against the captions).
- Scrolling up reverses.
- A jump to `#contact` (instant and smooth) never shakes more than 2 stages at once and settles to none.
- Scrolling through the Projects grid leaves the target progress unchanged; the build resumes on either side without a jump.
- Reduced motion shows the static house.
- In the Night & Gold theme the wires, washes and glow all read on navy.
- No console errors and no horizontal overflow; the idle loop stops.

---

## v5 addendum (2026-11-17): plan → elevation, professional drafting, edge fly-ins

The client asked for: a "more professional" drawing that looks like a professional architect's plan; lines that travel in from the screen edges in every direction and join the design; and both views, a floor plan that rotates from top view to front view, to show more detail.

**Sequence: 8 stages.** The weights are `[0.8, 1.1, 1.0, 0.9, 0.9, 1.2, 1.1, 1.6]`.

| # | Name | View | Content |
|---|---|---|---|
| 1 | Site & grid | plan | plot boundary (dash-dot), structural grid A–D / 1–3 with circled labels, north arrow |
| 2 | Floor plan | plan | 230 mm walls with poché hatch, columns, doors with swing arcs, windows, verandah steps, open-to-sky aangan with tulsi, room names, dimension strings, title "GROUND FLOOR PLAN · 1:100" |
| 3 | Services | plan | plumbing (fixtures: WC, basin, sink, shower, inspection chamber) and electrical (⊗ lights, switches, sockets, DB, curved wiring runs), as in real MEP plans |
| 4 | Plan to elevation | both | the plan tips back flat (CSS 3D `rotateX` 0 → 90°, hinged on the front wall / ground line) while the elevation rises (−90° → 0) from the same line |
| 5 | Frame | elevation | ground, plinth, RCC frame, chhajja, grid axes with bubbles, level markers (▽ ±0.00 GL, +0.45 PL, +3.30 FFL, +6.60 TOS), earth hatch, dimension strings |
| 6 | Brickwork | elevation | brick courses; conduits and water lines go in with the masonry |
| 7 | Plaster & Paint | elevation | roller wipe; services concealed |
| 8 | Home | elevation | roof, jaali, door, tree, tulsi; leader notes; title "FRONT ELEVATION · 1:100"; lights glow |

**Both views share the same coordinates** (`viewBox 0 280 600 540`):
- grid axes at x = 95 / 300 / 400 / 500, matching the elevation's column centres;
- the plan's front wall and the elevation's ground line are both at y = 740, which is the hinge.

So the rotation reads as one drawing turning, not two pictures swapping.

**Professional drafting:**
- line-weight hierarchy: `.sh-heavy` 2.2 for cut, outline and ground; the default 1.5; `.sh-detail` 1.0 for hatching; `.sh-thin` 0.6 for grid, dimensions and leaders;
- `<text class="sh-note">` annotations (Inter, small caps-style, letter-spaced), which fade in once their stage is about 80% drawn.

**Edge fly-ins:**
- A second full-viewport SVG carries 6–10 comet lines per drawing stage. Each starts at a screen edge (spread around all four sides and the diagonals) and travels to a joint of that stage. The tail follows the head, so the line "joins" the drawing and disappears into it.
- They are scrubbed by scroll and reverse on scroll-up.
- Anchors are measured in screen space once per measure (with the 3D transforms cleared). No fly-ins during the rotation stage.

**Grouping:** groups may share a stage number. A stage's fraction drives every group with that `data-stage`, each by its own `data-kind`. The pause during Projects, the hysteresis, the shakes, the drift, the label, tone, reduced motion and visibility all carry over unchanged.
