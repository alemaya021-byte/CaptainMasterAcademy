document.addEventListener("DOMContentLoaded", async () => {
  const metricsRoot = document.querySelector("[data-readiness-metrics]");
  const trendMetrics = document.querySelector("[data-trend-metrics]");
  const readinessChart = document.querySelector("[data-readiness-chart]");
  const commandScorecard = document.querySelector("[data-command-scorecard]");
  const weaknessRoot = document.querySelector("[data-weakness-intelligence]");
  const coachRoot = document.querySelector("[data-daily-coach]");
  const timelineRoot = document.querySelector("[data-performance-timeline]");
  const milestoneRoot = document.querySelector("[data-milestones]");
  const cloudPanel = document.querySelector("[data-cloud-panel]");
  const syncButton = document.querySelector("[data-sync-now]");
  const printButton = document.querySelector("[data-print-performance]");
  const rangeButtons = document.querySelectorAll("[data-timeline-range]");

  let questions = [];
  let timelineRange = "30";

  const DAY_MS = 86400000;

  function escape(value) {
    return CMA.escapeHtml(String(value ?? ""));
  }

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Math.round(Number(value || 0))));
  }

  function average(values) {
    const usable = values.map(Number).filter((value) => Number.isFinite(value));
    return usable.length ? clamp(usable.reduce((sum, value) => sum + value, 0) / usable.length) : 0;
  }

  function dayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function daysAgo(day) {
    const time = Date.parse(`${day}T00:00:00`);
    if (!time) return 9999;
    return Math.floor((Date.now() - time) / DAY_MS);
  }

  function progress() {
    return CMA.progress || {};
  }

  function chiefProfile() {
    return progress().chiefMentor?.profile || {};
  }

  function incidentRows() {
    return CMA.incidentAttempts ? CMA.incidentAttempts() : [];
  }

  function flashcardsReviewed() {
    return Object.values(progress().flashcards || {}).reduce((sum, row) => sum + (row.reps || 0), 0);
  }

  function totalStudySeconds(days = 7) {
    const threshold = Date.now() - days * DAY_MS;
    return Object.entries(progress().daily || {}).reduce((sum, [day, row]) => {
      if (Date.parse(`${day}T23:59:59.999Z`) < threshold) return sum;
      return sum + (row.studySeconds || Math.round((row.responseMs || 0) / 1000) || 0);
    }, 0);
  }

  function readiness() {
    return CMA.readinessModel(questions);
  }

  function blendedReadiness(model = readiness()) {
    const incident = progress().incidentProfile || {};
    const chief = chiefProfile();
    const flash = CMA.flashcardStats();
    const flashScore = flash.total ? clamp((flash.mastered / Math.max(1, flash.total)) * 100) : 0;
    const parts = [model.score];
    if (incident.readiness) parts.push(incident.readiness);
    if (chief.readiness) parts.push(chief.readiness);
    if (flashScore) parts.push(flashScore);
    return average(parts);
  }

  function commandAverages() {
    const incidents = incidentRows();
    const domain = (key) => incidents.length ? average(incidents.map((row) => row[key] || 0)) : 0;
    const tactical = domain("tacticalScore");
    const safety = domain("safetyScore");
    const communications = domain("communicationsScore");
    const leadership = domain("leadershipScore");
    const command = domain("overallScore") || domain("commandScore");
    return {
      "Incident Command": command,
      "Tactical Decisions": tactical,
      Communications: communications,
      Safety: safety,
      Leadership: leadership,
      Accountability: average([safety, leadership, communications]),
      "Resource Management": average([tactical, leadership]),
      "Risk Management": average([safety, tactical]),
    };
  }

  function trendForDays(days) {
    const adaptiveRows = CMA.adaptiveTrend(days);
    const snapshots = new Map((progress().adaptive?.predictions?.snapshots || []).map((row) => [row.date, row]));
    const incidentsByDay = new Map();
    incidentRows().forEach((row) => {
      const day = (row.completedAt || row.at || "").slice(0, 10);
      if (!day) return;
      const current = incidentsByDay.get(day) || [];
      current.push(row);
      incidentsByDay.set(day, current);
    });
    const examsByDay = new Map();
    (progress().exams || []).forEach((exam) => {
      const day = (exam.completedAt || exam.at || "").slice(0, 10);
      if (!day) return;
      const current = examsByDay.get(day) || [];
      current.push(exam);
      examsByDay.set(day, current);
    });
    const profile = chiefProfile();
    return adaptiveRows.map((row) => {
      const snapshot = snapshots.get(row.date);
      const incidents = incidentsByDay.get(row.date) || [];
      const exams = examsByDay.get(row.date) || [];
      const accuracy = row.attempts ? clamp((row.correct / row.attempts) * 100) : 0;
      const readinessScore = snapshot?.readiness || (row.attempts ? accuracy : 0);
      return {
        ...row,
        readiness: readinessScore,
        mastery: snapshot?.readiness || (row.attempts ? accuracy : 0),
        confidence: snapshot?.confidence || profile.confidence || 0,
        retention: snapshot?.retention || profile.retention || 0,
        exams,
        incidents,
        examScore: exams.length ? average(exams.map((exam) => exam.pct || 0)) : 0,
        incidentScore: incidents.length ? average(incidents.map((incident) => incident.overallScore || 0)) : 0,
      };
    });
  }

  function trendDelta(days) {
    const rows = trendForDays(days).filter((row) => row.readiness || row.attempts || row.examScore || row.incidentScore);
    if (rows.length < 2) return 0;
    return clamp((rows[rows.length - 1].readiness || 0) - (rows[0].readiness || 0), -100, 100);
  }

  function renderMetric(label, value, note = "") {
    return `<div class="stat-card"><div class="label">${escape(label)}</div><div class="value">${escape(value)}</div>${note ? `<span class="muted">${escape(note)}</span>` : ""}</div>`;
  }

  function renderCloudPanel() {
    const syncState = window.CMASyncEngine?.state || {};
    const reports = progress().reports || [];
    const cloudReports = reports.filter((row) => /chief|incident|issue|exam/i.test(row.type || row.reason || ""));
    cloudPanel.innerHTML = `
      <div class="grid four">
        ${renderMetric("Cloud Status", syncState.cloudStatus || (window.CMA_FIREBASE_ENABLED ? "Ready" : "Guest/local"))}
        ${renderMetric("Sync Status", syncState.status || "Local progress active")}
        ${renderMetric("Last Sync", syncState.lastSyncAt ? syncState.lastSyncAt.slice(0, 19).replace("T", " ") : "Not synced")}
        ${renderMetric("Cloud History", cloudReports.length, "synced report records")}
      </div>
    `;
  }

  function renderReadinessMetrics() {
    const model = readiness();
    const summary = CMA.scoreSummary();
    const streak = CMA.streak();
    const flash = CMA.flashcardStats();
    const incidents = incidentRows();
    const profile = chiefProfile();
    const incidentProfile = progress().incidentProfile || {};
    const overall = blendedReadiness(model);
    const weeklyHours = (totalStudySeconds(7) / 3600).toFixed(1);
    const mastery = average([model.retentionWeightedMastery || model.score, profile.mastery, incidentProfile.mastery].filter(Boolean));
    const confidence = average([model.confidence, profile.confidence, incidentProfile.confidence].filter(Boolean));
    const retention = average([model.retentionWeightedMastery, profile.retention, incidentProfile.retention].filter(Boolean));
    metricsRoot.innerHTML = [
      renderMetric("Captain Readiness", `${overall}%`, model.category),
      renderMetric("Predicted Written Exam", `${model.predictedExamScore || model.score}%`, model.estimatedRank || "rank pending"),
      renderMetric("Pass Probability", `${model.passProbability || 0}%`, "estimated"),
      renderMetric("Daily Study Streak", streak.current, `${streak.best} best`),
      renderMetric("Weekly Study Hours", weeklyHours, "last 7 days"),
      renderMetric("Questions Answered", summary.attempts, `${summary.accuracy}% accuracy`),
      renderMetric("Incidents Completed", incidents.length, incidents[0]?.scenarioTitle || "none yet"),
      renderMetric("Flashcards Reviewed", flashcardsReviewed(), `${flash.mastered} mastered`),
      renderMetric("Average Confidence", `${confidence}%`),
      renderMetric("Average Mastery", `${mastery}%`),
      renderMetric("Average Retention", `${retention}%`),
      renderMetric("Firebase History", (progress().reports || []).length, "local + cloud merged"),
    ].join("");
    trendMetrics.innerHTML = `
      ${renderMetric("7-Day Trend", `${trendDelta(7)} pts`)}
      ${renderMetric("30-Day Trend", `${trendDelta(30)} pts`)}
      ${renderMetric("90-Day Trend", `${trendDelta(90)} pts`)}
    `;
    renderReadinessChart(trendForDays(30));
  }

  function chartBar(row, metric, label) {
    const value = clamp(row[metric] || 0);
    return `<div class="timeline-bar" style="height:${Math.max(6, value * 1.25)}px" title="${escape(row.date)} ${escape(label)}: ${value}%"><span>${value || ""}</span></div>`;
  }

  function renderReadinessChart(rows) {
    const visible = rows.slice(-30);
    readinessChart.innerHTML = `
      <div class="timeline-grid compact">
        ${visible.map((row) => `
          <div class="timeline-day">
            <div class="timeline-bars">
              ${chartBar(row, "readiness", "Readiness")}
              ${chartBar(row, "examScore", "Exam")}
              ${chartBar(row, "incidentScore", "Incident")}
            </div>
            <small>${escape(row.label)}</small>
          </div>
        `).join("")}
      </div>
      <div class="timeline-legend">
        <span><i class="legend readiness"></i>Readiness</span>
        <span><i class="legend exam"></i>Exam</span>
        <span><i class="legend incident"></i>Incident</span>
      </div>
    `;
  }

  function grade(score) {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "Needs work";
  }

  function scoreImprovement(key) {
    const rows = incidentRows().slice().reverse();
    if (rows.length < 2) return 0;
    const midpoint = Math.max(1, Math.floor(rows.length / 2));
    const early = average(rows.slice(0, midpoint).map((row) => row[key] || 0));
    const late = average(rows.slice(midpoint).map((row) => row[key] || 0));
    return late - early;
  }

  function renderCommandScorecard() {
    const scores = commandAverages();
    const keys = {
      "Incident Command": "overallScore",
      "Tactical Decisions": "tacticalScore",
      Communications: "communicationsScore",
      Safety: "safetyScore",
      Leadership: "leadershipScore",
      Accountability: "safetyScore",
      "Resource Management": "tacticalScore",
      "Risk Management": "safetyScore",
    };
    commandScorecard.innerHTML = `
      <div class="scorecard-grid">
        ${Object.entries(scores).map(([label, score]) => {
          const delta = scoreImprovement(keys[label]);
          return `
            <div class="scorecard-row">
              <div>
                <strong>${escape(label)}</strong>
                <span class="muted">Grade ${escape(grade(score))} - ${delta >= 0 ? "+" : ""}${delta} pts historical change</span>
              </div>
              <div class="score-ring" style="--score:${score}"><span>${score}%</span></div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function rowList(title, rows, emptyText, valueFn) {
    return `
      <div class="list-item">
        <strong>${escape(title)}</strong>
        ${rows.length ? `<ul>${rows.map((row) => `<li>${escape(row.label || row.type || row.topic || row.questionId || row)} <span class="muted">${escape(valueFn ? valueFn(row) : "")}</span></li>`).join("")}</ul>` : `<p class="muted">${escape(emptyText)}</p>`}
      </div>
    `;
  }

  function weakestIncidentTypes() {
    const rows = new Map();
    incidentRows().forEach((incident) => {
      const key = incident.scenarioType || "Incident";
      const row = rows.get(key) || { label: key, attempts: 0, score: 0 };
      row.attempts += 1;
      row.score += Number(incident.overallScore || 0);
      rows.set(key, row);
    });
    return [...rows.values()].map((row) => ({ ...row, accuracy: average([row.score / row.attempts]) })).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
  }

  function forgottenMaterial() {
    return Object.values(progress().adaptive?.questions || {})
      .filter((profile) => profile.status === "forgotten" || Number(profile.retention || 0) < 55)
      .sort((a, b) => (a.retention || 0) - (b.retention || 0))
      .slice(0, 6);
  }

  function notReviewedRecently() {
    return Object.values(progress().adaptive?.questions || {})
      .filter((profile) => profile.attempts && daysAgo((profile.lastReviewedAt || profile.lastSeen || "").slice(0, 10)) >= 14)
      .sort((a, b) => daysAgo((b.lastReviewedAt || b.lastSeen || "").slice(0, 10)) - daysAgo((a.lastReviewedAt || a.lastSeen || "").slice(0, 10)))
      .slice(0, 6);
  }

  function renderWeaknessIntelligence() {
    const bookRows = CMA.adaptiveGroupRows(questions, "book").filter((row) => row.attempts).sort((a, b) => b.risk - a.risk || a.mastery - b.mastery).slice(0, 5);
    const chapterRows = CMA.adaptiveGroupRows(questions, "chapter").filter((row) => row.attempts).sort((a, b) => b.risk - a.risk || a.mastery - b.mastery).slice(0, 5);
    const policyRows = CMA.policyScores(questions).filter((row) => row.attempts).sort((a, b) => (b.risk || 0) - (a.risk || 0) || a.accuracy - b.accuracy).slice(0, 5);
    const sogRows = policyRows.filter((row) => /sog|sop|procedure|high-rise|hazmat|incident|fire/i.test(row.label)).slice(0, 5);
    weaknessRoot.innerHTML = [
      rowList("Weakest books", bookRows, "Book weaknesses appear after attempts.", (row) => `${row.mastery ?? row.accuracy}% mastery, ${row.risk || 0}% risk`),
      rowList("Weakest chapters", chapterRows, "Chapter weaknesses appear after attempts.", (row) => `${row.mastery ?? row.accuracy}% mastery`),
      rowList("Weakest policies", policyRows, "Policy weaknesses appear after attempts.", (row) => `${row.accuracy || row.mastery || 0}% accuracy`),
      rowList("Weakest SOGs", sogRows, "SOG/SOP weaknesses appear after operational attempts.", (row) => `${row.accuracy || row.mastery || 0}% accuracy`),
      rowList("Weakest incident types", weakestIncidentTypes(), "Run incident simulations to populate this section.", (row) => `${row.accuracy}% command score`),
      rowList("Most forgotten material", forgottenMaterial(), "Forgotten material appears after retention data builds.", (row) => `${row.retention || 0}% retention`),
      rowList("Topics not reviewed recently", notReviewedRecently(), "No stale reviewed topics detected.", (row) => `${daysAgo((row.lastReviewedAt || row.lastSeen || "").slice(0, 10))} days ago`),
    ].join("");
  }

  function dailyMission() {
    const model = readiness();
    const weak = CMA.weakTopics(questions, 3);
    const forgotten = forgottenMaterial();
    const incidents = incidentRows();
    const flash = CMA.flashcardStats();
    const questionTarget = model.score >= 85 ? 25 : model.score >= 70 ? 45 : 60;
    const incidentTarget = incidents.length && (progress().incidentProfile?.readiness || 0) >= 85 ? 1 : 2;
    const flashTarget = Math.max(10, Math.min(40, flash.dueToday + flash.overdue + 10));
    const minutes = questionTarget + incidentTarget * 15 + Math.round(flashTarget * 0.75);
    const priorities = [
      weak[0]?.label && `Attack weakest chapter: ${weak[0].label}.`,
      forgotten[0]?.topic && `Recover forgotten material: ${forgotten[0].topic}.`,
      CMA.missedIds().length && `Clear missed-question queue: ${CMA.missedIds().length} active items.`,
      flash.overdue && `Resolve ${flash.overdue} overdue flashcards.`,
    ].filter(Boolean);
    if (!priorities.length) priorities.push("Maintain readiness with mixed timed practice and one incident command rep.");
    return {
      mission: model.score >= 85 ? "Defend readiness with exam-speed reps and command polish." : "Raise readiness by attacking weak source areas before adding volume.",
      priorities,
      questionTarget,
      incidentTarget,
      flashTarget,
      minutes,
      readinessGain: model.score >= 85 ? "+0.3 to +1.0 points" : "+1.0 to +3.0 points",
    };
  }

  function renderDailyCoach() {
    const mission = dailyMission();
    coachRoot.innerHTML = `
      <div class="coach-mission">
        <strong>Today's Mission</strong>
        <p>${escape(mission.mission)}</p>
      </div>
      <div class="grid two">
        ${renderMetric("Questions", mission.questionTarget)}
        ${renderMetric("Incidents", mission.incidentTarget)}
        ${renderMetric("Flashcards", mission.flashTarget)}
        ${renderMetric("Study Time", `${mission.minutes}m`)}
      </div>
      <div class="list-item">
        <strong>Today's priorities</strong>
        <ul>${mission.priorities.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
      </div>
      <div class="list-item">
        <strong>Estimated readiness improvement</strong>
        <p>${escape(mission.readinessGain)}</p>
      </div>
      <div class="action-row">
        <a class="button" href="quiz.html?mode=adaptive">Start Study</a>
        <a class="ghost-button" href="incident.html">Run Incident</a>
        <a class="ghost-button" href="flashcards.html">Flashcards</a>
      </div>
    `;
  }

  function milestones() {
    const summary = CMA.scoreSummary();
    const model = readiness();
    const incidents = incidentRows();
    const flash = CMA.flashcardStats();
    const exams = progress().exams || [];
    const streak = CMA.streak();
    const studyHours = Object.values(progress().daily || {}).reduce((sum, row) => sum + (row.studySeconds || Math.round((row.responseMs || 0) / 1000) || 0), 0) / 3600;
    const rows = [];
    if (summary.attempts >= 1000) rows.push(`First 1,000 questions completed (${summary.attempts}).`);
    const additional = Math.floor(summary.attempts / 1000) * 1000;
    if (additional >= 2000) rows.push(`${additional.toLocaleString()} total question attempts reached.`);
    if ((model.retentionWeightedMastery || 0) >= 90) rows.push("90% mastery reached.");
    if (blendedReadiness(model) >= 95) rows.push("95% Captain readiness reached.");
    if (exams.some((exam) => (exam.pct || 0) === 100)) rows.push("Perfect practice exam completed.");
    if (incidents.some((incident) => (incident.overallScore || 0) === 100)) rows.push("Perfect incident simulation completed.");
    if (streak.current >= 30 || streak.best >= 30) rows.push("30-day study streak achieved.");
    if (studyHours >= 100) rows.push("100-hour study milestone reached.");
    if (!rows.length) rows.push("Next milestone: complete 1,000 question attempts or one full exam simulation.");
    return rows;
  }

  function renderMilestones() {
    const rows = milestones();
    milestoneRoot.innerHTML = rows.map((row) => `<div class="milestone-item"><strong>${escape(row)}</strong></div>`).join("");
  }

  function versionMilestones() {
    return [
      { date: "2026-07-05", label: "Version 1.0 Stable Release" },
      { date: "2026-07-05", label: "Version 2.0 Adaptive Study Coach" },
      { date: "2026-07-05", label: "Version 2.3 Incident Simulator" },
      { date: "2026-07-05", label: "Version 2.4 AI Chief Mentor" },
      { date: "2026-07-05", label: "Version 2.4 Command Performance Center" },
    ];
  }

  function rangeDays() {
    if (timelineRange === "all") {
      const days = Object.keys(progress().daily || {}).sort();
      return Math.max(30, Math.min(365, days.length || 30));
    }
    return Number(timelineRange);
  }

  function renderTimeline() {
    const rows = trendForDays(rangeDays());
    const versions = versionMilestones();
    timelineRoot.innerHTML = `
      <div class="timeline-table">
        <table>
          <thead><tr><th>Date</th><th>Readiness</th><th>Mastery</th><th>Confidence</th><th>Retention</th><th>Exam</th><th>Incident</th><th>Study</th><th>Milestones</th></tr></thead>
          <tbody>
            ${rows.map((row) => {
              const milestoneText = [
                ...(row.attempts ? [`${row.attempts} questions`] : []),
                ...(row.exams.length ? [`${row.exams.length} exam${row.exams.length > 1 ? "s" : ""}`] : []),
                ...(row.incidents.length ? [`${row.incidents.length} incident${row.incidents.length > 1 ? "s" : ""}`] : []),
                ...versions.filter((item) => item.date === row.date).map((item) => item.label),
              ];
              return `<tr>
                <td>${escape(row.date)}</td>
                <td>${row.readiness || 0}%</td>
                <td>${row.mastery || 0}%</td>
                <td>${row.confidence || 0}%</td>
                <td>${row.retention || 0}%</td>
                <td>${row.examScore || "--"}${row.examScore ? "%" : ""}</td>
                <td>${row.incidentScore || "--"}${row.incidentScore ? "%" : ""}</td>
                <td>${row.studyMinutes || 0}m</td>
                <td>${milestoneText.map(escape).join("; ") || "--"}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderAll() {
    renderCloudPanel();
    renderReadinessMetrics();
    renderCommandScorecard();
    renderWeaknessIntelligence();
    renderDailyCoach();
    renderMilestones();
    renderTimeline();
  }

  rangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      timelineRange = button.dataset.timelineRange;
      rangeButtons.forEach((item) => item.classList.toggle("active-mode", item === button));
      renderTimeline();
    });
  });

  syncButton.addEventListener("click", async () => {
    syncButton.disabled = true;
    syncButton.textContent = "Syncing...";
    await Promise.resolve(window.CMASyncEngine?.manualSync?.("performance-center")).catch(() => {});
    syncButton.disabled = false;
    syncButton.textContent = "Sync Now";
    renderAll();
  });
  printButton.addEventListener("click", () => window.print());

  try {
    const data = await CMA.loadQuestions();
    questions = data.questions;
    CMA.refreshAdaptive(questions, false);
    renderAll();
  } catch (error) {
    CMA.statusMessage(metricsRoot, error.message);
  }
});
