document.addEventListener("DOMContentLoaded", async () => {
  const card = document.querySelector("[data-quiz-card]");
  const sourceScores = document.querySelector("[data-source-scores]");
  const scoreCorrect = document.querySelector("[data-score-correct]");
  const scoreTotal = document.querySelector("[data-score-total]");
  const scorePercent = document.querySelector("[data-score-percent]");
  const scoreBar = document.querySelector("[data-score-bar]");
  const timerSelect = document.querySelector("[data-quiz-timer-select]");
  const timerDisplay = document.querySelector("[data-quiz-timer]");
  const studyNote = document.querySelector("[data-study-note]");
  const studyCoach = document.querySelector("[data-study-coach]");
  const modeButtons = {
    all: document.querySelector("[data-normal-mode]"),
    adaptive: document.querySelector("[data-adaptive-mode]"),
    missed: document.querySelector("[data-missed-review]"),
    bookmarks: document.querySelector("[data-bookmark-review]"),
    needs: document.querySelector("[data-needs-review]"),
  };
  const filters = {
    query: document.querySelector("[data-filter-query]"),
    category: document.querySelector("[data-filter-category]"),
    difficulty: document.querySelector("[data-filter-difficulty]"),
    tag: document.querySelector("[data-filter-tag]"),
    probability: document.querySelector("[data-filter-probability]"),
  };

  let allQuestions = [];
  let pool = [];
  let current = null;
  let choices = [];
  let selectedOriginalLabel = "";
  let submitted = false;
  let studyMode = new URLSearchParams(location.search).get("mode") === "adaptive";
  let questionStartedAt = 0;
  let localCorrect = 0;
  let localAnswered = 0;
  let reviewMode = new URLSearchParams(location.search).get("review") || "";
  let remainingSeconds = 0;
  let timerId = null;
  let timerExpired = false;

  function formatTime(seconds) {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function updateScore() {
    scoreCorrect.textContent = localCorrect;
    scoreTotal.textContent = localAnswered;
    const pct = localAnswered ? Math.round((localCorrect / localAnswered) * 100) : 0;
    scorePercent.textContent = `${pct}%`;
    scoreBar.style.width = `${pct}%`;
    CMA.renderSourceScores(sourceScores, 8);
    if (studyCoach && allQuestions.length) {
      studyCoach.innerHTML = CMA.studyCoachHtml(allQuestions, { localCorrect, localAnswered, currentQuestion: current });
    }
  }

  function setMode(mode) {
    reviewMode = mode;
    Object.values(modeButtons).forEach((button) => button.classList.remove("active-mode"));
    if (mode === "missed") modeButtons.missed.classList.add("active-mode");
    if (mode === "bookmarks") modeButtons.bookmarks.classList.add("active-mode");
    if (mode === "needs") modeButtons.needs.classList.add("active-mode");
    if (!mode && studyMode) modeButtons.adaptive.classList.add("active-mode");
    if (!mode && !studyMode) modeButtons.all.classList.add("active-mode");
    if (studyNote) {
      studyNote.classList.toggle("hidden", !studyMode);
      studyNote.textContent = studyMode ? "Adaptive Study is active. Weak topics appear more often; mastered topics appear less often." : "";
    }
  }

  function readFilters() {
    return {
      query: filters.query.value,
      category: filters.category.value,
      difficulty: filters.difficulty.value,
      tag: filters.tag.value,
      probability: filters.probability.value,
      missedOnly: reviewMode === "missed",
      bookmarkedOnly: reviewMode === "bookmarks",
      needsReviewOnly: reviewMode === "needs",
    };
  }

  function rebuildPool(showNext = true) {
    pool = CMA.applyFilters(allQuestions, readFilters());
    if (!pool.length) {
      const label = reviewMode === "missed" ? "missed questions" : reviewMode === "bookmarks" ? "bookmarked questions" : reviewMode === "needs" ? "needs-review questions" : "questions";
      card.innerHTML = `<div class="empty">No ${label} match the current selection.</div>`;
      return;
    }
    if (showNext) nextQuestion();
  }

  function currentChoice(originalLabel) {
    return choices.find((choice) => choice.originalLabel === originalLabel);
  }

  function incorrectExplanations() {
    const explanations = current.incorrect_answer_explanations || {};
    const rows = choices
      .filter((choice) => choice.originalLabel !== current.correct_answer && explanations[choice.originalLabel])
      .map((choice) => `
        <li><strong>${choice.displayLabel}.</strong> ${CMA.escapeHtml(explanations[choice.originalLabel])}</li>
      `)
      .join("");
    if (!rows) return "";
    return `
      <div style="margin-top:10px">
        <strong>Why the other answers are incorrect:</strong>
        <ul class="explanation-list">${rows}</ul>
      </div>
    `;
  }

  function renderQuestion() {
    const modePill = reviewMode === "missed" ? "Missed review" : reviewMode === "bookmarks" ? "Bookmark review" : reviewMode === "needs" ? "Needs-review drill" : "Promotional mode";
    const missedPill = CMA.isMissed(current.question_id) ? `<span class="pill">${CMA.missedStatus(current.question_id)}</span>` : "";
    card.innerHTML = `
      <div class="question-meta">
        <span class="pill">${CMA.escapeHtml(current.question_id)}</span>
        <span class="pill">${CMA.escapeHtml(current.source_category)}</span>
        <span class="pill">${CMA.escapeHtml(current.difficulty)}</span>
        <span class="pill">${CMA.escapeHtml(current.estimated_exam_probability)} probability</span>
        <span class="pill">${modePill}</span>
        ${missedPill}
        ${CMA.isNeedsReview(current.question_id) ? `<span class="pill">Needs review</span>` : ""}
        ${studyMode ? `<span class="pill">Adaptive</span>` : ""}
      </div>
      <h2>${CMA.escapeHtml(current.question_stem)}</h2>
      <div class="choice-list" data-choice-list>
        ${choices
          .map((choice) => `
            <button class="choice ${selectedOriginalLabel === choice.originalLabel ? "selected" : ""}" type="button" data-choice="${CMA.escapeHtml(choice.originalLabel)}" data-display="${choice.displayLabel}" ${submitted || timerExpired ? "disabled" : ""}>
              <span class="letter">${choice.displayLabel}</span>
              <span class="text">${CMA.escapeHtml(choice.text)}</span>
            </button>
          `)
          .join("")}
      </div>
      <div class="feedback" data-feedback></div>
      <div class="toolbar sticky-submit">
        ${CMA.reviewActionsHtml(current)}
        <button class="button" type="button" data-submit-answer ${!selectedOriginalLabel || submitted || timerExpired ? "disabled" : ""}>Submit Answer</button>
        <button class="ghost-button" type="button" data-next-question>${submitted || timerExpired ? "Next Question" : "Skip"}</button>
      </div>
    `;
    card.querySelectorAll("[data-choice]").forEach((button) => {
      button.addEventListener("click", () => selectAnswer(button.dataset.choice));
    });
    card.querySelector("[data-submit-answer]").addEventListener("click", () => submitAnswer(false));
    card.querySelector("[data-next-question]").addEventListener("click", nextQuestion);
    CMA.bindReviewActions(card, (id) => allQuestions.find((question) => question.question_id === id), () => {
      updateScore();
      if (reviewMode === "bookmarks" || reviewMode === "needs") rebuildPool(false);
    });
  }

  function selectAnswer(originalLabel) {
    if (submitted || timerExpired) return;
    selectedOriginalLabel = originalLabel;
    card.querySelectorAll("[data-choice]").forEach((button) => {
      button.classList.toggle("selected", button.dataset.choice === originalLabel);
    });
    const submitButton = card.querySelector("[data-submit-answer]");
    if (submitButton) submitButton.disabled = false;
  }

  function showFeedback(correct, autoSubmitted = false) {
    const correctChoice = currentChoice(current.correct_answer);
    const selectedChoice = currentChoice(selectedOriginalLabel);
    card.querySelectorAll("[data-choice]").forEach((choiceButton) => {
      choiceButton.disabled = true;
      if (choiceButton.dataset.choice === current.correct_answer) choiceButton.classList.add("correct");
      if (choiceButton.dataset.choice === selectedOriginalLabel && !correct) choiceButton.classList.add("incorrect");
    });
    const feedback = card.querySelector("[data-feedback]");
    feedback.className = `feedback show ${correct ? "correct" : "incorrect"}`;
    feedback.innerHTML = `
      <h3>${correct ? "Correct" : autoSubmitted ? "Time Expired" : "Incorrect"}</h3>
      <p><strong>Correct answer:</strong> ${correctChoice.displayLabel}. ${CMA.escapeHtml(correctChoice.text)}</p>
      ${selectedChoice && !correct ? `<p><strong>Your answer:</strong> ${selectedChoice.displayLabel}. ${CMA.escapeHtml(selectedChoice.text)}</p>` : ""}
      ${!selectedChoice ? `<p><strong>Your answer:</strong> No answer selected.</p>` : ""}
      <p style="margin-top:10px"><strong>Rationale:</strong> ${CMA.escapeHtml(current.detailed_rationale)}</p>
      <p style="margin-top:10px"><strong>Source reference:</strong> ${CMA.escapeHtml(CMA.sourceLabel(current))}</p>
      ${incorrectExplanations()}
    `;
    const submitButton = card.querySelector("[data-submit-answer]");
    if (submitButton) submitButton.disabled = true;
  }

  function submitAnswer(autoSubmitted = false) {
    if (submitted) return;
    if (!selectedOriginalLabel && !autoSubmitted) {
      const feedback = card.querySelector("[data-feedback]");
      feedback.className = "feedback show incorrect";
      feedback.innerHTML = "<h3>Select an answer first</h3><p>Choose A, B, C, or D before submitting.</p>";
      return;
    }
    submitted = true;
    const responseMs = questionStartedAt ? Date.now() - questionStartedAt : 0;
    const correct = CMA.recordAnswer(current, selectedOriginalLabel, autoSubmitted ? "quiz-timer" : studyMode ? "adaptive-study" : "quiz", { responseMs });
    CMA.refreshAdaptive(allQuestions, true);
    localAnswered += 1;
    localCorrect += correct ? 1 : 0;
    showFeedback(correct, autoSubmitted);
    updateScore();
  }

  function nextQuestion() {
    if (timerExpired) return;
    if (reviewMode === "missed" || reviewMode === "bookmarks" || reviewMode === "needs") {
      pool = CMA.applyFilters(allQuestions, readFilters());
    }
    if (!pool.length) {
      const label = reviewMode === "missed" ? "missed questions" : reviewMode === "bookmarks" ? "bookmarked questions" : reviewMode === "needs" ? "needs-review questions" : "questions";
      card.innerHTML = `<div class="empty">No ${label} match the current selection.</div>`;
      return;
    }
    current = studyMode && !reviewMode ? CMA.adaptiveSelection(pool, 1)[0] : pool[Math.floor(Math.random() * pool.length)];
    choices = CMA.displayChoices(current, true);
    selectedOriginalLabel = "";
    submitted = false;
    questionStartedAt = Date.now();
    renderQuestion();
  }

  function expireQuiz() {
    timerExpired = true;
    window.clearInterval(timerId);
    timerDisplay.textContent = "00:00";
    if (current && !submitted) submitAnswer(true);
    card.insertAdjacentHTML("beforeend", `<div class="feedback show incorrect" style="margin-top:12px"><h3>Timer complete</h3><p>The practice timer has ended. Start a new quiz or continue reviewing the explanation above.</p></div>`);
  }

  function stopTimer() {
    window.clearInterval(timerId);
    timerId = null;
    remainingSeconds = 0;
    timerExpired = false;
    timerDisplay.textContent = "--:--";
  }

  function startTimer(minutes) {
    stopTimer();
    if (!minutes) return;
    remainingSeconds = minutes * 60;
    timerDisplay.textContent = formatTime(remainingSeconds);
    timerId = window.setInterval(() => {
      remainingSeconds -= 1;
      timerDisplay.textContent = formatTime(remainingSeconds);
      if (remainingSeconds <= 0) expireQuiz();
    }, 1000);
  }

  function setModeFromUrl() {
    const params = new URLSearchParams(location.search);
    const category = params.get("category");
    if (category) filters.category.value = category;
    const urlReview = params.get("review");
    if (urlReview === "missed" || urlReview === "bookmarks" || urlReview === "needs") reviewMode = urlReview;
    if (params.get("query")) filters.query.value = params.get("query");
    setMode(reviewMode);
  }

  function bindControls() {
    Object.values(filters).forEach((element) => {
      element.addEventListener("input", () => rebuildPool());
      element.addEventListener("change", () => rebuildPool());
    });
    modeButtons.all.addEventListener("click", () => {
      studyMode = false;
      setMode("");
      rebuildPool();
    });
    modeButtons.adaptive.addEventListener("click", () => {
      studyMode = true;
      setMode("");
      rebuildPool();
    });
    modeButtons.missed.addEventListener("click", () => {
      studyMode = false;
      setMode("missed");
      rebuildPool();
    });
    modeButtons.bookmarks.addEventListener("click", () => {
      studyMode = false;
      setMode("bookmarks");
      rebuildPool();
    });
    modeButtons.needs.addEventListener("click", () => {
      studyMode = false;
      setMode("needs");
      rebuildPool();
    });
    timerSelect.addEventListener("change", () => startTimer(Number(timerSelect.value)));
  }

  try {
    const { questions } = await CMA.loadQuestions();
    allQuestions = questions;
    const values = CMA.collectFilterValues(questions);
    CMA.populateSelect(filters.category, values.categories, "All books");
    CMA.populateSelect(filters.difficulty, values.difficulties, "All difficulties");
    CMA.populateSelect(filters.tag, values.tags, "All tags");
    CMA.populateSelect(filters.probability, values.probabilities, "All probabilities");
    setModeFromUrl();
    bindControls();
    startTimer(Number(timerSelect.value));
    rebuildPool();
    updateScore();
  } catch (error) {
    CMA.statusMessage(card, error.message);
  }
});
