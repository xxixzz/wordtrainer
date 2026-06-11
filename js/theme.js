/* Переключатель темы для контентных страниц (без app.js) */
(function () {
  var b = document.getElementById("theme-btn");
  function icon() {
    var t = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    if (b) b.textContent = t === "light" ? "☀️" : "🌙";
  }
  icon();
  if (b) b.addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    var n = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", n);
    try { localStorage.setItem("wordtrainer_theme", n); } catch (e) {}
    icon();
  });
})();
