# Anjali Design Studio — Architect Portfolio

A single-page portfolio for an architecture and interior design studio. It is built with plain HTML, CSS and JavaScript, so there is no framework and no build step.

**Live:** https://senin142.github.io/architectPortfolio/

## Design: "Drawn Into Being"

Each animation is meant to look like part of designing a building:

| Effect | Where it's used |
| --- | --- |
| SVG line drawings that draw themselves | Hero elevation, section dividers, footer floor plan |
| Split-text build (letters rise into place one at a time) | Hero heading |
| Gold curtain that slides off to reveal an image | Project cards |
| Angled clip-path reveals | About portrait, process steps |
| Scroll progress line along the left edge | Whole page |
| Scroll house: lines fly in from the screen edges and draw a professional floor plan (grid, walls, services). The plan then folds up in 3D into the front elevation, which is built frame → brick → paint → home. Scrolling up reverses it all | Background, from the stats strip to the footer |

The page also has a light and dark theme with no flash of the wrong theme on load, and it honours `prefers-reduced-motion`. With JavaScript turned off, all content is still visible.

## Structure

```
index.html        All content: sections plus project modals at the bottom
404.html          Custom GitHub Pages 404
css/style.css     All styles (design tokens are at the top in :root)
js/theme.js       Dark/light toggle
js/main.js        Header, nav, reveals, split text, counters, modals, form
js/filter.js      Project category filter
js/lightbox.js    Image viewer (opens only for real photos, not SVG placeholders)
js/scroll-house*.js  Scroll house animation (+ math, unit-tested: node tests/scroll-house-math.test.js)
images/           Placeholder SVGs, favicon, og-image.png
robots.txt, sitemap.xml
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

`404.html` uses `<base href="/architectPortfolio/">` so that it works from any missing path on GitHub Pages. Because of that, its styles only load when the site is deployed.

## Deploy (GitHub Pages)

1. Go to Settings → Pages.
2. Set the source to **Deploy from a branch**, then pick `main` and `/ (root)`.
3. The site appears at `https://senin142.github.io/architectPortfolio/` after about a minute.

## Editing content

See **[CONTENT-GUIDE.md](CONTENT-GUIDE.md)**. Every editable block in `index.html` is marked with a `<!-- CONTENT: ... -->` comment.
