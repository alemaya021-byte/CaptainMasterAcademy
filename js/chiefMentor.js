(() => {
  const MAX_REVIEWS = 250;
  const MAX_DEBRIEFS = 80;

  function cma() {
    return window.CMA || {};
  }

  function escapeHtml(value) {
    if (cma().escapeHtml) return cma().escapeHtml(String(value ?? ""));
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pct(value) {
    const number = Number(value || 0);
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function average(values) {
    const usable = values.map(Number).filter((value) => Number.isFinite(value));
    return usable.length ? pct(usable.reduce((sum, value) => sum + value, 0) / usable.length) : 0;
  }

  function sourceLabel(question = {}) {
    if (cma().sourceLabel) return cma().sourceLabel(question);
    return question.chapter_policy_sop_reference || question.source || question.source_category || "Source reference unavailable";
  }

  function sourceText(question = {}) {
    return [
      question.source,
      question.source_category,
      question.chapter_policy_sop_reference,
      question.book,
      question.topic,
      question.subtopic,
      ...(question.tags || []),
      ...(question.keywords || []),
    ].join(" ");
  }

  function sourceCategory(question = {}) {
    return question.source_category || question.source || question.book || "General";
  }

  function choiceText(question = {}, label = "") {
    return question.answer_choices?.[label] || "No answer selected";
  }

  function tags(question = {}) {
    return [...(question.tags || []), ...(question.keywords || [])].map((item) => String(item).toLowerCase());
  }

  function normalize(value) {
    return String(value || "").toLowerCase();
  }

  function relatedQuestions(question, questions = [], limit = 5) {
    const currentId = question.question_id;
    const questionTags = new Set(tags(question));
    const ref = normalize(question.chapter_policy_sop_reference || question.source_category || question.source || "");
    return questions
      .filter((item) => item && item.question_id !== currentId)
      .map((item) => {
        const itemRef = normalize(item.chapter_policy_sop_reference || item.source_category || item.source || "");
        const tagScore = tags(item).filter((tag) => questionTags.has(tag)).length;
        const refScore = ref && itemRef && (ref.includes(itemRef.slice(0, 18)) || itemRef.includes(ref.slice(0, 18))) ? 4 : 0;
        const categoryScore = item.source_category === question.source_category ? 2 : 0;
        return { item, score: tagScore + refScore + categoryScore };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((row) => row.item);
  }

  function relevantPolicy(question = {}) {
    const text = normalize(sourceText(question));
    if (text.includes("policy") || text.includes("procedure")) return sourceLabel(question);
    if (text.includes("administrative order") || text.includes("ao ") || text.includes("io ")) return `Administrative order reference: ${sourceLabel(question)}`;
    if (text.includes("cba") || text.includes("collective bargaining")) return `CBA reference: ${sourceLabel(question)}`;
    return `No separate policy reference was identified; use the cited source: ${sourceLabel(question)}`;
  }

  function relevantSop(question = {}) {
    const text = normalize(sourceText(question));
    if (text.includes("sop") || text.includes("sog") || text.includes("high-rise") || text.includes("hazmat") || text.includes("fireground")) return sourceLabel(question);
    if (text.includes("operations") || text.includes("incident") || text.includes("safety")) return `Operational reference: ${sourceLabel(question)}`;
    return `No separate SOP reference was identified; use the cited source: ${sourceLabel(question)}`;
  }

  function trapNotes(question = {}, selectedLabel = "") {
    const notes = [];
    const stem = normalize(question.question_stem);
    const selected = normalize(choiceText(question, selectedLabel));
    const rationale = normalize(question.detailed_rationale);
    if (stem.includes("except") || stem.includes("not correct")) notes.push("EXCEPT/NOT inversion: the item rewards the one false or excluded statement.");
    if (/\b(day|days|hour|hours|minute|minutes|immediately|promptly|prior|after)\b/.test(stem + " " + selected + " " + rationale)) notes.push("Timeline drift: the wrong option likely changed when the action must occur.");
    if (/\b(captain|oic|chief|employee|member|supervisor|driver|officer)\b/.test(stem + " " + selected + " " + rationale)) notes.push("Role swap: the option may assign the duty to the wrong person or rank.");
    if (/\b(shall|must|required|may|should)\b/.test(stem + " " + selected + " " + rationale)) notes.push("Mandatory-language trap: may, should, shall, and must are not interchangeable.");
    if (/\b(rit|mayday|accountability|search|ventilation|water supply|exposure)\b/.test(stem + " " + selected)) notes.push("Fireground sequence trap: tactical actions must be coordinated with command, accountability, and safety.");
    if (!notes.length) notes.push("Source-wording trap: the distractor changed, added, or removed a condition from the cited source.");
    return notes.slice(0, 4);
  }

  function memoryStrategy(question = {}) {
    const ref = question.chapter_policy_sop_reference || sourceCategory(question);
    const topic = question.topic || question.subtopic || sourceCategory(question);
    return `Build a three-part cue card for ${ref}: trigger, responsible position, and required action. Then drill two related ${topic} questions before moving on.`;
  }

  function tacticalConsideration(question = {}, context = {}) {
    if (context.incidentPhase) return `Tie the decision to the incident objective, crew location, benchmark, and next operational trigger for ${context.incidentPhase}.`;
    return "Identify the operational trigger in the stem before choosing an answer; Captain-level items often test sequence, exception, or responsibility.";
  }

  function safetyConsideration(question = {}, context = {}) {
    if (context.incidentPhase) return "Confirm crew accountability, risk profile, RIT or rescue posture, and whether the chosen action increases exposure without a control measure.";
    return "Check whether the option protects members, patients, the public, records, or command accountability exactly as the source requires.";
  }

  function leadershipConsideration(question = {}, context = {}) {
    if (context.incidentPhase) return "The Captain must set command intent, assign work, require progress reports, and correct drift before crews freelance.";
    return "Choose the option that reflects the Captain's responsibility to apply policy consistently, document actions, and communicate expectations.";
  }

  function communicationConsideration(question = {}, context = {}) {
    if (context.incidentPhase) return "Use plain-language radio traffic: conditions, command mode, assignment, location, benchmark, and follow-up report.";
    return "Use the source reference as the communication script: who reports, what is reported, when it is due, and where it is documented.";
  }

  function profileImpactFromQuestion(question = {}, correct = false) {
    const difficulty = normalize(question.difficulty);
    const base = correct ? 84 : difficulty.includes("hard") ? 56 : difficulty.includes("moderate") ? 61 : 66;
    return {
      mastery: base,
      confidence: correct ? 82 : Math.max(45, base - 8),
      retention: correct ? 84 : Math.max(52, base + 6),
      readiness: correct ? 82 : Math.max(50, base - 2),
    };
  }

  function ensureState() {
    const progress = cma().progress || {};
    progress.chiefMentor = progress.chiefMentor || {};
    progress.chiefMentor.reviews = Array.isArray(progress.chiefMentor.reviews) ? progress.chiefMentor.reviews : [];
    progress.chiefMentor.debriefs = Array.isArray(progress.chiefMentor.debriefs) ? progress.chiefMentor.debriefs : [];
    progress.chiefMentor.studyPlan = Array.isArray(progress.chiefMentor.studyPlan) ? progress.chiefMentor.studyPlan : [];
    progress.chiefMentor.profile = progress.chiefMentor.profile || {
      attempts: 0,
      mastery: 0,
      confidence: 0,
      retention: 0,
      readiness: 0,
      updatedAt: "",
    };
    return progress.chiefMentor;
  }

  function blend(oldValue, newValue, attempts) {
    if (!attempts || !oldValue) return pct(newValue);
    return pct((Number(oldValue || 0) * Math.min(12, attempts - 1) + Number(newValue || 0)) / (Math.min(12, attempts - 1) + 1));
  }

  function updateProfile(impact = {}, studyPlan = []) {
    const state = ensureState();
    const profile = state.profile;
    const attempts = (profile.attempts || 0) + 1;
    state.profile = {
      attempts,
      mastery: blend(profile.mastery, impact.mastery ?? profile.mastery, attempts),
      confidence: blend(profile.confidence, impact.confidence ?? profile.confidence, attempts),
      retention: blend(profile.retention, impact.retention ?? profile.retention, attempts),
      readiness: blend(profile.readiness, impact.readiness ?? profile.readiness, attempts),
      updatedAt: new Date().toISOString(),
    };
    state.studyPlan = [...studyPlan, ...(state.studyPlan || [])].filter(Boolean).slice(0, 12);
    return state.profile;
  }

  function syncReport(review) {
    const progress = cma().progress;
    if (!progress) return;
    progress.reports = [
      {
        id: `chief-mentor-${review.id}`,
        reportId: `chief-mentor-${review.id}`,
        type: "chief-mentor-review",
        reason: review.title || review.type,
        note: review.summary || review.whatHappened || "Chief Mentor review",
        source: review.sourceReference || review.scenarioTitle || review.examId || "",
        result: review,
        timestamp: review.at,
        updatedAt: review.at,
      },
      ...(progress.reports || []),
    ].slice(0, 500);
  }

  function saveState(review, bucket = "reviews") {
    const progress = cma().progress;
    if (!progress) return review;
    const state = ensureState();
    const collection = bucket === "debriefs" ? "debriefs" : "reviews";
    state[collection] = [review, ...(state[collection] || [])].slice(0, collection === "debriefs" ? MAX_DEBRIEFS : MAX_REVIEWS);
    const profile = updateProfile(review.profileImpact, review.studyPlan);
    review.profileAfter = profile;
    const day = review.at.slice(0, 10);
    progress.daily = progress.daily || {};
    progress.daily[day] = {
      ...(progress.daily[day] || {}),
      chiefMentorReviews: ((progress.daily[day] || {}).chiefMentorReviews || 0) + 1,
    };
    if (progress.adaptive) {
      progress.adaptive.lastSessionSummary = {
        ...(progress.adaptive.lastSessionSummary || {}),
        type: review.type,
        whatImprovedToday: review.strengths || review.whatImprovedToday || [],
        topicsRequiringImmediateReview: review.weaknesses || review.topicsRequiringImmediateReview || [],
        recommendedStudyPlan: review.studyPlan || [],
        estimatedMinutesRequired: review.estimatedMinutesRequired || 20,
        estimatedScoreImprovement: review.estimatedScoreImprovement || "+0.5 to +2.0 readiness points",
        updatedAt: review.at,
      };
    }
    syncReport(review);
    if (cma().writeProgress) cma().writeProgress(progress);
    return review;
  }

  function questionReview(question, selectedLabel = "", questions = [], context = {}) {
    const selectedText = choiceText(question, selectedLabel);
    const correctText = choiceText(question, question.correct_answer);
    const correct = selectedLabel && selectedLabel === question.correct_answer;
    const related = relatedQuestions(question, context.relatedPool || questions, context.relatedLimit || 5);
    const why = correct
      ? "The selected answer matched the verified source reference."
      : selectedLabel
        ? question.incorrect_answer_explanations?.[selectedLabel] || "The selected option does not match the cited source and changes a required condition."
        : "No answer was selected, so the question must be treated as missed.";
    const traps = trapNotes(question, selectedLabel);
    const studyPlan = [
      `Review ${sourceLabel(question)} and restate the correct rule in one sentence.`,
      `Drill ${sourceCategory(question)} items until two consecutive answers are correct.`,
      memoryStrategy(question),
    ];
    return {
      id: `chief-question-${question.question_id || "unknown"}-${Date.now()}`,
      type: "chief-question-review",
      title: "Chief Mentor Question Review",
      at: new Date().toISOString(),
      mode: context.mode || "quiz",
      questionId: question.question_id,
      questionStem: question.question_stem,
      selectedLabel,
      selectedText,
      correctAnswer: question.correct_answer,
      correctText,
      sourceReference: sourceLabel(question),
      whatHappened: correct
        ? `You selected ${selectedLabel}, which matched the source-backed answer.`
        : selectedLabel
          ? `You selected ${selectedLabel}. ${selectedText}`
          : "The item was submitted without an answer.",
      whyIncorrect: why,
      betterDecision: `Slow down on the source trigger and eliminate choices that alter the reference before selecting ${question.correct_answer}.`,
      bestDecision: `Select ${question.correct_answer}. ${correctText}`,
      tacticalConsiderations: tacticalConsideration(question, context),
      safetyConsiderations: safetyConsideration(question, context),
      leadershipConsiderations: leadershipConsideration(question, context),
      communicationConsiderations: communicationConsideration(question, context),
      relevantDepartmentPolicy: relevantPolicy(question),
      relevantSop: relevantSop(question),
      relatedQuestions: related.map((item) => ({
        id: item.question_id,
        stem: item.question_stem,
        reference: sourceLabel(item),
      })),
      similarHistoricalMistakes: traps,
      memoryStrategy: memoryStrategy(question),
      studyPlan,
      profileImpact: profileImpactFromQuestion(question, correct),
      summary: `${question.question_id}: ${correct ? "correct" : "missed"} under Chief Mentor review`,
      estimatedMinutesRequired: correct ? 8 : 18,
      estimatedScoreImprovement: correct ? "+0.2 readiness points" : "+0.5 to +1.5 readiness points",
    };
  }

  function recordQuestionReview(question, selectedLabel = "", questions = [], context = {}) {
    return saveState(questionReview(question, selectedLabel, questions, context));
  }

  function rowLabel(row = {}) {
    return row.label || row.source || row.book || row.chapter || "Topic";
  }

  function examStrengths(result = {}) {
    const strengths = [];
    if ((result.pct || 0) >= (result.passingScore || 70)) strengths.push("Score finished above the simulator passing threshold.");
    (result.sourceScores || []).filter((row) => (row.accuracy || 0) >= 80).slice(0, 3).forEach((row) => strengths.push(`${rowLabel(row)} performed at ${row.accuracy}%.`));
    if (!strengths.length) strengths.push("Exam completed, creating a usable performance baseline.");
    return strengths;
  }

  function examWeaknesses(result = {}, missedRows = []) {
    const weaknesses = [];
    if (missedRows.length) weaknesses.push(`${missedRows.length} missed or unanswered questions require review.`);
    (result.weakestBooks || []).slice(0, 2).forEach((item) => weaknesses.push(`Book weakness: ${item}.`));
    (result.weakestChapters || []).slice(0, 2).forEach((item) => weaknesses.push(`Chapter weakness: ${item}.`));
    (result.weakestPolicies || []).slice(0, 2).forEach((item) => weaknesses.push(`Policy weakness: ${item}.`));
    if (!weaknesses.length) weaknesses.push("No major weak category was detected on this attempt.");
    return weaknesses;
  }

  function examImpact(result = {}) {
    const score = pct(result.pct || 0);
    return {
      mastery: score,
      confidence: pct(result.confidenceScore || score),
      retention: pct(score * 0.78 + 12),
      readiness: pct(result.estimatedPromotionalExamScore || score),
    };
  }

  function examDebrief(result = {}, missedRows = [], questions = []) {
    const missedCategories = new Set(missedRows.map((row) => row.question.source_category).filter(Boolean));
    const missedTags = new Set(missedRows.flatMap((row) => tags(row.question)).filter(Boolean));
    const relatedPool = questions
      .filter((item) => missedCategories.has(item.source_category) || tags(item).some((tag) => missedTags.has(tag)))
      .slice(0, 800);
    const reviewItems = missedRows.map((row) =>
      questionReview(row.question, row.selectedChoice?.originalLabel || "", questions, {
        mode: "exam",
        relatedPool,
        relatedLimit: 3,
      })
    );
    const strengths = examStrengths(result);
    const weaknesses = examWeaknesses(result, missedRows);
    const studyPlan = [
      ...(result.recommendedStudyPlan || []),
      ...weaknesses.slice(0, 3).map((item) => `Drill: ${item}`),
    ].slice(0, 8);
    return {
      id: `chief-exam-${result.id || Date.now()}`,
      type: "chief-exam-debrief",
      title: "Chief Mentor Exam Debrief",
      at: new Date().toISOString(),
      examId: result.id,
      summary: `Exam scored ${result.pct}% with ${missedRows.length} missed or unanswered questions.`,
      strengths,
      weaknesses,
      commandPresence: "Exam discipline is shown through pacing, flag management, and the ability to avoid changing correct answers without evidence.",
      riskManagement: missedRows.length ? "Risk is concentrated in missed source areas; those misses should drive the next study block." : "Risk profile is low for this attempt.",
      resourceManagement: "Use study time like incident resources: assign it first to high-frequency weak books, then to hard questions and missed-question recovery.",
      firegroundCommunication: "For operations-heavy misses, convert the correct answer into a brief radio-style benchmark or order.",
      decisionQuality: `${result.pct}% raw score with ${result.passProbability || 0}% predicted pass probability.`,
      recommendations: studyPlan,
      reviewItems,
      studyPlan,
      profileImpact: examImpact(result),
      estimatedMinutesRequired: Math.max(30, Math.min(120, missedRows.length * 6)),
      estimatedScoreImprovement: missedRows.length ? "+1.0 to +4.0 readiness points" : "+0.5 readiness points",
    };
  }

  function recordExamReview(result = {}, missedRows = [], questions = []) {
    return saveState(examDebrief(result, missedRows, questions), "debriefs");
  }

  function decisionScore(row = {}) {
    return average([
      row.scores?.tactical,
      row.scores?.safety,
      row.scores?.communications,
      row.scores?.leadership,
    ]);
  }

  function incidentPolicy(result = {}, row = {}) {
    return row.departmentReference || (result.departmentReferences || [])[0] || "Department reference unavailable";
  }

  function incidentSop(result = {}, row = {}) {
    const refs = [...(result.relatedPolicies || []), ...(result.departmentReferences || [])];
    return refs.find((item) => /sop|sog|high-rise|hazmat|mayday|rit|incident/i.test(item)) || row.departmentReference || "Related SOP/operational reference unavailable";
  }

  function incidentMistakes(row = {}) {
    const phase = normalize(row.phaseTitle);
    const mistakes = [];
    if (phase.includes("size")) mistakes.push("Delayed command establishment or incomplete initial radio report.");
    if (phase.includes("priorit")) mistakes.push("Committing companies before accountability, RIT, or resource controls are in place.");
    if (phase.includes("search")) mistakes.push("Separating search, fire attack, and water supply instead of coordinating them.");
    if (phase.includes("ventilation")) mistakes.push("Ventilating before attack, exposure, or safety controls are ready.");
    if (phase.includes("mayday")) mistakes.push("Allowing the rescue problem to erase command discipline and incident stabilization.");
    if (phase.includes("demobil")) mistakes.push("Ending command without benchmarks, accountability, investigation, or transfer documentation.");
    if (!mistakes.length) mistakes.push("Choosing visible activity over command sequence and benchmark control.");
    return mistakes;
  }

  function decisionAnalysis(result = {}, row = {}, related = []) {
    const score = decisionScore(row);
    const weak = score < 85;
    return {
      phaseTitle: row.phaseTitle,
      score,
      whatHappened: `You chose: ${row.selected}`,
      whyIncorrect: weak
        ? `The decision scored ${score}% because it left a command, safety, communication, or sequencing gap.`
        : "The decision aligned with the preferred command pattern for this scenario.",
      betterDecision: row.betterDecision || row.correctDecision || "Tighten command sequence, assignments, benchmarks, and progress reporting.",
      bestDecision: row.correctDecision || row.betterDecision || "Use the highest-scoring command decision for this phase.",
      tacticalConsiderations: tacticalConsideration({}, { incidentPhase: row.phaseTitle }),
      safetyConsiderations: safetyConsideration({}, { incidentPhase: row.phaseTitle }),
      leadershipConsiderations: leadershipConsideration({}, { incidentPhase: row.phaseTitle }),
      communicationConsiderations: communicationConsideration({}, { incidentPhase: row.phaseTitle }),
      relevantDepartmentPolicy: incidentPolicy(result, row),
      relevantSop: incidentSop(result, row),
      relatedQuestions: (related || []).slice(0, 4).map((question) => ({
        id: question.question_id,
        stem: question.question_stem,
        reference: sourceLabel(question),
      })),
      similarHistoricalMistakes: incidentMistakes(row),
      memoryStrategy: `For ${row.phaseTitle}, rehearse the command phrase: condition, objective, assignment, safety control, and benchmark.`,
    };
  }

  function incidentStrengths(result = {}) {
    const strengths = [];
    if ((result.tacticalScore || 0) >= 80) strengths.push("Tactical sequencing stayed mostly aligned with the incident objective.");
    if ((result.safetyScore || 0) >= 80) strengths.push("Safety, accountability, and risk controls were maintained.");
    if ((result.communicationsScore || 0) >= 80) strengths.push("Command communications supported progress tracking.");
    if ((result.leadershipScore || 0) >= 80) strengths.push("Command presence remained clear across the scenario.");
    if (!strengths.length) strengths.push("Scenario completion created a clear command-development baseline.");
    return strengths;
  }

  function incidentWeaknesses(result = {}) {
    const rows = [
      ["Tactical priorities", result.tacticalScore],
      ["Safety and risk control", result.safetyScore],
      ["Fireground communication", result.communicationsScore],
      ["Leadership and command presence", result.leadershipScore],
    ];
    const weak = rows.filter(([, score]) => Number(score || 0) < 80).map(([label, score]) => `${label} scored ${score || 0}%.`);
    return weak.length ? weak : ["No domain fell below 80%; continue with harder scenarios."];
  }

  function incidentDebrief(result = {}, related = []) {
    const decisionAnalyses = (result.decisionLog || []).map((row) => decisionAnalysis(result, row, related));
    const strengths = incidentStrengths(result);
    const weaknesses = incidentWeaknesses(result);
    const studyPlan = [
      ...(result.studyPlan || []),
      ...weaknesses.slice(0, 3).map((item) => `Run a focused scenario drill for ${item}`),
    ].slice(0, 8);
    return {
      id: `chief-incident-${result.id || Date.now()}`,
      type: "chief-incident-debrief",
      title: "Chief's Debrief",
      at: new Date().toISOString(),
      scenarioId: result.scenarioId,
      scenarioTitle: result.scenarioTitle,
      summary: `${result.scenarioTitle} completed at ${result.overallScore}% command score.`,
      strengths,
      weaknesses,
      commandPresence: (result.leadershipScore || 0) >= 80 ? "Command presence was clear and assignment-driven." : "Command presence needs earlier control of assignments, accountability, and benchmarks.",
      riskManagement: (result.safetyScore || 0) >= 80 ? "Risk controls were generally aligned with conditions." : "Risk management needs earlier RIT, accountability, isolation, and Mayday readiness.",
      resourceManagement: (result.tacticalScore || 0) >= 80 ? "Resources were mostly matched to tactical priorities." : "Resource management needs clearer staging, support assignments, and escalation triggers.",
      firegroundCommunication: (result.communicationsScore || 0) >= 80 ? "Radio and command communications supported the plan." : "Fireground communication needs clearer initial report, progress reports, and benchmark confirmation.",
      decisionQuality: `Overall command score ${result.overallScore}%; tactical ${result.tacticalScore}%, safety ${result.safetyScore}%, communications ${result.communicationsScore}%, leadership ${result.leadershipScore}%.`,
      recommendations: studyPlan,
      decisionAnalyses,
      studyPlan,
      profileImpact: {
        mastery: result.overallScore,
        confidence: average([result.overallScore, result.leadershipScore]),
        retention: pct((result.overallScore || 0) * 0.8 + 12),
        readiness: average([result.overallScore, result.safetyScore, result.communicationsScore]),
      },
      estimatedMinutesRequired: Math.max(30, weaknesses.length * 15 + 15),
      estimatedScoreImprovement: "+1.0 to +3.5 readiness points",
    };
  }

  function recordIncidentDebrief(result = {}, related = []) {
    return saveState(incidentDebrief(result, related), "debriefs");
  }

  function listHtml(items = []) {
    return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>None recorded.</li>"}</ul>`;
  }

  function relatedHtml(items = []) {
    return `<ul>${items.map((item) => `<li><strong>${escapeHtml(item.id)}</strong> ${escapeHtml(item.stem)} <span class="muted">${escapeHtml(item.reference)}</span></li>`).join("") || "<li>No related questions located.</li>"}</ul>`;
  }

  function analysisHtml(item = {}, title = "Decision Analysis") {
    return `
      <details class="chief-detail">
        <summary>${escapeHtml(title)}</summary>
        <div class="chief-grid">
          <p><strong>What happened:</strong> ${escapeHtml(item.whatHappened)}</p>
          <p><strong>Why it was incorrect:</strong> ${escapeHtml(item.whyIncorrect)}</p>
          <p><strong>Better decision:</strong> ${escapeHtml(item.betterDecision)}</p>
          <p><strong>Best decision:</strong> ${escapeHtml(item.bestDecision)}</p>
          <p><strong>Tactical considerations:</strong> ${escapeHtml(item.tacticalConsiderations)}</p>
          <p><strong>Safety considerations:</strong> ${escapeHtml(item.safetyConsiderations)}</p>
          <p><strong>Leadership considerations:</strong> ${escapeHtml(item.leadershipConsiderations)}</p>
          <p><strong>Communication considerations:</strong> ${escapeHtml(item.communicationConsiderations)}</p>
          <p><strong>Relevant department policy:</strong> ${escapeHtml(item.relevantDepartmentPolicy)}</p>
          <p><strong>Relevant SOP:</strong> ${escapeHtml(item.relevantSop)}</p>
          <div><strong>Related questions:</strong>${relatedHtml(item.relatedQuestions)}</div>
          <div><strong>Similar historical mistakes:</strong>${listHtml(item.similarHistoricalMistakes)}</div>
          <p><strong>Memory strategy:</strong> ${escapeHtml(item.memoryStrategy)}</p>
        </div>
      </details>
    `;
  }

  function profileHtml(profile = {}) {
    return `
      <div class="grid four chief-profile">
        <div class="stat-card"><div class="label">Mastery</div><div class="value">${pct(profile.mastery)}%</div></div>
        <div class="stat-card"><div class="label">Confidence</div><div class="value">${pct(profile.confidence)}%</div></div>
        <div class="stat-card"><div class="label">Retention</div><div class="value">${pct(profile.retention)}%</div></div>
        <div class="stat-card"><div class="label">Readiness</div><div class="value">${pct(profile.readiness)}%</div></div>
      </div>
    `;
  }

  function renderQuestionReview(review) {
    if (!review) return "";
    return `
      <section class="chief-panel stack">
        <h3>AI Chief Mentor Review</h3>
        ${analysisHtml(review, `${review.questionId || "Question"} command review`)}
        <div class="list-item">
          <strong>Recommended study plan</strong>
          ${listHtml(review.studyPlan)}
        </div>
        ${profileHtml(review.profileAfter)}
      </section>
    `;
  }

  function renderExamDebrief(debrief) {
    if (!debrief) return "";
    return `
      <section class="chief-panel stack">
        <h3>AI Chief Mentor Exam Debrief</h3>
        <p>${escapeHtml(debrief.summary)}</p>
        <div class="grid two">
          <div class="list-item"><strong>Strengths</strong>${listHtml(debrief.strengths)}</div>
          <div class="list-item"><strong>Weaknesses</strong>${listHtml(debrief.weaknesses)}</div>
        </div>
        <div class="grid two">
          <div class="list-item"><strong>Command presence</strong><p>${escapeHtml(debrief.commandPresence)}</p></div>
          <div class="list-item"><strong>Risk management</strong><p>${escapeHtml(debrief.riskManagement)}</p></div>
          <div class="list-item"><strong>Resource management</strong><p>${escapeHtml(debrief.resourceManagement)}</p></div>
          <div class="list-item"><strong>Fireground communication</strong><p>${escapeHtml(debrief.firegroundCommunication)}</p></div>
        </div>
        <div class="list-item"><strong>Decision quality</strong><p>${escapeHtml(debrief.decisionQuality)}</p></div>
        <div class="list-item"><strong>Recommendations</strong>${listHtml(debrief.recommendations)}</div>
        <h4>Incorrect Answer Analysis</h4>
        ${debrief.reviewItems.map((item) => analysisHtml(item, `${item.questionId} missed-answer review`)).join("") || `<div class="empty">No incorrect answers to review.</div>`}
        ${profileHtml(debrief.profileAfter)}
      </section>
    `;
  }

  function renderIncidentDebrief(debrief) {
    if (!debrief) return "";
    return `
      <section class="chief-panel stack">
        <h3>Chief's Debrief</h3>
        <p>${escapeHtml(debrief.summary)}</p>
        <div class="grid two">
          <div class="list-item"><strong>Strengths</strong>${listHtml(debrief.strengths)}</div>
          <div class="list-item"><strong>Weaknesses</strong>${listHtml(debrief.weaknesses)}</div>
        </div>
        <div class="grid two">
          <div class="list-item"><strong>Command presence</strong><p>${escapeHtml(debrief.commandPresence)}</p></div>
          <div class="list-item"><strong>Risk management</strong><p>${escapeHtml(debrief.riskManagement)}</p></div>
          <div class="list-item"><strong>Resource management</strong><p>${escapeHtml(debrief.resourceManagement)}</p></div>
          <div class="list-item"><strong>Fireground communication</strong><p>${escapeHtml(debrief.firegroundCommunication)}</p></div>
        </div>
        <div class="list-item"><strong>Decision quality</strong><p>${escapeHtml(debrief.decisionQuality)}</p></div>
        <div class="list-item"><strong>Recommendations</strong>${listHtml(debrief.recommendations)}</div>
        <h4>Decision Analysis</h4>
        ${debrief.decisionAnalyses.map((item) => analysisHtml(item, `${item.phaseTitle} review`)).join("")}
        ${profileHtml(debrief.profileAfter)}
      </section>
    `;
  }

  window.CMAChiefMentor = {
    ensureState,
    questionReview,
    recordQuestionReview,
    examDebrief,
    recordExamReview,
    incidentDebrief,
    recordIncidentDebrief,
    renderQuestionReview,
    renderExamDebrief,
    renderIncidentDebrief,
  };
})();
