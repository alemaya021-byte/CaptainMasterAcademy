(() => {
  const DAY_MS = 86400000;
  const PASSING_THRESHOLD = 70;

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));
  }

  function round(value) {
    return Math.round(clamp(value));
  }

  function pct(correct, attempts) {
    return attempts ? round((correct / attempts) * 100) : 0;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function dayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function daysBetween(start, end = Date.now()) {
    const time = Date.parse(start || "");
    if (!time) return 999;
    return Math.max(0, Math.floor((end - time) / DAY_MS));
  }

  function addDays(iso, days) {
    const base = Date.parse(iso || "") || Date.now();
    return new Date(base + Math.max(0, Number(days) || 0) * DAY_MS).toISOString();
  }

  function difficultyScore(label = "") {
    const value = String(label || "").toLowerCase();
    if (value.includes("easy")) return 3;
    if (value.includes("hard")) return 9;
    if (value.includes("moderate")) return 6;
    return 5;
  }

  function sourceLabel(question = {}) {
    return String(question.chapter_policy_sop_reference || question.source || question.source_category || "Unknown source").replace(/\s+-\s+source page.*$/i, "");
  }

  function bookLabel(question = {}) {
    return question.source_category || question.book || "Unknown book";
  }

  function chapterLabel(question = {}) {
    return sourceLabel(question);
  }

  function sourceGroup(question = {}) {
    return question.source || sourceLabel(question);
  }

  function policyLabel(question = {}) {
    const combined = [
      question.chapter_policy_sop_reference,
      question.source,
      question.source_category,
      ...(question.tags || []),
      ...(question.keywords || []),
    ].filter(Boolean).join(" ");
    const policyMatch = combined.match(/\b(?:Policy\s*)?([IVX]+-[A-Z]-\d{2,}|[A-Z]{1,4}-\d{1,3}(?:-\d{1,3})?|[A-Z]-\d{1,3})\b/i);
    if (policyMatch) return policyMatch[1].toUpperCase();
    if (/policy|policies/i.test(combined)) return sourceLabel(question);
    return "Unassigned policy";
  }

  function topicLabel(question = {}) {
    return question.topic || question.subtopic || (question.tags || [])[0] || chapterLabel(question);
  }

  function questionMeta(question = {}) {
    return {
      book: bookLabel(question),
      chapter: chapterLabel(question),
      policy: policyLabel(question),
      source: sourceGroup(question),
      topic: topicLabel(question),
      difficulty: question.difficulty || "Unknown",
      difficultyScore: difficultyScore(question.difficulty),
      probability: question.estimated_exam_probability || question.exam_frequency_estimate || "Unrated",
    };
  }

  function blankAdaptive() {
    return {
      version: 1,
      questions: {},
      books: {},
      chapters: {},
      policies: {},
      topics: {},
      difficulties: {},
      sources: {},
      readiness: {},
      predictions: { snapshots: [] },
      sessionsByDay: {},
      lastSessionSummary: null,
      updatedAt: "",
    };
  }

  function ensure(progress) {
    const existing = progress.adaptive || {};
    const defaults = blankAdaptive();
    Object.entries(defaults).forEach(([key, value]) => {
      if (existing[key] === undefined) existing[key] = value;
    });
    existing.questions = existing.questions || {};
    existing.books = existing.books || {};
    existing.chapters = existing.chapters || {};
    existing.policies = existing.policies || {};
    existing.topics = existing.topics || {};
    existing.difficulties = existing.difficulties || {};
    existing.sources = existing.sources || {};
    existing.readiness = existing.readiness || {};
    existing.predictions = existing.predictions || { snapshots: [] };
    existing.predictions.snapshots = existing.predictions.snapshots || [];
    existing.sessionsByDay = existing.sessionsByDay || {};
    progress.adaptive = existing;
    return progress.adaptive;
  }

  function recentCorrectPercent(record, limit = 5) {
    const history = (record.history || []).slice(-limit);
    if (!history.length) return pct(record.correct || 0, record.attempts || 0);
    return pct(history.filter((event) => event.correct).length, history.length);
  }

  function reviewInterval(previous, correct, confidence) {
    if (!correct) return 1;
    const prior = Math.max(1, Number(previous?.reviewIntervalDays || 1));
    if (confidence < 50) return 2;
    if (confidence < 75) return Math.max(4, Math.round(prior * 1.3));
    return Math.min(30, Math.max(5, Math.round(prior * 1.8)));
  }

  function retentionFrom(mastery, lastSeenAt, intervalDays) {
    if (!lastSeenAt) return 0;
    const days = daysBetween(lastSeenAt);
    const halfLife = Math.max(1, Number(intervalDays || 1) * 1.6);
    return round(mastery * Math.exp(-days / halfLife));
  }

  function statusFor(profile) {
    if (!profile.attempts) return "never seen";
    if (profile.retention < 55 && Date.parse(profile.recommendedReviewAt || "") <= Date.now()) return "forgotten";
    if (profile.mastery >= 85 && profile.retention >= 75 && profile.confidence >= 70) return "mastered";
    if (profile.mastery < 70 || profile.retention < 65) return "needs review";
    return "learning";
  }

  function questionProfile(progress, question, record, event = {}) {
    const adaptive = ensure(progress);
    const previous = adaptive.questions[question.question_id] || {};
    const attempts = record.attempts || 0;
    const correct = record.correct || 0;
    const correctPercent = pct(correct, attempts);
    const recentSignal = recentCorrectPercent(record);
    const meta = questionMeta(question);
    const lastSeenAt = record.lastAt || event.at || nowIso();
    const daysSinceSeen = daysBetween(lastSeenAt);
    const recencySignal = daysSinceSeen <= 14 ? 100 : Math.max(0, 100 - daysSinceSeen * 4);
    const consistencySignal = Math.max(0, 100 - Math.abs(recentSignal - correctPercent));
    const examModeBonus = /exam/i.test(event.mode || record.mode || "") ? 100 : 0;
    const confidence = round(
      Math.min(100, (attempts / 4) * 100) * 0.45 +
      recencySignal * 0.25 +
      consistencySignal * 0.20 +
      examModeBonus * 0.10
    );
    const difficultyAdjustedCorrectSignal = round(correctPercent + (meta.difficultyScore - 5) * 4);
    const missedRecoverySignal = record.incorrect > 0 && record.lastCorrect === true
      ? round(60 + Math.min(40, (record.correct / Math.max(1, record.incorrect + record.correct)) * 40))
      : correctPercent;
    const intervalDays = reviewInterval(previous, Boolean(event.correct ?? record.lastCorrect), confidence);
    const baseMastery = round(
      correctPercent * 0.40 +
      recentSignal * 0.20 +
      difficultyAdjustedCorrectSignal * 0.15 +
      missedRecoverySignal * 0.15 +
      (previous.retention || correctPercent) * 0.10
    );
    const retention = retentionFrom(baseMastery, lastSeenAt, intervalDays);
    const profile = {
      questionId: question.question_id,
      attempts,
      correct,
      incorrect: record.incorrect || 0,
      correctPercent,
      confidence,
      difficulty: meta.difficulty,
      difficultyScore: meta.difficultyScore,
      difficultyProfile: {
        label: meta.difficulty,
        score: meta.difficultyScore,
        hard: meta.difficultyScore >= 8,
      },
      retention,
      mastery: baseMastery,
      lastSeenAt,
      lastReviewedAt: lastSeenAt,
      lastCorrectAt: record.lastCorrect ? lastSeenAt : previous.lastCorrectAt || "",
      lastMissedAt: record.lastCorrect === false ? lastSeenAt : previous.lastMissedAt || "",
      reviewIntervalDays: intervalDays,
      forgettingIntervalDays: intervalDays,
      expectedForgettingAt: addDays(lastSeenAt, intervalDays),
      recommendedReviewAt: addDays(lastSeenAt, intervalDays),
      book: meta.book,
      chapter: meta.chapter,
      policy: meta.policy,
      source: meta.source,
      topic: meta.topic,
      probability: meta.probability,
      updatedAt: nowIso(),
    };
    profile.status = statusFor(profile);
    return profile;
  }

  function recordAnswer(progress, question, record, event = {}) {
    const adaptive = ensure(progress);
    const prior = adaptive.questions[question.question_id] || {};
    const profile = questionProfile(progress, question, record, event);
    adaptive.questions[question.question_id] = profile;
    updateDailyStudy(progress, event.responseMs || 0);
    updateSession(progress, profile, prior, event);
    adaptive.updatedAt = nowIso();
    return profile;
  }

  function updateDailyStudy(progress, responseMs) {
    const day = dayKey();
    progress.daily = progress.daily || {};
    const row = progress.daily[day] || { attempts: 0, correct: 0, responseMs: 0 };
    row.studySeconds = Math.round((row.studySeconds || 0) + Math.max(0, Number(responseMs || 0)) / 1000);
    row.studyMinutes = Math.round((row.studySeconds || 0) / 60);
    progress.daily[day] = row;
  }

  function pushUnique(list, value, limit = 8) {
    if (!value) return list || [];
    const next = [value, ...(list || []).filter((item) => item !== value)];
    return next.slice(0, limit);
  }

  function updateSession(progress, profile, previous, event = {}) {
    const adaptive = ensure(progress);
    const day = dayKey();
    const session = adaptive.sessionsByDay[day] || {
      day,
      answered: 0,
      correct: 0,
      missed: 0,
      whatImprovedToday: [],
      whatGotWorse: [],
      topicsRequiringImmediateReview: [],
      recommendedStudyPlan: [],
      estimatedMinutesRequired: 30,
      estimatedScoreImprovement: "0 to +1 readiness points",
      updatedAt: "",
    };
    session.answered += 1;
    session.correct += event.correct ? 1 : 0;
    session.missed += event.correct ? 0 : 1;
    const delta = (profile.mastery || 0) - (previous.mastery || 0);
    if (delta >= 3) {
      session.whatImprovedToday = pushUnique(session.whatImprovedToday, `${profile.topic} mastery +${Math.round(delta)}`);
    }
    if (!event.correct || delta <= -3 || profile.retention < 65) {
      const reason = !event.correct ? `${profile.topic} missed` : `${profile.topic} retention ${profile.retention}%`;
      session.whatGotWorse = pushUnique(session.whatGotWorse, reason);
      session.topicsRequiringImmediateReview = pushUnique(session.topicsRequiringImmediateReview, profile.topic);
    }
    session.recommendedStudyPlan = buildStudyPlan(adaptive).slice(0, 5);
    session.estimatedMinutesRequired = estimateMinutes(session.recommendedStudyPlan.length, session.topicsRequiringImmediateReview.length);
    session.estimatedScoreImprovement = estimateImprovement(session);
    session.updatedAt = nowIso();
    adaptive.sessionsByDay[day] = session;
    adaptive.lastSessionSummary = session;
  }

  function estimateMinutes(planCount, urgentCount) {
    return Math.max(20, Math.min(120, planCount * 8 + urgentCount * 10 + 20));
  }

  function estimateImprovement(session) {
    const base = Math.max(0.8, Math.min(4.5, (session.topicsRequiringImmediateReview || []).length * 0.7 + (session.recommendedStudyPlan || []).length * 0.35));
    return `+${base.toFixed(1)} to +${(base + 1.4).toFixed(1)} readiness points`;
  }

  function newest(a, b) {
    const aTime = Date.parse(a?.updatedAt || a?.lastSeenAt || "") || 0;
    const bTime = Date.parse(b?.updatedAt || b?.lastSeenAt || "") || 0;
    return bTime >= aTime ? b : a;
  }

  function mergeAdaptive(progress, remote = {}) {
    const adaptive = ensure(progress);
    Object.entries(remote.questions || {}).forEach(([id, profile]) => {
      adaptive.questions[id] = newest(adaptive.questions[id], profile);
    });
    Object.entries(remote.sessionsByDay || {}).forEach(([day, session]) => {
      adaptive.sessionsByDay[day] = newest(adaptive.sessionsByDay[day], session);
    });
    adaptive.lastSessionSummary = newest(adaptive.lastSessionSummary, remote.lastSessionSummary);
    adaptive.updatedAt = nowIso();
    return adaptive;
  }

  function groupRows(progress, questions, dimension) {
    const adaptive = ensure(progress);
    const getKey = {
      book: bookLabel,
      chapter: chapterLabel,
      policy: policyLabel,
      topic: topicLabel,
      difficulty: (q) => q.difficulty || "Unknown",
      source: sourceGroup,
    }[dimension] || bookLabel;
    const rows = new Map();
    questions.forEach((question) => {
      const key = getKey(question);
      const row = rows.get(key) || emptyRow(key, dimension);
      row.total += 1;
      rows.set(key, row);
      const record = progress.answers?.[question.question_id];
      if (!record) {
        row.unseen += 1;
        return;
      }
      const profile = adaptive.questions[question.question_id] || questionProfile(progress, question, record);
      row.attemptedQuestions += 1;
      row.attempts += record.attempts || 0;
      row.correct += record.correct || 0;
      row.incorrect += record.incorrect || 0;
      row.masterySum += profile.mastery || 0;
      row.confidenceSum += profile.confidence || 0;
      row.retentionSum += profile.retention || 0;
      row.forgotten += profile.status === "forgotten" ? 1 : 0;
      row.overdue += Date.parse(profile.recommendedReviewAt || "") < Date.now() ? 1 : 0;
    });
    return [...rows.values()].map(finalizeRow).sort((a, b) => b.risk - a.risk || b.attempts - a.attempts || a.label.localeCompare(b.label));
  }

  function emptyRow(label, dimension) {
    return {
      key: label,
      label,
      dimension,
      total: 0,
      unseen: 0,
      attemptedQuestions: 0,
      attempts: 0,
      correct: 0,
      incorrect: 0,
      masterySum: 0,
      confidenceSum: 0,
      retentionSum: 0,
      forgotten: 0,
      overdue: 0,
    };
  }

  function finalizeRow(row) {
    const divisor = Math.max(1, row.attemptedQuestions);
    const accuracy = pct(row.correct, row.attempts);
    const mastery = round(row.masterySum / divisor);
    const confidence = round(row.confidenceSum / divisor);
    const retention = round(row.retentionSum / divisor);
    const missRate = pct(row.incorrect, row.attempts);
    const unseenPenalty = pct(row.unseen, row.total);
    const hardQuestionPenalty = 100 - mastery;
    const risk = round((100 - mastery) * 0.30 + (100 - retention) * 0.25 + missRate * 0.20 + unseenPenalty * 0.15 + hardQuestionPenalty * 0.10);
    return {
      key: row.key,
      label: row.label,
      dimension: row.dimension,
      total: row.total,
      attempts: row.attempts,
      correct: row.correct,
      incorrect: row.incorrect,
      accuracy,
      mastery,
      confidence,
      retention,
      risk,
      unseen: row.unseen,
      forgotten: row.forgotten,
      overdue: row.overdue,
      trend: row.attempts < 2 ? "insufficient data" : risk >= 70 ? "declining" : mastery >= 85 ? "improving" : "stable",
      recommendedAction: risk >= 70 ? `Review ${row.label} today` : risk >= 45 ? `Drill ${row.label}` : `Maintain ${row.label}`,
    };
  }

  function recentAccuracy(progress, days = 14) {
    const since = Date.now() - days * DAY_MS;
    const events = Object.values(progress.answers || {}).flatMap((record) => record.history || []).filter((event) => Date.parse(event.at || "") >= since);
    return pct(events.filter((event) => event.correct).length, events.length);
  }

  function hardAccuracy(progress) {
    const rows = Object.values(progress.answers || {}).filter((record) => record.difficulty === "Hard");
    const attempts = rows.reduce((sum, row) => sum + (row.attempts || 0), 0);
    const correct = rows.reduce((sum, row) => sum + (row.correct || 0), 0);
    return pct(correct, attempts);
  }

  function streak(progress) {
    const days = Object.entries(progress.daily || {}).filter(([, row]) => row.attempts > 0).map(([day]) => day).sort();
    let current = 0;
    const cursor = new Date();
    while (days.includes(dayKey(cursor))) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    let longest = 0;
    let run = 0;
    days.forEach((day, index) => {
      if (!index) run = 1;
      else {
        const prev = new Date(`${days[index - 1]}T00:00:00`);
        const now = new Date(`${day}T00:00:00`);
        run = Math.round((now - prev) / DAY_MS) === 1 ? run + 1 : 1;
      }
      longest = Math.max(longest, run);
    });
    return { current, longest, activeDays: days.length };
  }

  function studyMinutes(progress, days = 7) {
    const since = Date.now() - days * DAY_MS;
    return Object.entries(progress.daily || {}).reduce((sum, [day, row]) => {
      if (Date.parse(`${day}T23:59:59.999Z`) < since) return sum;
      return sum + (row.studySeconds || Math.round((row.responseMs || 0) / 1000) || 0) / 60;
    }, 0);
  }

  function readiness(progress, questions = []) {
    const adaptive = ensure(progress);
    const answers = Object.values(progress.answers || {});
    const attempts = answers.reduce((sum, row) => sum + (row.attempts || 0), 0);
    const correct = answers.reduce((sum, row) => sum + (row.correct || 0), 0);
    const accuracy = pct(correct, attempts);
    const profiles = Object.values(adaptive.questions || {});
    const seenProfiles = profiles.filter((profile) => profile.attempts);
    const retentionWeightedMastery = seenProfiles.length ? round(seenProfiles.reduce((sum, profile) => sum + (profile.mastery || 0) * ((profile.retention || 0) / 100), 0) / seenProfiles.length) : accuracy;
    const coverage = questions.length ? round((seenProfiles.length / questions.length) * 100) : 0;
    const bookRows = questions.length ? groupRows(progress, questions, "book") : [];
    const weakRows = bookRows.filter((row) => row.attempts).sort((a, b) => a.mastery - b.mastery).slice(0, 5);
    const weakTopicFloor = weakRows.length ? round(weakRows.reduce((sum, row) => sum + row.mastery, 0) / weakRows.length) : accuracy;
    const exams = progress.exams || [];
    const examAverage = exams.length ? round(exams.slice(0, 5).reduce((sum, exam) => sum + (exam.pct || 0), 0) / Math.min(5, exams.length)) : 0;
    const recent = recentAccuracy(progress, 14);
    const hard = hardAccuracy(progress);
    const streakInfo = streak(progress);
    const consistency = Math.min(100, Math.round(streakInfo.current * 8 + streakInfo.activeDays * 2));
    const score = round(
      retentionWeightedMastery * 0.30 +
      coverage * 0.15 +
      (recent || accuracy) * 0.15 +
      (hard || accuracy) * 0.10 +
      (examAverage || accuracy) * 0.15 +
      (weakTopicFloor || accuracy) * 0.10 +
      consistency * 0.05
    );
    const predictedExamScore = round((examAverage || accuracy) * 0.35 + score * 0.30 + (recent || accuracy) * 0.15 + retentionWeightedMastery * 0.10 + (hard || accuracy) * 0.10);
    const riskPenalty = weakRows.length ? Math.max(0, 75 - weakTopicFloor) * 0.18 : 0;
    const passProbability = round(100 / (1 + Math.exp(-((predictedExamScore - PASSING_THRESHOLD - riskPenalty) / 7))));
    const last7 = studyMinutes(progress, 7);
    const snapshots = adaptive.predictions?.snapshots || [];
    const lastWeek = snapshots.find((snapshot) => Date.parse(snapshot.date) <= Date.now() - 7 * DAY_MS);
    const scoreGain = lastWeek ? score - (lastWeek.readiness || score) : Math.max(0, score - 55);
    const studyEfficiency = Number((scoreGain / Math.max(1, last7 / 60)).toFixed(1));
    const category = score >= 85 ? "Exam ready" : score >= 72 ? "Near ready" : score >= 55 ? "Developing" : "Not ready";
    const estimatedRank = score >= 90 && confidenceAverage(seenProfiles) >= 80 ? "Top tier" : score >= 82 ? "Competitive" : score >= 72 ? "Borderline" : "At risk";
    const forgotten = seenProfiles.filter((profile) => profile.status === "forgotten").length;
    const mastered = seenProfiles.filter((profile) => profile.status === "mastered").length;
    const needsReview = seenProfiles.filter((profile) => profile.status === "needs review" || profile.status === "forgotten").length;
    const neverSeen = Math.max(0, (questions.length || 0) - seenProfiles.length);
    const recommendations = buildStudyPlan(adaptive, bookRows);
    return {
      score,
      category,
      predictedExamScore,
      passProbability,
      estimatedRank,
      studyEfficiency,
      confidence: confidenceAverage(seenProfiles),
      confidenceInterval: confidenceInterval(predictedExamScore, attempts, coverage, examAverage),
      retentionWeightedMastery,
      coverage,
      recent,
      hard,
      weakAverage: weakTopicFloor,
      examAverage,
      consistency,
      questionsMastered: mastered,
      questionsNeedingReview: needsReview,
      questionsNeverSeen: neverSeen,
      questionsForgotten: forgotten,
      studyMinutes7Day: Math.round(last7),
      streak: streakInfo,
      strongestBooks: bookRows.filter((row) => row.attempts).sort((a, b) => b.mastery - a.mastery).slice(0, 5),
      weakestBooks: weakRows,
      recommendations,
    };
  }

  function confidenceAverage(profiles) {
    return profiles.length ? round(profiles.reduce((sum, profile) => sum + (profile.confidence || 0), 0) / profiles.length) : 0;
  }

  function confidenceInterval(predictedScore, attempts, coverage, examAverage) {
    const width = Math.max(4, Math.round(18 - Math.min(8, attempts / 80) - Math.min(4, coverage / 25) - (examAverage ? 3 : 0)));
    return {
      low: Math.max(0, predictedScore - width),
      high: Math.min(100, predictedScore + width),
      width,
    };
  }

  function buildStudyPlan(adaptive, rows = []) {
    const urgentProfiles = Object.values(adaptive.questions || {})
      .filter((profile) => profile.status === "forgotten" || profile.retention < 55 || profile.mastery < 65)
      .sort((a, b) => (a.retention - b.retention) || (a.mastery - b.mastery))
      .slice(0, 5)
      .map((profile) => `Review ${profile.topic || profile.chapter}`);
    const rowPlans = rows
      .filter((row) => row.risk >= 55)
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 5)
      .map((row) => row.recommendedAction);
    const plan = [...urgentProfiles, ...rowPlans];
    return [...new Set(plan)].slice(0, 6);
  }

  function trend(progress, days = 30) {
    const rows = [];
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - days + 1);
    for (let index = 0; index < days; index += 1) {
      const day = dayKey(cursor);
      const row = progress.daily?.[day] || { attempts: 0, correct: 0, responseMs: 0, studySeconds: 0 };
      rows.push({
        date: day,
        label: day.slice(5),
        attempts: row.attempts || 0,
        correct: row.correct || 0,
        accuracy: pct(row.correct || 0, row.attempts || 0),
        studyMinutes: Math.round((row.studySeconds || Math.round((row.responseMs || 0) / 1000) || 0) / 60),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return rows;
  }

  function upsertPredictionSnapshot(progress, currentReadiness) {
    const adaptive = ensure(progress);
    const today = dayKey();
    const snapshot = {
      date: today,
      readiness: currentReadiness.score,
      predictedScore: currentReadiness.predictedExamScore,
      passProbability: currentReadiness.passProbability,
      confidenceLow: currentReadiness.confidenceInterval.low,
      confidenceHigh: currentReadiness.confidenceInterval.high,
      studyEfficiency: currentReadiness.studyEfficiency,
      updatedAt: nowIso(),
    };
    const existing = (adaptive.predictions.snapshots || []).filter((row) => row.date !== today);
    adaptive.predictions.snapshots = [snapshot, ...existing].slice(0, 120);
  }

  function analyze(progress, questions = [], options = {}) {
    const adaptive = ensure(progress);
    if (questions.length) {
      questions.forEach((question) => {
        const record = progress.answers?.[question.question_id];
        if (record) adaptive.questions[question.question_id] = questionProfile(progress, question, record);
      });
      adaptive.books = Object.fromEntries(groupRows(progress, questions, "book").map((row) => [row.key, row]));
      adaptive.chapters = Object.fromEntries(groupRows(progress, questions, "chapter").map((row) => [row.key, row]));
      adaptive.policies = Object.fromEntries(groupRows(progress, questions, "policy").map((row) => [row.key, row]));
      adaptive.topics = Object.fromEntries(groupRows(progress, questions, "topic").map((row) => [row.key, row]));
      adaptive.difficulties = Object.fromEntries(groupRows(progress, questions, "difficulty").map((row) => [row.key, row]));
      adaptive.sources = Object.fromEntries(groupRows(progress, questions, "source").map((row) => [row.key, row]));
    }
    const currentReadiness = readiness(progress, questions);
    adaptive.readiness = currentReadiness;
    if (options.snapshot !== false) upsertPredictionSnapshot(progress, currentReadiness);
    adaptive.updatedAt = nowIso();
    return adaptive;
  }

  function completeSession(progress, details = {}) {
    const adaptive = ensure(progress);
    const day = dayKey();
    const session = adaptive.sessionsByDay[day] || {
      day,
      answered: 0,
      correct: 0,
      missed: 0,
      whatImprovedToday: [],
      whatGotWorse: [],
      topicsRequiringImmediateReview: [],
      recommendedStudyPlan: buildStudyPlan(adaptive),
      estimatedMinutesRequired: 30,
      estimatedScoreImprovement: "+0.8 to +2.0 readiness points",
      updatedAt: nowIso(),
    };
    session.type = details.type || session.type || "study";
    session.examScore = details.result?.pct ?? session.examScore;
    session.completedAt = nowIso();
    session.recommendedStudyPlan = session.recommendedStudyPlan?.length ? session.recommendedStudyPlan : buildStudyPlan(adaptive);
    session.estimatedMinutesRequired = estimateMinutes(session.recommendedStudyPlan.length, session.topicsRequiringImmediateReview.length);
    session.estimatedScoreImprovement = estimateImprovement(session);
    adaptive.sessionsByDay[day] = session;
    adaptive.lastSessionSummary = session;
    adaptive.updatedAt = nowIso();
    return session;
  }

  window.CMAAdaptiveEngine = {
    ensure,
    recordAnswer,
    analyze,
    groupRows,
    readiness,
    trend,
    completeSession,
    mergeAdaptive,
    questionMeta,
    buildStudyPlan,
  };
})();
