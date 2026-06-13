/* ===== Тренажёр английских слов / English vocabulary trainer ===== */
(function () {
  "use strict";

  var STORAGE_KEY = "EnglishTrainer_v2";
  var LEVELS = ["A1", "A2", "B1", "B2", "C1"];
  var ROUND_SIZE = 10;

  // ---- Локализация интерфейсных (динамических) строк ----
  var STRINGS = {
    ru: {
      promptFrom: "Переведите с английского:",
      promptTo: "Переведите на английский:",
      notEnough: "Недостаточно слов",
      mistakesEmptyWord: "Ошибок нет 🎉",
      mistakesPrompt: "Режим работы над ошибками",
      mistakesEmptyBody: function (lvl) { return "На уровне " + lvl + " нет слов с ошибками. Отвечайте в режиме практики — сюда попадут слова, в которых вы ошиблись."; },
      historyEmpty: "Здесь появятся ваши ответы.",
      confirmReset: "Сбросить статистику, историю и список ошибок?",
      accuracy: "Точность: ",
      streak: "Серия: ",
      sumGreat: "Великолепно!", sumGood: "Отличный раунд!", sumOk: "Неплохо!", sumTry: "Идём дальше!",
      suggestUp: function (t) { return "Отлично получается! Попробуете уровень посложнее — " + t + "?"; },
      suggestDown: function (t) { return "Похоже, тут сложновато. Перейти на уровень полегче — " + t + "?"; },
      tips: [
        "💡 Отвечайте клавишами 1–4, а Enter или Пробел — следующее слово.",
        "🔁 Слова, в которых вы ошиблись, попадут в режим «Работа над ошибками».",
        "↔️ Переключайте EN → RU и RU → EN, чтобы тренировать оба направления.",
        "🎓 Не знаете свой уровень? Пройдите тест «Узнать уровень».",
        "🔥 Отвечайте без ошибок — тренажёр предложит уровень посложнее.",
        "📈 Статистика и история ответов сохраняются в этом браузере.",
        "⏱️ Достаточно 5 минут в день — главное заниматься регулярно."
      ]
    },
    en: {
      promptFrom: "Translate from English:",
      promptTo: "Translate into English:",
      notEnough: "Not enough words",
      mistakesEmptyWord: "No mistakes 🎉",
      mistakesPrompt: "Review-mistakes mode",
      mistakesEmptyBody: function (lvl) { return "No mistakes at level " + lvl + " yet. Practice some words — the ones you get wrong will appear here."; },
      historyEmpty: "Your answers will appear here.",
      confirmReset: "Reset your stats, history and mistakes?",
      accuracy: "Accuracy: ",
      streak: "Streak: ",
      sumGreat: "Excellent!", sumGood: "Great round!", sumOk: "Not bad!", sumTry: "Keep going!",
      suggestUp: function (t) { return "You're on fire! Try a harder level — " + t + "?"; },
      suggestDown: function (t) { return "Looks tricky. Switch to an easier level — " + t + "?"; },
      tips: [
        "💡 Answer with keys 1–4; Enter or Space goes to the next word.",
        "🔁 Words you get wrong are collected in the “Review mistakes” mode.",
        "↔️ Switch EN → RU and RU → EN to train both directions.",
        "🎓 Not sure of your level? Take the level test.",
        "🔥 Answer without mistakes and the trainer will suggest a harder level.",
        "📈 Your stats and answer history are saved in this browser.",
        "⏱️ Just 5 minutes a day — consistency is what matters."
      ]
    }
  };
  var LANG = (document.documentElement.lang === "en") ? "en" : "ru";
  function T(k) { return STRINGS[LANG][k]; }

  var state = {
    level: "A1",
    dir: "en-ru",
    mode: "infinite",
    current: null,
    answered: false,
    stats: { total: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0 },
    history: [],
    mistakes: {},
    recent: [],
    dismissed: {},
    test: null,
    round: { i: 0, correct: 0 }
  };

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    word: $("quiz-word"), prompt: $("quiz-prompt"), options: $("options"),
    next: $("next-btn"), quiz: $("quiz"),
    total: $("stat-total"), correct: $("stat-correct"), wrong: $("stat-wrong"),
    accuracy: $("stat-accuracy"), streak: $("stat-streak"), statsPanel: $("stats-panel"),
    mistakesCount: $("mistakes-count"),
    suggest: $("suggest"), suggestText: $("suggest-text"),
    historyList: $("history-list"), hint: $("hint"),
    testbox: $("testbox"), testIntro: $("test-intro"), testProgress: $("test-progress"),
    testResult: $("test-result"), testWord: $("test-word"), testPrompt: $("test-prompt"),
    testOptions: $("test-options"), testQNum: $("test-q-num"), testLevelLabel: $("test-level-label"),
    testBarFill: $("test-bar-fill"), testLevelResult: $("test-level-result"), testBreakdown: $("test-breakdown"),
    themeBtn: $("theme-btn"),
    summary: $("summary"), summaryCorrect: $("summary-correct"), summaryTotal: $("summary-total"),
    summaryAcc: $("summary-acc"), summaryStreak: $("summary-streak"), summaryEmoji: $("summary-emoji"), summaryTitle: $("summary-title"),
    roundProgress: $("round-progress"), roundBar: $("round-bar-fill"), roundCount: $("round-count")
  };

  // Перемешивание короткого массива (используется только для 4 вариантов)
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pool(level) { return (window.WORDS && window.WORDS[level]) || []; }
  function qText(p) { return state.dir === "en-ru" ? p.en : p.ru; }
  function aText(p) { return state.dir === "en-ru" ? p.ru : p.en; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function mKey(level, en) { return level + "|" + en; }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        level: state.level, dir: state.dir, mode: state.mode === "test" ? "infinite" : state.mode,
        stats: state.stats, history: state.history.slice(-100),
        mistakes: state.mistakes, dismissed: state.dismissed
      }));
    } catch (e) {}
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (d.level && pool(d.level).length) state.level = d.level;
      if (d.dir) state.dir = d.dir;
      if (d.mode) state.mode = d.mode;
      if (d.stats) state.stats = Object.assign(state.stats, d.stats);
      if (Array.isArray(d.history)) state.history = d.history;
      if (d.mistakes) state.mistakes = d.mistakes;
      if (d.dismissed) state.dismissed = d.dismissed;
    } catch (e) {}
  }

  function renderStats() {
    els.total.textContent = state.stats.total;
    els.correct.textContent = state.stats.correct;
    els.wrong.textContent = state.stats.wrong;
    els.streak.textContent = state.stats.streak;
    els.accuracy.textContent = state.stats.total
      ? Math.round((state.stats.correct / state.stats.total) * 100) + "%" : "—";
    els.mistakesCount.textContent = mistakeList(null).length;
  }

  function mistakeList(level) {
    var arr = [];
    for (var k in state.mistakes) {
      if (!state.mistakes.hasOwnProperty(k)) continue;
      var m = state.mistakes[k];
      if (!level || m.level === level) arr.push(m);
    }
    return arr;
  }
  function addMistake(pair, level) {
    state.mistakes[mKey(level, pair.en)] = { en: pair.en, ru: pair.ru, level: level };
  }
  function clearMistake(pair, level) {
    delete state.mistakes[mKey(level, pair.en)];
  }

  function renderHistory() {
    var list = state.history.slice(-30).reverse();
    if (!list.length) {
      els.historyList.innerHTML = '<li class="history-empty">' + escapeHtml(T("historyEmpty")) + '</li>';
      return;
    }
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      var time = new Date(h.ts);
      var hh = ("0" + time.getHours()).slice(-2) + ":" + ("0" + time.getMinutes()).slice(-2);
      var givenHtml = h.correct ? "" : ' <span class="a wrongans">' + escapeHtml(h.given) + "</span>";
      html += '<li class="history-item ' + (h.correct ? "ok" : "no") + '">' +
        '<span class="mark">' + (h.correct ? "✅" : "❌") + "</span>" +
        '<span class="q">' + escapeHtml(h.q) + "</span>" +
        '<span class="arrow">→</span>' +
        '<span class="a">' + escapeHtml(h.a) + "</span>" + givenHtml +
        '<span class="time">' + hh + "</span></li>";
    }
    els.historyList.innerHTML = html;
  }

  // Быстрый подбор 3 неправильных вариантов: случайная выборка из пула
  // (без копирования и полного перемешивания всего уровня — важно для C1 ~1300 слов).
  function buildOptions(container, correct, levelForPool, onPick) {
    var words = pool(levelForPool);
    container.innerHTML = "";
    if (!words.length) return;

    var correctAns = aText(correct);
    var seen = {}; seen[correctAns] = true;
    var distractors = [];
    var n = words.length;
    var attempts = 0, maxAttempts = 60;
    while (distractors.length < 3 && attempts < maxAttempts) {
      attempts++;
      var w = words[(Math.random() * n) | 0];
      var a = aText(w);
      if (!seen[a]) { seen[a] = true; distractors.push(w); }
    }
    // Добор для маленьких наборов / редких повторов переводов
    for (var i = 0; i < n && distractors.length < 3; i++) {
      var a2 = aText(words[i]);
      if (!seen[a2]) { seen[a2] = true; distractors.push(words[i]); }
    }

    var opts = shuffle([correct].concat(distractors));
    var frag = document.createDocumentFragment();
    opts.forEach(function (p, idx) {
      var btn = document.createElement("button");
      btn.className = "option";
      btn.type = "button";
      btn.innerHTML = '<span class="num">' + (idx + 1) + "</span>" + escapeHtml(aText(p));
      btn.dataset.correct = (p === correct) ? "1" : "0";
      btn.addEventListener("click", function () { onPick(btn, p); });
      frag.appendChild(btn);
    });
    container.appendChild(frag);
  }

  // ---- Раунды ----
  function resetRound() { state.round = { i: 0, correct: 0 }; renderRoundProgress(); }
  function renderRoundProgress() {
    var on = state.mode === "infinite";
    els.roundProgress.hidden = !on;
    if (!on) return;
    els.roundBar.style.width = Math.round((state.round.i / ROUND_SIZE) * 100) + "%";
    els.roundCount.textContent = state.round.i + " / " + ROUND_SIZE;
  }
  function showSummary() {
    var correct = state.round.correct, total = ROUND_SIZE;
    var acc = Math.round((correct / total) * 100);
    els.summaryCorrect.textContent = correct;
    els.summaryTotal.textContent = total;
    els.summaryAcc.textContent = T("accuracy") + acc + "%";
    els.summaryStreak.textContent = T("streak") + state.stats.streak + " 🔥";
    els.summaryEmoji.textContent = acc >= 90 ? "🏆" : acc >= 70 ? "🎉" : acc >= 50 ? "🙂" : "💪";
    els.summaryTitle.textContent = acc >= 90 ? T("sumGreat") : acc >= 70 ? T("sumGood") : acc >= 50 ? T("sumOk") : T("sumTry");
    els.quiz.hidden = true;
    els.roundProgress.hidden = true;
    els.summary.hidden = false;
    hideSuggest();
  }

  function nextQuestion() {
    if (state.mode === "infinite" && state.round.i >= ROUND_SIZE) { showSummary(); return; }
    els.summary.hidden = true;
    els.quiz.hidden = false;
    state.answered = false;
    els.next.hidden = true;
    renderRoundProgress();

    var words = pool(state.level);
    var correct;

    if (state.mode === "mistakes") {
      var ms = mistakeList(state.level);
      if (!ms.length) {
        els.word.textContent = T("mistakesEmptyWord");
        els.prompt.textContent = T("mistakesPrompt");
        els.options.innerHTML = '<p style="grid-column:1/-1;color:var(--text-dim)">' +
          escapeHtml(T("mistakesEmptyBody")(state.level)) + '</p>';
        return;
      }
      var m = ms[Math.floor(Math.random() * ms.length)];
      correct = { en: m.en, ru: m.ru };
    } else {
      if (words.length < 4) {
        els.word.textContent = T("notEnough");
        els.options.innerHTML = "";
        return;
      }
      correct = words[Math.floor(Math.random() * words.length)];
    }

    state.current = correct;
    els.prompt.textContent = state.dir === "en-ru" ? T("promptFrom") : T("promptTo");
    els.word.textContent = qText(correct);
    els.word.classList.remove("animate"); void els.word.offsetWidth; els.word.classList.add("animate");
    buildOptions(els.options, correct, state.level, handleAnswer);
  }

  function handleAnswer(btn, picked) {
    if (state.answered) return;
    state.answered = true;
    var isCorrect = btn.dataset.correct === "1";

    var btns = els.options.querySelectorAll(".option");
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (btns[i].dataset.correct === "1") btns[i].classList.add("correct");
    }
    if (!isCorrect) btn.classList.add("wrong");

    state.stats.total++;
    if (isCorrect) {
      state.stats.correct++; state.stats.streak++;
      if (state.stats.streak > state.stats.bestStreak) state.stats.bestStreak = state.stats.streak;
      clearMistake(state.current, state.level);
    } else {
      state.stats.wrong++; state.stats.streak = 0;
      addMistake(state.current, state.level);
    }

    state.history.push({
      q: qText(state.current), a: aText(state.current),
      given: aText(picked), correct: isCorrect, ts: Date.now(),
      level: state.level, dir: state.dir
    });
    if (state.history.length > 100) state.history = state.history.slice(-100);

    if (state.mode === "infinite") {
      state.round.i++;
      if (isCorrect) state.round.correct++;
      renderRoundProgress();
      state.recent.push(isCorrect);
      if (state.recent.length > 12) state.recent.shift();
      maybeSuggest();
    }

    renderStats(); renderHistory(); save();
    els.next.hidden = false; els.next.focus();
  }

  // ---- Бар подсказок / адаптив ----
  function showTip() {
    if (state.mode === "test") { els.suggest.hidden = true; return; }
    var tips = STRINGS[LANG].tips;
    els.suggest.classList.add("is-tip");
    els.suggestText.textContent = tips[Math.floor(Math.random() * tips.length)];
    els.suggest.hidden = false;
  }
  function levelIndex(l) { return LEVELS.indexOf(l); }
  function maybeSuggest() {
    var r = state.recent, n = r.length;
    var idx = levelIndex(state.level);
    if (idx < LEVELS.length - 1 && n >= 10) {
      var last10 = r.slice(-10), allRight = last10.every(function (x) { return x; });
      if (allRight && !state.dismissed["up" + state.level]) { showSuggest(LEVELS[idx + 1], "up"); return; }
    }
    if (idx > 0 && n >= 8) {
      var last8 = r.slice(-8), right = last8.filter(function (x) { return x; }).length;
      if (right / 8 < 0.4 && !state.dismissed["down" + state.level]) { showSuggest(LEVELS[idx - 1], "down"); return; }
    }
  }
  function showSuggest(target, dir) {
    state._suggestTarget = target;
    state._suggestDir = dir;
    els.suggest.classList.remove("is-tip");
    els.suggestText.textContent = dir === "up" ? T("suggestUp")(target) : T("suggestDown")(target);
    els.suggest.hidden = false;
  }
  function hideSuggest() { els.suggest.hidden = true; }

  $("suggest-accept").addEventListener("click", function () {
    if (state._suggestTarget) setLevel(state._suggestTarget);
    showTip();
  });
  $("suggest-dismiss").addEventListener("click", function () {
    state.dismissed[state._suggestDir + state.level] = true;
    showTip(); save();
  });

  // ---- Переключатели ----
  function setLevel(level) {
    state.level = level;
    state.recent = [];
    document.querySelectorAll(".level-btn").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.level === level);
    });
    save();
    if (state.mode !== "test") { resetRound(); nextQuestion(); showTip(); }
  }
  function setDir(dir) {
    state.dir = dir;
    document.querySelectorAll(".dir-btn").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.dir === dir);
    });
    save();
    if (state.mode === "test" && state.test) startTest();
    else { resetRound(); nextQuestion(); }
  }
  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll(".mode-btn").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.mode === mode);
    });
    var isTest = mode === "test";
    els.summary.hidden = true;
    els.quiz.hidden = isTest;
    els.statsPanel.hidden = isTest;
    els.hint.hidden = isTest;
    els.testbox.hidden = !isTest;
    if (isTest) { els.roundProgress.hidden = true; hideSuggest(); showTestIntro(); }
    else { resetRound(); nextQuestion(); showTip(); save(); }
  }

  document.querySelectorAll(".level-btn").forEach(function (b) {
    b.addEventListener("click", function () { setLevel(b.dataset.level); });
  });
  document.querySelectorAll(".dir-btn").forEach(function (b) {
    b.addEventListener("click", function () { setDir(b.dataset.dir); });
  });
  document.querySelectorAll(".mode-btn").forEach(function (b) {
    b.addEventListener("click", function () { setMode(b.dataset.mode); });
  });

  els.next.addEventListener("click", nextQuestion);
  $("reset-btn").addEventListener("click", function () {
    if (!confirm(T("confirmReset"))) return;
    state.stats = { total: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0 };
    state.history = []; state.mistakes = {}; state.recent = []; state.dismissed = {};
    hideSuggest(); renderStats(); renderHistory(); save();
    if (state.mode !== "test") { resetRound(); nextQuestion(); }
  });

  $("summary-again").addEventListener("click", function () {
    resetRound();
    els.summary.hidden = true;
    els.quiz.hidden = false;
    nextQuestion();
  });
  $("summary-level").addEventListener("click", function () {
    els.summary.hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
    var first = document.querySelector(".level-btn");
    if (first) first.focus();
  });

  // ---- Тема ----
  function applyThemeIcon() {
    var t = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    els.themeBtn.textContent = t === "light" ? "☀️" : "🌙";
  }
  els.themeBtn.addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    var next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("EnglishTrainer_theme", next); } catch (e) {}
    applyThemeIcon();
  });

  // ---- Тест уровня ----
  function showTestIntro() {
    els.testIntro.hidden = false;
    els.testProgress.hidden = true;
    els.testResult.hidden = true;
  }
  $("test-start").addEventListener("click", startTest);
  $("test-retry").addEventListener("click", startTest);
  $("test-use-level").addEventListener("click", function () {
    if (state.test && state.test.estimate && state.test.estimate !== "—") {
      var target = (state.test.estimate === "ниже A1" || state.test.estimate === "below A1") ? "A1" : state.test.estimate;
      setMode("infinite");
      var infBtn = document.querySelector('[data-mode="infinite"]');
      if (infBtn) infBtn.classList.add("is-active");
      setLevel(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  var PER_LEVEL = 4;
  function startTest() {
    var queue = [];
    LEVELS.forEach(function (L) {
      var words = shuffle(pool(L)).slice(0, PER_LEVEL);
      words.forEach(function (w) { queue.push({ level: L, pair: w }); });
    });
    state.test = { queue: queue, idx: 0, correctByLevel: {}, totalByLevel: {}, estimate: "—", stopped: false };
    LEVELS.forEach(function (L) { state.test.correctByLevel[L] = 0; state.test.totalByLevel[L] = 0; });
    els.testIntro.hidden = true;
    els.testResult.hidden = true;
    els.testProgress.hidden = false;
    renderTestQuestion();
  }

  function renderTestQuestion() {
    var t = state.test;
    if (t.idx >= t.queue.length) return finishTest();
    var item = t.queue[t.idx];
    els.testLevelLabel.textContent = item.level;
    els.testQNum.textContent = (t.idx + 1) + " / " + t.queue.length;
    els.testBarFill.style.width = Math.round((t.idx / t.queue.length) * 100) + "%";
    els.testPrompt.textContent = state.dir === "en-ru" ? T("promptFrom") : T("promptTo");
    els.testWord.textContent = qText(item.pair);
    els.testWord.classList.remove("animate"); void els.testWord.offsetWidth; els.testWord.classList.add("animate");
    buildOptions(els.testOptions, item.pair, item.level, handleTestAnswer);
  }

  function handleTestAnswer(btn, picked) {
    var t = state.test;
    var item = t.queue[t.idx];
    var isCorrect = btn.dataset.correct === "1";
    var btns = els.testOptions.querySelectorAll(".option");
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (btns[i].dataset.correct === "1") btns[i].classList.add("correct");
    }
    if (!isCorrect) btn.classList.add("wrong");

    t.totalByLevel[item.level]++;
    if (isCorrect) t.correctByLevel[item.level]++;
    t.idx++;

    if (t.idx % PER_LEVEL === 0) {
      var lvl = item.level;
      if (t.totalByLevel[lvl] >= PER_LEVEL && t.correctByLevel[lvl] <= 1) t.stopped = true;
    }

    setTimeout(function () {
      if (t.stopped) return finishTest();
      renderTestQuestion();
    }, 650);
  }

  function finishTest() {
    var t = state.test;
    var estimate = (LANG === "en") ? "below A1" : "ниже A1";
    for (var i = 0; i < LEVELS.length; i++) {
      var L = LEVELS[i];
      var total = t.totalByLevel[L];
      if (!total) break;
      var acc = t.correctByLevel[L] / total;
      if (acc >= 0.5) estimate = L; else break;
    }
    t.estimate = estimate;

    els.testProgress.hidden = true;
    els.testResult.hidden = false;
    els.testLevelResult.textContent = estimate;
    els.testBarFill.style.width = "100%";

    var html = "";
    for (var k = 0; k < LEVELS.length; k++) {
      var lv = LEVELS[k];
      var tot = t.totalByLevel[lv];
      if (!tot) continue;
      var pct = Math.round((t.correctByLevel[lv] / tot) * 100);
      html += '<div class="test-row"><span class="lvl">' + lv + "</span>" +
        '<span class="rowbar"><i style="width:' + pct + '%"></i></span>' +
        '<span class="pct">' + t.correctByLevel[lv] + "/" + tot + " · " + pct + "%</span></div>";
    }
    els.testBreakdown.innerHTML = html;
  }

  document.addEventListener("keydown", function (e) {
    if (e.key >= "1" && e.key <= "4") {
      var container = state.mode === "test" ? els.testOptions : els.options;
      var btn = container.querySelectorAll(".option:not([disabled])")[parseInt(e.key, 10) - 1];
      if (btn) btn.click();
    } else if ((e.key === "Enter" || e.key === " ") && state.mode !== "test" && state.answered) {
      e.preventDefault(); nextQuestion();
    }
  });

  // ---- Старт ----
  load();
  // Глубокая ссылка с посадочных страниц: ?level=B1 (и опц. ?dir=ru-en)
  try {
    var qp = new URLSearchParams(location.search);
    var qpLevel = (qp.get("level") || "").toUpperCase();
    if (qpLevel && pool(qpLevel).length) state.level = qpLevel;
    var qpDir = qp.get("dir");
    if (qpDir === "en-ru" || qpDir === "ru-en") state.dir = qpDir;
  } catch (e) {}
  document.querySelectorAll(".level-btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.level === state.level); });
  document.querySelectorAll(".dir-btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.dir === state.dir); });
  document.querySelectorAll(".mode-btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.mode === state.mode); });
  renderStats(); renderHistory(); applyThemeIcon();
  setMode(state.mode);

  // ---- PWA: офлайн-кэш и снижение нагрузки на сервер ----
  // (активно только на хостинге по http/https; на file:// не вмешивается в локальную разработку)
  if (location.protocol === "http:" || location.protocol === "https:") {
    if (!document.querySelector('link[rel="manifest"]')) {
      var ml = document.createElement("link");
      ml.rel = "manifest"; ml.href = "../manifest.json";
      document.head.appendChild(ml);
    }
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("../sw.js").catch(function () {});
      });
    }
  }
})();
