// The Admin button in the menu: shown only in a browser where the admin page has opened for its owner (it leaves a
// mark here when it does). Visitors' browsers never have the mark, so they never see the button, and nothing is asked
// of their computer.
(function () {
  var on = false; try { on = localStorage.getItem("dd-admin") === "1"; } catch (e) {}
  if (!on) return;
  var ul = document.querySelector(".nav-links"); if (!ul) return;
  var li = document.createElement("li"), a = document.createElement("a");
  a.href = "admin.html?t=" + Date.now(); a.textContent = "Admin"; a.className = "nav-admin";
  li.appendChild(a); ul.appendChild(li);
})();
