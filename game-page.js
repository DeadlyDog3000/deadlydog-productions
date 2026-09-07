/* ===================================================================
   Shared behaviour for the per-game store pages.

   Each page declares one object before loading this file:

     window.GAME = {
       key:   'forester',   // used in the review mailto subject
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
  var CONTACT = 'deadlydogdev@gmail.com';

  /* Where a submitted review is sent.

     Leave this empty and the form still works: it folds what the player
     wrote into a pre-addressed email and opens their mail app. That needs
     no account anywhere, but it does need them to have a mail app.

     Paste an endpoint here and the form posts straight to it instead —
     no mail client involved, which is the reliable path. Formspree gives
     you one shaped like 'https://formspree.io/f/abcdwxyz'. */
  var REVIEW_ENDPOINT = 'https://formspree.io/f/moeqkpye';
  var PIXEL = !!GAME.pixel;

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
     Reviews are real or they are nothing. Nothing here invents one: the
     page ships with an empty list and an honest empty state, and each
     review that arrives is added by hand to the page's own GAME.reviews.
     The verdict at the top is worked out from those real ones only.
     ---------------------------------------------------------------- */
  var THUMB_SVG =
    '<svg class="sp-thumbicon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M2 21h3V9H2v12zM22 10c0-1.1-.9-2-2-2h-5.3l.8-3.8v-.3c0-.4-.2-.8-.4-1.1L14.2 2 7.6 8.6c-.4.4-.6.9-.6 1.4v9c0 1.1.9 2 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7c.1-.2.2-.5.2-.8v-2z"/>' +
    '</svg>';

  function verdict(pct) {
    if (pct >= 95) return { word: 'Overwhelmingly Positive', tone: '' };
    if (pct >= 80) return { word: 'Very Positive', tone: '' };
    if (pct >= 70) return { word: 'Mostly Positive', tone: '' };
    if (pct >= 40) return { word: 'Mixed', tone: 'mixed' };
    if (pct >= 20) return { word: 'Mostly Negative', tone: 'negative' };
    return { word: 'Negative', tone: 'negative' };
  }

  var mount = document.getElementById('reviews');
  if (mount) {
    var reviews = Array.isArray(GAME.reviews) ? GAME.reviews : [];
    var name = GAME.name || 'this game';
    var side = document.getElementById('spReviewSummary');

    /* A review sent as email, with whatever the player has typed already
       folded in. Used as the no-endpoint path and as the fallback when a
       post to the endpoint fails. */
    function mailtoFor(data) {
      data = data || {};
      var lines = [
        'Rating (1-5): ' + (data.rating || ''),
        'Headline: ' + (data.headline || ''),
        '',
        'Review:',
        data.review || '',
        '',
        'Name to publish it under: ' + (data.author || ''),
        '',
        '(By sending this you are happy for it to appear on the ' + name + ' page.)'
      ];
      return 'mailto:' + CONTACT +
        '?subject=' + encodeURIComponent('Review — ' + name) +
        '&body=' + encodeURIComponent(lines.join('\n'));
    }

    var note = '<p class="sp-reviews-note">Reviews are sent in by players and posted by hand. We do not write our own.</p>';

    /* The form. It is built here rather than in each page's markup so the
       two game pages cannot drift apart. */
    function formHtml() {
      var stars = '';
      for (var i = 5; i >= 1; i--) {
        stars +=
          '<input type="radio" id="spStar' + i + '" name="rating" value="' + i + '">' +
          '<label for="spStar' + i + '"><span aria-hidden="true">&#9733;</span>' +
          '<span class="sp-sr">' + i + ' out of 5</span></label>';
      }
      return '' +
        '<div class="sp-write">' +
          '<button type="button" class="sp-btn-ghost" id="spWriteToggle" ' +
                  'aria-expanded="false" aria-controls="spForm">Write a Review</button>' +
          '<form class="sp-form" id="spForm" novalidate hidden>' +
            '<fieldset class="sp-field">' +
              '<legend>Your rating</legend>' +
              '<div class="sp-stars">' + stars + '</div>' +
              '<p class="sp-star-hint" id="spStarHint">Three or more shows as Recommended.</p>' +
            '</fieldset>' +
            '<label class="sp-field"><span>Headline</span>' +
              '<input type="text" name="headline" maxlength="80" placeholder="One line on what it was like"></label>' +
            '<label class="sp-field"><span>Your review</span>' +
              '<textarea name="review" rows="5" maxlength="2000" placeholder="What happened, what you liked, what you did not"></textarea></label>' +
            '<label class="sp-field"><span>Name to publish it under</span>' +
              '<input type="text" name="author" maxlength="60" placeholder="However you want to be credited"></label>' +
            '<label class="sp-field"><span>Your email <em>optional, only so we can reply</em></span>' +
              '<input type="email" name="email" autocomplete="email"></label>' +
            /* Bots fill everything in; people never see this one. */
            '<div class="sp-hp" aria-hidden="true">' +
              '<label>Leave this empty<input type="text" name="_gotcha" tabindex="-1" autocomplete="off"></label>' +
            '</div>' +
            '<label class="sp-check"><input type="checkbox" name="consent">' +
              '<span>You may publish this review, under that name, on this page.</span></label>' +
            '<div class="sp-form-actions">' +
              '<button type="submit" class="sp-btn-play">Send Review</button>' +
              '<span class="sp-form-msg" id="spFormMsg" role="status"></span>' +
            '</div>' +
            '<p class="sp-reviews-note">Read and posted by hand, so it will not appear here straight away. ' +
              'You can also email it to <a href="mailto:' + CONTACT + '">' + CONTACT + '</a>.</p>' +
          '</form>' +
        '</div>';
    }

    var html;

    if (!reviews.length) {
      html =
        '<div class="sp-reviews-empty">' +
          '<p>No user reviews yet. ' + escapeHtml(name) + ' is in beta and free to play &mdash; ' +
          'if you get a few hours out of it, tell us what you thought and it goes up here.</p>' +
          note +
        '</div>' +
        formHtml();
      if (side) side.textContent = 'No user reviews';
    } else {
      var positive = reviews.filter(function (r) { return (Number(r.rating) || 0) >= 3; }).length;
      var pct = Math.round((positive / reviews.length) * 100);
      var v = verdict(pct);

      html =
        '<div class="sp-reviews-summary">' +
          '<span class="sp-reviews-label">Overall Reviews:</span>' +
          '<span class="sp-reviews-verdict ' + v.tone + '">' + v.word + '</span>' +
          '<span class="sp-reviews-count">' + pct + '% of the ' + reviews.length +
            (reviews.length === 1 ? ' review' : ' reviews') + ' are positive</span>' +
        '</div>' +
        reviews.map(function (r) {
          var up = (Number(r.rating) || 0) >= 3;
          var when = r.date
            ? new Date(r.date + 'T00:00:00').toLocaleDateString(undefined,
                { year: 'numeric', month: 'long', day: 'numeric' })
            : '';
          return '<article class="sp-review">' +
            '<div class="sp-review-who">' +
              '<div class="sp-review-name">' + escapeHtml(r.author || 'Anonymous') + '</div>' +
              (r.source ? '<div class="sp-review-source">' + escapeHtml(r.source) + '</div>' : '') +
            '</div>' +
            '<div class="sp-review-main">' +
              '<div class="sp-verdict' + (up ? '' : ' down') + '">' + THUMB_SVG +
                '<span>' + (up ? 'Recommended' : 'Not Recommended') + '</span>' +
              '</div>' +
              (when ? '<div class="sp-review-date">Posted ' + when + '</div>' : '') +
              (r.title ? '<div class="sp-review-title">' + escapeHtml(r.title) + '</div>' : '') +
              '<p class="sp-review-body">' + escapeHtml(r.body || '') + '</p>' +
            '</div>' +
          '</article>';
        }).join('') +
        '<div class="sp-reviews-foot">' + note + '</div>' +
        formHtml();

      if (side) {
        side.textContent = v.word + ' (' + reviews.length + ')';
        side.className = v.tone ? '' : 'sp-positive';
      }
    }
    mount.innerHTML = html;

    /* ---------- Form behaviour ------------------------------------- */
    var form = document.getElementById('spForm');
    var toggleBtn = document.getElementById('spWriteToggle');
    var msg = document.getElementById('spFormMsg');
    var hint = document.getElementById('spStarHint');

    if (toggleBtn && form) {
      toggleBtn.addEventListener('click', function () {
        var open = form.hidden;
        form.hidden = !open;
        toggleBtn.setAttribute('aria-expanded', String(open));
        if (open) {
          var first = form.querySelector('input[name="rating"]');
          if (first) first.focus();
        }
      });
    }

    if (form) {
      form.addEventListener('change', function (e) {
        if (e.target.name === 'rating' && hint) {
          var n = Number(e.target.value);
          hint.textContent = n + ' out of 5 — shows as ' +
            (n >= 3 ? 'Recommended.' : 'Not Recommended.');
        }
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!msg) return;

        var fd = new FormData(form);
        var data = {
          rating:   fd.get('rating') || '',
          headline: (fd.get('headline') || '').trim(),
          review:   (fd.get('review') || '').trim(),
          author:   (fd.get('author') || '').trim(),
          email:    (fd.get('email') || '').trim(),
          consent:  fd.get('consent') === 'on'
        };

        /* A bot filled the hidden field. Say nothing useful, do nothing. */
        if ((fd.get('_gotcha') || '') !== '') return;

        var problem =
          !data.rating   ? 'Pick a rating first.' :
          !data.review   ? 'The review itself is empty.' :
          !data.author   ? 'Add a name to publish it under.' :
          !data.consent  ? 'Tick the box so we know we may publish it.' : '';

        if (problem) {
          msg.textContent = problem;
          msg.className = 'sp-form-msg bad';
          return;
        }

        /* No endpoint configured: hand it to their mail app, filled in. */
        if (!REVIEW_ENDPOINT) {
          msg.textContent = 'Opening your email app…';
          msg.className = 'sp-form-msg';
          window.location.href = mailtoFor(data);
          return;
        }

        msg.textContent = 'Sending…';
        msg.className = 'sp-form-msg';
        var btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;

        fetch(REVIEW_ENDPOINT, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game: GAME.key || name,
            rating: data.rating,
            headline: data.headline,
            review: data.review,
            author: data.author,
            email: data.email
          })
        }).then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.innerHTML =
            '<p class="sp-form-done">Thank you — that reached us. ' +
            'Every review is read and put up by hand, so give it a few days.</p>';
        }).catch(function () {
          /* The post failed. Rather than lose what they wrote, offer the
             same content as an email. */
          if (btn) btn.disabled = false;
          msg.innerHTML = 'That would not send. ' +
            '<a href="' + mailtoFor(data) + '">Send it as an email instead</a>, ' +
            'or write to ' + CONTACT + '.';
          msg.className = 'sp-form-msg bad';
        });
      });
    }
  }
})();
