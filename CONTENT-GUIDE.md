# Content Guide

All content lives in **`index.html`**, so you only need a text editor to change it. Every block you can edit is marked with a comment, so search the file for `CONTENT:` to jump to each one. Line numbers below are approximate.

> Edit text only *between* the tags. Leave `class="..."`, `id="..."` and `data-...` attributes as they are, because the styling and animations depend on them.

## 1. Studio name, page title and SEO (`index.html`, top, ~line 7–60)

| What | Where |
| --- | --- |
| Browser tab title and Google description | `<title>`, `<meta name="description">` |
| Social preview (WhatsApp, LinkedIn, X) | `og:*` / `twitter:*` meta tags; image `images/og-image.png` (1200×630) |
| Business details for Google | `<script type="application/ld+json">` block |
| Logo text | `ANJALI<span>.</span>` in the header (~line 75) and the footer brand (~line 627) |

If you rename the studio, search the file for `Anjali` and replace every match. Do the same in `404.html`.

## 2. Hero (~line 120)

- **Background image:** replace `images/hero-bg.svg` with a wide photo (at least 1600×900). JPG or WebP works; update the path in the `style="background-image:url(...)"` attribute.
- **Heading:** the `<h1 class="text-build">` must contain **plain text only**. Don't add `<br>`, `<em>` or other tags inside it, because JavaScript splits it into letters for the build animation.
- **Eyebrow, subtitle, buttons:** edit them freely.

## 3. Stats (~line 180)

```html
<span class="stat-num" data-target="12" data-suffix="+">12+</span>
```

Update all three values together: `data-target` is the number to count up to, `data-suffix` is what follows it (`+`, `%` or nothing), and the visible text is what shows when JavaScript is off.

## 4. Projects (~line 214) and project details (~line 659 onward)

Each project has two parts:

1. **A card** in the grid (`<article class="project-card ...">`).
2. **A detail pop-up** at the bottom of the file (`<div class="project-modal" id="project-N">`).

**To edit a project,** change the name, category, description and image in both places.

**Filter categories:** the card's `data-category` must be one of `residential`, `commercial`, `hospitality` or `public`, matching the filter buttons. To add a category, add a `<button class="filter-btn" data-filter="newname" role="tab" aria-selected="false">` and use `data-category="newname"` on its cards.

**Featured card:** the first card has the class `featured` and appears twice as large. Move that class to feature a different project.

**Adding a 7th project:**
1. Copy a whole `<article class="project-card ...">` and set `style="--i: 6"`, `href="#project-7"` and the new text and image.
2. Copy a whole `project-modal` block and change `id="project-7"`, `aria-labelledby="project-7-title"`, the `<h2 id="project-7-title">`, and the `01 / 06` counters.
3. Fix the **Previous / Next** links so the chain loops: project 6's "Next" goes to `#project-7`, project 7's goes to `#project-1`, and project 1's "Previous" goes to `#project-7`.

**Images:**
- Card images are 800×600 (4:3).
- To use WebP, uncomment the `<source srcset="...webp">` line inside each `<picture>`, but **only once that .webp file actually exists**. A missing WebP shows a broken image.
- **Gallery photos:** add more `<img>` tags inside `.modal-gallery`, each with `data-lightbox="project-N"`. Clicking one opens the full-screen viewer. The viewer ignores `.svg` placeholders, so it only starts working once real photos are added.
- Always write a meaningful `alt="..."` description.

## 5. About (~line 336)

Replace `images/about-portrait.svg` with a portrait photo (about 600×720, portrait orientation), then edit the paragraphs and the signature line.

## 6. Services, Process, Testimonials (~lines 387, 440, 490)

Each item is a repeated block. To add or remove one, copy or delete a whole block. Keep the `style="--i: N"` values counting up from 0, because they control the stagger timing.

## 7. Contact (~line 552)

Edit the email, phone and studio address, and replace `href="#"` on the social links with real profile URLs (also in the footer, ~line 640).

### Making the contact form actually send email

At the moment the form validates the input and shows a thank-you note, but it doesn't send anything. Choose one of these:

1. **Formspree** (free, easiest)
   1. Sign up at formspree.io and create a form to get an ID.
   2. Change the form tag to:
      `<form class="contact-form reveal-up" id="contactForm" action="https://formspree.io/f/YOUR_ID" method="POST" novalidate>`
   3. In `js/main.js`, find the comment `// CONTENT: see CONTENT-GUIDE.md` in the submit handler. Replace the two lines after it with:
      ```js
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function () { formNote.hidden = false; form.reset(); });
      ```
      This keeps the validation and still sends the message.
2. **Netlify Forms** (only if you host on Netlify): add `name="contact" data-netlify="true"` to the `<form>` tag.
3. **EmailJS** (free tier): add their SDK and call `emailjs.sendForm(...)` in the same spot in `main.js`.

## 8. Colours and fonts

Colours and fonts are design tokens at the top of `css/style.css` in `:root`. The dark theme overrides them under `[data-theme="dark"]`. Change a token once and it updates everywhere.

## 9. After editing

Preview locally with `python3 -m http.server 8000`, then open http://localhost:8000. Commit and push to `main`, and GitHub Pages updates within about a minute.
