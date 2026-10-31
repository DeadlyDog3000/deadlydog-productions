/* The mailing list: a short band above the footer asking for an email address, for news of the games (big updates,
   new games, sales). The address goes to the game server's /list/join, which sends a letter to confirm it: nothing is
   kept for long unless its owner clicks. data-game on this script tag names the game the page is about. */
(function () {
  var me = document.currentScript, game = (me && me.getAttribute('data-game')) || '';
  var API = window.REVIEWS_API ||
    (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && (location.search.match(/[?&]reviewsApi=([^&]+)/) || [])[1] && decodeURIComponent(location.search.match(/[?&]reviewsApi=([^&]+)/)[1])) ||
    'https://45-76-245-44.sslip.io';
  var NAMES = { forester: 'Forester', reckoning: 'Forester: Reckoning', 'standards-in-smoke': 'Standards In Smoke' };
  var foot = document.querySelector('footer.footer'); if (!foot) return;
  // (shown only once the server says it can send the letters: until then there is no form to fail)
  fetch(API + '/list/open', { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.open) show(); }).catch(function () {});
  function show() {
  var band = document.createElement('section');
  band.className = 'news-band'; band.id = 'news';
  band.innerHTML =
    '<div class="container news-inner">' +
      '<div class="news-copy"><h2>Get the news</h2>' +
      '<p>A letter when there is real news' + (NAMES[game] ? ' of ' + NAMES[game] : '') + ': a big update, a new game, a sale. A few a year at most, and a link in each one to stop them.</p></div>' +
      '<form class="news-form" novalidate>' +
        '<label class="news-label" for="newsEmail">Email address</label>' +
        '<input id="newsEmail" type="email" name="email" autocomplete="email" placeholder="you@example.com" required>' +
        '<input class="news-trap" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<button class="btn btn-primary" type="submit">Sign up</button>' +
        '<p class="news-msg" role="status" aria-live="polite"></p>' +
        '<p class="news-small">We send a letter to confirm first. Your address is used for this and nothing else. <a href="privacy.html#news">Privacy</a></p>' +
      '</form>' +
    '</div>';
  foot.parentNode.insertBefore(band, foot);
  var form = band.querySelector('form'), msg = band.querySelector('.news-msg'), btn = form.querySelector('button');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.className = 'news-msg bad'; msg.textContent = "That doesn't look like an email address."; form.email.focus(); return; }
    btn.disabled = true; msg.className = 'news-msg'; msg.textContent = 'Sending...';
    fetch(API + '/list/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
      body: JSON.stringify({ email: email, game: game, website: form.website.value }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (x.ok) { msg.className = 'news-msg good'; msg.textContent = 'Nearly there: check your inbox for a letter from us, and click the link in it.'; form.email.value = ''; }
        else { msg.className = 'news-msg bad'; msg.textContent = x.j.error || "That didn't go through. Try again in a little while."; }
      })
      .catch(function () { msg.className = 'news-msg bad'; msg.textContent = "Couldn't reach the server. Try again in a little while."; })
      .then(function () { btn.disabled = false; });
  });
  }
})();
