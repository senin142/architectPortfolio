/* Lightbox — only for real photos (R17: SVG placeholders are skipped). */
(function () {
  var triggers = Array.prototype.filter.call(
    document.querySelectorAll('img[data-lightbox]'),
    function (img) { return !/\.svg(\?|#|$)/i.test(img.currentSrc || img.src); }
  );
  if (!triggers.length) return;

  var box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Image viewer');
  box.hidden = true;
  box.innerHTML =
    '<img class="lightbox-img" alt="">' +
    '<button class="lightbox-close" type="button" aria-label="Close image viewer">&times;</button>' +
    '<button class="lightbox-prev" type="button" aria-label="Previous image">&larr;</button>' +
    '<button class="lightbox-next" type="button" aria-label="Next image">&rarr;</button>' +
    '<span class="lightbox-counter" aria-live="polite"></span>';
  document.body.appendChild(box);

  var img = box.querySelector('.lightbox-img');
  var counter = box.querySelector('.lightbox-counter');
  var group = [], index = 0, opener = null, touchX = null;

  function show(i) {
    index = (i + group.length) % group.length;
    var src = group[index];
    img.src = src.currentSrc || src.src;
    img.alt = src.alt;
    counter.textContent = (index + 1) + ' / ' + group.length;
  }

  function open(trigger) {
    var name = trigger.dataset.lightbox;
    group = triggers.filter(function (t) { return t.dataset.lightbox === name; });
    opener = trigger;
    show(group.indexOf(trigger));
    box.hidden = false;
    requestAnimationFrame(function () { box.classList.add('open'); });
    box.querySelector('.lightbox-close').focus();
  }

  function close() {
    box.classList.remove('open');
    setTimeout(function () { box.hidden = true; }, 300);
    if (opener) opener.focus();
  }

  triggers.forEach(function (t) {
    t.tabIndex = 0;
    t.style.cursor = 'zoom-in';
    t.addEventListener('click', function () { open(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(t); }
    });
  });

  box.querySelector('.lightbox-close').addEventListener('click', close);
  box.querySelector('.lightbox-prev').addEventListener('click', function () { show(index - 1); });
  box.querySelector('.lightbox-next').addEventListener('click', function () { show(index + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) close(); });

  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
  }, true);

  box.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();
