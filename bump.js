/*
 * bump.js — поднимает версию ассетов, чтобы браузеры и Service Worker
 * не отдавали старый кэш после обновления сайта.
 *
 * Как пользоваться (нужен установленный Node.js):
 *   1. Внесли правки в css/js.
 *   2. В папке проекта выполните:  node bump.js
 *   3. Закоммитьте и задеплойте:   git add -A && git commit -m "bump vN" && git push
 *
 * Что делает:
 *   - находит текущую версию в sw.js (EnglishTrainer-vN) и увеличивает на 1;
 *   - в sw.js обновляет имя кэша и все ?v= в списке ASSETS;
 *   - во всех .html меняет ?v=<старое> на ?v=<новое> у css/js.
 */
var fs = require("fs");
var path = require("path");
var root = __dirname;

var swPath = path.join(root, "sw.js");
var sw = fs.readFileSync(swPath, "utf8");
var cur = (sw.match(/EnglishTrainer-v(\d+)/) || [])[1] || "1";
var next = String(parseInt(cur, 10) + 1);

sw = sw.replace(/EnglishTrainer-v\d+/g, "EnglishTrainer-v" + next);
sw = sw.replace(/\?v=\d+/g, "?v=" + next);
fs.writeFileSync(swPath, sw);

function walk(dir) {
  var out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (e.name === "node_modules" || e.name === ".git") return;
    var p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith(".html")) out.push(p);
  });
  return out;
}

var changed = 0;
walk(root).forEach(function (f) {
  var html = fs.readFileSync(f, "utf8");
  var upd = html.replace(/(\.(?:css|js))\?v=\d+/g, "$1?v=" + next);
  if (upd !== html) { fs.writeFileSync(f, upd); changed++; }
});

console.log("Версия ассетов поднята до v" + next + ". HTML-файлов изменено: " + changed +
  ".\nТеперь: git add -A && git commit -m \"bump v" + next + "\" && git push");
