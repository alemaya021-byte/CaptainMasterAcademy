document.addEventListener("DOMContentLoaded", async () => {
  const metricsRoot = document.querySelector("[data-tracking-metrics]");
  const readinessRoot = document.querySelector("[data-readiness-dashboard]");
  const missionRoot = document.querySelector("[data-daily-mission]");
  const completionRoot = document.querySelector("[data-completion-dashboard]");
  const milestoneRoot = document.querySelector("[data-milestone-dashboard]");
  const timelineRoot = document.querySelector("[data-performance-timeline]");
  const weeklyRoot = document.querySelector("[data-weekly-report]");
  const examDateInput = document.querySelector("[data-promotion-exam-date]");
  const examDateStatus = document.querySelector("[data-exam-date-status]");
  const saveExamDate = document.querySelector("[data-save-exam-date]");
  const syncButton = document.querySelector("[data-sync-now]");
  const printButton = document.querySelector("[data-print-tracking]");
  const rangeButtons = document.querySelectorAll("[data-tracking-range]");

  const DAY_MS = 86400000;
  let questions = [];
  let timelineRange = "7";

  function escape(value) {
    return CMA.escapeHtml(String(value ?? ""));
  }

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Math.round(Number(value || 0))));
  }

  function dayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function daysBetween(start, end = new Date()) {
    const startMs = Date.parse(`${start}T00:00:00`);
    if (!startMs) return 0;
    return Math.max(0, Math.floor((end.getTime() - startMs) / DAY_MS));
  }

  function progress() {
    return CMA.progress || {};
  }

  function tracking() {
    return CMA.ensureTracking ? CMA.ensureTracking() : (progress().tracking || {});
  }

  function dailyEntries() {
    return Object.entries(progress().daily || {}).sort(([a], [b]) => a.localeCompare(b));
  }

  function dailySeconds(row) {
    return Number(row.studySeconds || 0) || Math.round(Number(row.responseMs || 0) / 1000);
  }

  function totalStudySeconds() {
    const dailyTotal = dailyEntries().reduce((sum, [, row]) => sum + dailySeconds(row), 0);
    return Math.max(dailyTotal, Number(tracking().totalStudySeconds || 0));
  }

  function totalStudyHours() {
    return totalStudySeconds() / 3600;
  }

  function activeStudyDays() {
    return dailyEntries().filter(([, row]) => dailySeconds(row) || row.attempts || row.incidentAttempts || row.flashcardReviews || row.aiTutorSessions || row.practiceExamsCompleted).length;
  }

  function rowsSince(days) {
    if (days === "all") return dailyEntries();
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - Number(days) + 1);
    const startKey = dayKey(start);
    return dailyEntries().filter(([day]) => day >= startKey);
  }

  function rowTotals(rows) {
    return rows.reduce((totals, [, row]) => {
      totals.studySeconds += dailySeconds(row);
      totals.attempts += Number(row.attempts || row.questionsAnswered || 0);
      totals.correct += Number(row.correct || 0);
      totals.incidents += Number(row.incidentAttempts || 0);
      totals.flashcards += Number(row.flashcardReviews || 0);
      totals.tutor += Number(row.aiTutorSessions || 0);
      totals.exams += Number(row.practiceExamsCompleted || 0);
      return totals;
    }, { studySeconds: 0, attempts: 0, correct: 0, incidents: 0, flashcards: 0, tutor: 0, exams: 0 });
  }

  function metric(label, value, note = "") {
    return `<div class="stat-card"><div class="label">${escape(label)}</div><div class="value">${escape(value)}</div>${note ? `<span class="muted">${escape(note)}</span>` : ""}</div>`;
  }

  function list(items, empty = "More activity is needed to populate this section.") {
    return items.length ? `<ul>${items.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>` : `<p class="muted">${escape(empty)}</p>`;
  }

  function readiness() {
    return CMA.readinessModel(questions);
  }

  function summary() {
    return CMA.scoreSummary();
  }

  function exams() {
    return progress().exams || [];
  }

  function incidentRows() {
    return CMA.incidentAttempts ? CMA.incidentAttempts() : (progress().incidents || []);
  }

  function flashcardsReviewed() {
    const cardReps = Object.values(progress().flashcards || {}).reduce((sum, row) => sum + Number(row.reps || 0), 0);
    const dailyReps = dailyEntries().reduce((sum, [, row]) => sum + Number(row.flashcardReviews || 0), 0);
    return Math.max(cardReps, dailyReps);
  }

  function tutorSessions() {
    const dailySessions = dailyEntries().reduce((sum, [, row]) => sum + Number(row.aiTutorSessions || 0), 0);
    return Math.max(dailySessions, (progress().tutor?.events || []).length);
  }

  function examStats() {
    const rows = exams();
    const average = rows.length ? Math.round(rows.reduce((sum, exam) => sum + Number(exam.pct || 0), 0) / rows.length) : 0;
    const high = rows.length ? Math.max(...rows.map((exam) => Number(exam.pct || 0))) : 0;
    return { count: rows.length, average, high };
  }

  function groupRows(dimension) {
    return CMA.adaptiveGroupRows ? CMA.adaptiveGroupRows(questions, dimension) : [];
  }

  function masteredCount(dimension) {
    return groupRows(dimension).filter((row) => row.attempts && Number(row.mastery || row.accuracy || 0) >= 85 && Number(row.retention || 75) >= 70).length;
  }

  function completedCount(dimension) {
    return groupRows(dimension).filter((row) => row.total && Number(row.unseen || 0) === 0).length;
  }

  function weakTopicRows(limit = 6) {
    const rows = [
      ...CMA.weakTopics(questions, limit),
      ...groupRows("topic").filter((row) => row.attempts && (row.risk || 0) >= 55).sort((a, b) => b.risk - a.risk).slice(0, limit),
    ];
    const seen = new Set();
    return rows.filter((row) => {
      const key = row.label || row.topic;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);
  }

  function projectedReadinessByExamDate(model = readiness()) {
    const examDate = tracking().promotionalExamDate;
    if (!examDate) return { daysLeft: 0, projected: model.score, note: "Set an exam date to activate projection." };
    const daysLeft = Math.max(0, Math.ceil((Date.parse(`${examDate}T23:59:59`) - Date.now()) / DAY_MS));
    const hoursPerDay = activeStudyDays() ? totalStudyHours() / activeStudyDays() : 0.75;
    const efficiency = Math.max(0.5, Number(model.studyEfficiency || 1.8));
    const projectedGain = Math.min(100 - model.score, daysLeft * hoursPerDay * efficiency * 0.55);
    return { daysLeft, projected: clamp(model.score + projectedGain), note: `${daysLeft} days left at current pace` };
  }

  function hoursRemaining(target, model = readiness()) {
    const gap = Math.max(0, Number(target) - Number(model.score || 0));
    const efficiency = Math.max(0.75, Number(model.studyEfficiency || 2));
    return Number((gap / efficiency).toFixed(1));
  }

  function renderTrackingMetrics() {
    const track = tracking();
    const sum = summary();
    const today = rowTotals(rowsSince(1));
    const week = rowTotals(rowsSince(7));
    const month = rowTotals(rowsSince(30));
    const exam = examStats();
    const startDate = track.studyStartDate || dailyEntries()[0]?.[0] || "Not started";
    const daysStudied = activeStudyDays();
    const streak = CMA.streak();
    metricsRoot.innerHTML = [
      metric("Study Start", startDate),
      metric("Days Until Exam", track.promotionalExamDate ? projectedReadinessByExamDate().daysLeft : "Set date"),
      metric("Total Study Days", daysStudied),
      metric("Study Streak", streak.current, `${streak.best} longest`),
      metric("Total Study Hours", totalStudyHours().toFixed(1)),
      metric("Avg Hours/Day", daysStudied ? (totalStudyHours() / daysStudied).toFixed(1) : "0.0"),
      metric("Avg Hours/Week", (totalStudyHours() / Math.max(1, Math.ceil(daysStudied / 7))).toFixed(1)),
      metric("Questions Answered", sum.attempts, `${sum.correct} correct / ${sum.incorrect} incorrect`),
      metric("Overall Accuracy", `${sum.accuracy}%`),
      metric("Questions Today", today.attempts),
      metric("Questions This Week", week.attempts),
      metric("Questions This Month", month.attempts),
      metric("Practice Exams", exam.count, `${exam.average}% average`),
      metric("Highest Exam", `${exam.high}%`),
      metric("Incident Sims", incidentRows().length),
      metric("Flashcards Reviewed", flashcardsReviewed()),
      metric("AI Tutor Sessions", tutorSessions()),
      metric("Policies Mastered", masteredCount("policy")),
      metric("Books Completed", completedCount("book")),
      metric("Chapters Completed", completedCount("chapter")),
      metric("Topics Mastered", masteredCount("topic")),
      metric("Weak Topics Remaining", weakTopicRows(20).length + (readiness().questionsForgotten || 0)),
    ].join("");
  }

  function renderReadinessDashboard() {
    const model = readiness();
    const projection = projectedReadinessByExamDate(model);
    readinessRoot.innerHTML = `
      <div class="readiness-meter"><span style="width:${model.score}%"></span></div>
      <div class="grid three">
        ${metric("Captain Readiness", `${model.score}%`, model.category)}
        ${metric("Predicted Written Exam", `${model.predictedExamScore || model.score}%`, model.estimatedRank || "rank pending")}
        ${metric("Probability of Passing", `${model.passProbability || 0}%`, "estimated")}
        ${metric("Readiness By Exam Date", `${projection.projected}%`, projection.note)}
        ${metric("Hours to 80%", `${hoursRemaining(80, model)}h`)}
        ${metric("Hours to 90%", `${hoursRemaining(90, model)}h`)}
        ${metric("Hours to 95%", `${hoursRemaining(95, model)}h`)}
        ${metric("Hours to 98%", `${hoursRemaining(98, model)}h`)}
        ${metric("Study Efficiency", `${model.studyEfficiency || 0}`, "readiness points/hour")}
      </div>
    `;
  }

  function dailyMission() {
    const model = readiness();
    const flash = CMA.flashcardStats();
    const weak = weakTopicRows(4);
    const questionTarget = model.score >= 90 ? 25 : model.score >= 78 ? 40 : model.score >= 62 ? 55 : 70;
    const flashTarget = Math.max(10, Math.min(45, (flash.dueToday || 0) + (flash.overdue || 0) + 12));
    const incidentTarget = (progress().incidentProfile?.readiness || 0) >= 85 ? 1 : 2;
    const minutes = Math.round(questionTarget * 1.2 + flashTarget * 0.75 + incidentTarget * 18);
    const expectedGain = model.score >= 90 ? "+0.2 to +0.8" : model.score >= 75 ? "+0.5 to +1.5" : "+1.0 to +3.0";
    const mission = {
      day: dayKey(),
      questions: questionTarget,
      flashcards: flashTarget,
      incidents: incidentTarget,
      weakTopics: weak.map((row) => row.label),
      minutes,
      expectedReadinessImprovement: expectedGain,
      updatedAt: new Date().toISOString(),
    };
    const track = tracking();
    const current = track.dailyMissions?.[mission.day];
    if (JSON.stringify(current || {}) !== JSON.stringify(mission)) {
      track.dailyMissions[mission.day] = mission;
      CMA.writeProgress(progress());
    }
    return mission;
  }

  function renderDailyMission() {
    const mission = dailyMission();
    missionRoot.innerHTML = `
      <div class="coach-mission">
        <strong>Today's Mission</strong>
        <p>${readiness().score >= 85 ? "Maintain readiness with timed reps and weak-topic cleanup." : "Raise readiness by attacking weak areas before adding new volume."}</p>
      </div>
      <div class="grid two">
        ${metric("Questions", mission.questions)}
        ${metric("Flashcards", mission.flashcards)}
        ${metric("Incidents", mission.incidents)}
        ${metric("Study Time", `${mission.minutes}m`)}
      </div>
      <div class="list-item">
        <strong>Weak topics to study</strong>
        ${list(mission.weakTopics, "Weak topics appear after more attempts.")}
      </div>
      <div class="list-item">
        <strong>Expected readiness improvement</strong>
        <p>${escape(mission.expectedReadinessImprovement)} points</p>
      </div>
      <div class="action-row">
        <a class="button" href="quiz.html?mode=adaptive">Start Mission</a>
        <a class="ghost-button" href="flashcards.html">Flashcards</a>
        <a class="ghost-button" href="incident.html">Incident Rep</a>
      </div>
    `;
  }

  function renderCompletionDashboard() {
    const bookRows = groupRows("book");
    const chapterRows = groupRows("chapter");
    const policyRows = groupRows("policy");
    const topicRows = groupRows("topic");
    const weak = weakTopicRows(5);
    const strong = CMA.strongestTopics(questions, 5);
    completionRoot.innerHTML = `
      <div class="grid two">
        ${metric("Books Mastered", masteredCount("book"), `${bookRows.length} tracked`)}
        ${metric("Chapters Mastered", masteredCount("chapter"), `${chapterRows.length} tracked`)}
        ${metric("Policies Mastered", masteredCount("policy"), `${policyRows.length} tracked`)}
        ${metric("Topics Mastered", masteredCount("topic"), `${topicRows.length} tracked`)}
      </div>
      <div class="grid two">
        <div class="list-item">
          <strong>Strongest areas</strong>
          ${list(strong.map((row) => `${row.label}: ${row.accuracy}%`))}
        </div>
        <div class="list-item">
          <strong>Weak topics remaining</strong>
          ${list(weak.map((row) => `${row.label}: ${row.accuracy ?? row.mastery ?? 0}%`))}
        </div>
      </div>
    `;
  }

  function milestoneRows() {
    const sum = summary();
    const model = readiness();
    const exam = examStats();
    const streak = CMA.streak();
    const hours = totalStudyHours();
    const rows = [
      { id: "first-study-day", label: "First study day", achieved: activeStudyDays() >= 1 },
      { id: "1000-questions", label: "1,000 questions", achieved: sum.attempts >= 1000 },
      { id: "perfect-quiz", label: "First perfect quiz", achieved: Object.values(progress().daily || {}).some((row) => row.attempts >= 10 && row.attempts === row.correct) },
      { id: "perfect-exam", label: "First perfect exam", achieved: exams().some((row) => Number(row.pct || 0) === 100) },
      { id: "30-day-streak", label: "30-day streak", achieved: streak.best >= 30 },
      { id: "60-day-streak", label: "60-day streak", achieved: streak.best >= 60 },
      { id: "100-hours", label: "100 study hours", achieved: hours >= 100 },
      { id: "250-hours", label: "250 study hours", achieved: hours >= 250 },
      { id: "500-hours", label: "500 study hours", achieved: hours >= 500 },
      { id: "90-readiness", label: "90% readiness", achieved: model.score >= 90 },
      { id: "95-readiness", label: "95% readiness", achieved: model.score >= 95 },
      { id: "promotion-ready", label: "Promotion-ready status", achieved: model.score >= 90 && exam.average >= 85 },
    ];
    const thousands = Math.floor(sum.attempts / 1000);
    for (let index = 2; index <= Math.max(2, thousands); index += 1) {
      rows.splice(index, 0, { id: `${index * 1000}-questions`, label: `${index * 1000} questions`, achieved: sum.attempts >= index * 1000 });
    }
    const track = tracking();
    let changed = false;
    rows.filter((row) => row.achieved && !track.milestones[row.id]).forEach((row) => {
      track.milestones[row.id] = { label: row.label, achievedAt: new Date().toISOString() };
      changed = true;
    });
    if (changed) CMA.writeProgress(progress());
    return rows;
  }

  function renderMilestones() {
    milestoneRoot.innerHTML = `
      <div class="milestone-grid">
        ${milestoneRows().map((row) => `<div class="milestone-item ${row.achieved ? "achieved" : ""}"><strong>${row.achieved ? "Complete" : "Next"}</strong><span>${escape(row.label)}</span></div>`).join("")}
      </div>
    `;
  }

  function timelineRows() {
    if (timelineRange === "today") return CMA.adaptiveTrend(1);
    if (timelineRange === "all") {
      const count = Math.max(30, Math.min(365, dailyEntries().length || 30));
      return CMA.adaptiveTrend(count);
    }
    return CMA.adaptiveTrend(Number(timelineRange));
  }

  function timelineStatsByDay() {
    const incidents = new Map();
    incidentRows().forEach((row) => {
      const day = (row.completedAt || row.at || "").slice(0, 10);
      if (!day) return;
      const listForDay = incidents.get(day) || [];
      listForDay.push(row);
      incidents.set(day, listForDay);
    });
    const examMap = new Map();
    exams().forEach((row) => {
      const day = (row.completedAt || row.at || "").slice(0, 10);
      if (!day) return;
      const listForDay = examMap.get(day) || [];
      listForDay.push(row);
      examMap.set(day, listForDay);
    });
    return { incidents, examMap };
  }

  function renderTimeline() {
    const { incidents, examMap } = timelineStatsByDay();
    const snapshots = new Map((progress().adaptive?.predictions?.snapshots || []).map((row) => [row.date, row]));
    timelineRoot.innerHTML = `
      <div class="timeline-table tracking-timeline">
        <table>
          <thead><tr><th>Date</th><th>Readiness</th><th>Mastery</th><th>Confidence</th><th>Retention</th><th>Exam</th><th>Incident</th><th>Study Hours</th><th>Questions</th><th>Streak</th></tr></thead>
          <tbody>
            ${timelineRows().map((row) => {
              const day = row.date || row.key;
              const daily = progress().daily?.[day] || {};
              const snapshot = snapshots.get(day) || {};
              const dayExams = examMap.get(day) || [];
              const dayIncidents = incidents.get(day) || [];
              const examScore = dayExams.length ? Math.round(dayExams.reduce((sum, item) => sum + Number(item.pct || 0), 0) / dayExams.length) : 0;
              const incidentScore = dayIncidents.length ? Math.round(dayIncidents.reduce((sum, item) => sum + Number(item.overallScore || 0), 0) / dayIncidents.length) : 0;
              return `<tr>
                <td>${escape(day)}</td>
                <td>${escape(snapshot.readiness || row.accuracy || 0)}%</td>
                <td>${escape(progress().adaptive?.readiness?.retentionWeightedMastery || snapshot.readiness || row.accuracy || 0)}%</td>
                <td>${escape(progress().adaptive?.readiness?.confidence || 0)}%</td>
                <td>${escape(progress().adaptive?.readiness?.retentionWeightedMastery || 0)}%</td>
                <td>${examScore ? `${examScore}%` : "--"}</td>
                <td>${incidentScore ? `${incidentScore}%` : "--"}</td>
                <td>${(dailySeconds(daily) / 3600).toFixed(1)}</td>
                <td>${escape(daily.attempts || row.attempts || 0)}</td>
                <td>${daily.attempts || daily.studySeconds ? "active" : "--"}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function currentWeekDays() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const days = [];
    for (let index = 0; index < 7; index += 1) {
      const next = new Date(start);
      next.setDate(start.getDate() + index);
      days.push(dayKey(next));
    }
    return days;
  }

  function weeklyReport() {
    const days = currentWeekDays();
    const rows = dailyEntries().filter(([day]) => days.includes(day));
    const totals = rowTotals(rows);
    const accuracy = totals.attempts ? Math.round((totals.correct / totals.attempts) * 100) : 0;
    const weak = weakTopicRows(4).map((row) => row.label);
    const strong = CMA.strongestTopics(questions, 4).map((row) => row.label);
    const model = readiness();
    const report = {
      weekOf: days[0],
      questionsCompleted: totals.attempts,
      hoursStudied: Number((totals.studySeconds / 3600).toFixed(1)),
      accuracy,
      readinessImprovement: `${Math.max(0, model.score - (progress().adaptive?.predictions?.snapshots?.find((row) => row.date <= days[0])?.readiness || model.score))} pts`,
      weakestAreas: weak,
      strongestAreas: strong,
      studyConsistency: `${rows.filter(([, row]) => row.attempts || row.studySeconds).length}/7 active days`,
      recommendedPlan: [
        weak[0] ? `Open Adaptive Study for ${weak[0]}.` : "Run a mixed official-blueprint quiz.",
        (CMA.flashcardStats().dueToday + CMA.flashcardStats().overdue) ? "Clear due and overdue flashcards." : "Create flashcards from missed or needs-review questions.",
        model.score < 85 ? "Complete one 125-question exam simulation this week." : "Maintain readiness with timed maintenance drills.",
      ],
      generatedAt: new Date().toISOString(),
    };
    if (new Date().getDay() === 0) {
      const track = tracking();
      if (!track.weeklyReports[report.weekOf]) {
        track.weeklyReports[report.weekOf] = report;
        CMA.writeProgress(progress());
      }
    }
    return report;
  }

  function renderWeeklyReport() {
    const report = weeklyReport();
    weeklyRoot.innerHTML = `
      <div class="grid four">
        ${metric("Questions", report.questionsCompleted)}
        ${metric("Hours", `${report.hoursStudied}h`)}
        ${metric("Accuracy", `${report.accuracy}%`)}
        ${metric("Readiness Change", report.readinessImprovement)}
      </div>
      <div class="grid two">
        <div class="list-item"><strong>Weakest areas</strong>${list(report.weakestAreas)}</div>
        <div class="list-item"><strong>Strongest areas</strong>${list(report.strongestAreas)}</div>
        <div class="list-item"><strong>Study consistency</strong><p>${escape(report.studyConsistency)}</p></div>
        <div class="list-item"><strong>Recommended plan for next week</strong>${list(report.recommendedPlan)}</div>
      </div>
    `;
  }

  function renderAll() {
    if (examDateInput) examDateInput.value = tracking().promotionalExamDate || "";
    renderTrackingMetrics();
    renderReadinessDashboard();
    renderDailyMission();
    renderCompletionDashboard();
    renderMilestones();
    renderTimeline();
    renderWeeklyReport();
  }

  saveExamDate?.addEventListener("click", () => {
    CMA.setPromotionalExamDate(examDateInput.value || "");
    examDateStatus.textContent = examDateInput.value ? "Saved" : "Date cleared";
    renderAll();
  });

  syncButton?.addEventListener("click", async () => {
    syncButton.disabled = true;
    syncButton.textContent = "Syncing...";
    await Promise.resolve(window.CMASyncEngine?.manualSync?.("promotion-tracking")).catch(() => {});
    syncButton.disabled = false;
    syncButton.textContent = "Sync Now";
    renderAll();
  });

  printButton?.addEventListener("click", () => window.print());

  rangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      timelineRange = button.dataset.trackingRange;
      rangeButtons.forEach((item) => item.classList.toggle("active-mode", item === button));
      renderTimeline();
    });
  });

  try {
    const data = await CMA.loadQuestions();
    questions = data.questions;
    CMA.refreshAdaptive(questions, false);
    renderAll();
  } catch (error) {
    CMA.statusMessage(metricsRoot, error.message);
  }
});
