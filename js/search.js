document.addEventListener("DOMContentLoaded", async () => {
  const controls = {
    query: document.querySelector("[data-search-query]"),
    id: document.querySelector("[data-search-id]"),
    source: document.querySelector("[data-search-source]"),
    code: document.querySelector("[data-search-code]"),
    book: document.querySelector("[data-search-book]"),
    chapter: document.querySelector("[data-search-chapter]"),
    difficulty: document.querySelector("[data-search-difficulty]"),
    tag: document.querySelector("[data-search-tag]"),
    probability: document.querySelector("[data-search-probability]"),
    missed: document.querySelector("[data-search-missed]"),
    bookmarked: document.querySelector("[data-search-bookmarked]"),
    needs: document.querySelector("[data-search-needs]"),
  };
  const count = document.querySelector("[data-search-count]");
  const results = document.querySelector("[data-search-results]");
  const facets = document.querySelector("[data-search-facets]");
  const printButton = document.querySelector("[data-print-search]");

  let questions = [];

  function readFilters() {
    return {
      query: controls.query.value,
      questionId: controls.id.value,
      source: controls.source.value,
      code: controls.code.value,
      book: controls.book.value,
      chapter: controls.chapter.value,
      difficulty: controls.difficulty.value,
      tag: controls.tag.value,
      probability: controls.probability.value,
      missedOnly: controls.missed.checked,
      bookmarkedOnly: controls.bookmarked.checked,
      needsReviewOnly: controls.needs.checked,
    };
  }

  function renderResults() {
    const filtered = CMA.applyFilters(questions, readFilters());
    count.textContent = `${filtered.length} results`;
    if (!filtered.length) {
      results.innerHTML = `<div class="empty">No questions match those filters.</div>`;
      return;
    }
    results.innerHTML = filtered
      .slice(0, 120)
      .map((q) => `
        <div class="list-item">
          <div class="question-meta">
            <span class="pill">${CMA.escapeHtml(q.question_id)}</span>
            <span class="pill">${CMA.escapeHtml(q.source_category)}</span>
            <span class="pill">${CMA.escapeHtml(q.difficulty)}</span>
            <span class="pill">${CMA.escapeHtml(q.estimated_exam_probability || "Unrated")}</span>
            ${CMA.isMissed(q.question_id) ? `<span class="pill">${CMA.missedStatus(q.question_id)}</span>` : ""}
            ${CMA.isNeedsReview(q.question_id) ? `<span class="pill">Needs review</span>` : ""}
          </div>
          <strong>${CMA.escapeHtml(q.question_stem)}</strong>
          <span class="muted">${CMA.escapeHtml(CMA.sourceLabel(q))}</span>
          <div class="action-row">
            <a class="ghost-button" href="quiz.html?query=${encodeURIComponent(q.question_id)}">Practice</a>
            ${CMA.reviewActionsHtml(q)}
          </div>
        </div>
      `)
      .join("");
    CMA.bindReviewActions(results, (id) => questions.find((question) => question.question_id === id), renderResults);
  }

  function renderFacets() {
    const values = CMA.collectFilterValues(questions);
    const summary = CMA.scoreSummary();
    facets.innerHTML = `
      <div class="stat-card"><div class="label">Question Bank</div><div class="value">${questions.length}</div></div>
      <div class="list-item"><strong>Sources</strong><span class="muted">${values.sources.length}</span></div>
      <div class="list-item"><strong>Books</strong><span class="muted">${values.books.length}</span></div>
      <div class="list-item"><strong>Chapters / Articles</strong><span class="muted">${values.chapters.length}</span></div>
      <div class="list-item"><strong>Tags</strong><span class="muted">${values.tags.length}</span></div>
      <div class="list-item"><strong>Missed / Bookmarked / Needs Review</strong><span class="muted">${summary.missed} / ${summary.bookmarks} / ${summary.needsReview}</span></div>
    `;
  }

  function bind() {
    Object.values(controls).forEach((control) => {
      control.addEventListener("input", renderResults);
      control.addEventListener("change", renderResults);
    });
    printButton.addEventListener("click", () => window.print());
  }

  try {
    const data = await CMA.loadQuestions();
    questions = data.questions;
    const values = CMA.collectFilterValues(questions);
    CMA.populateSelect(controls.source, values.sources, "All sources");
    CMA.populateSelect(controls.code, values.codes, "All policies and SOPs");
    CMA.populateSelect(controls.book, values.books, "All books");
    CMA.populateSelect(controls.chapter, values.chapters, "All chapters and articles");
    CMA.populateSelect(controls.difficulty, values.difficulties, "All difficulties");
    CMA.populateSelect(controls.tag, values.tags, "All tags");
    CMA.populateSelect(controls.probability, values.probabilities, "All probabilities");
    const params = new URLSearchParams(location.search);
    if (params.get("query")) controls.query.value = params.get("query");
    if (params.get("review") === "missed") controls.missed.checked = true;
    if (params.get("review") === "bookmarks") controls.bookmarked.checked = true;
    if (params.get("review") === "needs") controls.needs.checked = true;
    bind();
    renderFacets();
    renderResults();
  } catch (error) {
    CMA.statusMessage(results, error.message);
  }
});
