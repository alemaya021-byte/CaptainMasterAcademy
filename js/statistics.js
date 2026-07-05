document.addEventListener("DOMContentLoaded", async () => {
  const cards = document.querySelector("[data-summary-cards]");
  const readinessPanel = document.querySelector("[data-readiness-panel]");
  const nextActions = document.querySelector("[data-next-actions]");
  const areaTable = document.querySelector("[data-area-table]");
  const sourceTable = document.querySelector("[data-source-table]");
  const chapterTable = document.querySelector("[data-chapter-table]");
  const policyTable = document.querySelector("[data-policy-table]");
  const sessionSummary = document.querySelector("[data-session-summary]");
  const weaknessHeatmap = document.querySelector("[data-weakness-heatmap]");
  const confidenceHeatmap = document.querySelector("[data-confidence-heatmap]");
  const retentionCurve = document.querySelector("[data-retention-curve]");
  const predictionTrend = document.querySelector("[data-prediction-trend]");
  const missedList = document.querySelector("[data-missed-list]");
  const bookmarkList = document.querySelector("[data-bookmark-list]");
  const needsList = document.querySelector("[data-needs-list]");
  const reportList = document.querySelector("[data-report-list]");
  const strongTopicList = document.querySelector("[data-strong-topic-list]");
  const weakTopicList = document.querySelector("[data-weak-topic-list]");
  const missedSourceList = document.querySelector("[data-missed-source-list]");
  const dailyGraph = document.querySelector("[data-daily-graph]");
  const weeklyGraph = document.querySelector("[data-weekly-graph]");
  const monthlyGraph = document.querySelector("[data-monthly-graph]");
  const quarterlyGraph = document.querySelector("[data-quarterly-graph]");
  const resetButton = document.querySelector("[data-reset-progress]");
  const printButton = document.querySelector("[data-print-dashboard]");
  const exportJsonButton = document.querySelector("[data-export-issues-json]");
  const exportCsvButton = document.querySelector("[data-export-issues-csv]");

  let questions = [];

  function questionById() {
    return new Map(questions.map((question) => [question.question_id, question]));
  }

  function scoreTable(rows, columns = "Area", limit = 80) {
    const visible = rows.slice(0, limit);
    if (!visible.length) return `<div class="empty">No scored answers yet.</div>`;
    return `
      <table>
        <thead><tr><th>${columns}</th><th>Attempts</th><th>Correct</th><th>Accuracy</th><th>Mastery</th><th>Retention</th></tr></thead>
        <tbody>
          ${visible.map((row) => `
            <tr>
              <td>${CMA.escapeHtml(row.label || row.source)}</td>
              <td>${row.attempts}</td>
              <td>${row.correct}</td>
              <td>${row.accuracy}%</td>
              <td>${row.mastery ?? "--"}${row.mastery !== undefined ? "%" : ""}</td>
              <td>${row.retention ?? "--"}${row.retention !== undefined ? "%" : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function renderCards() {
    const summary = CMA.scoreSummary();
    const streak = CMA.streak();
    const readiness = CMA.readinessModel(questions);
    const passProbability = readiness.passProbability || Math.max(5, Math.min(99, Math.round(readiness.score * 0.92 + (CMA.recentAccuracy(14) || readiness.score) * 0.08)));
    cards.innerHTML = `
      <div class="stat-card"><div class="label">Readiness</div><div class="value">${readiness.score}%</div><span class="muted">${readiness.category}</span></div>
      <div class="stat-card"><div class="label">Predicted Exam</div><div class="value">${readiness.predictedExamScore || readiness.score}%</div><span class="muted">${CMA.escapeHtml(readiness.estimatedRank || "Rank band pending")}</span></div>
      <div class="stat-card"><div class="label">Predicted Pass</div><div class="value">${passProbability}%</div></div>
      <div class="stat-card"><div class="label">Overall Accuracy</div><div class="value">${summary.accuracy}%</div></div>
      <div class="stat-card"><div class="label">Completed</div><div class="value">${summary.attempts}</div></div>
      <div class="stat-card"><div class="label">Mastered</div><div class="value">${readiness.questionsMastered || 0}</div></div>
      <div class="stat-card"><div class="label">Needs Review</div><div class="value">${readiness.questionsNeedingReview || 0}</div></div>
      <div class="stat-card"><div class="label">Never Seen</div><div class="value">${readiness.questionsNeverSeen || 0}</div></div>
      <div class="stat-card"><div class="label">Bookmarked</div><div class="value">${summary.bookmarks}</div></div>
      <div class="stat-card"><div class="label">Reviewed Today</div><div class="value">${summary.reviewedToday}</div></div>
      <div class="stat-card"><div class="label">Study Streak</div><div class="value">${streak.current}</div></div>
      <div class="stat-card"><div class="label">Study Time</div><div class="value">${readiness.studyMinutes7Day || 0}m</div></div>
      <div class="stat-card"><div class="label">Efficiency</div><div class="value">${readiness.studyEfficiency || 0}</div><span class="muted">points/hour</span></div>
      <div class="stat-card"><div class="label">Avg Response</div><div class="value">${summary.avgResponseSeconds}s</div></div>
    `;
  }

  function renderReadiness() {
    const readiness = CMA.readinessModel(questions);
    readinessPanel.innerHTML = `
      <h2>Exam Readiness Score</h2>
      <div class="readiness-score">
        <div class="value">${readiness.score}%</div>
        <div>
          <strong>${readiness.category}</strong>
          <div class="readiness-meter"><span style="width:${readiness.score}%"></span></div>
        </div>
      </div>
      <div class="grid three">
        <div class="stat-card"><div class="label">Recent Accuracy</div><div class="value">${readiness.recent || 0}%</div></div>
        <div class="stat-card"><div class="label">Hard Questions</div><div class="value">${readiness.hard || 0}%</div></div>
        <div class="stat-card"><div class="label">Exam Average</div><div class="value">${readiness.examAverage || 0}%</div></div>
        <div class="stat-card"><div class="label">Weak Category</div><div class="value">${readiness.weakAverage || 0}%</div></div>
        <div class="stat-card"><div class="label">Recovery</div><div class="value">${readiness.recovery || 0}%</div></div>
        <div class="stat-card"><div class="label">Consistency</div><div class="value">${readiness.consistency || 0}%</div></div>
        <div class="stat-card"><div class="label">Retention Mastery</div><div class="value">${readiness.retentionWeightedMastery || 0}%</div></div>
        <div class="stat-card"><div class="label">Confidence</div><div class="value">${readiness.confidence || 0}%</div></div>
        <div class="stat-card"><div class="label">Interval</div><div class="value">${readiness.confidenceInterval ? `${readiness.confidenceInterval.low}-${readiness.confidenceInterval.high}` : "--"}</div></div>
      </div>
    `;
    nextActions.innerHTML = `
      <h2>Recommended Study Actions</h2>
      ${readiness.recommendations.map((item) => `<div class="list-item"><strong>${CMA.escapeHtml(item)}</strong></div>`).join("")}
    `;
  }

  function renderBarGraph(container, rows, title) {
    const max = Math.max(1, ...rows.map((row) => row.attempts));
    container.innerHTML = `
      <h3>${title}</h3>
      <div class="progress-graph">
        ${rows.map((row) => {
          const height = Math.max(8, Math.round((row.attempts / max) * 120));
          const pct = row.attempts ? Math.round((row.correct / row.attempts) * 100) : 0;
          return `<div class="graph-column" title="${row.label}: ${row.correct}/${row.attempts}"><div class="graph-bar" style="height:${height}px"><span>${row.attempts}</span></div><small>${row.label}</small><em>${pct}%</em></div>`;
        }).join("")}
      </div>
    `;
  }

  function trendRows(days) {
    return CMA.adaptiveTrend(days).map((row) => ({ label: row.label, attempts: row.attempts, correct: row.correct, studyMinutes: row.studyMinutes }));
  }

  function bucketedTrend(days, bucketSize, labelPrefix) {
    const daily = trendRows(days);
    const rows = [];
    for (let i = 0; i < daily.length; i += bucketSize) {
      const slice = daily.slice(i, i + bucketSize);
      rows.push({
        label: `${labelPrefix} ${rows.length + 1}`,
        attempts: slice.reduce((sum, row) => sum + row.attempts, 0),
        correct: slice.reduce((sum, row) => sum + row.correct, 0),
      });
    }
    return rows;
  }

  function renderGraphs() {
    renderBarGraph(dailyGraph, trendRows(7), "7-Day Trend");
    renderBarGraph(weeklyGraph, bucketedTrend(30, 7, "Week"), "30-Day Trend");
    renderBarGraph(monthlyGraph, bucketedTrend(30, 10, "Block"), "30-Day Volume");
    renderBarGraph(quarterlyGraph, bucketedTrend(90, 15, "Period"), "90-Day Trend");
  }

  function statusClass(value, mode = "risk") {
    if (mode === "confidence") {
      if (value >= 75) return "strong";
      if (value >= 50) return "moderate";
      return "weak";
    }
    if (mode === "retention") {
      if (value >= 80) return "strong";
      if (value >= 65) return "moderate";
      return "weak";
    }
    if (value >= 70) return "weak";
    if (value >= 45) return "moderate";
    return "strong";
  }

  function heatRows(rows, metric, mode, limit = 12) {
    const visible = rows.slice(0, limit);
    if (!visible.length) return `<div class="empty">Adaptive heat map appears after questions are answered.</div>`;
    return `
      <div class="heatmap-grid">
        ${visible.map((row) => {
          const value = row[metric] || 0;
          return `
            <div class="heat-cell ${statusClass(value, mode)}">
              <strong>${CMA.escapeHtml(row.label)}</strong>
              <span>${value}% ${metric}</span>
              <small>${row.attempts} attempts - ${row.recommendedAction || "Study"}</small>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderAdaptiveDashboards() {
    const weaknessRows = CMA.adaptiveGroupRows(questions, "book").sort((a, b) => b.risk - a.risk || a.label.localeCompare(b.label));
    const confidenceRows = CMA.adaptiveGroupRows(questions, "chapter").filter((row) => row.attempts).sort((a, b) => a.confidence - b.confidence || b.risk - a.risk);
    const retentionRows = Object.values(CMA.progress.adaptive?.questions || {})
      .filter((profile) => profile.attempts)
      .sort((a, b) => (a.retention || 0) - (b.retention || 0))
      .slice(0, 12);
    weaknessHeatmap.innerHTML = heatRows(weaknessRows, "risk", "risk");
    confidenceHeatmap.innerHTML = heatRows(confidenceRows, "confidence", "confidence");
    retentionCurve.innerHTML = retentionRows.length ? retentionRows.map((profile) => `
      <div class="source-score">
        <strong>${CMA.escapeHtml(profile.questionId)} - ${CMA.escapeHtml(profile.topic || profile.chapter)}</strong>
        <span class="muted">Retention ${profile.retention}% - Review ${CMA.escapeHtml((profile.recommendedReviewAt || "").slice(0, 10) || "soon")}</span>
        <div class="bar"><span style="width:${profile.retention}%"></span></div>
      </div>
    `).join("") : `<div class="empty">Retention curve appears after answered questions.</div>`;
    const snapshots = CMA.progress.adaptive?.predictions?.snapshots || [];
    predictionTrend.innerHTML = snapshots.length ? `
      <table>
        <thead><tr><th>Date</th><th>Readiness</th><th>Predicted</th><th>Pass</th><th>Interval</th></tr></thead>
        <tbody>${snapshots.slice(0, 14).map((row) => `<tr><td>${CMA.escapeHtml(row.date)}</td><td>${row.readiness}%</td><td>${row.predictedScore}%</td><td>${row.passProbability}%</td><td>${row.confidenceLow}-${row.confidenceHigh}</td></tr>`).join("")}</tbody>
      </table>
    ` : `<div class="empty">Predicted exam trend appears after study activity.</div>`;
  }

  function renderSessionSummary() {
    const session = CMA.adaptiveSessionSummary();
    if (!session) {
      sessionSummary.innerHTML = `<div class="empty">Complete a quiz, exam, or flashcard session to generate an adaptive study plan.</div>`;
      return;
    }
    const list = (items, fallback) => (items?.length ? items.map((item) => `<li>${CMA.escapeHtml(item)}</li>`).join("") : `<li>${fallback}</li>`);
    sessionSummary.innerHTML = `
      <div class="adaptive-session">
        <div class="grid two">
          <div class="stat-card"><div class="label">Estimated Minutes</div><div class="value">${session.estimatedMinutesRequired || 30}</div></div>
          <div class="stat-card"><div class="label">Score Improvement</div><div class="value compact-value">${CMA.escapeHtml(session.estimatedScoreImprovement || "+0.8 to +2.0")}</div></div>
        </div>
        <h3>Today's Improvements</h3>
        <ul>${list(session.whatImprovedToday, "More answered questions are needed to detect gains.")}</ul>
        <h3>Topics Requiring Immediate Review</h3>
        <ul>${list(session.topicsRequiringImmediateReview, "No urgent review topics detected.")}</ul>
        <h3>Recommended Study Plan</h3>
        <ul>${list(session.recommendedStudyPlan, "Run adaptive study or a timed exam next.")}</ul>
      </div>
    `;
  }

  function renderTopicRows(container, rows, emptyText) {
    if (!rows.length) {
      container.innerHTML = `<div class="empty">${emptyText}</div>`;
      return;
    }
    container.innerHTML = rows.map((row) => `
      <div class="source-score">
        <strong>${CMA.escapeHtml(row.label)}</strong>
        <span class="muted">${row.correct || 0}/${row.attempts || row.count || 0} ${row.count ? "missed" : `correct - ${row.accuracy}%`}</span>
        ${row.accuracy !== undefined ? `<div class="bar"><span style="width:${row.accuracy}%"></span></div>` : ""}
      </div>
    `).join("");
  }

  function renderQuestionList(container, ids, emptyText, reviewMode) {
    const byId = questionById();
    const rows = ids.map((id) => byId.get(id)).filter(Boolean).slice(0, 30);
    if (!rows.length) {
      container.innerHTML = `<div class="empty">${emptyText}</div>`;
      return;
    }
    container.innerHTML = rows.map((q) => `
      <div class="list-item">
        <div class="question-meta">
          <span class="pill">${CMA.escapeHtml(q.question_id)}</span>
          <span class="pill">${CMA.escapeHtml(q.difficulty)}</span>
          ${CMA.isMissed(q.question_id) ? `<span class="pill">${CMA.missedStatus(q.question_id)}</span>` : ""}
        </div>
        <strong>${CMA.escapeHtml(q.question_stem)}</strong>
        <span class="muted">${CMA.escapeHtml(CMA.sourceLabel(q))}</span>
        <div class="action-row">
          <a class="ghost-button" href="quiz.html?review=${reviewMode}&query=${encodeURIComponent(q.question_id)}">Drill</a>
          ${CMA.reviewActionsHtml(q)}
        </div>
      </div>
    `).join("");
    CMA.bindReviewActions(container, (id) => byId.get(id), renderAll);
  }

  function renderReports() {
    const reports = CMA.issueReports();
    if (!reports.length) {
      reportList.innerHTML = `<div class="empty">No reported issues saved locally.</div>`;
      return;
    }
    reportList.innerHTML = reports.slice(0, 30).map((report) => `
      <div class="list-item">
        <strong>${CMA.escapeHtml(report.question_id)} - ${CMA.escapeHtml(report.reason)}</strong>
        <span>${CMA.escapeHtml(report.note || "No note")}</span>
        <span class="muted">${CMA.escapeHtml(report.timestamp)} - ${CMA.escapeHtml(report.source)}</span>
      </div>
    `).join("");
  }

  function renderAll() {
    renderCards();
    renderReadiness();
    areaTable.innerHTML = scoreTable(CMA.areaScores(questions), "Area");
    sourceTable.innerHTML = scoreTable(CMA.adaptiveGroupRows(questions, "book").filter((row) => row.attempts > 0 || row.unseen < row.total), "Book");
    chapterTable.innerHTML = scoreTable(CMA.chapterScores(questions).filter((row) => row.attempts > 0), "Chapter / Policy / SOP / Article", 100);
    policyTable.innerHTML = scoreTable(CMA.policyScores(questions).filter((row) => row.attempts > 0 || row.unseen < row.total), "Policy", 100);
    renderGraphs();
    renderAdaptiveDashboards();
    renderSessionSummary();
    renderTopicRows(strongTopicList, CMA.strongestTopics(questions, 6), "Strongest topics appear after scored attempts.");
    renderTopicRows(weakTopicList, CMA.weakTopics(questions, 8), "Weakest topics appear after scored attempts.");
    renderTopicRows(missedSourceList, CMA.missedBySource(questions).slice(0, 10), "No missed-question source clusters yet.");
    renderQuestionList(missedList, CMA.missedIds(), "No missed questions yet.", "missed");
    renderQuestionList(bookmarkList, CMA.bookmarkedIds(), "No bookmarks yet.", "bookmarks");
    renderQuestionList(needsList, CMA.needsReviewIds(), "No needs-review questions yet.", "needs");
    renderReports();
  }

  try {
    const data = await CMA.loadQuestions();
    questions = data.questions;
    resetButton.addEventListener("click", () => {
      if (!confirm("Reset saved progress, bookmarks, missed questions, flashcards, issue reports, and exam history?")) return;
      CMA.resetProgress();
      renderAll();
    });
    printButton.addEventListener("click", () => window.print());
    exportJsonButton.addEventListener("click", () => CMA.exportIssueReports("json"));
    exportCsvButton.addEventListener("click", () => CMA.exportIssueReports("csv"));
    renderAll();
  } catch (error) {
    CMA.statusMessage(cards, error.message);
  }
});
