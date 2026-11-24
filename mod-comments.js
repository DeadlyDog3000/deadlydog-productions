/* Comments on the Old World mods (mods.html): one board for all the mods, in #modComments.
   Each comment can be tagged with up to 5 mods; readers pick a mod to see only its comments, or click a tag.
   Anyone can read; writing needs an account on our server, the same one as the game pages' reviews.
   A mod card's Comments button ([data-cm="<slug>"]) opens the board on that mod and tags a new comment with it.
   The server side is reckoning/server/reviews.cjs in the Forester repo. */
(function () {
  'use strict';
  var API = window.REVIEWS_API ||
    /* (testing on this machine: ?reviewsApi=http://127.0.0.1:47999 points it at a local server) */
    (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && (location.search.match(/[?&]reviewsApi=([^&]+)/) || [])[1] && decodeURIComponent(location.search.match(/[?&]reviewsApi=([^&]+)/)[1])) ||
    'https://45-76-245-44.sslip.io';
  var TOKEN_KEY = 'dd.reviews.token', BOARD = 'mods', TAGS_MAX = 5;
  var mount = document.getElementById('modComments');
  if (!mount) return;
  var buttons = [].slice.call(document.querySelectorAll('[data-cm]'));
  // the mods, in page order, from the cards' buttons
  var MODS = [], NAME = {};
  buttons.forEach(function (b) { var k = b.getAttribute('data-cm'); if (!NAME[k]) { NAME[k] = b.getAttribute('data-name'); MODS.push(k); } });

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

  var st = { filter: '', list: [], counts: {}, total: 0, user: null, reached: null, panel: null, editing: null, editTags: [], draftTags: [], draft: '', msg: '', bad: false, max: 1500 };

  // ---- the count on each card's button ----
  function paintCounts() {
    buttons.forEach(function (b) {
      var k = b.getAttribute('data-cm'), n = st.counts[k] || 0, c = b.querySelector('.ow-cm-n');
      if (c) c.textContent = n ? String(n) : '';
      b.setAttribute('aria-label', 'Comments on ' + NAME[k] + (n ? ' (' + n + ')' : ''));
    });
  }

  function tagPills(tags, removable) {
    return (tags || []).filter(function (t) { return NAME[t]; }).map(function (t) {
      return removable
        ? '<button type="button" class="cm-tag" data-untag="' + esc(t) + '" aria-label="Remove the ' + esc(NAME[t]) + ' tag">' + esc(NAME[t]) + '<span class="x" aria-hidden="true">&times;</span></button>'
        : '<button type="button" class="cm-tag' + (st.filter === t ? ' on' : '') + '" data-filter="' + esc(t) + '" title="Show only comments about ' + esc(NAME[t]) + '">' + esc(NAME[t]) + '</button>';
    }).join('');
  }
  function picker(tags, which) {
    if (tags.length >= TAGS_MAX) return '<span class="cm-note" style="padding:0">Up to ' + TAGS_MAX + ' mods.</span>';
    var opts = MODS.filter(function (k) { return tags.indexOf(k) < 0; }).map(function (k) { return '<option value="' + esc(k) + '">' + esc(NAME[k]) + '</option>'; }).join('');
    return '<select class="cm-sel" data-addtag="' + which + '" aria-label="Tag a mod"><option value="">+ Tag a mod&hellip;</option>' + opts + '</select>';
  }
  function itemHtml(c) {
    var ed = st.editing && st.editing.id === c.id;
    return '<li class="cm-item' + (c.mine ? ' mine' : '') + '">' +
      '<div class="cm-meta"><b>' + esc(c.user) + '</b><span>' + when(c.at) + (c.edited ? ' &middot; edited' : '') + '</span></div>' +
      (ed
        ? '<form class="cm-form" data-form="edit"><textarea name="body" rows="3" maxlength="' + st.max + '" required>' + esc(st.editing.body) + '</textarea>' +
          '<div class="cm-picker">' + tagPills(st.editTags, true) + picker(st.editTags, 'edit') + '</div>' +
          '<div class="cm-actions"><button type="submit" class="cm-btn">Save</button><button type="button" class="cm-ghost" data-act="cancel">Cancel</button></div></form>'
        : '<p class="cm-body">' + esc(c.body) + '</p>' + (c.tags && c.tags.length ? '<div class="cm-tags">' + tagPills(c.tags) + '</div>' : '') +
          (c.mine ? '<div class="cm-own"><button type="button" class="cm-link" data-edit="' + esc(c.id) + '">Edit</button><button type="button" class="cm-link" data-del="' + esc(c.id) + '">Delete</button></div>' : '')) +
    '</li>';
  }
  function composerHtml() {
    var m = st.msg ? '<p class="cm-msg' + (st.bad ? ' bad' : '') + '" role="status">' + esc(st.msg) + '</p>' : '';
    if (st.reached === false) return '<p class="cm-note">Comments can\'t be reached right now. Try again in a little while.</p>' + m;
    if (st.reached === null) return '';
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
      '<textarea name="body" rows="3" maxlength="' + st.max + '" placeholder="Ask a question, report a problem, or share a story from your campaign" required>' + esc(st.draft) + '</textarea>' +
      '<div class="cm-picker">' + tagPills(st.draftTags, true) + picker(st.draftTags, 'draft') + '</div>' +
      '<div class="cm-actions"><button type="submit" class="cm-btn">Post comment</button></div>' + m + '</form>';
  }
  function render(keepScroll) {
    var sc = mount.querySelector('.cm-scroll'), top = sc ? sc.scrollTop : 0;
    var opts = '<option value="">All mods (' + st.total + ')</option>' + MODS.map(function (k) {
      return '<option value="' + esc(k) + '"' + (st.filter === k ? ' selected' : '') + '>' + esc(NAME[k]) + ' (' + (st.counts[k] || 0) + ')</option>';
    }).join('');
    var list = st.reached === null ? '<p class="cm-note">Loading comments&hellip;</p>'
      : st.reached === false ? ''
      : st.list.length ? '<ol class="cm-list">' + st.list.map(itemHtml).join('') + '</ol>'
      : '<p class="cm-empty">' + (st.filter ? 'No comments about ' + esc(NAME[st.filter]) + ' yet. Be the first.' : 'No comments yet. Be the first.') + '</p>';
    mount.innerHTML = '<div class="cm-bar"><label>Show <select class="cm-sel" id="cmFilter">' + opts + '</select></label>' +
      '<span class="cm-total">' + st.total + (st.total === 1 ? ' comment' : ' comments') + '</span></div>' +
      '<div class="cm-scroll">' + list + '</div><div class="cm-foot">' + composerHtml() + '</div>';
    if (keepScroll) { var s2 = mount.querySelector('.cm-scroll'); if (s2) s2.scrollTop = top; }
    if (st.focus) { var f = mount.querySelector('.cm-foot input:not([tabindex="-1"]), .cm-foot textarea, .cm-item textarea'); if (f) f.focus(); st.focus = false; }
  }
  function say(t, bad) { st.msg = t; st.bad = !!bad; render(true); }
  function saveDraft() { var t = mount.querySelector('form[data-form="post"] textarea'); if (t) st.draft = t.value; }
  var seq = 0;   // (only the newest request may paint: a slow answer for an old filter is dropped)
  function load() {
    var my = ++seq;
    return Promise.all([
      token() ? api('me').catch(function () { return { user: null }; }) : Promise.resolve({ user: null }),
      api('comments?on=' + BOARD + (st.filter ? '&tag=' + encodeURIComponent(st.filter) : '')),
      api('comment-counts?on=' + BOARD)
    ]).then(function (r) {
      if (my !== seq) return;
      if (!r[0].user && token()) setToken('');
      st.user = r[0].user; st.list = r[1].comments || []; st.max = r[1].max || st.max;
      st.counts = r[2].counts || {}; st.total = r[2].total || 0; st.reached = true;
      paintCounts(); render();
    }).catch(function () { if (my !== seq) return; st.reached = false; render(); });
  }
  function setFilter(k) {
    saveDraft();
    st.filter = NAME[k] ? k : '';
    if (st.filter && st.draftTags.indexOf(st.filter) < 0 && !st.draft && st.draftTags.length < TAGS_MAX) st.draftTags = [st.filter];
    st.editing = null; st.msg = ''; st.reached = st.reached === false ? false : st.reached;
    render(); load();
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      setFilter(b.getAttribute('data-cm'));
      document.getElementById('comments').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  mount.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'cmFilter') { setFilter(t.value); return; }
    var which = t.getAttribute('data-addtag');
    if (which && t.value) {
      saveDraft();
      var arr = which === 'edit' ? st.editTags : st.draftTags;
      if (arr.indexOf(t.value) < 0 && arr.length < TAGS_MAX) arr.push(t.value);
      if (which === 'edit') { var ta = mount.querySelector('.cm-item textarea'); if (ta) st.editing.body = ta.value; }
      render(true);
    }
  });
  mount.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var act = b.getAttribute('data-act');
    if (b.hasAttribute('data-filter')) { setFilter(b.getAttribute('data-filter') === st.filter ? '' : b.getAttribute('data-filter')); return; }
    if (b.hasAttribute('data-untag')) {
      saveDraft();
      var k = b.getAttribute('data-untag'), inEdit = !!b.closest('.cm-item');
      if (inEdit) { var ta = mount.querySelector('.cm-item textarea'); if (ta) st.editing.body = ta.value; st.editTags = st.editTags.filter(function (x) { return x !== k; }); }
      else st.draftTags = st.draftTags.filter(function (x) { return x !== k; });
      render(true); return;
    }
    if (act === 'login' || act === 'signup') { st.panel = act; st.msg = ''; st.focus = true; render(true); }
    else if (act === 'cancel') { st.panel = null; st.editing = null; st.msg = ''; render(true); }
    else if (act === 'logout') { api('logout', {}).catch(function () {}).then(function () { setToken(''); st.user = null; st.msg = ''; load(); }); }
    else if (b.hasAttribute('data-edit')) {
      saveDraft();
      var c = st.list.filter(function (x) { return x.id === b.getAttribute('data-edit'); })[0];
      if (c) { st.editing = { id: c.id, body: c.body }; st.editTags = (c.tags || []).slice(); st.msg = ''; st.focus = true; render(true); }
    } else if (b.hasAttribute('data-del')) {
      if (!window.confirm('Delete this comment? It can\'t be brought back.')) return;
      api('comment-delete', { id: b.getAttribute('data-del') }).then(function () { st.msg = ''; return load(); }).catch(function (err) { say(err.message, true); });
    }
  });
  mount.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, fd = new FormData(f), kind = f.getAttribute('data-form'), btn = f.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    var fail = function (err) { if (btn) btn.disabled = false; if (kind === 'post') saveDraft(); say(err.message, true); };
    if (kind === 'auth') {
      api(st.panel === 'signup' ? 'signup' : 'login', { user: String(fd.get('user') || '').trim(), password: fd.get('password') || '', website: fd.get('website') || '' })
        .then(function (d) { if (!d.token) throw new Error('Something went wrong.'); setToken(d.token); st.panel = null; st.msg = ''; st.focus = true; return load(); }).catch(fail);
    } else if (kind === 'post') {
      api('comment', { on: BOARD, body: String(fd.get('body') || '').trim(), tags: st.draftTags })
        .then(function () { st.draft = ''; st.draftTags = st.filter ? [st.filter] : []; st.msg = ''; return load(); }).catch(fail);
    } else if (kind === 'edit') {
      api('comment-edit', { id: st.editing.id, body: String(fd.get('body') || '').trim(), tags: st.editTags })
        .then(function () { st.editing = null; st.msg = ''; return load(); }).catch(fail);
    }
  });

  render();
  load();
})();
