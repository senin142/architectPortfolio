# Scroll House: Design (v3, red-teamed; see the Red-Team Log in the plan)

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

- **Ground floor:** a front **verandah** with 3 slim pillars and a stepped plinth (3 steps); a carved wooden main door; one window with a deep **chhajja**.
- **Upper floor:** a modern flat-roof box with a horizontal ribbon window and a **jaali** screen panel (a simple geometric lattice).
- **Roof:** a **sloped terracotta-tile roof** over the verandah wing. Tile courses are drawn as short parallel strokes.
- On the flat roof: the **overhead water tank** (Sintex-style cylinder), which the plumbing stage connects to.
- **Landscaping:** a courtyard tree (frangipani/neem silhouette), a tulsi planter by the steps, and the ground line.
- **Readable at a glance:** about 20% of the detail of a real drawing. Every element must be recognisable at 12–18% opacity and at a 375px width. No tiny text inside the drawing.

## The 7 stages

The label shows `0N / 07 — Name` plus one short caption, so the story is easy to follow.

| # | Name | What appears | Caption | Visual treatment |
| --- | --- | --- | --- | --- |
| 1 | Layout | Ground line, plot pegs, the plan line pulled taut | "Marking the plot" | Single continuous pen line (the reference curve), dot at tip |
| 2 | Frame | Plinth, columns, beams, slabs | "Raising the RCC frame" | Pen line continues |
| 3 | Brickwork | Brick courses fill the walls row by row; window and door openings stay empty | "Laying the walls, course by course" | Short brick strokes, rows revealed bottom-up; the dot runs along the current course |
| 4 | Plumbing | Water tank, down-pipe, lines to kitchen and bath, small valve/tap symbols | "Water lines, before the plaster" | Sage-green dashed runs draw from the tank down |
| 5 | Electrical | Meter box, conduit runs, switch boxes, light points | "Wiring every room" | Terracotta/gold conduit runs with small square boxes and dot points |
| 6 | Plaster & Paint | Walls wash in lime-white / warm ochre; the pipes and wires fade *under* the paint (concealed) | "Plaster, then colour" | A paint "roller wipe" (clip reveal) upward; the dot becomes a short roller bar |
| 7 | Home | Sloped tile roof, jaali, chhajja, door, tree, tulsi; window lights glow on | "Home." | Final line work, then a warm glow in the windows (payoff for electrical) |

## Goals

- **Front-loaded speed:** about 20% of the scroll completes stages 1–3, so the house visibly exists quickly. The later stages add richness more slowly.
- **Kinetic feel:**
  - The pen follows scroll on a spring with slight lag and overshoot.
  - Each completed stage settle-shakes (2–3px, about 420ms).
  - When the brick courses finish they give one small "thud".
  - Scrolling up deconstructs: the stage un-draws, and completed stages drift 4–8px apart as they come off.
  - Everything is at rest when scrolling stops.
- **Progress visible:** the existing gold left-edge line, plus the stage label and caption fixed bottom-left.
- **Mobile and desktop:** the same drawing.
  - Desktop: right side, about 42vw.
  - Mobile: centred, full viewport height, slightly lower opacity behind text. The caption is hidden on screens ≤ 380px if it crowds the content.

## Non-goals and anti-goals

- No libraries (no GSAP) and no build step.
- **Text readability comes first.** Lines at about 16% opacity, paint washes at about 10%. If it competes with the content, that is a failure.
- No mobile jank: no layout reads in the loop, and no work while idle.
- No cartoonishness. It must stay architectural line art with restrained colour (the site palette only: ink, gold, terracotta, sage, lime-white, ochre).

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
  - `finish` may also contain `.sh-glow` shapes.
  - The `pipe` and `wire` groups also carry the class `sh-services`, so paint can fade them.
- **Mapping:**
  - Scroll progress `s` runs from the end of the hero to the bottom of the page.
  - `target = ease(s)` is front-loaded.
  - A spring drives `x` toward `target`.
  - `x` is distributed across the 7 stages by weight (not by raw length): weights `[1, 1, 1.2, 1, 1, 1.2, 1.4]`.
- **Per-kind render of stage fraction `f`:**
  - **line:** distribute `f` across the paths by length and set `dashoffset`.
  - **brick:** reveal bricks one by one, left → right within each course and bottom course first (`round(f·N)` bricks visible).
  - **paint:** an SVG `<clipPath>` rect rises from the bottom (its attributes are set by JS, which is Safari-safe); `.sh-services` opacity goes `1 → 0.18` as `f` goes `0 → 1`.
  - **finish:** line rule for its paths, with `.sh-glow` opacity ramping in over the last 30%.
- **Pen dot:** `circle.sh-dot` sits at the active tip. During paint it morphs (`scaleX` 3, `scaleY` 0.5) into a roller bar riding the wipe edge.
- **Layer:**
  - `svg.scroll-house`: fixed, `pointer-events: none`, `aria-hidden`, `z-index: 50` (under the header and modals).
  - No blend modes. Line colour follows the *tone* of the section under the viewport centre (dark sections such as Services and the footer, or dark theme → light lines).
  - Solid surfaces (cards, images, form) sit above the layer, so lines never cross photos.
  - Hidden while the hero is on screen and while `body.modal-open`.
- **Accessibility:** under `prefers-reduced-motion`, show the complete static house. Print hides it.

## Left to the builder

Exact path geometry, spring constants within the plan's ranges, opacity tuning per theme, and caption visibility on the smallest screens.

## Verification

- Screenshots at each stage midpoint and at 100% scroll, in light and dark, at 1440 and 375.
- A person unfamiliar with it can name the stage from the drawing alone (self-check against the captions).
- Scrolling up reverses.
- Reduced motion shows the static house.
- No console errors and no horizontal overflow; the idle loop stops.
