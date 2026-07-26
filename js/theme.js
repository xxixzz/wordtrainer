/* Переключатель темы для контентных страниц (без app.js) */
(function () {
  var b = document.getElementById("theme-btn");
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  function icon() {
    var t = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    if (b) b.innerHTML = t === "light" ? SUN : MOON;
  }
  icon();
  if (b) b.addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    var n = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", n);
    try { localStorage.setItem("EnglishTrainer_theme", n); } catch (e) {}
    icon();
  });
})();
