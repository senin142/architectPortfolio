/* Core behaviour — header, nav, reveals, split text, counters, modals, form. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var header = document.getElementById('header');
  var progressFill = document.querySelector('.scroll-progress-fill');

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Split text: words → masked characters ---------- */
  function splitText(el) {
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    var charIndex = 0;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(' ').forEach(function (word, w) {
      if (w > 0) el.appendChild(document.createTextNode(' '));
      var wordEl = document.createElement('span');
      wordEl.className = 'word';
      wordEl.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (ch) {
        var mask = document.createElement('span');
        mask.className = 'char-mask';
        var c = document.createElement('span');
        c.className = 'split-char';
        c.style.setProperty('--char-i', charIndex++);
        c.textContent = ch;
        mask.appendChild(c);
        wordEl.appendChild(mask);
      });
      el.appendChild(wordEl);
    });
  }
  document.querySelectorAll('.text-build').forEach(splitText);

  /* ---------- Line draw: measure each path ---------- */
  document.querySelectorAll('.draw-path').forEach(function (path) {
    if (typeof path.getTotalLength !== 'function') return;
    var len = Math.ceil(path.getTotalLength()) + 1;
    path.style.setProperty('--path-length', len);
  });

  /* ---------- Counters ---------- */
  function animateCounter(el) {
    var target = parseInt(el.dataset.target, 10);
    if (isNaN(target)) return;
    var suffix = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = target + suffix; return; }
    var duration = 1800;
    var start = performance.now();
    function tick(now) {
      var p = Math.min((now - start) / duration, 1);
      var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    el.textContent = '0' + suffix;
    requestAnimationFrame(tick);
  }

  /* ---------- Reveal on scroll ---------- */
  var revealSelector = '.reveal-up, .reveal-fade, .clip-reveal, .clip-reveal-diagonal, .curtain-reveal, .line-draw, .text-build';
  var revealEls = document.querySelectorAll(revealSelector);
  var counters = document.querySelectorAll('.stat-num[data-target]');

  // Hero plays its construction sequence on load, not on scroll
  document.querySelectorAll('.hero .line-draw, .hero .text-build').forEach(function (el) {
    requestAnimationFrame(function () { el.classList.add('visible'); });
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
    counters.forEach(function (el) { el.textContent = el.dataset.target + (el.dataset.suffix || ''); });
  } else {
    // A fully clipped element never "intersects" in Chrome, so clip-path
    // reveals are observed through their parent instead.
    var targets = new Map();
    revealEls.forEach(function (el) {
      if (el.closest('.hero') || el.closest('.project-modal')) return;
      var isClip = el.classList.contains('clip-reveal') || el.classList.contains('clip-reveal-diagonal');
      var watch = isClip ? el.parentElement : el;
      if (!targets.has(watch)) targets.set(watch, []);
      targets.get(watch).push(el);
    });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        targets.get(entry.target).forEach(function (el) { el.classList.add('visible'); });
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (_, watch) { revealObserver.observe(watch); });

    // Modal content is revealed as soon as it exists (modals are display:none until opened)
    document.querySelectorAll('.project-modal').forEach(function (m) {
      m.querySelectorAll(revealSelector).forEach(function (el) { el.classList.add('visible'); });
    });

    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { counterObserver.observe(el); });
  }

  /* ---------- Header state, scroll progress, scroll-spy ---------- */
  var navLinks = document.querySelectorAll('.nav-desktop a[href^="#"]');
  var spySections = Array.prototype.map.call(navLinks, function (a) {
    return document.querySelector(a.getAttribute('href'));
  });
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 40);

    if (progressFill) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progressFill.style.transform = 'scaleY(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }

    var mark = y + window.innerHeight * 0.35;
    var current = -1;
    spySections.forEach(function (sec, i) {
      if (sec && sec.offsetTop <= mark) current = i;
    });
    navLinks.forEach(function (a, i) { a.classList.toggle('active', i === current); });
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById('navToggle');
  var navMobile = document.getElementById('navMobile');

  function setNav(open) {
    if (!navToggle || !navMobile) return;
    navMobile.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (navToggle && navMobile) {
    navToggle.addEventListener('click', function () {
      setNav(navToggle.getAttribute('aria-expanded') !== 'true');
    });
    navMobile.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setNav(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navMobile.classList.contains('open')) { setNav(false); navToggle.focus(); }
    });
  }

  /* ---------- Project modals (hash-routed) ---------- */
  var activeModal = null;
  var FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

  function openModal(modal) {
    if (activeModal === modal) return;
    if (activeModal) hideModal(activeModal, true);
    activeModal = modal;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modal.scrollTop = 0;
    requestAnimationFrame(function () {
      modal.classList.add('is-open');
      var closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    });
  }

  function hideModal(modal, instant) {
    modal.classList.remove('is-open');
    if (instant || reduceMotion) modal.hidden = true;
    else setTimeout(function () { if (!modal.classList.contains('is-open')) modal.hidden = true; }, 350);
  }

  function closeModal(updateUrl) {
    if (!activeModal) return;
    var modal = activeModal;
    activeModal = null;
    hideModal(modal, false);
    document.body.classList.remove('modal-open');
    if (updateUrl) history.replaceState(null, '', '#projects');
    var link = document.querySelector('.project-link[href="#' + modal.id + '"]');
    if (link) link.focus({ preventScroll: true });
  }

  function route() {
    var hash = location.hash;
    var modal = /^#project-\d+$/.test(hash) ? document.querySelector(hash) : null;
    if (modal && modal.classList.contains('project-modal')) openModal(modal);
    else closeModal(false);
  }

  document.querySelectorAll('.project-modal').forEach(function (modal) {
    modal.querySelectorAll('.modal-close, .modal-close-text').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(true); });
    });
  });

  document.addEventListener('keydown', function (e) {
    if (!activeModal) return;
    if (e.key === 'Escape') { closeModal(true); return; }
    if (e.key !== 'Tab') return;
    var items = Array.prototype.filter.call(activeModal.querySelectorAll(FOCUSABLE), function (el) {
      return el.offsetParent !== null;
    });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  window.addEventListener('hashchange', route);
  route();

  /* ---------- Contact form validation ---------- */
  var form = document.getElementById('contactForm');
  var formNote = document.getElementById('formNote');

  function validateField(field) {
    var error = field.closest('.form-row') && field.closest('.form-row').querySelector('.field-error');
    var value = field.value.trim();
    var message = '';
    if (field.required && !value) message = 'This field is required';
    else if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = 'Please enter a valid email';
    else if (field.minLength > 0 && value.length > 0 && value.length < field.minLength) message = 'Minimum ' + field.minLength + ' characters';

    field.classList.toggle('invalid', !!message);
    field.classList.toggle('valid', !message && !!value);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) error.textContent = message;
    return !message;
  }

  if (form) {
    var fields = form.querySelectorAll('input, textarea');
    fields.forEach(function (field) {
      field.addEventListener('blur', function () { if (field.value) validateField(field); });
      field.addEventListener('input', function () {
        if (field.classList.contains('invalid')) validateField(field);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      fields.forEach(function (field) {
        if (!validateField(field) && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }
      // CONTENT: see CONTENT-GUIDE.md to connect Formspree / EmailJS
      if (formNote) formNote.hidden = false;
      form.reset();
      fields.forEach(function (f) { f.classList.remove('valid', 'invalid'); f.removeAttribute('aria-invalid'); });
    });
  }
})();
