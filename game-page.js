/* ===================================================================
   Shared behaviour for the per-game store pages.

   Each page declares one object before loading this file:

     window.GAME = {
       key:   'forester',   // which game's reviews (the reviews server knows each)
       name:  'Forester',
       pixel: true,         // pixel art: don't smooth it when scaled
       reviews: [ ... ]     // see REVIEWS below
     };

   The media player, the lightbox and the reviews are each optional:
   a page with no strip gets no player, a page with no #reviews mount
   gets no reviews, and a page with no reviews gets an honest empty
   state rather than an invented one.
   =================================================================== */
(function () {
  'use strict';

  var GAME = window.GAME || {};

  var PIXEL = !!GAME.pixel;

  /* The shop: Stripe's checkout, opened by the game's own server (which
     makes the licence key and hands it over once Stripe says it's paid).
     The Buy button goes to the server, which sends the buyer straight on to
     Stripe; Stripe sends them back here with ?paid=<the checkout's id>, and
     this page offers the way to their key. */
  (function shop() {
    var box = document.querySelector('.sp-buy');
    if (!box || !GAME.shop) return;
    var h = box.querySelector('h2'), note = box.querySelector('.sp-buy-note'), act = box.querySelector('.sp-buy-act');
    var paid = (location.search.match(/[?&]paid=(cs_(?:test|live)_[A-Za-z0-9]+)/) || [])[1];
    function button(text, href, ghost) {
      var a = document.createElement('a');
      a.className = ghost ? 'sp-btn-ghost' : 'sp-btn-play'; a.href = href; a.textContent = text;
      act.appendChild(a);
    }
    /* The app to download (GAME.downloads: { mac, windows }) \u2014 free, as the demo */
    function downloads(prefix) {
      var d = GAME.downloads || {};
      if (d.mac) button(prefix + 'Mac', d.mac, true);
      if (d.windows) button(prefix + 'Windows', d.windows, true);
    }
    if (paid) {
      if (h) h.textContent = 'Thank you';
      if (note) note.textContent = 'Your payment went through. Bought from inside the game? It has already unlocked by itself. Otherwise, your licence key is one click away \u2014 it\u2019s also in the description on your emailed receipt. Haven\u2019t got the game yet? Download it, then paste the key in on the title screen (Unlock the full game).';
      if (act) { act.innerHTML = ''; downloads(''); button('Show my licence key', GAME.shop + '/shop/key?s=' + paid); }
      box.scrollIntoView && setTimeout(function () { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
      return;
    }
    if (!GAME.shopOpen) return;
    /* a sale on: its banner over the buy box (and a strip at the top of the page pointing to it), the sale price on the button */
    var sale = GAME.sale && Date.now() < Date.parse(GAME.sale.until) ? GAME.sale : null;
    if (sale) {
      var b = document.createElement('div'); b.className = 'sp-sale';
      b.innerHTML = '<span class="sp-sale-name">' + escapeHtml(sale.name) + '</span><span class="sp-sale-price"><s>' + escapeHtml(GAME.price || '') + '</s> ' + escapeHtml(sale.price) + '</span><span class="sp-sale-ends">Ends ' + escapeHtml(sale.ends) + '</span>';
      box.insertBefore(b, box.querySelector('.sp-buy-row'));
      var top = document.createElement('a'); top.className = 'sp-sale-strip'; top.href = '#buy';
      top.innerHTML = '<b>' + escapeHtml(sale.name) + '</b> &mdash; ' + escapeHtml(GAME.name || 'the game') + ' for ' + escapeHtml(sale.price) + ' <s>' + escapeHtml(GAME.price || '') + '</s> until ' + escapeHtml(sale.ends);
      var main = document.querySelector('main') || document.body; main.insertBefore(top, main.firstChild);
    }
    if (h) h.textContent = 'Play ' + (GAME.name || 'the game');
    /* the details, in pieces you can take in at a glance: what's free, what you get, how the key works, and (folded away) how to install */
    if (note) {
      var info = document.createElement('div'); info.className = 'sp-buy-info';
      info.innerHTML = (GAME.demo ? '<p class="sp-buy-lead"><b>Try it free.</b> The demo is ' + escapeHtml(GAME.demo) + '.</p>' : '')
        + '<ul class="sp-buy-list">'
        + '<li><b>One payment, yours for good:</b> the whole story, battles, duels and the campaign, the Worlds &amp; colonies, and every update to come.</li>'
        + '<li><b>Your licence key appears as soon as you\u2019ve paid.</b> Paste it into the game once, or buy from inside the game and it unlocks by itself.</li>'
        + '<li><b>Up to three computers</b> on one key.</li>'
        + '</ul>'
        + (GAME.downloadNote ? '<details class="sp-buy-help"><summary>Installing &amp; first launch</summary><p>' + escapeHtml(GAME.downloadNote).replace(/^(Mac:)/, '<b>$1</b>').replace(/ (Windows:)/, '</p><p><b>$1</b>') + '</p></details>' : '');
      note.parentNode.replaceChild(info, note);
    }
    if (act) { act.innerHTML = ''; downloads('Free demo \u00b7 '); button('Buy' + (sale ? ' \u2014 ' + sale.price : GAME.price ? ' \u2014 ' + GAME.price : ''), GAME.shop + '/shop/buy'); }
  })();

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Navigation ------------------------------------------ */
  var toggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', function () {
      navLinks.classList.toggle('active');
      toggle.classList.toggle('active');
      document.body.classList.toggle('nav-open');
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('active');
        toggle.classList.remove('active');
        document.body.classList.remove('nav-open');
      });
    });
  }

  var navbar = document.querySelector('.navbar');
  if (navbar) {
    var onScroll = function () {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
  }

  /* Smooth scroll for same-page anchors only. A link to index.html#games
     must be left alone, or it never leaves this page. */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---------- Media player -----------------------------------------
     One stage, one filmstrip. The strip is authored in HTML so that
     with no JavaScript you still get the trailer and every screenshot;
     this only makes the thumbnails switch the stage.
     ---------------------------------------------------------------- */
  var stage = document.getElementById('spStage');
  var strip = document.getElementById('spStrip');
  var thumbs = strip ? Array.prototype.slice.call(strip.querySelectorAll('.sp-thumb')) : [];

  /* The lightbox walks the images only — you cannot open a video "full size". */
  var images = thumbs.filter(function (t) { return t.dataset.type === 'image'; });

  function showMedia(i) {
    var thumb = thumbs[i];
    if (!thumb || !stage) return;

    thumbs.forEach(function (t) { t.classList.remove('is-active'); });
    thumb.classList.add('is-active');

    stage.classList.toggle('pixel', PIXEL && thumb.dataset.type === 'image' && thumb.classList.contains('pixel'));

    if (thumb.dataset.type === 'video') {
      stage.classList.remove('is-image');
      stage.innerHTML =
        '<video controls preload="none" playsinline poster="' + escapeHtml(thumb.dataset.poster || '') + '">' +
          /* (a lighter 720p copy for phones, where one is given) */
          (thumb.dataset.srcSm ? '<source src="' + escapeHtml(thumb.dataset.srcSm) + '" type="video/mp4" media="(max-width: 900px)">' : '') +
          '<source src="' + escapeHtml(thumb.dataset.src) + '" type="video/mp4">' +
          '<p>Your browser will not play this video. ' +
          '<a href="' + escapeHtml(thumb.dataset.src) + '">Download it instead.</a></p>' +
        '</video>';
    } else {
      var img = thumb.querySelector('img');
      stage.classList.add('is-image');
      stage.innerHTML =
        '<img src="' + escapeHtml(thumb.dataset.src) + '" alt="' + escapeHtml(img ? img.alt : '') + '">' +
        (thumb.dataset.caption ? '<div class="sp-stage-caption">' + thumb.dataset.caption + '</div>' : '');
      stage.onclick = function () { openLightbox(images.indexOf(thumb)); };
    }
    if (thumb.dataset.type === 'video') stage.onclick = null;
  }

  thumbs.forEach(function (thumb, i) {
    thumb.addEventListener('click', function () { showMedia(i); });
  });

  /* The stage as authored is already the first item; wire its click. */
  if (stage && thumbs.length && thumbs[0].dataset.type === 'image') {
    stage.onclick = function () { openLightbox(0); };
  }

  /* Strip arrows. They scroll the filmstrip and grey out at the ends. */
  if (strip) {
    var arrows = Array.prototype.slice.call(document.querySelectorAll('.sp-strip-arrow'));
    arrows.forEach(function (btn) {
      btn.addEventListener('click', function () {
        strip.scrollLeft += Number(btn.dataset.dir) * strip.clientWidth * 0.8;
      });
    });
    var syncArrows = function () {
      var max = strip.scrollWidth - strip.clientWidth - 1;
      arrows.forEach(function (btn) {
        var back = Number(btn.dataset.dir) < 0;
        btn.disabled = back ? strip.scrollLeft <= 0 : strip.scrollLeft >= max;
      });
    };
    strip.addEventListener('scroll', syncArrows);
    window.addEventListener('resize', syncArrows);
    syncArrows();
  }

  /* ---------- Lightbox ---------------------------------------------- */
  var box = null, lbImg = null, lbCap = null, lbIndex = 0, lastFocus = null;

  function buildLightbox() {
    box = document.createElement('div');
    box.className = 'sp-lightbox' + (PIXEL ? ' pixel' : '');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Screenshot viewer');
    box.innerHTML =
      '<button class="sp-lb-btn sp-lb-close" aria-label="Close">&times;</button>' +
      '<button class="sp-lb-btn sp-lb-prev" aria-label="Previous screenshot">&#8249;</button>' +
      '<button class="sp-lb-btn sp-lb-next" aria-label="Next screenshot">&#8250;</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(box);

    lbImg = box.querySelector('img');
    lbCap = box.querySelector('figcaption');

    box.querySelector('.sp-lb-close').addEventListener('click', closeLightbox);
    box.querySelector('.sp-lb-prev').addEventListener('click', function () { showLightbox(lbIndex - 1); });
    box.querySelector('.sp-lb-next').addEventListener('click', function () { showLightbox(lbIndex + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) closeLightbox(); });
  }

  function showLightbox(i) {
    if (!images.length) return;
    lbIndex = (i + images.length) % images.length;
    var thumb = images[lbIndex];
    var img = thumb.querySelector('img');
    lbImg.src = thumb.dataset.src;
    lbImg.alt = img ? img.alt : '';
    lbCap.innerHTML = (thumb.dataset.caption || '') +
      '<span class="sp-lb-count">' + (lbIndex + 1) + ' / ' + images.length + '</span>';
  }

  function openLightbox(i) {
    if (!images.length) return;
    if (!box) buildLightbox();
    lastFocus = document.activeElement;
    showLightbox(i < 0 ? 0 : i);
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
    box.querySelector('.sp-lb-close').focus();
  }

  function closeLightbox() {
    box.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener('keydown', function (e) {
    if (!box || !box.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showLightbox(lbIndex - 1);
    if (e.key === 'ArrowRight') showLightbox(lbIndex + 1);
  });

  /* ---------- Reviews ----------------------------------------------
     Reviews are real or they are nothing. Players write them with an
     account of their own on our server (two per game each, which they can
     edit or take down); the few sent in before accounts existed stay in
     the page's own GAME.reviews. The verdict is worked out from those real
     ones only.
     ---------------------------------------------------------------- */
  var REVIEWS_API = window.REVIEWS_API ||
    /* (testing on this machine: ?reviewsApi=http://127.0.0.1:47999 points it at a local server) */
    (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && (location.search.match(/[?&]reviewsApi=([^&]+)/) || [])[1] && decodeURIComponent(location.search.match(/[?&]reviewsApi=([^&]+)/)[1])) ||
    'https://45-76-245-44.sslip.io';
  var TOKEN_KEY = 'dd.reviews.token';
  var THUMB_SVG =
    '<svg class="sp-thumbicon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M2 21h3V9H2v12zM22 10c0-1.1-.9-2-2-2h-5.3l.8-3.8v-.3c0-.4-.2-.8-.4-1.1L14.2 2 7.6 8.6c-.4.4-.6.9-.6 1.4v9c0 1.1.9 2 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7c.1-.2.2-.5.2-.8v-2z"/>' +
    '</svg>';

  /* The emphatic words only mean something once there are enough reviews
     to carry them. Below that it stays plain: one five-star review is a
     good review, not an overwhelming verdict. */
  function verdict(pct, count) {
    if (count < 5) {
      if (pct >= 70) return { word: 'Positive', tone: '' };
      if (pct >= 40) return { word: 'Mixed', tone: 'mixed' };
      return { word: 'Negative', tone: 'negative' };
    }
    if (pct >= 95) return { word: 'Overwhelmingly Positive', tone: '' };
    if (pct >= 80) return { word: 'Very Positive', tone: '' };
    if (pct >= 70) return { word: 'Mostly Positive', tone: '' };
    if (pct >= 40) return { word: 'Mixed', tone: 'mixed' };
    if (pct >= 20) return { word: 'Mostly Negative', tone: 'negative' };
    return { word: 'Negative', tone: 'negative' };
  }

  var mount = document.getElementById('reviews');
  if (mount) {
    var name = GAME.name || 'this game';
    var side = document.getElementById('spReviewSummary');
    var kept = (Array.isArray(GAME.reviews) ? GAME.reviews : []).map(function (r) {
      return { rating: r.rating, title: r.title, body: r.body, user: r.author, source: r.source,
               at: r.date ? new Date(r.date + 'T00:00:00').getTime() : 0, mine: false };
    });
    var state = { user: null, live: [], left: null, reached: false, panel: null, editing: null, msg: '', bad: false };

    function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
    function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
    function api(path, body) {
      var h = { 'Accept': 'application/json' }, t = token();
      if (t) h['Authorization'] = 'Bearer ' + t;
      if (body) h['Content-Type'] = 'application/json';
      return fetch(REVIEWS_API + '/reviews/' + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { if (!res.ok) throw new Error(d.error || 'Something went wrong (' + res.status + ').'); return d; }); });
    }
    function load() {
      return Promise.all([api('me'), api('list?game=' + encodeURIComponent(GAME.key || ''))]).then(function (r) {
        state.user = r[0].user; if (!state.user && token()) setToken('');
        state.live = r[1].reviews || []; state.left = r[1].left; state.reached = true;
      }).catch(function () { state.reached = false; }).then(render);
    }

    function when(t) { return t ? new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''; }
    function reviewHtml(r) {
      var up = (Number(r.rating) || 0) >= 3;
      return '<article class="sp-review">' +
        '<div class="sp-review-who">' +
          '<div class="sp-review-name">' + escapeHtml(r.user || 'Anonymous') + '</div>' +
          (r.source ? '<div class="sp-review-source">' + escapeHtml(r.source) + '</div>' : '') +
          (r.mine ? '<div class="sp-review-source">Your review</div>' : '') +
        '</div>' +
        '<div class="sp-review-main">' +
          '<div class="sp-verdict' + (up ? '' : ' down') + '">' + THUMB_SVG +
            '<span>' + (up ? 'Recommended' : 'Not Recommended') + '</span>' +
            '<span class="sp-review-stars" aria-label="' + r.rating + ' out of 5">' + new Array((Number(r.rating) || 0) + 1).join('&#9733;') + '</span>' +
          '</div>' +
          (r.at ? '<div class="sp-review-date">Posted ' + when(r.at) + (r.edited ? ' &middot; edited ' + when(r.edited) : '') + '</div>' : '') +
          (r.title ? '<div class="sp-review-title">' + escapeHtml(r.title) + '</div>' : '') +
          '<p class="sp-review-body">' + escapeHtml(r.body || '') + '</p>' +
          (r.mine ? '<div class="sp-review-actions">' +
            '<button type="button" class="sp-btn-ghost sp-btn-small" data-edit="' + escapeHtml(r.id) + '">Edit</button>' +
            '<button type="button" class="sp-btn-ghost sp-btn-small" data-del="' + escapeHtml(r.id) + '">Delete</button></div>' : '') +
        '</div>' +
      '</article>';
    }

    function accountHtml() {
      var m = state.msg ? '<span class="sp-form-msg' + (state.bad ? ' bad' : '') + '" role="status">' + escapeHtml(state.msg) + '</span>' : '';
      if (!state.reached) return '<div class="sp-write"><p class="sp-reviews-note">Reviews can\'t be reached right now, so writing one will have to wait. Try again in a little while.</p></div>';
      if (!state.user) {
        if (state.panel !== 'login' && state.panel !== 'signup')
          return '<div class="sp-write"><div class="sp-acct"><button type="button" class="sp-btn-ghost" data-act="login">Sign in to write a review</button>' +
            '<button type="button" class="sp-btn-ghost" data-act="signup">Create an account</button>' + m + '</div></div>';
        var su = state.panel === 'signup';
        return '<div class="sp-write"><form class="sp-form" id="spAuth" novalidate>' +
          '<h3 class="sp-form-head">' + (su ? 'Create an account' : 'Sign in') + '</h3>' +
          '<label class="sp-field"><span>Username</span><input type="text" name="user" maxlength="24" autocomplete="username" required></label>' +
          '<label class="sp-field"><span>Password' + (su ? ' <em>at least 8 characters</em>' : '') + '</span>' +
            '<input type="password" name="password" maxlength="200" autocomplete="' + (su ? 'new-password' : 'current-password') + '" required></label>' +
          (su ? '<div class="sp-hp" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' : '') +
          '<div class="sp-form-actions"><button type="submit" class="sp-btn-play">' + (su ? 'Create account' : 'Sign in') + '</button>' +
            '<button type="button" class="sp-btn-ghost" data-act="' + (su ? 'login' : 'signup') + '">' + (su ? 'I have an account' : 'Create an account instead') + '</button>' +
            '<button type="button" class="sp-btn-ghost" data-act="close">Cancel</button>' + m + '</div>' +
          (su ? '<p class="sp-reviews-note">Your username is shown on your reviews. No email needed.</p>' : '') +
        '</form></div>';
      }
      var head = '<div class="sp-acct"><span class="sp-acct-who">Signed in as <b>' + escapeHtml(state.user) + '</b></span>' +
        '<button type="button" class="sp-btn-ghost sp-btn-small" data-act="logout">Sign out</button></div>';
      if (state.panel !== 'write') {
        var left = state.left == null ? 2 : state.left;
        return '<div class="sp-write">' + head +
          (left > 0 ? '<button type="button" class="sp-btn-ghost" data-act="write">Write a Review</button>' +
            '<span class="sp-reviews-note"> ' + left + ' of 2 reviews of ' + escapeHtml(name) + ' left to write</span>'
            : '<p class="sp-reviews-note">You have written your two reviews of ' + escapeHtml(name) + '. Edit or delete one to write another.</p>') +
          m + '</div>';
      }
      var e = state.editing || {}, stars = '';
      for (var i = 5; i >= 1; i--) {
        stars += '<input type="radio" id="spStar' + i + '" name="rating" value="' + i + '"' + (Number(e.rating) === i ? ' checked' : '') + '>' +
          '<label for="spStar' + i + '"><span aria-hidden="true">&#9733;</span><span class="sp-sr">' + i + ' out of 5</span></label>';
      }
      return '<div class="sp-write">' + head + '<form class="sp-form" id="spForm" novalidate>' +
        '<h3 class="sp-form-head">' + (e.id ? 'Edit your review' : 'Write a review') + '</h3>' +
        '<fieldset class="sp-field"><legend>Your rating</legend><div class="sp-stars">' + stars + '</div>' +
          '<p class="sp-star-hint" id="spStarHint">Three or more shows as Recommended.</p></fieldset>' +
        '<label class="sp-field"><span>Headline</span><input type="text" name="title" maxlength="80" value="' + escapeHtml(e.title || '') + '" placeholder="One line on what it was like"></label>' +
        '<label class="sp-field"><span>Your review</span><textarea name="body" rows="5" maxlength="2000" placeholder="What happened, what you liked, what you did not">' + escapeHtml(e.body || '') + '</textarea></label>' +
        '<div class="sp-form-actions"><button type="submit" class="sp-btn-play">' + (e.id ? 'Save changes' : 'Post review') + '</button>' +
          '<button type="button" class="sp-btn-ghost" data-act="close">Cancel</button>' + m + '</div>' +
        '<p class="sp-reviews-note">It goes up on this page straight away, under your username.</p>' +
      '</form></div>';
    }

    function render() {
      var all = state.live.concat(kept);
      var html;
      if (!all.length) {
        html = '<div class="sp-reviews-empty"><p>No user reviews yet. ' + escapeHtml(name) +
          (GAME.shopOpen ? ' has a free demo &mdash; ' : ' is in beta and free to play &mdash; ') +
          'if you get a few hours out of it, tell everyone what you thought.</p></div>';
        if (side) side.textContent = 'No user reviews';
      } else {
        var positive = all.filter(function (r) { return (Number(r.rating) || 0) >= 3; }).length;
        var pct = Math.round((positive / all.length) * 100), v = verdict(pct, all.length);
        html = '<div class="sp-reviews-summary"><span class="sp-reviews-label">Overall Reviews:</span>' +
          '<span class="sp-reviews-verdict ' + v.tone + '">' + v.word + '</span>' +
          '<span class="sp-reviews-count">' + pct + '% of the ' + all.length + (all.length === 1 ? ' review is' : ' reviews are') + ' positive</span></div>' +
          all.map(reviewHtml).join('');
        if (side) { side.textContent = v.word + ' (' + all.length + ')'; side.className = v.tone ? '' : 'sp-positive'; }
      }
      mount.innerHTML = html + '<div class="sp-reviews-foot"><p class="sp-reviews-note">Reviews are written by players, signed in with their own accounts. We do not write our own.</p></div>' + accountHtml();
      var f = document.getElementById('spAuth') || document.getElementById('spForm'), first = f && f.querySelector('input:not([type=hidden]):not([tabindex="-1"])');
      if (first && state.focus) { first.focus(); state.focus = false; }
    }
    function say(text, bad) { state.msg = text; state.bad = !!bad; render(); }

    mount.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'login' || act === 'signup' || act === 'write') { state.panel = act; state.editing = null; state.msg = ''; state.focus = true; render(); }
      else if (act === 'close') { state.panel = null; state.editing = null; state.msg = ''; render(); }
      else if (act === 'logout') { api('logout', {}).catch(function () {}).then(function () { setToken(''); state.user = null; state.panel = null; state.msg = ''; load(); }); }
      else if (b.hasAttribute('data-edit')) {
        var id = b.getAttribute('data-edit'), r = state.live.filter(function (x) { return x.id === id; })[0];
        if (r) { state.panel = 'write'; state.editing = r; state.msg = ''; state.focus = true; render(); mount.querySelector('#spForm').scrollIntoView({ block: 'center' }); }
      } else if (b.hasAttribute('data-del')) {
        if (!window.confirm('Delete this review? It can\'t be brought back.')) return;
        api('delete', { id: b.getAttribute('data-del') }).then(function () { state.msg = 'Your review is deleted.'; state.bad = false; return load(); })
          .catch(function (err) { say(err.message, true); });
      }
    });
    mount.addEventListener('change', function (e) {
      var hint = document.getElementById('spStarHint');
      if (e.target.name === 'rating' && hint) { var n = Number(e.target.value); hint.textContent = n + ' out of 5 — shows as ' + (n >= 3 ? 'Recommended.' : 'Not Recommended.'); }
    });
    mount.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, fd = new FormData(f), btn = f.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      var done = function () { if (btn) btn.disabled = false; };
      if (f.id === 'spAuth') {
        var su = state.panel === 'signup';
        api(su ? 'signup' : 'login', { user: (fd.get('user') || '').trim(), password: fd.get('password') || '', website: fd.get('website') || '' })
          .then(function (d) { if (!d.token) throw new Error('Something went wrong.'); setToken(d.token); state.panel = null; state.msg = 'Signed in as ' + d.user + '.'; state.bad = false; return load(); })
          .catch(function (err) { done(); say(err.message, true); });
        return;
      }
      var body = { game: GAME.key, rating: Number(fd.get('rating')) || 0, title: (fd.get('title') || '').trim(), body: (fd.get('body') || '').trim() };
      if (!body.rating) { done(); return say('Pick a rating first.', true); }
      var ed = state.editing;
      if (ed) body.id = ed.id;
      api(ed ? 'edit' : 'post', body)
        .then(function () { state.panel = null; state.editing = null; state.msg = ed ? 'Your review is updated.' : 'Your review is up.'; state.bad = false; return load(); })
        .catch(function (err) { done(); say(err.message, true); });
    });

    render();
    load();
  }
})();
