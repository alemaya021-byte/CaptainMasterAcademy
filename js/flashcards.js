document.addEventListener("DOMContentLoaded", async () => {
  const card = document.querySelector("[data-flashcard]");
  const count = document.querySelector("[data-card-count]");
  const position = document.querySelector("[data-card-position]");
  const stats = document.querySelector("[data-card-stats]");
  const buttons = {
    prev: document.querySelector("[data-card-prev]"),
    next: document.querySelector("[data-card-next]"),
    flip: document.querySelector("[data-card-flip]"),
    again: document.querySelector("[data-card-again]"),
    hard: document.querySelector("[data-card-hard]"),
    good: document.querySelector("[data-card-good]"),
    easy: document.querySelector("[data-card-easy]"),
    shuffle: document.querySelector("[data-card-shuffle]"),
    bookmarks: document.querySelector("[data-card-bookmarks]"),
    missed: document.querySelector("[data-card-missed]"),
    needs: document.querySelector("[data-card-needs]"),
    due: document.querySelector("[data-card-due]"),
    review: document.querySelector("[data-card-review]"),
    markNeeds: document.querySelector("[data-card-mark-needs]"),
  };
  const filters = {
    query: document.querySelector("[data-filter-query]"),
    category: document.querySelector("[data-filter-category]"),
    difficulty: document.querySelector("[data-filter-difficulty]"),
    tag: document.querySelector("[data-filter-tag]"),
  };

  let allQuestions = [];
  let deck = [];
  let index = 0;
  let flipped = false;
  let mode = "due";

  function readFilters() {
    return {
      query: filters.query.value,
      category: filters.category.value,
      difficulty: filters.difficulty.value,
      tag: filters.tag.value,
      bookmarkedOnly: mode === "bookmarks",
      missedOnly: mode === "missed",
      needsReviewOnly: mode === "needs",
    };
  }

  function applyMode(questions) {
    if (mode === "due") return questions.filter((question) => CMA.flashcardDue(question.question_id));
    return questions;
  }

  function setActiveMode() {
    [buttons.bookmarks, buttons.missed, buttons.needs, buttons.due].forEach((button) => button.classList.remove("active-mode"));
    if (mode === "bookmarks") buttons.bookmarks.classList.add("active-mode");
    if (mode === "missed") buttons.missed.classList.add("active-mode");
    if (mode === "needs") buttons.needs.classList.add("active-mode");
    if (mode === "due") buttons.due.classList.add("active-mode");
  }

  function renderStats() {
    const row = CMA.flashcardStats();
    stats.innerHTML = `
      <div class="stat-card"><div class="label">Due Today</div><div class="value">${row.dueToday}</div></div>
      <div class="stat-card"><div class="label">Overdue</div><div class="value">${row.overdue}</div></div>
      <div class="stat-card"><div class="label">Upcoming</div><div class="value">${row.upcoming}</div></div>
      <div class="stat-card"><div class="label">Mastered</div><div class="value">${row.mastered}</div></div>
    `;
  }

  function rebuildDeck() {
    deck = applyMode(CMA.applyFilters(allQuestions, readFilters()));
    index = 0;
    flipped = false;
    setActiveMode();
    renderStats();
    renderCard();
  }

  function currentQuestion() {
    return deck[index];
  }

  function scheduleLabel(q) {
    const row = CMA.progress.flashcards[q.question_id];
    if (!row) return "New card";
    const due = new Date(row.dueAt);
    const dueText = due.getTime() <= Date.now() ? "Due now" : `Due ${due.toLocaleDateString()}`;
    return `${dueText} - ${row.rating || "unrated"} - ${row.reps || 0} reviews`;
  }

  function renderCard() {
    count.textContent = `${deck.length} cards`;
    position.textContent = deck.length ? `${index + 1} / ${deck.length}` : "0 / 0";
    buttons.review.disabled = !deck.length;
    buttons.markNeeds.disabled = !deck.length;
    if (!deck.length) {
      card.innerHTML = `<div class="empty">No flashcards match the current selection.</div>`;
      return;
    }
    const q = currentQuestion();
    const front = `
      <div class="face">
        <div class="question-meta">
          <span class="pill">${CMA.escapeHtml(q.question_id)}</span>
          <span class="pill">${CMA.escapeHtml(q.source_category)}</span>
          <span class="pill">${CMA.escapeHtml(q.difficulty)}</span>
          <span class="pill">${CMA.escapeHtml(scheduleLabel(q))}</span>
        </div>
        <h2>${CMA.escapeHtml(q.question_stem)}</h2>
        <p class="muted">${CMA.escapeHtml(CMA.sourceLabel(q))}</p>
        ${CMA.isNeedsReview(q.question_id) ? `<span class="pill">Needs review</span>` : ""}
      </div>
    `;
    const back = `
      <div class="face">
        <div class="question-meta">
          <span class="pill">${CMA.escapeHtml(q.question_id)}</span>
          <span class="pill">${CMA.escapeHtml(q.estimated_exam_probability)} probability</span>
        </div>
        <p class="answer">Answer ${CMA.escapeHtml(q.correct_answer)}. ${CMA.escapeHtml(q.answer_choices[q.correct_answer])}</p>
        <p><strong>Rationale:</strong> ${CMA.escapeHtml(q.detailed_rationale)}</p>
        <p class="muted">${CMA.escapeHtml((q.tags || []).join(", "))}</p>
      </div>
    `;
    card.innerHTML = flipped ? back : front;
    buttons.markNeeds.textContent = CMA.isNeedsReview(q.question_id) ? "Clear Needs Review" : "Needs Review";
  }

  function move(step) {
    if (!deck.length) return;
    index = (index + step + deck.length) % deck.length;
    flipped = false;
    renderCard();
  }

  function rate(rating) {
    const q = currentQuestion();
    if (!q) return;
    CMA.rateFlashcard(q, rating);
    if (mode === "due" && rating !== "again") {
      deck = deck.filter((item) => item.question_id !== q.question_id);
      index = Math.min(index, Math.max(0, deck.length - 1));
      flipped = false;
      renderCard();
      return;
    }
    move(1);
  }

  function bind() {
    Object.values(filters).forEach((element) => {
      element.addEventListener("input", () => rebuildDeck());
      element.addEventListener("change", () => rebuildDeck());
    });
    card.addEventListener("click", () => {
      flipped = !flipped;
      renderCard();
    });
    buttons.flip.addEventListener("click", () => {
      flipped = !flipped;
      renderCard();
    });
    buttons.prev.addEventListener("click", () => move(-1));
    buttons.next.addEventListener("click", () => move(1));
    buttons.again.addEventListener("click", () => rate("again"));
    buttons.hard.addEventListener("click", () => rate("hard"));
    buttons.good.addEventListener("click", () => rate("good"));
    buttons.easy.addEventListener("click", () => rate("easy"));
    buttons.shuffle.addEventListener("click", () => {
      deck = CMA.shuffle(deck);
      index = 0;
      flipped = false;
      renderCard();
    });
    buttons.bookmarks.addEventListener("click", () => {
      mode = mode === "bookmarks" ? "due" : "bookmarks";
      rebuildDeck();
    });
    buttons.missed.addEventListener("click", () => {
      mode = mode === "missed" ? "due" : "missed";
      rebuildDeck();
    });
    buttons.needs.addEventListener("click", () => {
      mode = mode === "needs" ? "due" : "needs";
      rebuildDeck();
    });
    buttons.due.addEventListener("click", () => {
      mode = mode === "due" ? "" : "due";
      rebuildDeck();
    });
    buttons.review.addEventListener("click", () => {
      const q = currentQuestion();
      if (q) CMA.openQuestionReview(q);
    });
    buttons.markNeeds.addEventListener("click", () => {
      const q = currentQuestion();
      if (!q) return;
      const active = CMA.toggleNeedsReview(q.question_id);
      buttons.markNeeds.textContent = active ? "Clear Needs Review" : "Needs Review";
      if (mode === "needs" && !active) rebuildDeck();
      else renderCard();
    });
  }

  try {
    const { questions } = await CMA.loadQuestions();
    allQuestions = questions;
    const values = CMA.collectFilterValues(questions);
    CMA.populateSelect(filters.category, values.categories, "All books");
    CMA.populateSelect(filters.difficulty, values.difficulties, "All difficulties");
    CMA.populateSelect(filters.tag, values.tags, "All tags");
    const params = new URLSearchParams(location.search);
    if (params.get("category")) filters.category.value = params.get("category");
    bind();
    rebuildDeck();
  } catch (error) {
    CMA.statusMessage(card, error.message);
  }
});
