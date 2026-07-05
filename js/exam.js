document.addEventListener("DOMContentLoaded", async () => {
  const card = document.querySelector("[data-exam-card]");
  const timer = document.querySelector("[data-exam-timer]");
  const position = document.querySelector("[data-exam-position]");
  const answeredCount = document.querySelector("[data-exam-answered]");
  const results = document.querySelector("[data-exam-results]");
  const startButton = document.querySelector("[data-start-exam]");
  const sizeSelect = document.querySelector("[data-exam-size]");
  const blueprintSelect = document.querySelector("[data-exam-blueprint]");
  const resumePanel = document.querySelector("[data-resume-panel]");
  const navigatorGrid = document.querySelector("[data-exam-navigator]");
  const filters = {
    query: document.querySelector("[data-filter-query]"),
    category: document.querySelector("[data-filter-category]"),
    difficulty: document.querySelector("[data-filter-difficulty]"),
  };

  const OFFICIAL_EXAM_SIZE = 125;
  const OFFICIAL_EXAM_SECONDS = 180 * 60;
  const PASSING_SCORE = 70;
  const READINESS_TARGET = 90;

  let allQuestions = [];
  let byId = new Map();
  let exam = null;
  let timerId = null;
  let submitted = false;

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));
  }

  function readFilters() {
    return {
      query: filters.query.value,
      category: filters.category.value,
      difficulty: filters.difficulty.value,
    };
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const mins = Math.floor((safeSeconds % 3600) / 60);
    const secs = Math.floor(safeSeconds % 60);
    if (hours) return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function questionSet() {
    return exam.questionIds.map((id) => byId.get(id)).filter(Boolean);
  }

  function saveExam() {
    if (!exam || submitted) return;
    exam.lastSavedAt = new Date().toISOString();
    CMA.saveActiveExam(exam);
  }

  function remainingSeconds() {
    if (!exam) return 0;
    if (exam.paused) return Math.max(0, Number(exam.remainingSeconds || 0));
    return Math.max(0, Math.ceil((new Date(exam.endsAt).getTime() - Date.now()) / 1000));
  }

  function startTimer() {
    window.clearInterval(timerId);
    if (!exam) return;
    timer.textContent = formatTime(remainingSeconds());
    if (exam.paused) return;
    timerId = window.setInterval(() => {
      const left = remainingSeconds();
      timer.textContent = formatTime(left);
      if (left <= 0) finishExam(true);
    }, 1000);
  }

  function activeQuestion() {
    return byId.get(exam.questionIds[exam.index]);
  }

  function difficultyKey(question) {
    const value = String(question.difficulty || "").toLowerCase();
    if (value.includes("hard")) return "Hard";
    if (value.includes("easy")) return "Easy";
    return "Moderate";
  }

  function difficultyRank(question) {
    return { Easy: 1, Moderate: 2, Hard: 3 }[difficultyKey(question)] || 2;
  }

  function pullQuestion(groups, preferredKeys) {
    for (const key of preferredKeys) {
      if (groups[key]?.length) return groups[key].shift();
    }
    const fallbackKey = Object.keys(groups).find((key) => groups[key].length);
    return fallbackKey ? groups[fallbackKey].shift() : null;
  }

  function orderByPromotionalProgression(selected) {
    const groups = {
      Easy: CMA.shuffle(selected.filter((question) => difficultyKey(question) === "Easy")),
      Moderate: CMA.shuffle(selected.filter((question) => difficultyKey(question) === "Moderate")),
      Hard: CMA.shuffle(selected.filter((question) => difficultyKey(question) === "Hard")),
    };
    const ordered = [];
    for (let index = 0; index < selected.length; index += 1) {
      const ratio = index / Math.max(1, selected.length - 1);
      const preference = ratio < 0.18
        ? ["Easy", "Moderate", "Hard"]
        : ratio < 0.62
          ? ["Moderate", "Easy", "Hard"]
          : ratio < 0.88
            ? ["Moderate", "Hard", "Easy"]
            : ["Hard", "Moderate", "Easy"];
      const next = pullQuestion(groups, preference);
      if (next) ordered.push(next);
    }
    return ordered.length === selected.length ? ordered : selected.sort((a, b) => difficultyRank(a) - difficultyRank(b));
  }

  function examDurationSeconds(size, blueprintId) {
    if (size === OFFICIAL_EXAM_SIZE && blueprintId === "official") return OFFICIAL_EXAM_SECONDS;
    return Math.max(size * 60, Math.round(size * 90));
  }

  function elapsedSeconds(currentExam = exam) {
    if (!currentExam?.startedAt) return 0;
    const pauseMs = Number(currentExam.pausedMsTotal || 0);
    return Math.max(0, Math.round((Date.now() - Date.parse(currentExam.startedAt) - pauseMs) / 1000));
  }

  function updateStatus() {
    if (!exam) {
      position.textContent = "0";
      answeredCount.textContent = "0";
      navigatorGrid.innerHTML = "";
      return;
    }
    position.textContent = `${exam.index + 1}/${exam.questionIds.length}`;
    answeredCount.textContent = Object.keys(exam.answers).length;
    renderNavigator();
  }

  function renderNavigator() {
    if (!exam) return;
    navigatorGrid.innerHTML = exam.questionIds
      .map((id, idx) => {
        const classes = ["nav-dot"];
        if (idx === exam.index) classes.push("current");
        if (exam.answers[id]) classes.push("answered");
        if (exam.flagged[id]) classes.push("flagged");
        const status = `${exam.answers[id] ? "answered" : "unanswered"}${exam.flagged[id] ? ", flagged" : ""}`;
        return `<button class="${classes.join(" ")}" type="button" data-nav-index="${idx}" title="Question ${idx + 1}" aria-label="Question ${idx + 1}, ${status}">${idx + 1}</button>`;
      })
      .join("");
    navigatorGrid.querySelectorAll("[data-nav-index]").forEach((button) => {
      button.addEventListener("click", () => {
        if (exam.paused) return;
        captureQuestionTime();
        exam.index = Number(button.dataset.navIndex);
        exam.questionStartedAt = Date.now();
        saveExam();
        renderQuestion();
      });
    });
  }

  function captureQuestionTime() {
    if (!exam || !exam.questionStartedAt || exam.paused) return;
    const id = exam.questionIds[exam.index];
    exam.responseMs[id] = (exam.responseMs[id] || 0) + Math.max(0, Date.now() - exam.questionStartedAt);
    exam.questionStartedAt = Date.now();
  }

  function renderQuestion() {
    if (!exam) return;
    if (exam.paused) {
      renderPauseScreen();
      return;
    }
    const question = activeQuestion();
    const choices = exam.choices[question.question_id];
    const selected = exam.answers[question.question_id];
    const flagged = Boolean(exam.flagged[question.question_id]);
    const isLastQuestion = exam.index === exam.questionIds.length - 1;
    card.innerHTML = `
      <div class="question-meta">
        <span class="pill">${CMA.escapeHtml(question.question_id)}</span>
        <span class="pill">${CMA.escapeHtml(question.source_category)}</span>
        <span class="pill">${CMA.escapeHtml(question.difficulty)}</span>
        <span class="pill">${CMA.escapeHtml(formatTime(remainingSeconds()))} remaining</span>
        <span class="pill">No feedback until completion</span>
        ${flagged ? `<span class="pill">Flagged</span>` : ""}
      </div>
      <h2>${CMA.escapeHtml(question.question_stem)}</h2>
      <p class="muted" style="margin-top:8px">${CMA.escapeHtml(CMA.sourceLabel(question))}</p>
      <div class="choice-list">
        ${choices
          .map((choice) => `
            <button class="choice ${selected === choice.originalLabel ? "selected" : ""}" type="button" data-choice="${CMA.escapeHtml(choice.originalLabel)}">
              <span class="letter">${choice.displayLabel}</span>
              <span class="text">${CMA.escapeHtml(choice.text)}</span>
            </button>
          `)
          .join("")}
      </div>
      <div class="toolbar exam-toolbar">
        <button class="ghost-button" type="button" data-prev ${exam.index === 0 ? "disabled" : ""}>Previous</button>
        <button class="ghost-button ${flagged ? "active-mode" : ""}" type="button" data-flag>${flagged ? "Unflag" : "Flag"}</button>
        <button class="ghost-button" type="button" data-pause>Pause</button>
        <button class="ghost-button" type="button" data-next>${isLastQuestion ? "Review" : "Next"}</button>
        <button class="button" type="button" data-submit>Review / Submit</button>
      </div>
    `;
    card.querySelectorAll("[data-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        captureQuestionTime();
        exam.answers[question.question_id] = button.dataset.choice;
        saveExam();
        renderQuestion();
      });
    });
    card.querySelector("[data-prev]").addEventListener("click", () => move(-1));
    card.querySelector("[data-next]").addEventListener("click", () => {
      if (isLastQuestion) renderReviewScreen();
      else move(1);
    });
    card.querySelector("[data-flag]").addEventListener("click", () => {
      exam.flagged[question.question_id] = !exam.flagged[question.question_id];
      if (!exam.flagged[question.question_id]) delete exam.flagged[question.question_id];
      saveExam();
      renderQuestion();
    });
    card.querySelector("[data-pause]").addEventListener("click", pauseExam);
    card.querySelector("[data-submit]").addEventListener("click", renderReviewScreen);
    updateStatus();
  }

  function move(delta) {
    if (!exam || exam.paused) return;
    captureQuestionTime();
    exam.index = Math.max(0, Math.min(exam.questionIds.length - 1, exam.index + delta));
    exam.questionStartedAt = Date.now();
    saveExam();
    renderQuestion();
  }

  function pauseExam() {
    if (!exam || exam.paused || submitted) return;
    captureQuestionTime();
    const left = remainingSeconds();
    exam.paused = true;
    exam.pausedAt = new Date().toISOString();
    exam.remainingSeconds = left;
    saveExam();
    window.clearInterval(timerId);
    renderPauseScreen();
  }

  function resumePausedExam() {
    if (!exam) return;
    const left = Math.max(1, Number(exam.remainingSeconds || remainingSeconds()));
    const pausedAt = Date.parse(exam.pausedAt || "");
    if (pausedAt) exam.pausedMsTotal = Number(exam.pausedMsTotal || 0) + Math.max(0, Date.now() - pausedAt);
    exam.paused = false;
    exam.pausedAt = "";
    exam.remainingSeconds = 0;
    exam.endsAt = new Date(Date.now() + left * 1000).toISOString();
    exam.questionStartedAt = Date.now();
    saveExam();
    startTimer();
    renderQuestion();
  }

  function renderPauseScreen() {
    if (!exam) return;
    window.clearInterval(timerId);
    timer.textContent = formatTime(remainingSeconds());
    card.innerHTML = `
      <section class="stack exam-pause-screen">
        <p class="eyebrow">Exam paused</p>
        <h2>Your 125-question simulation is saved.</h2>
        <div class="grid three">
          <div class="stat-card"><div class="label">Answered</div><div class="value">${Object.keys(exam.answers).length}</div><span class="muted">of ${exam.questionIds.length}</span></div>
          <div class="stat-card"><div class="label">Flagged</div><div class="value">${Object.keys(exam.flagged || {}).length}</div><span class="muted">for review</span></div>
          <div class="stat-card"><div class="label">Time Left</div><div class="value">${formatTime(remainingSeconds())}</div><span class="muted">timer stopped</span></div>
        </div>
        <div class="empty">Progress is saved in this browser and will sync to Firebase when cloud sync is available for this session.</div>
        <div class="toolbar">
          <button class="button" type="button" data-resume-paused>Resume Exam</button>
          <a class="ghost-button" href="index.html">Leave Exam Page</a>
        </div>
      </section>
    `;
    card.querySelector("[data-resume-paused]").addEventListener("click", resumePausedExam);
    updateStatus();
  }

  function subjectWeightHtml(selected) {
    const rows = new Map();
    selected.forEach((question) => {
      const key = CMA.bookLabel(question);
      rows.set(key, (rows.get(key) || 0) + 1);
    });
    return [...rows.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => `<span class="pill">${CMA.escapeHtml(label)}: ${count}</span>`)
      .join("");
  }

  function createExam(selected, size, blueprintId) {
    const blueprint = CMA.EXAM_BLUEPRINTS.find((item) => item.id === blueprintId) || CMA.EXAM_BLUEPRINTS[0];
    const now = Date.now();
    const ordered = blueprint.id === "official" ? orderByPromotionalProgression(selected) : selected;
    const durationSeconds = examDurationSeconds(size, blueprint.id);
    return {
      id: `exam-${now}`,
      size,
      questionIds: ordered.map((q) => q.question_id),
      choices: Object.fromEntries(ordered.map((q) => [q.question_id, CMA.displayChoices(q, true)])),
      answers: {},
      flagged: {},
      responseMs: {},
      index: 0,
      startedAt: new Date(now).toISOString(),
      endsAt: new Date(now + durationSeconds * 1000).toISOString(),
      durationSeconds,
      paused: false,
      pausedAt: "",
      pausedMsTotal: 0,
      remainingSeconds: 0,
      questionStartedAt: now,
      officialSimulation: blueprint.id === "official" && size === OFFICIAL_EXAM_SIZE,
      blueprint: { id: blueprint.id, label: blueprint.label },
      subjectWeights: Object.fromEntries([...new Set(ordered.map((question) => CMA.bookLabel(question)))].map((label) => [label, ordered.filter((question) => CMA.bookLabel(question) === label).length])),
    };
  }

  function startExam() {
    const size = Number(sizeSelect.value);
    const blueprintId = blueprintSelect?.value || "official";
    const activeFilters = readFilters();
    const hasActiveFilters = Boolean(activeFilters.query || activeFilters.category || activeFilters.difficulty);
    const filteredPool = CMA.applyFilters(allQuestions, activeFilters);
    const source = hasActiveFilters ? filteredPool : allQuestions;
    const selected = CMA.questionsForBlueprint(source, blueprintId, size);
    if (selected.length < size) {
      CMA.statusMessage(card, `Only ${selected.length} questions match that blueprint and filter combination. Adjust the filters or choose a shorter exam.`);
      return;
    }
    submitted = false;
    exam = createExam(selected, size, blueprintId);
    results.innerHTML = `
      <h2>Simulator Blueprint</h2>
      <p class="muted">${exam.officialSimulation ? "Full Captain promotional exam simulation with a 3-hour timer." : "Timed exam using the selected blueprint."}</p>
      <div class="pill-row">${subjectWeightHtml(questionSet())}</div>
    `;
    resumePanel.classList.add("hidden");
    saveExam();
    startTimer();
    renderQuestion();
  }

  function renderResumePanel() {
    const saved = CMA.progress.activeExam;
    if (!saved || saved.questionIds?.length !== OFFICIAL_EXAM_SIZE) {
      resumePanel.classList.add("hidden");
      return;
    }
    resumePanel.classList.remove("hidden");
    const answered = Object.keys(saved.answers || {}).length;
    const flagged = Object.keys(saved.flagged || {}).length;
    resumePanel.innerHTML = `
      <strong>Interrupted promotional exam found.</strong>
      <span class="muted">${answered}/${saved.questionIds.length} answered, ${flagged} flagged.</span>
      <div class="action-row" style="margin-top:10px">
        <button class="button" type="button" data-resume-exam>Resume Exam</button>
        <button class="ghost-button" type="button" data-discard-exam>Discard Saved Exam</button>
      </div>
    `;
    resumePanel.querySelector("[data-resume-exam]").addEventListener("click", () => {
      submitted = false;
      exam = saved;
      exam.responseMs = exam.responseMs || {};
      exam.flagged = exam.flagged || {};
      exam.answers = exam.answers || {};
      exam.index = Math.max(0, Math.min(exam.questionIds.length - 1, Number(exam.index || 0)));
      exam.questionStartedAt = Date.now();
      results.innerHTML = "";
      if (exam.paused) renderPauseScreen();
      else {
        startTimer();
        renderQuestion();
      }
    });
    resumePanel.querySelector("[data-discard-exam]").addEventListener("click", () => {
      CMA.clearActiveExam();
      resumePanel.classList.add("hidden");
    });
  }

  function renderReviewScreen() {
    if (!exam || exam.paused) return;
    captureQuestionTime();
    saveExam();
    const unanswered = exam.questionIds.filter((id) => !exam.answers[id]);
    const flagged = Object.keys(exam.flagged || {});
    const answered = exam.questionIds.length - unanswered.length;
    card.innerHTML = `
      <section class="stack exam-review-screen">
        <div class="question-meta">
          <span class="pill">${CMA.escapeHtml(exam.blueprint?.label || "Official Captain Simulation")}</span>
          <span class="pill">${formatTime(remainingSeconds())} remaining</span>
          <span class="pill">${answered}/${exam.questionIds.length} answered</span>
          <span class="pill">${flagged.length} flagged</span>
        </div>
        <h2>Review before final submission.</h2>
        <p class="muted">Feedback, correct answers, rationales, and analytics are shown only after the exam is submitted.</p>
        <div class="grid three">
          <div class="stat-card"><div class="label">Answered</div><div class="value">${answered}</div><span class="muted">responses saved</span></div>
          <div class="stat-card"><div class="label">Unanswered</div><div class="value">${unanswered.length}</div><span class="muted">${unanswered.length ? "count as incorrect" : "none"}</span></div>
          <div class="stat-card"><div class="label">Flagged</div><div class="value">${flagged.length}</div><span class="muted">for review</span></div>
        </div>
        <div class="exam-review-grid">
          ${exam.questionIds
            .map((id, idx) => {
              const classes = ["nav-dot"];
              if (exam.answers[id]) classes.push("answered");
              if (exam.flagged[id]) classes.push("flagged");
              if (!exam.answers[id]) classes.push("unanswered");
              return `<button class="${classes.join(" ")}" type="button" data-review-index="${idx}" title="Go to question ${idx + 1}">${idx + 1}</button>`;
            })
            .join("")}
        </div>
        <div class="toolbar sticky-submit">
          <button class="ghost-button" type="button" data-return-question>Return to Question ${exam.index + 1}</button>
          <button class="ghost-button" type="button" data-pause-review>Pause</button>
          <button class="button" type="button" data-final-submit>Submit Final Exam</button>
        </div>
      </section>
    `;
    card.querySelector("[data-return-question]").addEventListener("click", renderQuestion);
    card.querySelector("[data-pause-review]").addEventListener("click", pauseExam);
    card.querySelector("[data-final-submit]").addEventListener("click", () => finishExam(false));
    card.querySelectorAll("[data-review-index]").forEach((button) => {
      button.addEventListener("click", () => {
        exam.index = Number(button.dataset.reviewIndex);
        exam.questionStartedAt = Date.now();
        saveExam();
        renderQuestion();
      });
    });
    updateStatus();
  }

  function labelFor(question, dimension) {
    if (dimension === "book") return CMA.bookLabel(question);
    if (dimension === "chapter") return CMA.chapterLabel(question);
    if (dimension === "policy") return CMA.sourceCode(question);
    if (dimension === "difficulty") return question.difficulty || "Unknown";
    return CMA.sourceLabel(question);
  }

  function performanceRows(questions, answers, dimension) {
    const rows = new Map();
    questions.forEach((question) => {
      const label = labelFor(question, dimension);
      const row = rows.get(label) || { label, total: 0, correct: 0, missed: 0, accuracy: 0 };
      const isCorrect = answers[question.question_id] === question.correct_answer;
      row.total += 1;
      row.correct += isCorrect ? 1 : 0;
      row.missed += isCorrect ? 0 : 1;
      row.accuracy = Math.round((row.correct / row.total) * 100);
      rows.set(label, row);
    });
    return [...rows.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }

  function weakestRows(rows, limit = 5) {
    return rows
      .filter((row) => row.total > 0)
      .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total || a.label.localeCompare(b.label))
      .slice(0, limit);
  }

  function logisticProbability(score) {
    return Math.round(clamp(100 / (1 + Math.exp(-((score - PASSING_SCORE) / 6)))));
  }

  function estimatedPercentile(score, confidenceScore) {
    const confidenceAdjustment = (confidenceScore - 70) * 0.08;
    return Math.round(clamp((score - 55) * 2.2 + 35 + confidenceAdjustment, 1, 99));
  }

  function estimatedHoursUntil90(readiness) {
    const gap = Math.max(0, READINESS_TARGET - Number(readiness.score || 0));
    if (!gap) return 0;
    const efficiency = Math.max(1.5, Math.abs(Number(readiness.studyEfficiency || 0)) || 2.5);
    return Math.round((gap / efficiency) * 10) / 10;
  }

  function recommendedStudyPlan(analytics, missedCount) {
    const plan = [];
    analytics.weakestBooks.slice(0, 2).forEach((row) => plan.push(`Review ${row.label} and complete 20 targeted questions.`));
    analytics.weakestChapters.slice(0, 2).forEach((row) => plan.push(`Re-read ${row.label} and retry missed items from that chapter.`));
    analytics.weakestPolicies.slice(0, 2).forEach((row) => plan.push(`Run a policy/code drill for ${row.label}.`));
    if (missedCount) plan.push(`Complete missed-question recovery for ${missedCount} exam misses until each is correct twice in a row.`);
    if (!plan.length) plan.push("Maintain readiness with one official simulation and due flashcards this week.");
    return plan.slice(0, 6);
  }

  function buildExamAnalytics(examQuestions, answers, correct, pct, missed) {
    const readiness = CMA.readinessModel(allQuestions);
    const sourceRows = performanceRows(examQuestions, answers, "source");
    const bookRows = performanceRows(examQuestions, answers, "book");
    const chapterRows = performanceRows(examQuestions, answers, "chapter");
    const policyRows = performanceRows(examQuestions, answers, "policy");
    const difficultyRows = performanceRows(examQuestions, answers, "difficulty");
    const answeredRate = Math.round((Object.keys(answers).length / examQuestions.length) * 100);
    const confidenceScore = Math.round(clamp((readiness.confidence || 0) * 0.45 + answeredRate * 0.30 + pct * 0.25));
    const predictedBase = Number(readiness.predictedExamScore || readiness.score || pct);
    const estimatedScore = Math.round(clamp(pct * 0.62 + predictedBase * 0.38));
    const passProbability = Math.round(clamp(logisticProbability(estimatedScore) * 0.65 + Number(readiness.passProbability || logisticProbability(predictedBase)) * 0.35));
    const analytics = {
      readiness,
      sourceRows,
      bookRows,
      chapterRows,
      policyRows,
      difficultyRows,
      weakestBooks: weakestRows(bookRows),
      weakestChapters: weakestRows(chapterRows),
      weakestPolicies: weakestRows(policyRows),
      confidenceScore,
      estimatedScore,
      passProbability,
      percentile: estimatedPercentile(estimatedScore, confidenceScore),
      hoursUntil90: estimatedHoursUntil90(readiness),
    };
    analytics.plan = recommendedStudyPlan(analytics, missed.length);
    return analytics;
  }

  function rowsHtml(rows, limit = 8) {
    return rows.slice(0, limit).map((row) => `
      <div class="source-score">
        <strong>${CMA.escapeHtml(row.label)}</strong>
        <span class="muted">${row.correct}/${row.total} correct - ${row.accuracy}%</span>
        <div class="bar"><span style="width:${row.accuracy}%"></span></div>
      </div>
    `).join("");
  }

  function heatClass(row) {
    if (row.accuracy >= 82) return "strong";
    if (row.accuracy >= 70) return "moderate";
    return "weak";
  }

  function heatMapHtml(title, rows) {
    const weakFirst = [...rows].sort((a, b) => a.accuracy - b.accuracy || b.total - a.total).slice(0, 12);
    return `
      <section class="stack">
        <h3>${CMA.escapeHtml(title)}</h3>
        <div class="heatmap-grid">
          ${weakFirst.map((row) => `
            <div class="heat-cell ${heatClass(row)}">
              <strong>${CMA.escapeHtml(row.label)}</strong>
              <span>${row.accuracy}%</span>
              <small>${row.correct}/${row.total} correct, ${row.missed} missed</small>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function analyticsHtml(analytics) {
    return `
      <section class="stack exam-analytics">
        <h3>Exam Prediction</h3>
        <div class="grid three">
          <div class="stat-card"><div class="label">Estimated Exam Score</div><div class="value">${analytics.estimatedScore}%</div><span class="muted">weighted with readiness</span></div>
          <div class="stat-card"><div class="label">Pass Probability</div><div class="value">${analytics.passProbability}%</div><span class="muted">${analytics.passProbability >= 70 ? "favorable" : "needs work"}</span></div>
          <div class="stat-card"><div class="label">Estimated Percentile</div><div class="value">${analytics.percentile}</div><span class="muted">within current model</span></div>
        </div>
        <div class="grid three">
          <div class="stat-card"><div class="label">Confidence</div><div class="value">${analytics.confidenceScore}%</div><span class="muted">based on attempts and readiness</span></div>
          <div class="stat-card"><div class="label">Readiness</div><div class="value">${analytics.readiness.score || 0}%</div><span class="muted">${CMA.escapeHtml(analytics.readiness.category || "Not ready")}</span></div>
          <div class="stat-card"><div class="label">Hours To 90%</div><div class="value">${analytics.hoursUntil90}</div><span class="muted">estimated study hours</span></div>
        </div>
        ${heatMapHtml("Weakest Books", analytics.bookRows)}
        ${heatMapHtml("Weakest Chapters", analytics.chapterRows)}
        ${heatMapHtml("Weakest Policies", analytics.policyRows)}
        <div class="list-item">
          <strong>Recommended Study Plan</strong>
          <ol>${analytics.plan.map((item) => `<li>${CMA.escapeHtml(item)}</li>`).join("")}</ol>
        </div>
      </section>
    `;
  }

  function missedReviewRows(missed) {
    if (!missed.length) return `<div class="empty">No missed questions on this exam.</div>`;
    return `
      <div class="exam-review-list">
        ${missed
          .map(({ question, correctChoice, selectedChoice }) => {
            const selectedLabel = selectedChoice?.originalLabel || "";
            const incorrectExplanation = selectedLabel
              ? question.incorrect_answer_explanations?.[selectedLabel] || "No stored explanation is available for that selected answer."
              : "No answer was selected before the exam was submitted.";
            return `
              <div class="list-item">
                <strong>${CMA.escapeHtml(question.question_id)}</strong>
                <span>${CMA.escapeHtml(question.question_stem)}</span>
                <span class="muted">Reference: ${CMA.escapeHtml(CMA.sourceLabel(question))}</span>
                <span class="muted">Correct: ${correctChoice.displayLabel}. ${CMA.escapeHtml(correctChoice.text)}</span>
                <span class="muted">Selected: ${selectedChoice ? `${selectedChoice.displayLabel}. ${CMA.escapeHtml(selectedChoice.text)}` : "No answer"}</span>
                <span class="muted">Why selected answer is wrong: ${CMA.escapeHtml(incorrectExplanation)}</span>
                <span class="muted">Rationale: ${CMA.escapeHtml(question.detailed_rationale || "No rationale stored.")}</span>
                <div class="action-row">${CMA.reviewActionsHtml(question)}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function finishExam(autoSubmitted = false) {
    if (!exam || submitted) return;
    submitted = true;
    captureQuestionTime();
    window.clearInterval(timerId);
    const completedExam = exam;
    const examQuestions = questionSet();
    let correct = 0;
    const missed = [];
    examQuestions.forEach((question) => {
      const selected = completedExam.answers[question.question_id] || "";
      const choices = completedExam.choices[question.question_id];
      const isCorrect = selected === question.correct_answer;
      const correctChoice = choices.find((choice) => choice.originalLabel === question.correct_answer);
      const selectedChoice = choices.find((choice) => choice.originalLabel === selected);
      CMA.recordAnswer(question, selected, autoSubmitted ? "exam-auto-submit" : "exam", { responseMs: completedExam.responseMs[question.question_id] || 0 });
      if (isCorrect) correct += 1;
      if (!isCorrect) missed.push({ question, correctChoice, selectedChoice });
    });
    const pct = Math.round((correct / completedExam.questionIds.length) * 100);
    const flagged = Object.keys(completedExam.flagged || {});
    CMA.refreshAdaptive(allQuestions, true);
    const analytics = buildExamAnalytics(examQuestions, completedExam.answers, correct, pct, missed);
    const completedAt = new Date().toISOString();
    const result = {
      id: completedExam.id,
      at: completedAt,
      startedAt: completedExam.startedAt,
      completedAt,
      total: completedExam.questionIds.length,
      correct,
      pct,
      passingScore: PASSING_SCORE,
      passed: pct >= PASSING_SCORE,
      estimatedPromotionalExamScore: analytics.estimatedScore,
      passProbability: analytics.passProbability,
      estimatedPercentile: analytics.percentile,
      confidenceScore: analytics.confidenceScore,
      estimatedStudyHoursUntil90: analytics.hoursUntil90,
      weakestBooks: analytics.weakestBooks,
      weakestChapters: analytics.weakestChapters,
      weakestPolicies: analytics.weakestPolicies,
      recommendedStudyPlan: analytics.plan,
      flagged,
      missed: missed.map((row) => row.question.question_id),
      autoSubmitted,
      elapsedSeconds: elapsedSeconds(completedExam),
      durationSeconds: completedExam.durationSeconds,
      blueprint: completedExam.blueprint,
      officialSimulation: completedExam.officialSimulation,
      sourceScores: analytics.sourceRows,
      bookScores: analytics.bookRows,
      chapterScores: analytics.chapterRows,
      policyScores: analytics.policyRows,
      difficultyScores: analytics.difficultyRows,
    };
    CMA.setExamResult(result);
    const chiefDebrief = window.CMAChiefMentor ? window.CMAChiefMentor.recordExamReview(result, missed, examQuestions) : null;
    Promise.resolve(window.CMASyncEngine?.manualSync?.("exam-complete")).catch(() => {});
    timer.textContent = formatTime(0);
    position.textContent = "0";
    answeredCount.textContent = Object.keys(completedExam.answers).length;
    navigatorGrid.innerHTML = "";
    card.innerHTML = `
      <section class="print-report stack">
        <h2>Captain Promotional Exam Report</h2>
        <div class="grid three">
          <div class="stat-card"><div class="label">Final Score</div><div class="value">${correct}/${completedExam.questionIds.length}</div><span class="muted">${pct}% raw score</span></div>
          <div class="stat-card"><div class="label">Prediction</div><div class="value">${analytics.passProbability}%</div><span class="muted">pass probability</span></div>
          <div class="stat-card"><div class="label">Percentile</div><div class="value">${analytics.percentile}</div><span class="muted">estimated</span></div>
        </div>
        <p><strong>Blueprint:</strong> ${CMA.escapeHtml(completedExam.blueprint?.label || "Official Captain Simulation")}</p>
        <p><strong>Timer:</strong> ${formatTime(completedExam.durationSeconds)} allowed, ${formatTime(result.elapsedSeconds)} active time used</p>
        <p><strong>Flagged questions:</strong> ${flagged.length}</p>
        <p><strong>Status:</strong> ${autoSubmitted ? "Auto-submitted when time expired." : "Submitted by candidate."}</p>
        <div class="feedback show ${pct >= PASSING_SCORE ? "correct" : "incorrect"}">
          <p>${pct >= PASSING_SCORE ? "Current attempt is above the simulator passing threshold." : "Current attempt is below the simulator passing threshold."} ${missed.length ? `${missed.length} questions were missed or unanswered.` : "No missed questions on this exam."}</p>
        </div>
        ${analyticsHtml(analytics)}
        ${window.CMAChiefMentor ? window.CMAChiefMentor.renderExamDebrief(chiefDebrief) : ""}
        <div class="action-row" style="margin-top:14px">
          <button class="button" type="button" data-print-report>Print Score Report</button>
          <a class="ghost-button" href="quiz.html?review=missed">Review Missed Questions</a>
          <a class="ghost-button" href="exam.html?simulation=125">New Exam</a>
        </div>
        <h3 style="margin-top:18px">Missed Question Review</h3>
        ${missedReviewRows(missed)}
      </section>
    `;
    card.querySelector("[data-print-report]").addEventListener("click", () => window.print());
    CMA.bindReviewActions(card, (id) => byId.get(id));
    results.innerHTML = `
      <h2>Score By Source</h2>
      ${rowsHtml(analytics.bookRows, 12)}
      <h2>Score By Difficulty</h2>
      ${rowsHtml(analytics.difficultyRows, 5)}
      <h2>Study Coach</h2>
      ${CMA.studyCoachHtml(allQuestions, { examPct: pct })}
    `;
    exam = null;
    renderResumePanel();
  }

  function setInitialMode() {
    const params = new URLSearchParams(location.search);
    if (params.get("simulation") === "125") sizeSelect.value = "125";
    if (params.get("blueprint") && blueprintSelect) blueprintSelect.value = params.get("blueprint");
  }

  window.addEventListener("beforeunload", () => {
    captureQuestionTime();
    saveExam();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      captureQuestionTime();
      saveExam();
    }
  });

  try {
    const { questions } = await CMA.loadQuestions();
    allQuestions = questions;
    byId = new Map(questions.map((question) => [question.question_id, question]));
    const values = CMA.collectFilterValues(questions);
    CMA.populateSelect(filters.category, values.categories, "All books");
    CMA.populateSelect(filters.difficulty, values.difficulties, "All difficulties");
    if (blueprintSelect) {
      blueprintSelect.innerHTML = CMA.EXAM_BLUEPRINTS.map((item) => `<option value="${CMA.escapeHtml(item.id)}">${CMA.escapeHtml(item.label)}</option>`).join("");
    }
    setInitialMode();
    startButton.addEventListener("click", startExam);
    renderResumePanel();
    updateStatus();
  } catch (error) {
    CMA.statusMessage(card, error.message);
  }
});
