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

  const EXAM_BLUEPRINTS = [
    { id: "official", label: "Official Captain Simulation", description: "125-question mixed promotional exam distribution", mode: "official" },
    { id: "policies", label: "Policies Only", filters: { category: "Policies & Procedures" } },
    { id: "sop", label: "SOP Only", filters: { category: "SOPs" } },
    { id: "fire-officer", label: "Fire Officer", filters: { area: "Fire Officer" } },
    { id: "incident-safety", label: "Incident Safety Officer", filters: { area: "Incident Safety Officer" } },
    { id: "cba", label: "CBA", filters: { category: "Collective Bargaining Agreement" } },
    { id: "high-rise", label: "High-Rise", filters: { area: "High-Rise" } },
    { id: "mom", label: "MOM", filters: { category: "Medical Operations Manual" } },
    { id: "rapid-review", label: "Rapid Review", filters: { probability: "High" } },
    { id: "hard", label: "Hard Questions Only", filters: { difficulty: "Hard" } },
    { id: "weak", label: "Weak Topics Only", mode: "weak" },
    { id: "random", label: "Random Mixed", mode: "random" },
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

  let questionCatalog = [];

  const navItems = [
    ["index.html", "Dashboard"],
    ["quiz.html", "Study"],
    ["exam.html", "Exam"],
    ["incident.html", "Incidents"],
    ["performance.html", "Performance"],
    ["tracking.html", "Tracking"],
    ["flashcards.html", "Flashcards"],
    ["search.html", "Search"],
    ["statistics.html", "Analytics"],
    ["account.html", "Account"],
  ];

  function trackingDefaults() {
    return {
      studyStartDate: "",
      promotionalExamDate: "",
      firstStudyAt: "",
      lastActivityAt: "",
      totalStudySeconds: 0,
      milestones: {},
      weeklyReports: {},
      dailyMissions: {},
      updatedAt: "",
      updatedAtMs: 0,
    };
  }

  function normalizeTracking(value = {}) {
    return {
      ...trackingDefaults(),
      ...value,
      milestones: value?.milestones || {},
      weeklyReports: value?.weeklyReports || {},
      dailyMissions: value?.dailyMissions || {},
    };
  }

  function emptyProgress() {
    return {
      answers: {},
      bookmarks: {},
      missed: {},
      needsReview: {},
      reports: [],
      reviewed: {},
      flashcards: {},
      exams: [],
      incidents: [],
      incidentProfile: { attempts: 0, readiness: 0, mastery: 0, confidence: 0, retention: 0, updatedAt: "" },
      activeExam: null,
      daily: {},
      adaptive: window.CMAAdaptiveEngine ? window.CMAAdaptiveEngine.ensure({}) : {},
      tracking: trackingDefaults(),
      tutor: { events: [] },
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
      needsReview: parsed.needsReview || {},
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      reviewed: parsed.reviewed || {},
      flashcards: parsed.flashcards || {},
      exams: parsed.exams || [],
      incidents: parsed.incidents || [],
      incidentProfile: parsed.incidentProfile || { attempts: 0, readiness: 0, mastery: 0, confidence: 0, retention: 0, updatedAt: "" },
      activeExam: parsed.activeExam || null,
      daily: parsed.daily || {},
      adaptive: parsed.adaptive || {},
      tracking: normalizeTracking(parsed.tracking || {}),
      tutor: parsed.tutor || { events: [] },
      darkMode: Boolean(parsed.darkMode),
    };
    if (window.CMAAdaptiveEngine) window.CMAAdaptiveEngine.ensure(progress);

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
    questionCatalog = questions;
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
      question.difficulty_score,
      question.bloom_level,
      question.captain_competency,
      ...(question.captain_competencies || []),
      question.topic,
      question.subtopic,
      question.exam_frequency_estimate,
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
      sources: uniqueSorted(questions.map(sourceLabel)),
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
      if (filters.source && sourceLabel(question) !== filters.source) return false;
      if (filters.book && bookLabel(question) !== filters.book) return false;
      if (filters.chapter && chapterLabel(question) !== filters.chapter) return false;
      if (filters.policy && !normalize(searchableText(question)).includes(normalize(filters.policy))) return false;
      if (filters.sop && !normalize(searchableText(question)).includes(normalize(filters.sop))) return false;
      if (filters.article && !normalize(searchableText(question)).includes(normalize(filters.article))) return false;
      if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
      if (filters.tag && !(question.tags || []).includes(filters.tag)) return false;
      if (filters.code && sourceCode(question) !== filters.code) return false;
      if (filters.area && primaryArea(question) !== filters.area) return false;
      if (filters.probability && question.estimated_exam_probability !== filters.probability) return false;
      if (filters.questionId && !normalize(question.question_id).includes(normalize(filters.questionId))) return false;
      if (filters.missedOnly && !isMissed(question.question_id)) return false;
      if (filters.bookmarkedOnly && !isBookmarked(question.question_id)) return false;
      if (filters.needsReviewOnly && !isNeedsReview(question.question_id)) return false;
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

  function questionsForBlueprint(questions, blueprintId = "official", count = 125) {
    const blueprint = EXAM_BLUEPRINTS.find((item) => item.id === blueprintId) || EXAM_BLUEPRINTS[0];
    if (blueprint.mode === "official") return blueprintSample(questions, count);
    if (blueprint.mode === "random") return sample(questions, count);
    if (blueprint.mode === "weak") {
      const weakLabels = new Set(weakTopics(questions, 20).map((row) => row.label));
      const weakPool = questions.filter((question) => weakLabels.has(chapterLabel(question)) || isMissed(question.question_id));
      const source = weakPool.length ? weakPool : adaptiveSelection(questions, Math.min(count, questions.length));
      return sample(source, count);
    }
    const filtered = applyFilters(questions, blueprint.filters || {});
    return sample(filtered, count);
  }

  function answerRecord(questionId) {
    return progress.answers[questionId] || { attempts: 0, correct: 0, incorrect: 0, totalResponseMs: 0, lastCorrect: null, history: [] };
  }

  function dayKeyFrom(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
  }

  function dailyRow(day) {
    return {
      attempts: 0,
      correct: 0,
      responseMs: 0,
      ...(progress.daily[day] || {}),
    };
  }

  function ensureTracking() {
    progress.tracking = normalizeTracking(progress.tracking || {});
    return progress.tracking;
  }

  function addStudySeconds(row, seconds = 0) {
    const usable = Math.max(0, Math.round(Number(seconds || 0)));
    if (!usable) return row;
    row.studySeconds = Math.round((row.studySeconds || 0) + usable);
    row.studyMinutes = Math.round((row.studySeconds || 0) / 60);
    return row;
  }

  function activitySeconds(type = "study", meta = {}) {
    if (Number.isFinite(Number(meta.studySeconds))) return Math.max(0, Math.round(Number(meta.studySeconds)));
    if (Number.isFinite(Number(meta.responseMs)) && Number(meta.responseMs) > 0) return Math.max(8, Math.round(Number(meta.responseMs) / 1000));
    if (/incident/i.test(type)) return 900;
    if (/tutor|lesson/i.test(type)) return 45;
    if (/flashcard/i.test(type)) return 20;
    if (/exam/i.test(type)) return 0;
    return 15;
  }

  function touchTracking(at = new Date().toISOString(), seconds = 0) {
    const tracking = ensureTracking();
    const day = dayKeyFrom(at);
    if (!tracking.firstStudyAt) tracking.firstStudyAt = at;
    if (!tracking.studyStartDate) tracking.studyStartDate = day;
    tracking.lastActivityAt = at;
    tracking.totalStudySeconds = Math.max(0, Math.round(Number(tracking.totalStudySeconds || 0) + Math.max(0, Number(seconds || 0))));
    tracking.updatedAt = at;
    tracking.updatedAtMs = Date.parse(at) || Date.now();
    return tracking;
  }

  function recordStudyActivity(type = "study", meta = {}) {
    const at = meta.at || new Date().toISOString();
    const day = dayKeyFrom(at);
    const seconds = activitySeconds(type, meta);
    touchTracking(at, seconds);
    if (meta.daily === false) return progress.tracking;
    const row = dailyRow(day);
    row.activities = (row.activities || 0) + 1;
    row.lastActivityAt = at;
    row.updatedAt = at;
    row.updatedAtMs = Date.parse(at) || Date.now();
    addStudySeconds(row, seconds);
    if (/exam/i.test(type)) {
      row.practiceExamsCompleted = (row.practiceExamsCompleted || 0) + 1;
      row.practiceExamScoreTotal = (row.practiceExamScoreTotal || 0) + Number(meta.score || 0);
      row.highestPracticeExamScore = Math.max(Number(row.highestPracticeExamScore || 0), Number(meta.score || 0));
    } else if (/incident/i.test(type)) {
      row.incidentAttempts = (row.incidentAttempts || 0) + 1;
      row.incidentScoreTotal = (row.incidentScoreTotal || 0) + Number(meta.score || 0);
    } else if (/flashcard/i.test(type)) {
      row.flashcardReviews = (row.flashcardReviews || 0) + 1;
    } else if (/tutor/i.test(type)) {
      row.aiTutorSessions = (row.aiTutorSessions || 0) + 1;
    }
    progress.daily[day] = row;
    return progress.tracking;
  }

  function setPromotionalExamDate(dateString = "") {
    const tracking = ensureTracking();
    tracking.promotionalExamDate = dateString;
    tracking.updatedAt = new Date().toISOString();
    tracking.updatedAtMs = Date.now();
    writeProgress(progress);
    return tracking;
  }

  function updateDaily(correct, responseMs = 0, mode = "practice", meta = {}) {
    const at = meta.at || new Date().toISOString();
    const day = dayKeyFrom(at);
    const row = dailyRow(day);
    const seconds = activitySeconds(mode, { responseMs, studySeconds: meta.studySeconds });
    row.attempts += 1;
    row.correct += correct ? 1 : 0;
    row.responseMs += responseMs || 0;
    row.questionsAnswered = (row.questionsAnswered || 0) + 1;
    row.incorrect = Math.max(0, row.attempts - row.correct);
    row.lastActivityAt = at;
    row.updatedAt = at;
    row.updatedAtMs = Date.parse(at) || Date.now();
    if (/exam/i.test(mode)) row.examAnswers = (row.examAnswers || 0) + 1;
    else if (/flashcard/i.test(mode)) row.flashcardReviews = (row.flashcardReviews || 0) + 1;
    else if (/adaptive/i.test(mode)) row.adaptiveAnswers = (row.adaptiveAnswers || 0) + 1;
    else row.quizAnswers = (row.quizAnswers || 0) + 1;
    addStudySeconds(row, seconds);
    progress.daily[day] = row;
    touchTracking(at, seconds);
  }

  function updateMissed(questionId, correct) {
    if (!correct) {
      const current = progress.missed[questionId] || {};
      progress.missed[questionId] = {
        ...current,
        correctStreak: 0,
        misses: (current.misses || 0) + 1,
        lastMissedAt: new Date().toISOString(),
        status: "still weak",
      };
      return;
    }
    if (!progress.missed[questionId]) return;
    const row = progress.missed[questionId];
    row.correctStreak = (row.correctStreak || 0) + 1;
    row.lastCorrectAt = new Date().toISOString();
    row.status = row.correctStreak >= 2 ? "mastered" : "improving";
    if (row.correctStreak >= 2) delete progress.missed[questionId];
    else progress.missed[questionId] = row;
  }

  function markReviewed(questionId) {
    const day = new Date().toISOString().slice(0, 10);
    const row = progress.reviewed[day] || {};
    row[questionId] = true;
    progress.reviewed[day] = row;
    writeProgress(progress);
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
    updateDaily(correct, responseMs, mode, { at: record.lastAt });
    if (window.CMAAdaptiveEngine) {
      window.CMAAdaptiveEngine.recordAnswer(progress, question, record, { correct, responseMs, mode, at: record.lastAt });
      window.CMAAdaptiveEngine.analyze(progress, [], { snapshot: true });
    }
    writeProgress(progress);
    return correct;
  }

  function setExamResult(result) {
    progress.exams = [result, ...(progress.exams || [])].slice(0, 20);
    progress.activeExam = null;
    recordStudyActivity("practice-exam", {
      at: result.completedAt || result.at || new Date().toISOString(),
      score: result.pct || 0,
      studySeconds: 0,
    });
    if (window.CMAAdaptiveEngine) {
      window.CMAAdaptiveEngine.completeSession(progress, { type: "exam", result });
    }
    writeProgress(progress);
  }

  function incidentAttempts() {
    const local = progress.incidents || [];
    const synced = (progress.reports || [])
      .filter((row) => row.type === "incident-scenario" && row.result)
      .map((row) => row.result);
    const rows = new Map();
    [...local, ...synced].forEach((row) => {
      const id = row.id || row.reportId || row.completedAt || row.at;
      if (id) rows.set(id, row);
    });
    return [...rows.values()].sort((a, b) => Date.parse(b.completedAt || b.at || 0) - Date.parse(a.completedAt || a.at || 0));
  }

  function incidentWeakDomains(result) {
    const labels = [
      ["tacticalScore", "Tactical priorities"],
      ["safetyScore", "Safety"],
      ["communicationsScore", "Radio reports and command communications"],
      ["leadershipScore", "Leadership and command presence"],
    ];
    return labels
      .map(([key, label]) => ({ key, label, score: Number(result[key] || 0) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }

  function updateIncidentProfile(result) {
    const current = progress.incidentProfile || { attempts: 0, readiness: 0, mastery: 0, confidence: 0, retention: 0 };
    const attempts = (current.attempts || 0) + 1;
    const weighted = (oldValue, newValue) => Math.round(((oldValue || 0) * Math.max(0, attempts - 1) + Number(newValue || 0)) / attempts);
    const avgScore = Math.round(((result.overallScore || 0) + (result.tacticalScore || 0) + (result.safetyScore || 0) + (result.communicationsScore || 0) + (result.leadershipScore || 0)) / 5);
    const safetyFloor = Number(result.safetyScore || 0);
    const commFloor = Number(result.communicationsScore || 0);
    progress.incidentProfile = {
      attempts,
      readiness: weighted(current.readiness, Math.round(avgScore * 0.65 + safetyFloor * 0.2 + commFloor * 0.15)),
      mastery: weighted(current.mastery, avgScore),
      confidence: weighted(current.confidence, Math.round(avgScore * 0.7 + (result.leadershipScore || 0) * 0.3)),
      retention: weighted(current.retention, Math.max(40, Math.round(avgScore * 0.8 + 12))),
      lastScenario: result.scenarioTitle,
      updatedAt: new Date().toISOString(),
    };
    return progress.incidentProfile;
  }

  function incidentStudyPlan(result) {
    const weak = incidentWeakDomains(result);
    const plan = weak.map((row) => `Review ${row.label} from the scenario debrief and drill related questions.`);
    if ((result.safetyScore || 0) < 80) plan.push("Run an Incident Safety Officer or RIT-focused review before the next simulator attempt.");
    if ((result.communicationsScore || 0) < 80) plan.push("Practice a concise initial radio report, command mode announcement, resource request, and progress report.");
    if (!plan.length) plan.push("Run a higher-complexity incident and maintain the current command decision pattern.");
    return plan.slice(0, 5);
  }

  function setIncidentResult(result) {
    const completedAt = result.completedAt || new Date().toISOString();
    const id = result.id || `incident-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const next = {
      ...result,
      id,
      completedAt,
      at: completedAt,
      studyPlan: result.studyPlan?.length ? result.studyPlan : incidentStudyPlan(result),
      updatedAt: completedAt,
    };
    const profile = updateIncidentProfile(next);
    next.profileAfter = profile;
    progress.incidents = [next, ...(progress.incidents || [])].slice(0, 50);
    progress.reports = [
      {
        id: `incident-report-${id}`,
        reportId: `incident-report-${id}`,
        type: "incident-scenario",
        reason: "Incident command simulator completion",
        note: `${next.scenarioTitle}: ${next.overallScore}% command score`,
        source: (next.departmentReferences || []).join("; "),
        result: next,
        timestamp: completedAt,
        updatedAt: completedAt,
      },
      ...(progress.reports || []),
    ].slice(0, 500);
    const day = completedAt.slice(0, 10);
    const daily = progress.daily[day] || { attempts: 0, correct: 0, responseMs: 0 };
    daily.incidentAttempts = (daily.incidentAttempts || 0) + 1;
    daily.incidentScoreTotal = (daily.incidentScoreTotal || 0) + (next.overallScore || 0);
    daily.studySeconds = Math.round((daily.studySeconds || 0) + Math.max(300, Number(next.elapsedSeconds || 0)));
    daily.studyMinutes = Math.round((daily.studySeconds || 0) / 60);
    daily.lastActivityAt = completedAt;
    daily.updatedAt = completedAt;
    daily.updatedAtMs = Date.parse(completedAt) || Date.now();
    progress.daily[day] = daily;
    touchTracking(completedAt, Math.max(300, Number(next.elapsedSeconds || 0)));
    if (progress.adaptive) {
      progress.adaptive.lastSessionSummary = {
        day,
        answered: 0,
        correct: 0,
        missed: incidentWeakDomains(next).length,
        whatImprovedToday: [`${next.scenarioTitle} completed at ${next.overallScore}% command score`],
        whatGotWorse: incidentWeakDomains(next).filter((row) => row.score < 75).map((row) => `${row.label} scored ${row.score}%`),
        topicsRequiringImmediateReview: incidentWeakDomains(next).map((row) => row.label),
        recommendedStudyPlan: next.studyPlan,
        estimatedMinutesRequired: Math.max(30, incidentWeakDomains(next).length * 15 + 20),
        estimatedScoreImprovement: "+1.0 to +3.0 readiness points",
        type: "incident-scenario",
        updatedAt: completedAt,
      };
      progress.adaptive.sessionsByDay = progress.adaptive.sessionsByDay || {};
      progress.adaptive.sessionsByDay[day] = {
        ...(progress.adaptive.sessionsByDay[day] || {}),
        ...progress.adaptive.lastSessionSummary,
      };
    }
    writeProgress(progress);
    return next;
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

  function isNeedsReview(questionId) {
    return Boolean(progress.needsReview[questionId]);
  }

  function toggleNeedsReview(questionId) {
    if (progress.needsReview[questionId]) delete progress.needsReview[questionId];
    else progress.needsReview[questionId] = { at: new Date().toISOString() };
    writeProgress(progress);
    return isNeedsReview(questionId);
  }

  function needsReviewIds() {
    return Object.keys(progress.needsReview || {});
  }

  function missedStatus(questionId) {
    const row = progress.missed[questionId];
    if (!row) return "mastered";
    if ((row.correctStreak || 0) === 1) return "improving";
    return "still weak";
  }

  function reportIssue(question, reason, note = "") {
    const report = {
      id: `issue-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      question_id: question.question_id,
      source: sourceLabel(question),
      reason,
      note,
      timestamp: new Date().toISOString(),
    };
    progress.reports = [report, ...(progress.reports || [])].slice(0, 500);
    writeProgress(progress);
    return report;
  }

  function issueReports() {
    return progress.reports || [];
  }

  function downloadText(filename, content, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportIssueReports(format = "json") {
    const rows = issueReports();
    if (format === "csv") {
      const headers = ["reported question ID", "reason", "user note", "timestamp", "source"];
      const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const csv = [
        headers.map(escapeCsv).join(","),
        ...rows.map((row) => [row.question_id, row.reason, row.note, row.timestamp, row.source].map(escapeCsv).join(",")),
      ].join("\n");
      downloadText("captain-master-academy-reported-issues.csv", csv, "text/csv");
      return rows.length;
    }
    downloadText("captain-master-academy-reported-issues.json", JSON.stringify(rows, null, 2), "application/json");
    return rows.length;
  }

  function resetProgress() {
    progress.answers = {};
    progress.bookmarks = {};
    progress.missed = {};
    progress.needsReview = {};
    progress.reports = [];
    progress.reviewed = {};
    progress.flashcards = {};
    progress.exams = [];
    progress.incidents = [];
    progress.incidentProfile = { attempts: 0, readiness: 0, mastery: 0, confidence: 0, retention: 0, updatedAt: "" };
    progress.activeExam = null;
    progress.daily = {};
    progress.adaptive = emptyProgress().adaptive;
    progress.tracking = trackingDefaults();
    progress.tutor = { events: [] };
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
      needsReview: needsReviewIds().length,
      reportedIssues: issueReports().length,
      reviewedToday: Object.keys(progress.reviewed[new Date().toISOString().slice(0, 10)] || {}).length,
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

  function chapterScores(questions) {
    return aggregateScores(questions, chapterLabel).sort((a, b) => b.attempts - a.attempts || a.label.localeCompare(b.label));
  }

  function adaptiveAnalyze(questions = [], options = {}) {
    if (!window.CMAAdaptiveEngine) return null;
    return window.CMAAdaptiveEngine.analyze(progress, questions, options);
  }

  function adaptiveGroupRows(questions = [], dimension = "book") {
    if (!window.CMAAdaptiveEngine) return [];
    return window.CMAAdaptiveEngine.groupRows(progress, questions, dimension);
  }

  function policyScores(questions) {
    const rows = adaptiveGroupRows(questions, "policy");
    if (rows.length) return rows.sort((a, b) => b.attempts - a.attempts || b.risk - a.risk || a.label.localeCompare(b.label));
    return aggregateScores(questions, sourceLabel).sort((a, b) => b.attempts - a.attempts || a.label.localeCompare(b.label));
  }

  function adaptiveSessionSummary() {
    if (!window.CMAAdaptiveEngine) return null;
    window.CMAAdaptiveEngine.ensure(progress);
    return progress.adaptive.lastSessionSummary || progress.adaptive.sessionsByDay?.[new Date().toISOString().slice(0, 10)] || null;
  }

  function adaptiveTrend(days = 30) {
    return window.CMAAdaptiveEngine ? window.CMAAdaptiveEngine.trend(progress, days) : progressSeries(days);
  }

  function refreshAdaptive(questions = [], persist = false) {
    const adaptive = adaptiveAnalyze(questions, { snapshot: true });
    if (persist) writeProgress(progress);
    return adaptive;
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
      const profile = progress.adaptive?.questions?.[question.question_id];
      let weight = 1;
      if (!record) weight += 3;
      if (record?.lastCorrect === false) weight += 8;
      if (record?.attempts >= 2 && record.correct / record.attempts < 0.75) weight += 5;
      if (chapter?.attempts >= 2 && chapter.accuracy < 75) weight += 6;
      if (record?.attempts >= 3 && record.correct / record.attempts >= 0.85) weight -= 0.7;
      if (profile?.status === "forgotten") weight += 10;
      if (profile?.retention < 55) weight += 8;
      if (profile?.confidence < 50 && record) weight += 3;
      if (profile?.mastery >= 85 && profile?.retention >= 75) weight -= 1.2;
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

  function recentAccuracy(days = 14) {
    const since = Date.now() - days * DAY_MS;
    const events = Object.values(progress.answers).flatMap((record) => record.history || []).filter((event) => new Date(event.at || 0).getTime() >= since);
    const correct = events.filter((event) => event.correct).length;
    return events.length ? Math.round((correct / events.length) * 100) : 0;
  }

  function hardAccuracy() {
    const records = Object.values(progress.answers).filter((record) => record.difficulty === "Hard");
    const attempts = records.reduce((sum, record) => sum + record.attempts, 0);
    const correct = records.reduce((sum, record) => sum + record.correct, 0);
    return attempts ? Math.round((correct / attempts) * 100) : 0;
  }

  function flashcardStats() {
    const now = Date.now();
    const rows = Object.values(progress.flashcards || {});
    return rows.reduce(
      (stats, card) => {
        const due = new Date(card.dueAt || 0).getTime();
        if (!card.dueAt || due <= now) stats.dueToday += 1;
        if (card.dueAt && due < now - DAY_MS) stats.overdue += 1;
        if (card.dueAt && due > now) stats.upcoming += 1;
        if ((card.reps || 0) >= 3 && (card.intervalDays || 0) >= 7) stats.mastered += 1;
        return stats;
      },
      { dueToday: 0, overdue: 0, upcoming: 0, mastered: 0, total: rows.length }
    );
  }

  function readinessModel(questions) {
    const summary = scoreSummary();
    const recent = recentAccuracy(14);
    const hard = hardAccuracy();
    const weakRows = weakTopics(questions, 12);
    const weakAverage = weakRows.length ? Math.round(weakRows.reduce((sum, row) => sum + row.accuracy, 0) / weakRows.length) : summary.accuracy;
    const exams = progress.exams || [];
    const examAverage = exams.length ? Math.round(exams.slice(0, 5).reduce((sum, exam) => sum + (exam.pct || 0), 0) / Math.min(5, exams.length)) : 0;
    const recovered = Object.values(progress.answers).filter((record) => record.lastCorrect === true && record.incorrect > 0).length;
    const recovery = summary.answered ? Math.round((recovered / summary.answered) * 100) : 0;
    const streakInfo = streak();
    const consistency = Math.min(100, Math.round(((streakInfo.current * 8) + (streakInfo.activeDays * 2))));
    const responseScore = summary.avgResponseSeconds ? Math.max(0, Math.min(100, 100 - Math.max(0, summary.avgResponseSeconds - 45))) : 60;
    const score = Math.round(
      summary.accuracy * 0.25 +
      (recent || summary.accuracy) * 0.18 +
      (hard || summary.accuracy) * 0.14 +
      (weakAverage || summary.accuracy) * 0.14 +
      (examAverage || summary.accuracy) * 0.14 +
      recovery * 0.07 +
      consistency * 0.05 +
      responseScore * 0.03
    );
    const category = score >= 85 ? "Exam ready" : score >= 72 ? "Near ready" : score >= 55 ? "Developing" : "Not ready";
    const recommendations = [];
    if (summary.attempts < 125) recommendations.push("Complete at least one full 125-question simulator.");
    if (recent && recent < summary.accuracy) recommendations.push("Run a focused drill today to lift recent accuracy.");
    if (hard < 75) recommendations.push("Drill hard questions and review rationales before moving on.");
    if (weakRows.length) recommendations.push(`Focus next on ${weakRows[0].label}.`);
    if (missedIds().length) recommendations.push("Use missed-question drill until each item is answered correctly twice in a row.");
    if (!recommendations.length) recommendations.push("Maintain readiness with a timed exam and flashcard review cycle.");
    const legacy = { score, category, recommendations, recent, hard, weakAverage, examAverage, recovery, consistency, responseScore };
    const adaptive = adaptiveAnalyze(questions, { snapshot: true })?.readiness;
    if (!adaptive) return legacy;
    return {
      ...legacy,
      score: adaptive.score,
      category: adaptive.category,
      recommendations: adaptive.recommendations?.length ? adaptive.recommendations : legacy.recommendations,
      recent: adaptive.recent || legacy.recent,
      hard: adaptive.hard || legacy.hard,
      weakAverage: adaptive.weakAverage || legacy.weakAverage,
      examAverage: adaptive.examAverage || legacy.examAverage,
      consistency: adaptive.consistency || legacy.consistency,
      predictedExamScore: adaptive.predictedExamScore,
      passProbability: adaptive.passProbability,
      estimatedRank: adaptive.estimatedRank,
      studyEfficiency: adaptive.studyEfficiency,
      confidence: adaptive.confidence,
      confidenceInterval: adaptive.confidenceInterval,
      questionsMastered: adaptive.questionsMastered,
      questionsNeedingReview: adaptive.questionsNeedingReview,
      questionsNeverSeen: adaptive.questionsNeverSeen,
      questionsForgotten: adaptive.questionsForgotten,
      studyMinutes7Day: adaptive.studyMinutes7Day,
      strongestBooks: adaptive.strongestBooks,
      weakestBooks: adaptive.weakestBooks,
      retentionWeightedMastery: adaptive.retentionWeightedMastery,
      coverage: adaptive.coverage,
    };
  }

  function strongestTopics(questions, limit = 6) {
    return aggregateScores(questions, chapterLabel)
      .filter((row) => row.attempts >= 2)
      .sort((a, b) => b.accuracy - a.accuracy || b.correct - a.correct)
      .slice(0, limit);
  }

  function confidenceLabel(summary) {
    if (summary.attempts >= 250 && (progress.exams || []).length) return "High";
    if (summary.attempts >= 75) return "Moderate";
    return "Low";
  }

  function studyCoach(questions, context = {}) {
    const summary = scoreSummary();
    const readiness = readinessModel(questions);
    const strong = strongestTopics(questions, 3);
    const weak = weakTopics(questions, 5);
    const flashcards = flashcardStats();
    const missed = missedIds().length;
    const confidence = confidenceLabel(summary);
    const predictedPassProbability = readiness.passProbability || Math.max(1, Math.min(99, Math.round(readiness.score * 0.85 + (readiness.examAverage || readiness.recent || summary.accuracy || 55) * 0.15)));
    const weakLead = weak[0]?.label || "mixed official blueprint";
    const studyMinutes = readiness.score >= 85 ? 30 : readiness.score >= 72 ? 45 : readiness.score >= 55 ? 60 : 90;
    const recommendedQuiz = missed ? "Missed Questions Only" : weak.length ? "Weak Topics Only" : context.examPct ? "Official Captain Simulation" : "Adaptive Study";
    const recommendedChapters = weak.length ? weak.map((row) => row.label).slice(0, 3) : ["Official Captain Simulation", "Rapid Review", "Hard Questions Only"];
    const recommendedFlashcards = flashcards.dueToday || flashcards.overdue ? `${flashcards.dueToday + flashcards.overdue} due or overdue flashcards` : "Create flashcards from missed and needs-review questions";
    const recommendedMissed = missed ? `${missed} missed questions need two consecutive correct answers` : "No missed-question backlog";
    return {
      readiness,
      predictedPassProbability,
      predictedExamScore: readiness.predictedExamScore || readiness.score,
      estimatedRank: readiness.estimatedRank || "Insufficient data",
      studyEfficiency: readiness.studyEfficiency || 0,
      confidenceInterval: readiness.confidenceInterval,
      confidence,
      strongestSubjects: strong.map((row) => row.label),
      weakestSubjects: weak.map((row) => row.label),
      recommendedStudyTime: `${studyMinutes} minutes`,
      recommendedQuiz,
      recommendedChapters,
      recommendedFlashcards,
      recommendedMissed,
      recommendations: [
        { label: `Study ${weakLead}`, confidence },
        { label: `Run ${recommendedQuiz}`, confidence: missed || weak.length ? "High" : confidence },
        { label: recommendedFlashcards, confidence: flashcards.total ? "High" : "Moderate" },
        { label: recommendedMissed, confidence: missed ? "High" : "Moderate" },
      ],
    };
  }

  function studyCoachHtml(questions, context = {}) {
    const coach = studyCoach(questions, context);
    const strong = coach.strongestSubjects.length ? coach.strongestSubjects : ["Complete more questions to identify strengths"];
    const weak = coach.weakestSubjects.length ? coach.weakestSubjects : ["Complete more questions to identify weak areas"];
    return `
      <div class="stack">
        <div class="readiness-meter"><span style="width:${coach.readiness.score}%"></span></div>
        <div class="grid two">
          <div class="stat-card"><div class="label">Readiness</div><div class="value">${coach.readiness.score}%</div><span class="muted">${escapeHtml(coach.readiness.category)}</span></div>
          <div class="stat-card"><div class="label">Predicted Pass</div><div class="value">${coach.predictedPassProbability}%</div><span class="muted">${escapeHtml(coach.confidence)} confidence</span></div>
        </div>
        <div class="grid two">
          <div class="stat-card"><div class="label">Predicted Exam</div><div class="value">${coach.predictedExamScore}%</div><span class="muted">${escapeHtml(coach.estimatedRank)}</span></div>
          <div class="stat-card"><div class="label">Efficiency</div><div class="value">${coach.studyEfficiency}</div><span class="muted">points/hour</span></div>
        </div>
        <div class="list-item">
          <strong>Recommended study time</strong>
          <span class="muted">${escapeHtml(coach.recommendedStudyTime)} today</span>
        </div>
        <div class="list-item">
          <strong>Recommended quiz</strong>
          <span class="muted">${escapeHtml(coach.recommendedQuiz)}</span>
        </div>
        <div class="list-item">
          <strong>Strongest subjects</strong>
          <span class="muted">${escapeHtml(strong.join(", "))}</span>
        </div>
        <div class="list-item">
          <strong>Weakest subjects</strong>
          <span class="muted">${escapeHtml(weak.join(", "))}</span>
        </div>
        <div class="list-item">
          <strong>Recommended chapters</strong>
          <span class="muted">${escapeHtml(coach.recommendedChapters.join(", "))}</span>
        </div>
        <div class="list-item">
          <strong>Flashcards</strong>
          <span class="muted">${escapeHtml(coach.recommendedFlashcards)}</span>
        </div>
        <div class="list-item">
          <strong>Missed questions</strong>
          <span class="muted">${escapeHtml(coach.recommendedMissed)}</span>
        </div>
        ${coach.recommendations.map((item) => `<div class="list-item"><strong>${escapeHtml(item.label)}</strong><span class="pill">${escapeHtml(item.confidence)} confidence</span></div>`).join("")}
      </div>
    `;
  }

  function missedBySource(questions) {
    const byId = new Map(questions.map((question) => [question.question_id, question]));
    const rows = new Map();
    missedIds().forEach((id) => {
      const question = byId.get(id);
      const key = question ? sourceLabel(question) : "Unknown";
      rows.set(key, (rows.get(key) || 0) + 1);
    });
    return [...rows.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  function answerChoiceText(question, label) {
    return question.answer_choices?.[label] || "";
  }

  function sharedTerms(left = [], right = []) {
    const rightSet = new Set((right || []).map(normalize).filter(Boolean));
    return (left || []).map(normalize).filter(Boolean).filter((term) => rightSet.has(term));
  }

  function relatedQuestionRows(question, questions = questionCatalog, limit = 6) {
    const keywords = question.keywords || [];
    const tags = question.tags || [];
    const code = sourceCode(question);
    return (questions || [])
      .filter((candidate) => candidate.question_id !== question.question_id)
      .map((candidate) => {
        let score = 0;
        if (sourceCode(candidate) === code) score += 8;
        if (candidate.source_category === question.source_category) score += 3;
        if (candidate.difficulty === question.difficulty) score += 1;
        if (candidate.question_type && candidate.question_type === question.question_type) score += 2;
        if (candidate.topic && question.topic && candidate.topic === question.topic) score += 5;
        score += sharedTerms(keywords, candidate.keywords || []).length * 2;
        score += sharedTerms(tags, candidate.tags || []).length;
        return { question: candidate, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.question.question_id.localeCompare(b.question.question_id))
      .slice(0, limit);
  }

  function similarPromotionalRows(question, questions = questionCatalog, limit = 5) {
    return (questions || [])
      .filter((candidate) => candidate.question_id !== question.question_id)
      .map((candidate) => {
        let score = 0;
        if (candidate.difficulty === question.difficulty) score += 3;
        if (candidate.estimated_exam_probability === question.estimated_exam_probability) score += 2;
        if (candidate.question_type && candidate.question_type === question.question_type) score += 4;
        if (candidate.bloom_level && candidate.bloom_level === question.bloom_level) score += 2;
        if (primaryArea(candidate) === primaryArea(question)) score += 2;
        score += sharedTerms(question.keywords || [], candidate.keywords || []).length;
        return { question: candidate, score };
      })
      .filter((row) => row.score >= 4)
      .sort((a, b) => b.score - a.score || a.question.question_id.localeCompare(b.question.question_id))
      .slice(0, limit);
  }

  function sourceReference(question) {
    return [
      sourceLabel(question),
      question.source_section ? `Section: ${question.source_section}` : "",
      question.source_page ? `Page: ${question.source_page}` : "",
    ].filter(Boolean).join(" | ");
  }

  function relatedPolicies(question, relatedRows = relatedQuestionRows(question, questionCatalog, 12)) {
    const rows = [question, ...relatedRows.map((row) => row.question)];
    return uniqueSorted(rows
      .filter((item) => /policy|policies/i.test([item.source_category, item.source, item.chapter_policy_sop_reference].join(" ")))
      .map((item) => sourceCode(item) || sourceLabel(item)))
      .slice(0, 6);
  }

  function relatedSogs(question, relatedRows = relatedQuestionRows(question, questionCatalog, 12)) {
    const rows = [question, ...relatedRows.map((row) => row.question)];
    return uniqueSorted(rows
      .filter((item) => /sop|sog|standard operating/i.test([item.source_category, item.source, item.chapter_policy_sop_reference].join(" ")))
      .map((item) => sourceCode(item) || sourceLabel(item)))
      .slice(0, 6);
  }

  function trapList(question) {
    const traps = [];
    const stem = normalize(question.question_stem);
    const rationale = normalize(question.detailed_rationale);
    const incorrectText = normalize(Object.values(question.incorrect_answer_explanations || {}).join(" "));
    if (stem.includes("except") || stem.includes("not correct")) traps.push("Negative wording: answer the exception, not the true statement.");
    if (incorrectText.includes("may") || incorrectText.includes("must")) traps.push("May vs. must: test writers often change mandatory language into discretionary language.");
    if (incorrectText.includes("prior") || incorrectText.includes("after")) traps.push("Timing shift: watch for prior, after, promptly, immediately, and next-business-day wording.");
    if (incorrectText.includes("driver") || incorrectText.includes("oic") || incorrectText.includes("division chief") || rationale.includes("responsible")) traps.push("Role swap: confirm which rank, unit, bureau, or position owns the action.");
    if (question.question_type === "Timeline/Number" || /\d/.test(question.question_stem)) traps.push("Number trap: exact counts, days, hours, percentages, and sequence words matter.");
    if (!traps.length) traps.push("Close-language trap: each distractor is plausible, so anchor the answer to the cited source reference.");
    return traps.slice(0, 5);
  }

  function memoryAid(question) {
    const words = (question.keywords || []).slice(0, 5);
    if (words.length >= 3) return `Remember the chain: ${words.join(" -> ")}.`;
    if (question.topic) return `Anchor this item to: ${question.topic}.`;
    return `Anchor this item to ${sourceCode(question)} and the exact source wording.`;
  }

  function tacticalConsiderations(question) {
    const area = primaryArea(question);
    if (/MOM|medical|EMS/i.test(area)) return "For a Captain, treat the item as a patient-care and documentation control point: confirm the required action, timing, and accountability before delegating.";
    if (/SOP|High-Rise|Structural|NIMS|Incident Safety/i.test(area)) return "For a Captain, convert the rule into an operational sequence: command objective, crew assignment, safety check, communication, and follow-up.";
    if (/CBA|Human Resources|Administrative|Policies/i.test(area)) return "For a Captain, apply the rule exactly, document the action, and keep the proper chain of command or approval path intact.";
    return "For a Captain, identify who owns the decision, what must happen next, and which exception could change the action.";
  }

  function examinerTesting(question) {
    const type = question.question_type || question.bloom_level || "source application";
    const area = primaryArea(question);
    return `The examiner is testing ${type.toLowerCase()} in ${area}, especially whether you can separate exact source language from plausible Captain-level distractors.`;
  }

  function questionExplanation(question, questions = questionCatalog, context = {}) {
    const related = relatedQuestionRows(question, questions, 6);
    const similar = similarPromotionalRows(question, questions, 5);
    const selected = context.selectedLabel || "";
    const selectedExplanation = selected && selected !== question.correct_answer
      ? question.incorrect_answer_explanations?.[selected] || "The selected answer does not match the cited official source wording."
      : "";
    return {
      questionId: question.question_id,
      whyCorrect: question.detailed_rationale || `The correct answer matches ${sourceReference(question)}.`,
      whyIncorrect: Object.entries(question.answer_choices || {})
        .filter(([label]) => label !== question.correct_answer)
        .map(([label, text]) => ({
          label,
          text,
          explanation: question.incorrect_answer_explanations?.[label] || "This option changes, adds, or omits a condition from the cited source.",
        })),
      sourceReference: sourceReference(question),
      relatedPolicies: relatedPolicies(question, related),
      relatedSogs: relatedSogs(question, related),
      relatedQuestions: related,
      similarQuestions: similar,
      traps: trapList(question),
      keywords: question.keywords || [],
      memoryAid: memoryAid(question),
      tacticalConsiderations: tacticalConsiderations(question),
      examinerTesting: examinerTesting(question),
      selectedExplanation,
    };
  }

  function rowsListHtml(rows, emptyText = "None identified from the current database.") {
    if (!rows.length) return `<li>${escapeHtml(emptyText)}</li>`;
    return rows.map((row) => `<li>${escapeHtml(row)}</li>`).join("");
  }

  function questionRowsHtml(rows) {
    if (!rows.length) return `<li>No related questions identified from the current database.</li>`;
    return rows.map(({ question }) => `
      <li>
        <strong>${escapeHtml(question.question_id)}</strong>
        <span class="muted">${escapeHtml(sourceLabel(question))}</span><br>
        ${escapeHtml(question.question_stem)}
      </li>
    `).join("");
  }

  function explanationPanelHtml(question, questions = questionCatalog, context = {}) {
    const model = questionExplanation(question, questions, context);
    return `
      <div class="tutor-panel stack">
        <div class="question-meta">
          <span class="pill">AI Captain Tutor</span>
          <span class="pill">${escapeHtml(model.questionId)}</span>
          <span class="pill">${escapeHtml(question.difficulty || "Unrated")}</span>
        </div>
        <section class="tutor-section" data-tutor-section="explain">
          <h3>Why the Correct Answer Is Correct</h3>
          <p>${escapeHtml(model.whyCorrect)}</p>
          <h3>Why the Incorrect Answers Are Wrong</h3>
          <ul class="explanation-list">
            ${model.whyIncorrect.map((row) => `<li><strong>${escapeHtml(row.label)}.</strong> ${escapeHtml(row.text)}<br><span class="muted">${escapeHtml(row.explanation)}</span></li>`).join("")}
          </ul>
        </section>
        <section class="tutor-section" data-tutor-section="teach">
          <h3>Mini Lesson</h3>
          <p>${escapeHtml(miniLessonText(question, context.selectedLabel || ""))}</p>
          <div class="grid two">
            <div class="list-item"><strong>Common test-writer traps</strong><ul>${rowsListHtml(model.traps)}</ul></div>
            <div class="list-item"><strong>Keywords to remember</strong><ul>${rowsListHtml(model.keywords.slice(0, 8), "Use the source reference and answer wording as the keyword anchor.")}</ul></div>
          </div>
          <p><strong>Memory aid:</strong> ${escapeHtml(model.memoryAid)}</p>
          <p><strong>Captain tactical considerations:</strong> ${escapeHtml(model.tacticalConsiderations)}</p>
          <p><strong>What the examiner is testing:</strong> ${escapeHtml(model.examinerTesting)}</p>
        </section>
        <section class="tutor-section" data-tutor-section="reference">
          <h3>Exact Source Reference</h3>
          <p>${escapeHtml(model.sourceReference)}</p>
          <p><strong>Source:</strong> ${escapeHtml(question.source || question.source_category || "Unknown")}</p>
          <p><strong>Source support:</strong> ${escapeHtml(question.source_support || question.detailed_rationale || "Stored rationale is the available support for this question.")}</p>
          <h3>Related Policies</h3>
          <ul>${rowsListHtml(model.relatedPolicies, "No directly related policy code identified.")}</ul>
          <h3>Related SOGs / SOPs</h3>
          <ul>${rowsListHtml(model.relatedSogs, "No directly related SOG/SOP identified.")}</ul>
        </section>
        <section class="tutor-section" data-tutor-section="related">
          <h3>Related Questions</h3>
          <ul class="explanation-list">${questionRowsHtml(model.relatedQuestions)}</ul>
          <h3>Similar Captain Promotional Questions</h3>
          <ul class="explanation-list">${questionRowsHtml(model.similarQuestions)}</ul>
        </section>
      </div>
    `;
  }

  function miniLessonText(question, selectedLabel = "") {
    const selectedExplanation = selectedLabel && selectedLabel !== question.correct_answer
      ? question.incorrect_answer_explanations?.[selectedLabel] || "Your selected answer changed a condition from the source."
      : "";
    const correctText = answerChoiceText(question, question.correct_answer);
    return [
      `Start with the source: ${sourceReference(question)}.`,
      `The correct answer is ${question.correct_answer}: ${correctText}.`,
      selectedExplanation ? `Your miss: ${selectedExplanation}` : "",
      `Trap to avoid: ${trapList(question)[0]}`,
      `Remember: ${memoryAid(question)}`,
    ].filter(Boolean).join(" ");
  }

  function miniLessonHtml(question, selectedLabel = "", questions = questionCatalog) {
    const model = questionExplanation(question, questions, { selectedLabel });
    return `
      <div class="tutor-mini-lesson">
        <div class="question-meta">
          <span class="pill">Mini lesson</span>
          <span class="pill">30-90 sec</span>
          <span class="pill">Auto flashcard created</span>
        </div>
        <p>${escapeHtml(miniLessonText(question, selectedLabel))}</p>
        <div class="grid two">
          <div class="list-item"><strong>Examiner focus</strong><span class="muted">${escapeHtml(model.examinerTesting)}</span></div>
          <div class="list-item"><strong>Review reminder</strong><span class="muted">Due today, then again tomorrow if still missed.</span></div>
        </div>
      </div>
    `;
  }

  function openTutorPanel(question, mode = "explain", options = {}) {
    markReviewed(question.question_id);
    document.querySelector("[data-review-overlay]")?.remove();
    document.body.insertAdjacentHTML("beforeend", `
      <div class="review-overlay" data-review-overlay>
        <section class="review-panel tutor-overlay-panel" role="dialog" aria-modal="true" aria-label="AI Captain Tutor">
          <div class="review-head">
            <div>
              <p class="eyebrow">AI Captain Tutor</p>
              <h2>${escapeHtml(question.question_id)}</h2>
            </div>
            <button class="icon-button" type="button" aria-label="Close tutor" data-close-review>X</button>
          </div>
          <div class="toolbar tutor-tabs">
            <button class="ghost-button" type="button" data-tutor-tab="explain">Explain Question</button>
            <button class="ghost-button" type="button" data-tutor-tab="teach">Teach Me</button>
            <button class="ghost-button" type="button" data-tutor-tab="reference">Show Reference</button>
            <button class="ghost-button" type="button" data-tutor-tab="related">Show Related Questions</button>
          </div>
          ${explanationPanelHtml(question, options.questions || questionCatalog, options)}
        </section>
      </div>
    `);
    const overlay = document.querySelector("[data-review-overlay]");
    const activate = (nextMode) => {
      overlay.querySelectorAll("[data-tutor-section]").forEach((section) => section.classList.toggle("hidden", section.dataset.tutorSection !== nextMode));
      overlay.querySelectorAll("[data-tutor-tab]").forEach((button) => button.classList.toggle("active-mode", button.dataset.tutorTab === nextMode));
    };
    overlay.querySelector("[data-close-review]").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });
    overlay.querySelectorAll("[data-tutor-tab]").forEach((button) => {
      button.addEventListener("click", () => activate(button.dataset.tutorTab));
    });
    activate(mode);
  }

  function scheduleTutorFlashcard(question, selectedLabel = "") {
    const current = progress.flashcards[question.question_id] || { intervalDays: 0, ease: 2.2, reps: 0 };
    progress.flashcards[question.question_id] = {
      ...current,
      source: "AI Captain Tutor",
      prompt: question.question_stem,
      answer: `${question.correct_answer}. ${answerChoiceText(question, question.correct_answer)}`,
      lesson: miniLessonText(question, selectedLabel),
      rating: "again",
      intervalDays: 0,
      ease: Math.max(1.3, Number(current.ease || 2.2) - 0.15),
      dueAt: new Date().toISOString(),
      lastReviewedAt: new Date().toISOString(),
      createdAt: current.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function handleIncorrectLearningEvent(question, selectedLabel = "", questions = questionCatalog) {
    const now = new Date().toISOString();
    recordStudyActivity("ai-tutor-session", { at: now, studySeconds: 45 });
    scheduleTutorFlashcard(question, selectedLabel);
    progress.needsReview[question.question_id] = {
      ...(progress.needsReview[question.question_id] || {}),
      at: now,
      reason: "Incorrect answer in AI Captain Tutor flow",
      reminderAt: now,
      nextReminderAt: new Date(Date.now() + DAY_MS).toISOString(),
      source: sourceReference(question),
      miniLesson: miniLessonText(question, selectedLabel),
      updatedAt: now,
    };
    if (progress.adaptive?.questions?.[question.question_id]) {
      const profile = progress.adaptive.questions[question.question_id];
      profile.confidence = Math.max(0, Math.round((profile.confidence || 0) - 8));
      profile.mastery = Math.max(0, Math.round((profile.mastery || 0) - 6));
      profile.retention = Math.max(0, Math.round((profile.retention || 0) - 6));
      profile.recommendedReviewAt = now;
      profile.expectedForgettingAt = now;
      profile.status = "needs review";
      profile.updatedAt = now;
    }
    progress.tutor = progress.tutor || { events: [] };
    progress.tutor.events = [
      {
        id: `tutor-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        question_id: question.question_id,
        selectedLabel,
        correctAnswer: question.correct_answer,
        source: sourceReference(question),
        lesson: miniLessonText(question, selectedLabel),
        relatedQuestions: relatedQuestionRows(question, questions, 4).map((row) => row.question.question_id),
        at: now,
      },
      ...(progress.tutor.events || []),
    ].slice(0, 250);
    writeProgress(progress);
    return progress.tutor.events[0];
  }

  function reviewPanelHtml(question) {
    const tutor = questionExplanation(question, questionCatalog);
    const incorrect = Object.entries(question.incorrect_answer_explanations || {})
      .map(([label, explanation]) => `<li><strong>${escapeHtml(label)}.</strong> ${escapeHtml(answerChoiceText(question, label))}<br><span class="muted">${escapeHtml(explanation)}</span></li>`)
      .join("");
    return `
      <div class="review-overlay" data-review-overlay>
        <section class="review-panel" role="dialog" aria-modal="true" aria-label="Question review">
          <div class="review-head">
            <div>
              <p class="eyebrow">Question Review</p>
              <h2>${escapeHtml(question.question_id)}</h2>
            </div>
            <button class="icon-button" type="button" aria-label="Close review" data-close-review>X</button>
          </div>
          <div class="question-meta">
            <span class="pill">${escapeHtml(question.source_category)}</span>
            <span class="pill">${escapeHtml(question.difficulty)}</span>
            <span class="pill">${escapeHtml(question.estimated_exam_probability || "Unrated")} probability</span>
            <span class="pill">${escapeHtml(isMissed(question.question_id) ? missedStatus(question.question_id) : "not missed")}</span>
          </div>
          <div class="review-grid">
            <div class="stack">
              <h3>${escapeHtml(question.question_stem)}</h3>
              <p><strong>Source:</strong> ${escapeHtml(question.source || question.source_category || "Unknown")}</p>
              <p><strong>Reference:</strong> ${escapeHtml(sourceLabel(question))}</p>
              <p><strong>Correct answer:</strong> ${escapeHtml(question.correct_answer)}. ${escapeHtml(answerChoiceText(question, question.correct_answer))}</p>
              <p><strong>Rationale:</strong> ${escapeHtml(question.detailed_rationale)}</p>
              <div>
                <strong>Incorrect answer explanations:</strong>
                <ul class="explanation-list">${incorrect || "<li>No incorrect-answer explanations stored for this item.</li>"}</ul>
              </div>
              <p><strong>Tags:</strong> ${escapeHtml((question.tags || []).join(", ") || "None")}</p>
              <p><strong>Keywords:</strong> ${escapeHtml((question.keywords || []).join(", ") || "None")}</p>
              <div class="tutor-mini-lesson">
                <h3>AI Captain Tutor</h3>
                <p><strong>What the examiner is testing:</strong> ${escapeHtml(tutor.examinerTesting)}</p>
                <p><strong>Common trap:</strong> ${escapeHtml(tutor.traps[0])}</p>
                <p><strong>Memory aid:</strong> ${escapeHtml(tutor.memoryAid)}</p>
                <p><strong>Captain tactical consideration:</strong> ${escapeHtml(tutor.tacticalConsiderations)}</p>
              </div>
            </div>
            <aside class="panel stack">
              <button class="ghost-button" type="button" data-tutor-action="explain" data-tutor-question="${escapeHtml(question.question_id)}">Explain Question</button>
              <button class="ghost-button" type="button" data-tutor-action="teach" data-tutor-question="${escapeHtml(question.question_id)}">Teach Me</button>
              <button class="ghost-button" type="button" data-tutor-action="reference" data-tutor-question="${escapeHtml(question.question_id)}">Show Reference</button>
              <button class="ghost-button" type="button" data-tutor-action="related" data-tutor-question="${escapeHtml(question.question_id)}">Show Related Questions</button>
              <button class="ghost-button" type="button" data-review-bookmark>${isBookmarked(question.question_id) ? "Remove Bookmark" : "Bookmark Question"}</button>
              <button class="ghost-button" type="button" data-review-needs>${isNeedsReview(question.question_id) ? "Clear Needs Review" : "Mark Needs Review"}</button>
              <h3>Report Possible Issue</h3>
              <div class="field">
                <label for="issue-reason">Reason</label>
                <select id="issue-reason" data-issue-reason>
                  <option value="Answer may be wrong">Answer may be wrong</option>
                  <option value="Reference may be wrong">Reference may be wrong</option>
                  <option value="Wording is unclear">Wording is unclear</option>
                  <option value="Duplicate or too similar">Duplicate or too similar</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="field">
                <label for="issue-note">Note</label>
                <textarea id="issue-note" data-issue-note rows="5" placeholder="Add a short note"></textarea>
              </div>
              <button class="button" type="button" data-report-issue>Report Issue</button>
              <div class="empty hidden" data-report-status></div>
            </aside>
          </div>
        </section>
      </div>
    `;
  }

  function openQuestionReview(question) {
    markReviewed(question.question_id);
    document.querySelector("[data-review-overlay]")?.remove();
    document.body.insertAdjacentHTML("beforeend", reviewPanelHtml(question));
    const overlay = document.querySelector("[data-review-overlay]");
    overlay.querySelector("[data-close-review]").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });
    overlay.querySelector("[data-review-bookmark]").addEventListener("click", (event) => {
      const active = toggleBookmark(question.question_id);
      event.currentTarget.textContent = active ? "Remove Bookmark" : "Bookmark Question";
    });
    overlay.querySelector("[data-review-needs]").addEventListener("click", (event) => {
      const active = toggleNeedsReview(question.question_id);
      event.currentTarget.textContent = active ? "Clear Needs Review" : "Mark Needs Review";
    });
    overlay.querySelectorAll("[data-tutor-action]").forEach((button) => {
      button.addEventListener("click", () => openTutorPanel(question, button.dataset.tutorAction));
    });
    overlay.querySelector("[data-report-issue]").addEventListener("click", () => {
      const reason = overlay.querySelector("[data-issue-reason]").value;
      const note = overlay.querySelector("[data-issue-note]").value;
      reportIssue(question, reason, note);
      const status = overlay.querySelector("[data-report-status]");
      status.classList.remove("hidden");
      status.textContent = "Issue report saved locally.";
    });
  }

  function reviewActionsHtml(question) {
    return `
      <button class="ghost-button" type="button" data-tutor-action="explain" data-tutor-question="${escapeHtml(question.question_id)}">Explain Question</button>
      <button class="ghost-button" type="button" data-tutor-action="teach" data-tutor-question="${escapeHtml(question.question_id)}">Teach Me</button>
      <button class="ghost-button" type="button" data-tutor-action="reference" data-tutor-question="${escapeHtml(question.question_id)}">Show Reference</button>
      <button class="ghost-button" type="button" data-tutor-action="related" data-tutor-question="${escapeHtml(question.question_id)}">Show Related Questions</button>
      <button class="ghost-button" type="button" data-open-review="${escapeHtml(question.question_id)}">Review Details</button>
      <button class="ghost-button" type="button" data-toggle-bookmark="${escapeHtml(question.question_id)}">${isBookmarked(question.question_id) ? "Remove Bookmark" : "Bookmark"}</button>
      <button class="ghost-button" type="button" data-toggle-needs="${escapeHtml(question.question_id)}">${isNeedsReview(question.question_id) ? "Clear Needs Review" : "Needs Review"}</button>
    `;
  }

  function bindReviewActions(container, questionLookup, onChange = () => {}) {
    container.querySelectorAll("[data-tutor-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const question = questionLookup(button.dataset.tutorQuestion);
        if (question) openTutorPanel(question, button.dataset.tutorAction);
      });
    });
    container.querySelectorAll("[data-open-review]").forEach((button) => {
      button.addEventListener("click", () => {
        const question = questionLookup(button.dataset.openReview);
        if (question) openQuestionReview(question);
      });
    });
    container.querySelectorAll("[data-toggle-bookmark]").forEach((button) => {
      button.addEventListener("click", () => {
        const active = toggleBookmark(button.dataset.toggleBookmark);
        button.textContent = active ? "Remove Bookmark" : "Bookmark";
        onChange();
      });
    });
    container.querySelectorAll("[data-toggle-needs]").forEach((button) => {
      button.addEventListener("click", () => {
        const active = toggleNeedsReview(button.dataset.toggleNeeds);
        button.textContent = active ? "Clear Needs Review" : "Needs Review";
        onChange();
      });
    });
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
    const readiness = readinessModel(questions);
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
          <a class="ghost-button" href="performance.html">Performance Center</a>
          <a class="ghost-button" href="tracking.html">Promotion Tracking</a>
          <a class="ghost-button" href="incident.html">Incident Simulator</a>
          <a class="ghost-button" href="quiz.html?mode=adaptive">Adaptive Study</a>
          <a class="ghost-button" href="search.html">Search Bank</a>
          <a class="ghost-button" href="flashcards.html">Flashcards</a>
        </div>
      </section>

      <section class="grid four">
        <div class="stat-card"><div class="label">Questions</div><div class="value">${questions.length}</div></div>
        <div class="stat-card"><div class="label">Readiness</div><div class="value">${readiness.score}%</div><span class="muted">${readiness.category}</span></div>
        <div class="stat-card"><div class="label">Predicted Exam</div><div class="value">${readiness.predictedExamScore || readiness.score}%</div><span class="muted">${escapeHtml(readiness.estimatedRank || "Rank band pending")}</span></div>
        <div class="stat-card"><div class="label">Pass Probability</div><div class="value">${readiness.passProbability || 0}%</div></div>
        <div class="stat-card"><div class="label">Overall Score</div><div class="value">${summary.accuracy}%</div></div>
        <div class="stat-card"><div class="label">Study Streak</div><div class="value">${streakInfo.current}</div></div>
        <div class="stat-card"><div class="label">Mastered</div><div class="value">${readiness.questionsMastered || 0}</div></div>
        <div class="stat-card"><div class="label">Need Review</div><div class="value">${readiness.questionsNeedingReview || 0}</div></div>
      </section>

      <section class="grid two" style="margin-top:16px">
        <div class="panel stack">
          <h2>Captain Readiness</h2>
          <div class="readiness-meter"><span style="width:${readiness.score}%"></span></div>
          <div class="grid three">
            <div class="stat-card"><div class="label">Recent Accuracy</div><div class="value">${readiness.recent || 0}%</div></div>
            <div class="stat-card"><div class="label">Hard Accuracy</div><div class="value">${readiness.hard || 0}%</div></div>
            <div class="stat-card"><div class="label">Avg Response</div><div class="value">${summary.avgResponseSeconds}s</div></div>
            <div class="stat-card"><div class="label">Retention Mastery</div><div class="value">${readiness.retentionWeightedMastery || 0}%</div></div>
            <div class="stat-card"><div class="label">Never Seen</div><div class="value">${readiness.questionsNeverSeen || 0}</div></div>
            <div class="stat-card"><div class="label">Study Time</div><div class="value">${readiness.studyMinutes7Day || 0}m</div></div>
          </div>
        </div>
        <aside class="panel stack">
          <h2>Recommended Next Actions</h2>
          ${readiness.recommendations.map((item) => `<div class="list-item"><strong>${escapeHtml(item)}</strong></div>`).join("")}
        </aside>
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
          <h2>Study Queue</h2>
          <div class="grid two">
            <div class="stat-card"><div class="label">Missed</div><div class="value">${summary.missed}</div></div>
            <div class="stat-card"><div class="label">Needs Review</div><div class="value">${summary.needsReview}</div></div>
            <div class="stat-card"><div class="label">Bookmarks</div><div class="value">${summary.bookmarks}</div></div>
            <div class="stat-card"><div class="label">Reviewed Today</div><div class="value">${summary.reviewedToday}</div></div>
          </div>
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
    EXAM_BLUEPRINTS,
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
    questionsForBlueprint,
    displayChoices,
    recordAnswer,
    setExamResult,
    setIncidentResult,
    incidentAttempts,
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
    chapterScores,
    policyScores,
    weakTopics,
    strongestTopics,
    missedBySource,
    readinessModel,
    adaptiveAnalyze,
    adaptiveGroupRows,
    adaptiveSessionSummary,
    adaptiveTrend,
    refreshAdaptive,
    studyCoach,
    studyCoachHtml,
    flashcardStats,
    recentAccuracy,
    adaptiveSelection,
    recordStudyActivity,
    setPromotionalExamDate,
    ensureTracking,
    flashcardDue,
    rateFlashcard,
    streak,
    progressSeries,
    renderSourceScores,
    renderHome,
    statusMessage,
    writeProgress,
    markReviewed,
    isNeedsReview,
    toggleNeedsReview,
    needsReviewIds,
    missedStatus,
    reportIssue,
    issueReports,
    exportIssueReports,
    questionExplanation,
    explanationPanelHtml,
    miniLessonHtml,
    miniLessonText,
    handleIncorrectLearningEvent,
    openTutorPanel,
    openQuestionReview,
    reviewActionsHtml,
    bindReviewActions,
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
