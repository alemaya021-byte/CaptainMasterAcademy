(() => {
  const STORAGE_KEY = "cmaProgress.v3";
  const LEGACY_KEYS = ["cmaProgress.v2", "cmaProgress.v1"];
  const DATA_URL = "data/questions.json";
  const DATA_FILE_HINT = "data/questions.json";
  const DAY_MS = 86400000;

  const BLUEPRINT = [
    { category: "Policies & Procedures", count: 42 },
    { category: "SOPs", count: 32 },
    { category: "Medical Operations Manual", count: 27 },
    { category: "Collective Bargaining Agreement", count: 22 },
    { category: "Administrative Orders", count: 2 },
  ];

  const ANALYTICS_AREAS = [
    "Administrative Orders",
    "Policies",
    "SOPs",
    "Fire Officer",
    "Incident Safety Officer",
    "CBA",
    "Structural Firefighting",
    "High-Rise",
    "MOM",
    "Step Up and Lead",
    "NIMS",
  ];

  const navItems = [
    ["index.html", "Dashboard"],
    ["quiz.html", "Study"],
    ["exam.html", "Exam"],
    ["flashcards.html", "Flashcards"],
    ["statistics.html", "Analytics"],
  ];

  function emptyProgress() {
    return {
      answers: {},
      bookmarks: {},
      missed: {},
      flashcards: {},
      exams: [],
      activeExam: null,
      daily: {},
      darkMode: false,
      updatedAt: "",
    };
  }

  function normalizeProgress(parsed = {}) {
    const progress = {
      ...emptyProgress(),
      ...parsed,
      answers: parsed.answers || {},
      bookmarks: parsed.bookmarks || {},
      missed: parsed.missed || {},
      flashcards: parsed.flashcards || {},
      exams: parsed.exams || [],
      activeExam: parsed.activeExam || null,
      daily: parsed.daily || {},
      darkMode: Boolean(parsed.darkMode),
    };

    Object.entries(progress.answers).forEach(([questionId, record]) => {
      if (record?.lastCorrect === false && !progress.missed[questionId]) {
        progress.missed[questionId] = { correctStreak: 0, lastMissedAt: record.lastAt || "" };
      }
    });

    return progress;
  }

  function readProgress() {
    try {
      const parsed = window.CMAStorage
        ? window.CMAStorage.readJson(STORAGE_KEY, LEGACY_KEYS, {})
        : JSON.parse(window.localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean) || "{}");
      const progress = normalizeProgress(parsed);
      const hasCurrentRecord = window.CMAStorage ? window.CMAStorage.getItem(STORAGE_KEY) : window.localStorage.getItem(STORAGE_KEY);
      if (!hasCurrentRecord) writeProgress(progress);
      return progress;
    } catch {
      return emptyProgress();
    }
  }

  function writeProgress(progress) {
    progress.updatedAt = new Date().toISOString();
    if (window.CMAStorage) window.CMAStorage.writeJson(STORAGE_KEY, progress);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  const progress = readProgress();

  function applyTheme() {
    document.documentElement.classList.toggle("dark", progress.darkMode);
  }

  function toggleTheme(event) {
    progress.darkMode = !progress.darkMode;
    writeProgress(progress);
    applyTheme();
    if (event?.currentTarget) event.currentTarget.textContent = progress.darkMode ? "L" : "D";
  }

  function currentPage() {
    return location.pathname.split(/[\\/]/).pop() || "index.html";
  }

  function renderShell(activePage = currentPage()) {
    applyTheme();
    const header = document.querySelector("[data-app-header]");
    if (!header) return;
    const nav = navItems.map(([href, label]) => `<a href="${href}" class="${href === activePage ? "active" : ""}">${label}</a>`).join("");
    header.innerHTML = `
      <div class="topbar">
        <div class="brand">
          <h1 class="brand-title">Captain Master Academy</h1>
          <span class="brand-subtitle">Professional Edition</span>
        </div>
        <nav class="nav" aria-label="Primary navigation">${nav}</nav>
        <div class="header-actions">
          <span class="status-badge" data-connection-status title="Checking connection">Checking</span>
          <button class="ghost-button install-button" type="button" hidden data-install-app>Install</button>
          <button class="icon-button" type="button" title="Toggle dark mode" aria-label="Toggle dark mode" data-theme-toggle>${progress.darkMode ? "L" : "D"}</button>
        </div>
      </div>
    `;
    header.querySelector("[data-theme-toggle]").addEventListener("click", toggleTheme);
    if (window.CMASync) window.CMASync.render();
  }

  function localServerHint() {
    return "Start a local web server from this folder, then open index.html from that server.";
  }

  function dataLoadError(details) {
    return [`Unable to load question data from ${DATA_URL}.`, `Expected file: ${DATA_FILE_HINT}.`, details, localServerHint()].filter(Boolean).join(" ");
  }

  async function loadQuestions() {
    if (location.protocol === "file:") {
      throw new Error(dataLoadError("The app was opened with file://, and browsers block fetch() from local files."));
    }
    let response;
    try {
      response = await fetch(new URL(DATA_URL, document.baseURI).href, { cache: "no-store" });
    } catch (error) {
      throw new Error(dataLoadError(`Network error: ${error.name || "Error"} - ${error.message || "Failed to fetch"}.`));
    }
    if (!response.ok) {
      throw new Error(dataLoadError(`HTTP ${response.status} ${response.statusText || ""} while requesting ${response.url || DATA_URL}.`));
    }
    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error(dataLoadError(`The file was found, but JSON parsing failed: ${error.message}.`));
    }
    const questions = Array.isArray(payload) ? payload : payload.questions || [];
    if (!questions.length) throw new Error(dataLoadError("The file loaded, but it did not contain a non-empty questions array."));
    return { metadata: payload.metadata || {}, questions };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalize(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function sourceLabel(question) {
    return String(question.chapter_policy_sop_reference || question.source || "Unknown source").replace(/\s+-\s+source page.*$/i, "");
  }

  function chapterLabel(question) {
    return sourceLabel(question);
  }

  function bookLabel(question) {
    return question.source_category || "Unknown";
  }

  function sourceCode(question) {
    const ref = sourceLabel(question);
    const tag = (question.tags || []).find((value) => /\d/.test(value));
    return tag || ref.split(" - ")[0] || ref;
  }

  function primaryArea(question) {
    const text = normalize([question.source_category, question.chapter_policy_sop_reference, question.source_section, question.source, question.question_stem, ...(question.tags || []), ...(question.keywords || [])].join(" "));
    if (text.includes("administrative order") || text.includes(" io ") || text.includes(" ao ")) return "Administrative Orders";
    if (text.includes("collective bargaining") || text.includes("cba")) return "CBA";
    if (text.includes("medical operations") || text.includes("protocol") || text.includes("patient") || text.includes("triage") || text.includes("mom")) return "MOM";
    if (text.includes("high rise") || text.includes("highrise")) return "High-Rise";
    if (text.includes("structural") || text.includes("fireground") || text.includes("dwelling") || text.includes("warehouse")) return "Structural Firefighting";
    if (text.includes("incident safety") || text.includes("safety officer")) return "Incident Safety Officer";
    if (text.includes("nims") || text.includes("incident command") || text.includes(" ics ")) return "NIMS";
    if (text.includes("step up") || text.includes("leadership")) return "Step Up and Lead";
    if (text.includes("fire officer") || text.includes("company officer") || text.includes("captain")) return "Fire Officer";
    if (text.includes("sop") || question.source_category === "SOPs") return "SOPs";
    if (text.includes("policies") || text.includes("policy")) return "Policies";
    return question.source_category || "Other";
  }

  function searchableText(question) {
    return [
      question.question_id,
      question.source,
      question.source_category,
      question.chapter_policy_sop_reference,
      question.source_section,
      question.question_type,
      question.difficulty,
      question.estimated_exam_probability,
      question.question_stem,
      sourceCode(question),
      primaryArea(question),
      ...(question.keywords || []),
      ...(question.tags || []),
    ].join(" ");
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
  }

  function populateSelect(select, values, allLabel = "All") {
    if (!select) return;
    select.innerHTML = `<option value="">${allLabel}</option>` + uniqueSorted(values).map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  }

  function collectFilterValues(questions) {
    return {
      categories: uniqueSorted(questions.map((q) => q.source_category)),
      books: uniqueSorted(questions.map(bookLabel)),
      chapters: uniqueSorted(questions.map(chapterLabel)),
      difficulties: uniqueSorted(questions.map((q) => q.difficulty)),
      tags: uniqueSorted(questions.flatMap((q) => q.tags || [])),
      codes: uniqueSorted(questions.map(sourceCode)),
      areas: uniqueSorted([...ANALYTICS_AREAS, ...questions.map(primaryArea)]),
      probabilities: uniqueSorted(questions.map((q) => q.estimated_exam_probability)),
    };
  }

  function applyFilters(questions, filters = {}) {
    const terms = normalize(filters.query || filters.keyword).split(" ").filter(Boolean);
    return questions.filter((question) => {
      if (filters.category && question.source_category !== filters.category) return false;
      if (filters.book && bookLabel(question) !== filters.book) return false;
      if (filters.chapter && chapterLabel(question) !== filters.chapter) return false;
      if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
      if (filters.tag && !(question.tags || []).includes(filters.tag)) return false;
      if (filters.code && sourceCode(question) !== filters.code) return false;
      if (filters.area && primaryArea(question) !== filters.area) return false;
      if (filters.questionId && !normalize(question.question_id).includes(normalize(filters.questionId))) return false;
      if (filters.missedOnly && !isMissed(question.question_id)) return false;
      if (filters.bookmarkedOnly && !isBookmarked(question.question_id)) return false;
      if (!terms.length) return true;
      const haystack = normalize(searchableText(question));
      return terms.every((term) => haystack.includes(term));
    });
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function sample(questions, count) {
    return shuffle(questions).slice(0, Math.min(count, questions.length));
  }

  function displayChoices(question, randomize = true) {
    const baseChoices = Object.entries(question.answer_choices || {}).map(([label, text]) => ({ originalLabel: label, text }));
    const ordered = randomize ? shuffle(baseChoices) : baseChoices;
    return ordered.map((choice, index) => ({ ...choice, displayLabel: String.fromCharCode(65 + index) }));
  }

  function blueprintSample(questions, count = 125) {
    const selected = [];
    const used = new Set();
    BLUEPRINT.forEach((row) => {
      const group = questions.filter((q) => q.source_category === row.category && !used.has(q.question_id));
      sample(group, row.count).forEach((question) => {
        selected.push(question);
        used.add(question.question_id);
      });
    });
    if (selected.length < count) {
      sample(questions.filter((q) => !used.has(q.question_id)), count - selected.length).forEach((question) => selected.push(question));
    }
    return shuffle(selected).slice(0, count);
  }

  function answerRecord(questionId) {
    return progress.answers[questionId] || { attempts: 0, correct: 0, incorrect: 0, totalResponseMs: 0, lastCorrect: null, history: [] };
  }

  function updateDaily(correct, responseMs = 0) {
    const day = new Date().toISOString().slice(0, 10);
    const row = progress.daily[day] || { attempts: 0, correct: 0, responseMs: 0 };
    row.attempts += 1;
    row.correct += correct ? 1 : 0;
    row.responseMs += responseMs || 0;
    progress.daily[day] = row;
  }

  function updateMissed(questionId, correct) {
    if (!correct) {
      progress.missed[questionId] = { correctStreak: 0, lastMissedAt: new Date().toISOString() };
      return;
    }
    if (!progress.missed[questionId]) return;
    const row = progress.missed[questionId];
    row.correctStreak = (row.correctStreak || 0) + 1;
    row.lastCorrectAt = new Date().toISOString();
    if (row.correctStreak >= 2) delete progress.missed[questionId];
    else progress.missed[questionId] = row;
  }

  function recordAnswer(question, originalLabel, mode = "practice", meta = {}) {
    const correct = originalLabel === question.correct_answer;
    const responseMs = Math.max(0, Number(meta.responseMs || 0));
    const record = answerRecord(question.question_id);
    record.attempts += 1;
    record.correct += correct ? 1 : 0;
    record.incorrect += correct ? 0 : 1;
    record.totalResponseMs += responseMs;
    record.lastCorrect = correct;
    record.lastAnswer = originalLabel;
    record.lastAt = new Date().toISOString();
    record.sourceCategory = question.source_category;
    record.source = sourceLabel(question);
    record.chapter = chapterLabel(question);
    record.area = primaryArea(question);
    record.difficulty = question.difficulty;
    record.mode = mode;
    record.history = [...(record.history || []), { correct, answer: originalLabel, at: record.lastAt, mode, responseMs }].slice(-20);
    progress.answers[question.question_id] = record;
    updateMissed(question.question_id, correct);
    updateDaily(correct, responseMs);
    writeProgress(progress);
    return correct;
  }

  function setExamResult(result) {
    progress.exams = [result, ...(progress.exams || [])].slice(0, 20);
    progress.activeExam = null;
    writeProgress(progress);
  }

  function saveActiveExam(exam) {
    progress.activeExam = exam;
    writeProgress(progress);
  }

  function clearActiveExam() {
    progress.activeExam = null;
    writeProgress(progress);
  }

  function isMissed(questionId) {
    return Boolean(progress.missed[questionId]);
  }

  function missedIds() {
    return Object.keys(progress.missed || {});
  }

  function isBookmarked(questionId) {
    return Boolean(progress.bookmarks[questionId]);
  }

  function toggleBookmark(questionId) {
    if (progress.bookmarks[questionId]) delete progress.bookmarks[questionId];
    else progress.bookmarks[questionId] = true;
    writeProgress(progress);
    return isBookmarked(questionId);
  }

  function bookmarkedIds() {
    return Object.keys(progress.bookmarks || {});
  }

  function resetProgress() {
    progress.answers = {};
    progress.bookmarks = {};
    progress.missed = {};
    progress.flashcards = {};
    progress.exams = [];
    progress.activeExam = null;
    progress.daily = {};
    writeProgress(progress);
  }

  function scoreSummary() {
    const records = Object.values(progress.answers);
    const attempts = records.reduce((sum, record) => sum + record.attempts, 0);
    const correct = records.reduce((sum, record) => sum + record.correct, 0);
    const incorrect = records.reduce((sum, record) => sum + record.incorrect, 0);
    const responseMs = records.reduce((sum, record) => sum + (record.totalResponseMs || 0), 0);
    return {
      attempts,
      correct,
      incorrect,
      accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
      answered: records.length,
      missed: missedIds().length,
      bookmarks: bookmarkedIds().length,
      avgResponseSeconds: attempts && responseMs ? Math.round(responseMs / attempts / 1000) : 0,
    };
  }

  function aggregateScores(questions, keyFn) {
    const totals = new Map();
    questions.forEach((q) => totals.set(keyFn(q), (totals.get(keyFn(q)) || 0) + 1));
    const rows = new Map();
    Object.entries(progress.answers).forEach(([id, record]) => {
      const question = questions.find((q) => q.question_id === id);
      const key = question ? keyFn(question) : record.area || record.source || "Unknown";
      const row = rows.get(key) || { label: key, total: totals.get(key) || 0, attempts: 0, correct: 0, incorrect: 0 };
      row.attempts += record.attempts;
      row.correct += record.correct;
      row.incorrect += record.incorrect;
      rows.set(key, row);
    });
    totals.forEach((total, key) => {
      if (!rows.has(key)) rows.set(key, { label: key, total, attempts: 0, correct: 0, incorrect: 0 });
    });
    return [...rows.values()].map((row) => ({
      ...row,
      accuracy: row.attempts ? Math.round((row.correct / row.attempts) * 100) : 0,
    }));
  }

  function sourceScores(questions = []) {
    if (!questions.length) {
      const bySource = new Map();
      Object.values(progress.answers).forEach((record) => {
        const key = record.source || record.sourceCategory || "Unknown source";
        const current = bySource.get(key) || { source: key, label: key, attempts: 0, correct: 0, incorrect: 0 };
        current.attempts += record.attempts;
        current.correct += record.correct;
        current.incorrect += record.incorrect;
        bySource.set(key, current);
      });
      return [...bySource.values()].map((item) => ({ ...item, accuracy: item.attempts ? Math.round((item.correct / item.attempts) * 100) : 0 }));
    }
    return aggregateScores(questions, sourceLabel).sort((a, b) => b.attempts - a.attempts || a.label.localeCompare(b.label));
  }

  function areaScores(questions) {
    const rows = aggregateScores(questions, primaryArea);
    ANALYTICS_AREAS.forEach((area) => {
      if (!rows.some((row) => row.label === area)) rows.push({ label: area, total: 0, attempts: 0, correct: 0, incorrect: 0, accuracy: 0 });
    });
    return rows.sort((a, b) => ANALYTICS_AREAS.indexOf(a.label) - ANALYTICS_AREAS.indexOf(b.label));
  }

  function weakTopics(questions, limit = 8) {
    return aggregateScores(questions, chapterLabel)
      .filter((row) => row.attempts >= 2 && row.accuracy < 75)
      .sort((a, b) => a.accuracy - b.accuracy || b.incorrect - a.incorrect)
      .slice(0, limit);
  }

  function adaptiveSelection(questions, count = 1) {
    const chapterStats = new Map(aggregateScores(questions, chapterLabel).map((row) => [row.label, row]));
    const weighted = questions.map((question) => {
      const record = progress.answers[question.question_id];
      const chapter = chapterStats.get(chapterLabel(question));
      let weight = 1;
      if (!record) weight += 3;
      if (record?.lastCorrect === false) weight += 8;
      if (record?.attempts >= 2 && record.correct / record.attempts < 0.75) weight += 5;
      if (chapter?.attempts >= 2 && chapter.accuracy < 75) weight += 6;
      if (record?.attempts >= 3 && record.correct / record.attempts >= 0.85) weight -= 0.7;
      if (question.estimated_exam_probability === "High") weight += 1;
      return { question, weight: Math.max(0.2, weight) };
    });
    const selected = [];
    const used = new Set();
    while (selected.length < count && used.size < weighted.length) {
      const total = weighted.filter((item) => !used.has(item.question.question_id)).reduce((sum, item) => sum + item.weight, 0);
      let pick = Math.random() * total;
      for (const item of weighted) {
        if (used.has(item.question.question_id)) continue;
        pick -= item.weight;
        if (pick <= 0) {
          selected.push(item.question);
          used.add(item.question.question_id);
          break;
        }
      }
    }
    return selected;
  }

  function flashcardDue(questionId) {
    const card = progress.flashcards[questionId];
    return !card || new Date(card.dueAt).getTime() <= Date.now();
  }

  function rateFlashcard(question, rating) {
    const current = progress.flashcards[question.question_id] || { intervalDays: 0, ease: 2.5, reps: 0 };
    const intervals = { again: 0, hard: Math.max(1, current.intervalDays || 1), good: Math.max(3, Math.round((current.intervalDays || 1) * current.ease)), easy: Math.max(7, Math.round((current.intervalDays || 2) * (current.ease + 0.7))) };
    const easeDelta = { again: -0.2, hard: -0.1, good: 0.05, easy: 0.15 }[rating] || 0;
    const intervalDays = intervals[rating] ?? 1;
    const due = new Date(Date.now() + intervalDays * DAY_MS);
    progress.flashcards[question.question_id] = {
      rating,
      intervalDays,
      ease: Math.max(1.3, (current.ease || 2.5) + easeDelta),
      reps: (current.reps || 0) + 1,
      dueAt: due.toISOString(),
      lastReviewedAt: new Date().toISOString(),
    };
    recordAnswer(question, rating === "again" ? "" : question.correct_answer, "flashcard", { responseMs: 0 });
    writeProgress(progress);
  }

  function streak() {
    const days = Object.entries(progress.daily || {}).filter(([, row]) => row.attempts > 0).map(([day]) => day).sort();
    let current = 0;
    const cursor = new Date();
    while (days.includes(cursor.toISOString().slice(0, 10))) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    let best = 0;
    let run = 0;
    days.forEach((day, index) => {
      if (!index) run = 1;
      else {
        const prev = new Date(`${days[index - 1]}T00:00:00`);
        const now = new Date(`${day}T00:00:00`);
        run = Math.round((now - prev) / DAY_MS) === 1 ? run + 1 : 1;
      }
      best = Math.max(best, run);
    });
    return { current, best, activeDays: days.length };
  }

  function progressSeries(days = 14) {
    const rows = [];
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - days + 1);
    for (let i = 0; i < days; i += 1) {
      const key = cursor.toISOString().slice(0, 10);
      const row = progress.daily[key] || { attempts: 0, correct: 0 };
      rows.push({ key, label: key.slice(5), attempts: row.attempts || 0, correct: row.correct || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return rows;
  }

  function categoryCounts(questions) {
    const counts = new Map();
    questions.forEach((question) => counts.set(question.source_category, (counts.get(question.source_category) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }

  function renderSourceScores(container, limit = 8, questions = []) {
    if (!container) return;
    const scores = sourceScores(questions).filter((row) => row.attempts).slice(0, limit);
    if (!scores.length) {
      container.innerHTML = `<div class="empty">No scored answers yet.</div>`;
      return;
    }
    container.innerHTML = scores.map((item) => `
      <div class="source-score">
        <strong>${escapeHtml(item.label || item.source)}</strong>
        <span class="muted">${item.correct}/${item.attempts} correct - ${item.accuracy}%</span>
        <div class="bar"><span style="width:${item.accuracy}%"></span></div>
      </div>
    `).join("");
  }

  function renderHome({ questions }) {
    const root = document.querySelector("[data-home]");
    if (!root) return;
    const summary = scoreSummary();
    const categories = categoryCounts(questions);
    const streakInfo = streak();
    root.innerHTML = `
      <section class="page-head">
        <div>
          <p class="eyebrow">Professional Edition</p>
          <h1>Exam simulation, adaptive study, and analytics in one place.</h1>
        </div>
        <div class="action-row">
          <a class="button" href="exam.html?simulation=125">Start 125-Question Exam</a>
          <a class="ghost-button" href="quiz.html?mode=adaptive">Adaptive Study</a>
          <a class="ghost-button" href="flashcards.html">Flashcards</a>
        </div>
      </section>

      <section class="grid four">
        <div class="stat-card"><div class="label">Questions</div><div class="value">${questions.length}</div></div>
        <div class="stat-card"><div class="label">Overall Score</div><div class="value">${summary.accuracy}%</div></div>
        <div class="stat-card"><div class="label">Study Streak</div><div class="value">${streakInfo.current}</div></div>
        <div class="stat-card"><div class="label">Avg Response</div><div class="value">${summary.avgResponseSeconds}s</div></div>
      </section>

      <section class="grid two" style="margin-top:16px">
        <div class="panel stack">
          <h2>Exam Blueprint</h2>
          ${BLUEPRINT.map((row) => `<div class="source-score"><strong>${row.category}</strong><span class="muted">${row.count} of 125 questions</span><div class="bar"><span style="width:${Math.round((row.count / 125) * 100)}%"></span></div></div>`).join("")}
        </div>
        <aside class="panel stack">
          <h2>Weak Topics</h2>
          ${weakTopics(questions, 6).map((row) => `<div class="list-item"><strong>${escapeHtml(row.label)}</strong><span class="muted">${row.correct}/${row.attempts} correct - ${row.accuracy}%</span><a class="ghost-button" href="quiz.html?mode=adaptive&query=${encodeURIComponent(row.label)}">Drill</a></div>`).join("") || `<div class="empty">Weak topics appear after practice attempts.</div>`}
        </aside>
      </section>

      <section class="grid two" style="margin-top:16px">
        <div class="panel stack">
          <h2>Source Sections</h2>
          ${categories.map(([category, count]) => `<div class="list-item"><strong>${escapeHtml(category)}</strong><span class="muted">${count} questions</span><div class="action-row"><a class="ghost-button" href="quiz.html?category=${encodeURIComponent(category)}">Study</a><a class="ghost-button" href="flashcards.html?category=${encodeURIComponent(category)}">Flashcards</a></div></div>`).join("")}
        </div>
        <aside class="panel stack">
          <h2>Recent Source Scores</h2>
          <div data-source-scores></div>
          <a class="ghost-button" href="statistics.html">Open Analytics</a>
        </aside>
      </section>
    `;
    renderSourceScores(root.querySelector("[data-source-scores]"), 8, questions);
  }

  function statusMessage(container, message, type = "") {
    if (!container) return;
    container.innerHTML = `<div class="empty ${type}">${escapeHtml(message)}</div>`;
  }

  function registerPwa() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("service-worker.js", { scope: "./" }).then(() => {
        if (window.CMASync) window.CMASync.render();
      }).catch(() => {
        if (window.CMASync) window.CMASync.render();
      });
    }
  }

  function bindInstallPrompt() {
    let deferredPrompt = null;
    const installButton = document.querySelector("[data-install-app]");
    if (!installButton) return;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      installButton.hidden = false;
    });
    installButton.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => {});
      deferredPrompt = null;
      installButton.hidden = true;
    });
    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      installButton.hidden = true;
    });
  }

  window.CMA = {
    BLUEPRINT,
    ANALYTICS_AREAS,
    progress,
    renderShell,
    loadQuestions,
    escapeHtml,
    normalize,
    sourceLabel,
    chapterLabel,
    bookLabel,
    sourceCode,
    primaryArea,
    searchableText,
    collectFilterValues,
    populateSelect,
    applyFilters,
    shuffle,
    sample,
    blueprintSample,
    displayChoices,
    recordAnswer,
    setExamResult,
    saveActiveExam,
    clearActiveExam,
    isMissed,
    missedIds,
    isBookmarked,
    toggleBookmark,
    bookmarkedIds,
    resetProgress,
    scoreSummary,
    sourceScores,
    areaScores,
    weakTopics,
    adaptiveSelection,
    flashcardDue,
    rateFlashcard,
    streak,
    progressSeries,
    renderSourceScores,
    renderHome,
    statusMessage,
    writeProgress,
  };

  document.addEventListener("DOMContentLoaded", async () => {
    renderShell();
    bindInstallPrompt();
    registerPwa();
    if (!document.querySelector("[data-home]")) return;
    const root = document.querySelector("[data-home]");
    try {
      renderHome(await loadQuestions());
    } catch (error) {
      statusMessage(root, error.message);
    }
  });
})();
