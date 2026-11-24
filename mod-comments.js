/* Comments on the Old World mods (mods.html).
   Anyone can read them; writing one needs an account on our server: the same accounts as the game pages' reviews,
   so someone signed in there is signed in here too. Each mod's thread opens in a dialog from its Comments button
   (a button with data-cm="<slug>" and data-name="<mod name>"). See reckoning/server/reviews.cjs for the server side. */
(function () {
  'use strict';
  var API = window.REVIEWS_API ||
    /* (testing on this machine: ?reviewsApi=http://127.0.0.1:47999 points it at a local server) */
    (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && (location.search.match(/[?&]reviewsApi=([^&]+)/) || [])[1] && decodeURIComponent(location.search.match(/[?&]reviewsApi=([^&]+)/)[1])) ||
    'https://45-76-245-44.sslip.io';
  var TOKEN_KEY = 'dd.reviews.token';
  var buttons = [].slice.call(document.querySelectorAll('[data-cm]'));
  if (!buttons.length) return;

  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function when(t) {
    var s = (Date.now() - t) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 30 * 86400) return Math.floor(s / 86400) + ' d ago';
    return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function api(path, body) {
    var h = { 'Content-Type': 'application/json' }, t = token();
    if (t) h.Authorization = 'Bearer ' + t;
    return fetch(API + '/reviews/' + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || 'Something went wrong. Try again.'); return d; }); });
  }

  // ---- the count on each button ----
  function setCount(slug, n) {
    buttons.forEach(function (b) {
      if (b.getAttribute('data-cm') !== slug) return;
      var c = b.querySelector('.ow-cm-n'); if (c) c.textContent = n ? String(n) : '';
      b.setAttribute('aria-label', 'Comments on ' + b.getAttribute('data-name') + (n ? ' (' + n + ')' : ''));
    });
  }
  api('comment-counts').then(function (d) { Object.keys(d.counts || {}).forEach(function (k) { setCount(k, d.counts[k]); }); }).catch(function () {});

  // ---- the dialog ----
  var dlg = document.createElement('dialog');
  dlg.className = 'cm-dlg';
  dlg.setAttribute('aria-labelledby', 'cmTitle');
  document.body.appendChild(dlg);
  var st = { slug: '', name: '', list: [], user: null, reached: null, panel: null, editing: null, msg: '', bad: false, max: 1500 };

  function itemHtml(c) {
    var editing = st.editing && st.editing.id === c.id;
    return '<li class="cm-item' + (c.mine ? ' mine' : '') + '">' +
      '<div class="cm-meta"><b>' + esc(c.user) + '</b><span>' + when(c.at) + (c.edited ? ' &middot; edited' : '') + '</span></div>' +
      (editing
        ? '<form class="cm-form" data-form="edit"><textarea name="body" rows="3" maxlength="' + st.max + '" required>' + esc(c.body) + '</textarea>' +
          '<div class="cm-actions"><button type="submit" class="cm-btn">Save</button><button type="button" class="cm-ghost" data-act="cancel">Cancel</button></div></form>'
        : '<p class="cm-body">' + esc(c.body) + '</p>' +
          (c.mine ? '<div class="cm-own"><button type="button" class="cm-link" data-edit="' + esc(c.id) + '">Edit</button><button type="button" class="cm-link" data-del="' + esc(c.id) + '">Delete</button></div>' : '')) +
    '</li>';
  }
  function composerHtml() {
    var m = st.msg ? '<p class="cm-msg' + (st.bad ? ' bad' : '') + '" role="status">' + esc(st.msg) + '</p>' : '';
    if (st.reached === null) return '<p class="cm-note">Loading comments&hellip;</p>';
    if (!st.reached) return '<p class="cm-note">Comments can\'t be reached right now. Try again in a little while.</p>' + m;
    if (!st.user) {
      if (st.panel !== 'login' && st.panel !== 'signup')
        return '<div class="cm-signin"><p>Sign in to join the conversation.</p><div class="cm-actions">' +
          '<button type="button" class="cm-btn" data-act="login">Sign in</button><button type="button" class="cm-ghost" data-act="signup">Create an account</button></div>' + m + '</div>';
      var su = st.panel === 'signup';
      return '<form class="cm-form cm-auth" data-form="auth" novalidate><h3>' + (su ? 'Create an account' : 'Sign in') + '</h3>' +
        '<label><span>Username</span><input type="text" name="user" maxlength="24" autocomplete="username" required></label>' +
        '<label><span>Password' + (su ? ' <em>at least 8 characters</em>' : '') + '</span><input type="password" name="password" maxlength="200" autocomplete="' + (su ? 'new-password' : 'current-password') + '" required></label>' +
        (su ? '<div class="cm-hp" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' : '') +
        '<div class="cm-actions"><button type="submit" class="cm-btn">' + (su ? 'Create account' : 'Sign in') + '</button>' +
        '<button type="button" class="cm-ghost" data-act="' + (su ? 'login' : 'signup') + '">' + (su ? 'I have an account' : 'Create an account instead') + '</button>' +
        '<button type="button" class="cm-ghost" data-act="cancel">Cancel</button></div>' + m +
        '<p class="cm-note">' + (su ? 'Your username is shown on your comments. No email needed. ' : '') + 'The same account works for reviews on our game pages.</p></form>';
    }
    return '<form class="cm-form" data-form="post"><div class="cm-who">Signed in as <b>' + esc(st.user) + '</b> <button type="button" class="cm-link" data-act="logout">Sign out</button></div>' +
      '<textarea name="body" rows="3" maxlength="' + st.max + '" placeholder="Ask a question, report a problem, or say what you think of ' + esc(st.name) + '" required></textarea>' +
      '<div class="cm-actions"><button type="submit" class="cm-btn">Post comment</button></div>' + m + '</form>';
  }
  function render() {
    var list = st.reached === false ? '' : st.list.length ? '<ol class="cm-list">' + st.list.map(itemHtml).join('') + '</ol>'
      : st.reached ? '<p class="cm-empty">No comments yet. Be the first.</p>' : '';
    dlg.innerHTML = '<div class="cm-head"><div><span class="cm-eyebrow">Comments</span><h2 id="cmTitle">' + esc(st.name) + '</h2></div>' +
      '<button type="button" class="cm-x" data-act="close" aria-label="Close">&times;</button></div>' +
      '<div class="cm-scroll">' + list + '</div><div class="cm-foot">' + composerHtml() + '</div>';
    if (st.focus) { var f = dlg.querySelector('.cm-foot input:not([tabindex="-1"]), .cm-foot textarea, .cm-item textarea'); if (f) f.focus(); st.focus = false; }
  }
  function say(t, bad) { st.msg = t; st.bad = !!bad; render(); }
  function load(scrollEnd) {
    return Promise.all([token() ? api('me').catch(function () { return { user: null }; }) : Promise.resolve({ user: null }), api('comments?on=' + encodeURIComponent(st.slug))])
      .then(function (r) {
        if (!r[0].user && token()) setToken('');
        st.user = r[0].user; st.list = r[1].comments || []; st.max = r[1].max || st.max; st.reached = true;
        setCount(st.slug, st.list.length); render();
        if (scrollEnd) { var s = dlg.querySelector('.cm-scroll'); if (s) s.scrollTop = s.scrollHeight; }
      })
      .catch(function () { st.reached = false; render(); });
  }
  function open(b) {
    st.slug = b.getAttribute('data-cm'); st.name = b.getAttribute('data-name');
    st.list = []; st.reached = null; st.panel = null; st.editing = null; st.msg = '';
    render();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    load(true);
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { open(b); }); });
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) { dlg.close(); return; }   // (a click on the backdrop)
    var b = e.target.closest('button'); if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'close') dlg.close();
    else if (act === 'login' || act === 'signup') { st.panel = act; st.msg = ''; st.focus = true; render(); }
    else if (act === 'cancel') { st.panel = null; st.editing = null; st.msg = ''; render(); }
    else if (act === 'logout') { api('logout', {}).catch(function () {}).then(function () { setToken(''); st.user = null; st.msg = ''; load(); }); }
    else if (b.hasAttribute('data-edit')) { st.editing = st.list.filter(function (c) { return c.id === b.getAttribute('data-edit'); })[0] || null; st.msg = ''; st.focus = true; render(); }
    else if (b.hasAttribute('data-del')) {
      if (!window.confirm('Delete this comment? It can\'t be brought back.')) return;
      api('comment-delete', { id: b.getAttribute('data-del') }).then(function () { st.msg = ''; return load(); }).catch(function (err) { say(err.message, true); });
    }
  });
  dlg.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, fd = new FormData(f), kind = f.getAttribute('data-form'), btn = f.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    var fail = function (err) { if (btn) btn.disabled = false; say(err.message, true); };
    if (kind === 'auth') {
      api(st.panel === 'signup' ? 'signup' : 'login', { user: String(fd.get('user') || '').trim(), password: fd.get('password') || '', website: fd.get('website') || '' })
        .then(function (d) { if (!d.token) throw new Error('Something went wrong.'); setToken(d.token); st.panel = null; st.msg = ''; st.focus = true; return load(); }).catch(fail);
    } else if (kind === 'post') {
      api('comment', { on: st.slug, body: String(fd.get('body') || '').trim() }).then(function () { st.msg = ''; return load(true); }).catch(fail);
    } else if (kind === 'edit') {
      api('comment-edit', { id: st.editing.id, body: String(fd.get('body') || '').trim() }).then(function () { st.editing = null; st.msg = ''; return load(); }).catch(fail);
    }
  });
})();
