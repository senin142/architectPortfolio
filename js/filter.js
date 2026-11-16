/* Project filter — cards fold away (clip-path) then leave the layout. */
(function () {
  var grid = document.getElementById('projectGrid');
  var buttons = document.querySelectorAll('.filter-btn');
  if (!grid || !buttons.length) return;

  var cards = grid.querySelectorAll('.project-card');
  var OUT_MS = 350;
  var timer;

  function apply(filter) {
    clearTimeout(timer);
    // R10: lock height so the page doesn't jump while cards swap
    grid.style.minHeight = grid.offsetHeight + 'px';

    cards.forEach(function (card) {
      var show = filter === 'all' || card.dataset.category === filter;
      if (!show && !card.classList.contains('filtered-out')) card.classList.add('filtering-out');
    });

    timer = setTimeout(function () {
      grid.classList.toggle('is-filtered', filter !== 'all');
      cards.forEach(function (card) {
        var show = filter === 'all' || card.dataset.category === filter;
        card.classList.remove('filtering-out');
        card.classList.toggle('filtered-out', !show);
        if (show) card.classList.add('visible');
      });
      setTimeout(function () { grid.style.minHeight = ''; }, OUT_MS);
    }, OUT_MS);
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      apply(btn.dataset.filter);
    });
  });
})();
