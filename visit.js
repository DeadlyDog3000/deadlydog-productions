// Counts a visit for the studio's own admin page: which page, and which site sent the visitor. Nothing else.
// A random number this browser keeps (so a person who comes back isn't counted twice) — no name, no cookie, no address.
// The owner's own browser is never counted.
(function () {
  try {
    if (localStorage.getItem("dd-admin") === "1") return;
    var i = localStorage.getItem("dd-v");
    if (!i) { i = Array.from(crypto.getRandomValues(new Uint8Array(12)), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); localStorage.setItem("dd-v", i); }
    var s = document.currentScript && document.currentScript.getAttribute("data-s") || "site";
    var p = location.pathname.replace(/^\/[^/]+\//, "/").slice(0, 40) || "/";
    var r = ""; try { r = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
    if (r === location.hostname) r = "";
    fetch("https://45-76-245-44.sslip.io/visit?s=" + s + "&p=" + encodeURIComponent(p) + "&r=" + encodeURIComponent(r) + "&i=" + i, { mode: "no-cors", keepalive: true, credentials: "omit" }).catch(function () {});
  } catch (e) {}
})();
