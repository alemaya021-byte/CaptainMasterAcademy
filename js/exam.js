document.addEventListener("DOMContentLoaded", async () => {
  const card = document.querySelector("[data-exam-card]");
  const timer = document.querySelector("[data-exam-timer]");
  const position = document.querySelector("[data-exam-position]");
  const answeredCount = document.querySelector("[data-exam-answered]");
  const results = document.querySelector("[data-exam-results]");
  const startButton = document.querySelector("[data-start-exam]");
  const sizeSelect = document.querySelector("[data-exam-size]");
  const resumePanel = document.querySelector("[data-resume-panel]");
  const navigatorGrid = document.querySelector("[data-exam-navigator]");
  const filters = {
    query: document.querySelector("[data-filter-query]"),
    category: document.querySelector("[data-filter-category]"),
    difficulty: document.querySelector("[data-filter-difficulty]"),
  };

  let allQuestions = [];
  let byId = new Map();
  let exam = null;
  let timerId = null;
  let submitted = false;

  function readFilters() {
    return {
      query: filters.query.value,
      category: filters.category.value,
      difficulty: filters.difficulty.value,
    };
  }

  function formatTime(seconds) {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function questionSet() {
    return exam.questionIds.map((id) => byId.get(id)).filter(Boolean);
  }

  function saveExam() {
    if (!exam || submitted) return;
    CMA.saveActiveExam(exam);
  }

  function remainingSeconds() {
    return Math.max(0, Math.ceil((new Date(exam.endsAt).getTime() - Date.now()) / 1000));
  }

  function startTimer() {
    window.clearInterval(timerId);
    if (!exam) return;
    timer.textContent = formatTime(remainingSeconds());
    timerId = window.setInterval(() => {
      const left = remainingSeconds();
      timer.textContent = formatTime(left);
      if (left <= 0) finishExam(true);
    }, 1000);
  }

  function activeQuestion() {
    return byId.get(exam.questionIds[exam.index]);
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
        return `<button class="${classes.join(" ")}" type="button" data-nav-index="${idx}" title="Question ${idx + 1}">${idx + 1}</button>`;
      })
      .join("");
    navigatorGrid.querySelectorAll("[data-nav-index]").forEach((button) => {
      button.addEventListener("click", () => {
        captureQuestionTime();
        exam.index = Number(button.dataset.navIndex);
        exam.questionStartedAt = Date.now();
        saveExam();
        renderQuestion();
      });
    });
  }

  function captureQuestionTime() {
    if (!exam || !exam.questionStartedAt) return;
    const id = exam.questionIds[exam.index];
    exam.responseMs[id] = (exam.responseMs[id] || 0) + Math.max(0, Date.now() - exam.questionStartedAt);
    exam.questionStartedAt = Date.now();
  }

  function renderQuestion() {
    if (!exam) return;
    const question = activeQuestion();
    const choices = exam.choices[question.question_id];
    const selected = exam.answers[question.question_id];
    const flagged = Boolean(exam.flagged[question.question_id]);
    card.innerHTML = `
      <div class="question-meta">
        <span class="pill">${CMA.escapeHtml(question.question_id)}</span>
        <span class="pill">${CMA.escapeHtml(question.source_category)}</span>
        <span class="pill">${CMA.escapeHtml(question.difficulty)}</span>
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
      <div class="toolbar">
        <button class="ghost-button" type="button" data-prev ${exam.index === 0 ? "disabled" : ""}>Previous</button>
        <button class="ghost-button ${flagged ? "active-mode" : ""}" type="button" data-flag>${flagged ? "Unflag" : "Flag"}</button>
        <button class="ghost-button" type="button" data-next>${exam.index === exam.questionIds.length - 1 ? "Review" : "Next"}</button>
        <button class="button" type="button" data-submit>Submit Exam</button>
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
    card.querySelector("[data-next]").addEventListener("click", () => move(1));
    card.querySelector("[data-flag]").addEventListener("click", () => {
      exam.flagged[question.question_id] = !exam.flagged[question.question_id];
      if (!exam.flagged[question.question_id]) delete exam.flagged[question.question_id];
      saveExam();
      renderQuestion();
    });
    card.querySelector("[data-submit]").addEventListener("click", () => finishExam(false));
    updateStatus();
  }

  function move(delta) {
    if (!exam) return;
    captureQuestionTime();
    exam.index = Math.max(0, Math.min(exam.questionIds.length - 1, exam.index + delta));
    exam.questionStartedAt = Date.now();
    saveExam();
    renderQuestion();
  }

  function createExam(questions, size) {
    const selected = size === 125 ? CMA.blueprintSample(questions, 125) : CMA.sample(CMA.applyFilters(questions, readFilters()), size);
    const now = Date.now();
    return {
      id: `exam-${now}`,
      size,
      questionIds: selected.map((q) => q.question_id),
      choices: Object.fromEntries(selected.map((q) => [q.question_id, CMA.displayChoices(q, true)])),
      answers: {},
      flagged: {},
      responseMs: {},
      index: 0,
      startedAt: new Date(now).toISOString(),
      endsAt: new Date(now + size * 60 * 1000).toISOString(),
      questionStartedAt: now,
      blueprint: size === 125 ? CMA.BLUEPRINT : [],
    };
  }

  function startExam() {
    const size = Number(sizeSelect.value);
    const source = size === 125 ? allQuestions : CMA.applyFilters(allQuestions, readFilters());
    if (source.length < size) {
      CMA.statusMessage(card, `Only ${source.length} questions match those filters. Adjust the filters or choose a shorter exam.`);
      return;
    }
    submitted = false;
    exam = createExam(source, size);
    results.innerHTML = "";
    resumePanel.classList.add("hidden");
    saveExam();
    startTimer();
    renderQuestion();
  }

  function renderResumePanel() {
    const saved = CMA.progress.activeExam;
    if (!saved || saved.questionIds?.length !== 125) {
      resumePanel.classList.add("hidden");
      return;
    }
    resumePanel.classList.remove("hidden");
    const answered = Object.keys(saved.answers || {}).length;
    resumePanel.innerHTML = `
      <strong>Interrupted exam found.</strong>
      <span class="muted">${answered}/${saved.questionIds.length} answered.</span>
      <div class="action-row" style="margin-top:10px">
        <button class="button" type="button" data-resume-exam>Resume Exam</button>
        <button class="ghost-button" type="button" data-discard-exam>Discard Saved Exam</button>
      </div>
    `;
    resumePanel.querySelector("[data-resume-exam]").addEventListener("click", () => {
      submitted = false;
      exam = saved;
      exam.questionStartedAt = Date.now();
      results.innerHTML = "";
      startTimer();
      renderQuestion();
    });
    resumePanel.querySelector("[data-discard-exam]").addEventListener("click", () => {
      CMA.clearActiveExam();
      resumePanel.classList.add("hidden");
    });
  }

  function missedReviewRows(missed) {
    if (!missed.length) return `<div class="empty">No missed questions on this exam.</div>`;
    return `
      <div class="exam-review-list">
        ${missed
          .map(({ question, correctChoice, selectedChoice }) => `
            <div class="list-item">
              <strong>${CMA.escapeHtml(question.question_id)}</strong>
              <span>${CMA.escapeHtml(question.question_stem)}</span>
              <span class="muted">Correct: ${correctChoice.displayLabel}. ${CMA.escapeHtml(correctChoice.text)}</span>
              <span class="muted">Selected: ${selectedChoice ? `${selectedChoice.displayLabel}. ${CMA.escapeHtml(selectedChoice.text)}` : "No answer"}</span>
              <div class="action-row">${CMA.reviewActionsHtml(question)}</div>
            </div>
          `)
          .join("")}
      </div>
    `;
  }

  function finishExam(autoSubmitted = false) {
    if (!exam || submitted) return;
    submitted = true;
    captureQuestionTime();
    window.clearInterval(timerId);
    let correct = 0;
    const missed = [];
    const bySource = new Map();
    questionSet().forEach((question) => {
      const selected = exam.answers[question.question_id] || "";
      const choices = exam.choices[question.question_id];
      const isCorrect = selected === question.correct_answer;
      const correctChoice = choices.find((choice) => choice.originalLabel === question.correct_answer);
      const selectedChoice = choices.find((choice) => choice.originalLabel === selected);
      CMA.recordAnswer(question, selected, autoSubmitted ? "exam-auto-submit" : "exam", { responseMs: exam.responseMs[question.question_id] || 0 });
      if (isCorrect) correct += 1;
      if (!isCorrect) missed.push({ question, correctChoice, selectedChoice });
      const source = CMA.sourceLabel(question);
      const row = bySource.get(source) || { source, total: 0, correct: 0 };
      row.total += 1;
      row.correct += isCorrect ? 1 : 0;
      bySource.set(source, row);
    });
    const pct = Math.round((correct / exam.questionIds.length) * 100);
    const flagged = Object.keys(exam.flagged || {});
    CMA.setExamResult({ at: new Date().toISOString(), total: exam.questionIds.length, correct, pct, flagged, missed: missed.map((row) => row.question.question_id), autoSubmitted });
    timer.textContent = "00:00";
    position.textContent = "0";
    answeredCount.textContent = Object.keys(exam.answers).length;
    navigatorGrid.innerHTML = "";
    card.innerHTML = `
      <section class="print-report">
        <h2>Captain Promotional Exam Report</h2>
        <p style="margin-top:8px"><strong>Score:</strong> ${correct}/${exam.questionIds.length} (${pct}%)</p>
        <p><strong>Flagged questions:</strong> ${flagged.length}</p>
        <p><strong>Status:</strong> ${autoSubmitted ? "Auto-submitted when time expired." : "Submitted by candidate."}</p>
        <div class="feedback show ${pct >= 70 ? "correct" : "incorrect"}">
          <p>${missed.length ? `${missed.length} questions were missed or unanswered.` : "No missed questions on this exam."}</p>
        </div>
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
      ${[...bySource.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 20)
        .map((row) => {
          const rowPct = Math.round((row.correct / row.total) * 100);
          return `<div class="source-score"><strong>${CMA.escapeHtml(row.source)}</strong><span class="muted">${row.correct}/${row.total} correct - ${rowPct}%</span><div class="bar"><span style="width:${rowPct}%"></span></div></div>`;
        })
        .join("")}
    `;
    exam = null;
    renderResumePanel();
  }

  function setInitialMode() {
    if (new URLSearchParams(location.search).get("simulation") === "125") sizeSelect.value = "125";
  }

  try {
    const { questions } = await CMA.loadQuestions();
    allQuestions = questions;
    byId = new Map(questions.map((question) => [question.question_id, question]));
    const values = CMA.collectFilterValues(questions);
    CMA.populateSelect(filters.category, values.categories, "All books");
    CMA.populateSelect(filters.difficulty, values.difficulties, "All difficulties");
    setInitialMode();
    startButton.addEventListener("click", startExam);
    renderResumePanel();
    updateStatus();
  } catch (error) {
    CMA.statusMessage(card, error.message);
  }
});
