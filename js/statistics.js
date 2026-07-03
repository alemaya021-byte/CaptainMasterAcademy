document.addEventListener("DOMContentLoaded", async () => {
  const cards = document.querySelector("[data-summary-cards]");
  const areaTable = document.querySelector("[data-area-table]");
  const sourceTable = document.querySelector("[data-source-table]");
  const missedList = document.querySelector("[data-missed-list]");
  const bookmarkList = document.querySelector("[data-bookmark-list]");
  const dailyGraph = document.querySelector("[data-daily-graph]");
  const weeklyGraph = document.querySelector("[data-weekly-graph]");
  const resetButton = document.querySelector("[data-reset-progress]");

  let questions = [];

  function questionById() {
    return new Map(questions.map((question) => [question.question_id, question]));
  }

  function renderCards() {
    const summary = CMA.scoreSummary();
    const streak = CMA.streak();
    cards.innerHTML = `
      <div class="stat-card"><div class="label">Questions</div><div class="value">${questions.length}</div></div>
      <div class="stat-card"><div class="label">Overall Score</div><div class="value">${summary.accuracy}%</div></div>
      <div class="stat-card"><div class="label">Attempts</div><div class="value">${summary.attempts}</div></div>
      <div class="stat-card"><div class="label">Answered</div><div class="value">${summary.answered}</div></div>
      <div class="stat-card"><div class="label">Study Streak</div><div class="value">${streak.current}</div></div>
      <div class="stat-card"><div class="label">Avg Response</div><div class="value">${summary.avgResponseSeconds}s</div></div>
    `;
  }

  function scoreTable(rows, columns = "area") {
    return `
      <table>
        <thead><tr><th>${columns}</th><th>Attempts</th><th>Correct</th><th>Accuracy</th></tr></thead>
        <tbody>
          ${rows
            .map((row) => `
              <tr>
                <td>${CMA.escapeHtml(row.label || row.source)}</td>
                <td>${row.attempts}</td>
                <td>${row.correct}</td>
                <td>${row.accuracy}%</td>
              </tr>
            `)
            .join("")}
        </tbody>
      </table>
    `;
  }

  function renderAreaTable() {
    areaTable.innerHTML = scoreTable(CMA.areaScores(questions), "Area");
  }

  function renderSourceTable() {
    const scores = CMA.sourceScores(questions).filter((row) => row.attempts > 0).slice(0, 80);
    if (!scores.length) {
      sourceTable.innerHTML = `<div class="empty">No scored answers yet.</div>`;
      return;
    }
    sourceTable.innerHTML = scoreTable(scores, "Source");
  }

  function renderBarGraph(container, rows, title) {
    const max = Math.max(1, ...rows.map((row) => row.attempts));
    container.innerHTML = `
      <h3>${title}</h3>
      <div class="progress-graph">
        ${rows
          .map((row) => {
            const height = Math.max(8, Math.round((row.attempts / max) * 120));
            const pct = row.attempts ? Math.round((row.correct / row.attempts) * 100) : 0;
            return `<div class="graph-column" title="${row.label}: ${row.correct}/${row.attempts}"><div class="graph-bar" style="height:${height}px"><span>${row.attempts}</span></div><small>${row.label}</small><em>${pct}%</em></div>`;
          })
          .join("")}
      </div>
    `;
  }

  function renderGraphs() {
    const daily = CMA.progressSeries(14).map((row) => ({ label: row.label, attempts: row.attempts, correct: row.correct }));
    const weekly = [];
    for (let i = 0; i < daily.length; i += 7) {
      const slice = daily.slice(i, i + 7);
      weekly.push({
        label: `Week ${weekly.length + 1}`,
        attempts: slice.reduce((sum, row) => sum + row.attempts, 0),
        correct: slice.reduce((sum, row) => sum + row.correct, 0),
      });
    }
    renderBarGraph(dailyGraph, daily, "Daily Progress");
    renderBarGraph(weeklyGraph, weekly, "Weekly Progress");
  }

  function renderQuestionList(container, ids, emptyText, reviewMode) {
    const byId = questionById();
    const rows = ids.map((id) => byId.get(id)).filter(Boolean).slice(0, 25);
    if (!rows.length) {
      container.innerHTML = `<div class="empty">${emptyText}</div>`;
      return;
    }
    container.innerHTML = rows
      .map((q) => `
        <div class="list-item">
          <strong>${CMA.escapeHtml(q.question_id)}</strong>
          <span>${CMA.escapeHtml(q.question_stem)}</span>
          <span class="muted">${CMA.escapeHtml(CMA.sourceLabel(q))}</span>
          <a class="ghost-button" href="quiz.html?review=${reviewMode}&query=${encodeURIComponent(q.question_id)}">Review</a>
        </div>
      `)
      .join("");
  }

  function renderAll() {
    renderCards();
    renderAreaTable();
    renderSourceTable();
    renderGraphs();
    renderQuestionList(missedList, CMA.missedIds(), "No missed questions yet.", "missed");
    renderQuestionList(bookmarkList, CMA.bookmarkedIds(), "No bookmarks yet.", "bookmarks");
  }

  try {
    const data = await CMA.loadQuestions();
    questions = data.questions;
    resetButton.addEventListener("click", () => {
      if (!confirm("Reset saved progress, bookmarks, missed questions, flashcards, and exam history?")) return;
      CMA.resetProgress();
      renderAll();
    });
    renderAll();
  } catch (error) {
    CMA.statusMessage(cards, error.message);
  }
});
