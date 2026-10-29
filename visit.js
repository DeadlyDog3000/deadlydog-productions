// Counts a visit for the studio's own admin page: which page, and which site sent the visitor. Nothing else.
// A random number this browser keeps (so a person who comes back isn't counted twice) — no name, no cookie, no address.
// The owner's own browser is never counted.
(function () {
  try {
    if (!/\.github\.io$/.test(location.hostname)) return; // (only the real site counts, never a copy being tested on a computer)
    if (localStorage.getItem("dd-admin") === "1") return;
    var i = localStorage.getItem("dd-v");
    if (!i) { i = Array.from(crypto.getRandomValues(new Uint8Array(12)), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); localStorage.setItem("dd-v", i); }
    var s = document.currentScript && document.currentScript.getAttribute("data-s") || "site";
    var p = location.pathname.replace(/^\/[^/]+\//, "/").replace(/\/index\.html$/, "/").slice(0, 40) || "/";
    var r = ""; try { r = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
    if (r === location.hostname) r = "";
    var send = function (q) { fetch("https://45-76-245-44.sslip.io/visit?s=" + s + "&p=" + encodeURIComponent(p) + q + "&i=" + i, { mode: "no-cors", keepalive: true, credentials: "omit" }).catch(function () {}); };
    send("&r=" + encodeURIComponent(r));
    // and a click on Buy, a free demo or Play: just which of the four (so the admin page can show how many go from looking to trying to buying)
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
      var h = a.href, ev = /\/shop\/buy/.test(h) ? "buy" : /\.dmg(\?|$)/i.test(h) ? "demo-mac" : /(setup\.exe|windows\.zip)(\?|$)/i.test(h) ? "demo-win" : /github\.io\/(Forester|Standards-In-Smoke)\/?(index\.html)?(\?|#|$)/.test(h) ? "play" : "";
      if (/^demo/.test(ev) && /[?&]paid=/.test(location.search)) return; // (a buyer fetching the game after paying: not a demo)
      if (ev) send("&e=" + ev);
    }, true);
  } catch (e) {}
})();
