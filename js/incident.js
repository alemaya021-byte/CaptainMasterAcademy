document.addEventListener("DOMContentLoaded", async () => {
  const scenarioSelect = document.querySelector("[data-scenario-select]");
  const complexitySelect = document.querySelector("[data-complexity-select]");
  const startButton = document.querySelector("[data-start-scenario]");
  const randomButton = document.querySelector("[data-random-scenario]");
  const printButton = document.querySelector("[data-print-incident]");
  const card = document.querySelector("[data-incident-card]");
  const results = document.querySelector("[data-incident-results]");
  const checklist = document.querySelector("[data-incident-checklist]");
  const history = document.querySelector("[data-incident-history]");
  const stepValue = document.querySelector("[data-scenario-step]");
  const scoreValue = document.querySelector("[data-scenario-score]");
  const progressBar = document.querySelector("[data-scenario-progress]");
  const progressLabel = document.querySelector("[data-scenario-progress-label]");

  const COVERAGE = [
    "Initial size-up",
    "Radio reports",
    "Command mode",
    "Tactical priorities",
    "Resource requests",
    "Accountability",
    "RIT",
    "Search",
    "Fire attack",
    "Ventilation",
    "Water supply",
    "Exposure protection",
    "Safety",
    "Mayday management",
    "Demobilization",
  ];

  const SCENARIOS = [
    {
      id: "residential-working-fire",
      type: "Residential",
      complexity: "Moderate",
      title: "Two-Story Residential Fire",
      dispatch: "Engine 12 arrives to a two-story single-family dwelling with smoke showing from the second floor, reports of occupants possibly inside, and the next-due company three minutes out.",
      conditions: "Access is open on side A, smoke is banking to the floor on the second floor, and a hydrant is visible at the corner.",
      target: "life hazard with coordinated interior attack",
      water: "secure the hydrant and confirm a continuous supply before committing deeper interior operations",
      ventilation: "coordinate horizontal or vertical ventilation with water on the fire and command approval",
      exposure: "protect the attic extension path and side B/D exposures",
      resources: "request the balance needed for search, RIT, water supply, and command support",
      referenceTerms: ["residential", "structural", "fire attack", "search", "RIT", "mayday", "incident command"],
    },
    {
      id: "high-rise-smoke",
      type: "High-rise",
      complexity: "Hard",
      title: "High-Rise Smoke Investigation",
      dispatch: "Companies arrive to a high-rise residential building with alarm activation, light smoke in the lobby, occupants calling from upper floors, and the fire alarm panel indicating floor 18.",
      conditions: "Elevator status is uncertain, building staff is available, and the first alarm assignment is still arriving.",
      target: "high-rise command, lobby control, and stairwell discipline",
      water: "verify standpipe, pressure, attack stair, evacuation stair, and water supply before advancing",
      ventilation: "control HVAC, stairwell doors, and smoke movement before ordering ventilation",
      exposure: "protect floors above and control occupant movement",
      resources: "request high-rise support functions early, including lobby control, systems control, staging, RIT, and medical group",
      referenceTerms: ["high-rise", "standpipe", "lobby", "stairwell", "incident command", "accountability"],
    },
    {
      id: "commercial-strip-center",
      type: "Commercial",
      complexity: "Hard",
      title: "Commercial Strip Center Fire",
      dispatch: "First-arriving company finds smoke pushing from a closed restaurant in a strip center with attached businesses on both sides and security gates on the front.",
      conditions: "The occupancy is closed, roof conditions are unknown, and smoke is extending toward the common cockloft.",
      target: "commercial occupancy size-up with exposure control",
      water: "establish a sustained supply and position for larger lines if conditions dictate",
      ventilation: "coordinate forcible entry, roof or horizontal ventilation, and fire attack under command control",
      exposure: "protect the cockloft and attached occupancies before the incident runs the row",
      resources: "request additional companies for forcible entry, roof, exposure checks, RIT, utilities, and command support",
      referenceTerms: ["commercial", "forcible entry", "ventilation", "exposure", "roof", "incident command"],
    },
    {
      id: "warehouse-large-area",
      type: "Warehouse",
      complexity: "Hard",
      title: "Warehouse Fire With Collapse Concern",
      dispatch: "A warehouse has heavy smoke from the loading dock side, employees report everyone is out, and the building contains high-piled storage.",
      conditions: "The footprint is large, access is limited, and smoke volume suggests a deep-seated fire.",
      target: "large-area strategy with collapse and accountability discipline",
      water: "secure multiple water sources and consider master streams or large-caliber lines early",
      ventilation: "avoid uncoordinated ventilation that worsens fire spread in the large-area building",
      exposure: "protect adjacent storage, utilities, and loading-dock exposures",
      resources: "request additional alarms, safety officer, RIT, water supply support, and accountability resources",
      referenceTerms: ["warehouse", "collapse", "large", "water supply", "safety", "incident command"],
    },
    {
      id: "hazmat-leak",
      type: "Hazmat",
      complexity: "Hard",
      title: "Hazardous Materials Leak",
      dispatch: "Units are dispatched to an industrial facility for employees reporting an unknown chemical odor and two workers feeling dizzy near a loading area.",
      conditions: "A placarded delivery truck is present, wind is pushing vapors toward the parking lot, and facility representatives are gathering product information.",
      target: "isolation, identification, protective actions, and specialist resource control",
      water: "avoid creating contaminated runoff unless life safety requires protective stream use",
      ventilation: "do not ventilate or disperse vapors until product, exposure, and protective actions are understood",
      exposure: "isolate the hazard area, deny entry, and protect downwind exposures",
      resources: "request hazmat resources, law enforcement for isolation, EMS, and technical reference support",
      referenceTerms: ["hazardous materials", "hazmat", "isolate", "deny entry", "decontamination", "incident command"],
    },
    {
      id: "technical-rescue-collapse",
      type: "Technical rescue",
      complexity: "Hard",
      title: "Technical Rescue With Entrapment",
      dispatch: "Crews arrive to a construction site where a worker is trapped below grade after a partial trench wall failure.",
      conditions: "Workers are attempting a rescue, soil is unstable, and a storm drain is filling the trench area slowly.",
      target: "rescue discipline, scene control, and technical resource request",
      water: "control water entering the hazard area and protect rescuers from secondary collapse or flooding",
      ventilation: "manage atmospheric monitoring and ventilation only through the technical rescue plan",
      exposure: "isolate the collapse zone and remove non-essential personnel from the hazard area",
      resources: "request technical rescue, safety, medical, utilities, law enforcement, and additional command support",
      referenceTerms: ["technical rescue", "trench", "collapse", "rescue", "safety", "accountability"],
    },
    {
      id: "multi-company-mva-fire",
      type: "Multi-company response",
      complexity: "Moderate",
      title: "Multi-Company Response With Fire and Rescue Priorities",
      dispatch: "Multiple companies arrive at a roadway incident involving a vehicle fire, trapped occupant, leaking fuel, and traffic hazards.",
      conditions: "Law enforcement is delayed, bystanders are close to the hazard, and companies are arriving from opposite directions.",
      target: "multi-company command, sector assignments, and hazard control",
      water: "position apparatus for protection, suppression, and access while preserving rescue space",
      ventilation: "control smoke and fire conditions without compromising rescue or crew safety",
      exposure: "protect rescuers, bystanders, traffic lanes, and nearby vehicles from fire and fuel hazards",
      resources: "request EMS, law enforcement, additional suppression or rescue resources, and traffic control support",
      referenceTerms: ["multi-company", "vehicle fire", "rescue", "accountability", "incident command", "safety"],
    },
  ];

  let allQuestions = [];
  let current = null;
  let step = 0;
  let log = [];
  let state = { risk: 0, resources: 0, accountability: 0, communications: 0, safety: 0 };
  let startedAt = 0;

  function phaseDefinitions(scenario) {
    return [
      {
        key: "sizeup",
        title: "Initial Size-Up, Radio Report, and Command Mode",
        coverage: ["Initial size-up", "Radio reports", "Command mode"],
        prompt: `${scenario.dispatch} ${scenario.conditions} What is your first command decision?`,
        options: [
          {
            text: `Give a clear initial radio report, establish command, name the command, announce strategy and command mode, and assign incoming units based on ${scenario.target}.`,
            scores: { tactical: 92, safety: 90, communications: 96, leadership: 94 },
            effects: { risk: -1, communications: 2 },
            better: "Keep the first report concise, then follow with assignments as units arrive.",
          },
          {
            text: "Investigate personally before giving a full radio report or assuming command.",
            scores: { tactical: 58, safety: 55, communications: 42, leadership: 48 },
            effects: { risk: 2, communications: -2 },
            better: "Announce command and conditions first, even if the report is brief and updated after a 360 or reconnaissance.",
          },
          {
            text: "Order the first crew directly to the problem area and delay command mode until the next-due officer arrives.",
            scores: { tactical: 64, safety: 50, communications: 50, leadership: 52 },
            effects: { risk: 2 },
            better: "A Captain-level answer maintains command presence while still addressing the immediate tactical need.",
          },
        ],
      },
      {
        key: "priorities",
        title: "Tactical Priorities, Resources, Accountability, and RIT",
        coverage: ["Tactical priorities", "Resource requests", "Accountability", "RIT"],
        prompt: `Additional companies are arriving. The incident still needs life-safety priorities, work assignments, and resource control. What do you do next?`,
        options: [
          {
            text: `Set life safety, incident stabilization, and property conservation priorities; request ${scenario.resources}; establish accountability; and assign or request RIT early.`,
            scores: { tactical: 94, safety: 96, communications: 90, leadership: 94 },
            effects: { risk: -2, resources: 2, accountability: 2, safety: 2 },
            better: "Tie every assignment to a unit, location, objective, and reporting path.",
          },
          {
            text: "Commit all arriving crews to visible tactical work and handle accountability after the first benchmark.",
            scores: { tactical: 68, safety: 40, communications: 58, leadership: 55 },
            effects: { risk: 3, accountability: -2 },
            better: "Do not trade early speed for uncontrolled freelancing; accountability and RIT are part of the tactical plan.",
          },
          {
            text: "Hold companies in staging until the situation is fully confirmed, even though immediate assignments are available.",
            scores: { tactical: 55, safety: 70, communications: 62, leadership: 60 },
            effects: { resources: -1 },
            better: "Stage what you cannot use yet, but assign critical life safety, RIT, water supply, or isolation functions immediately.",
          },
        ],
      },
      {
        key: "operations",
        title: "Search, Fire Attack, and Water Supply",
        coverage: ["Search", "Fire attack", "Water supply"],
        prompt: `Conditions are changing. You must coordinate search, attack or hazard control, and water supply. What is the best command action?`,
        options: [
          {
            text: `Coordinate search with the attack or hazard-control plan, confirm crew integrity, and ${scenario.water}.`,
            scores: { tactical: 96, safety: 92, communications: 86, leadership: 90 },
            effects: { risk: -2, safety: 1 },
            better: "Ask for progress reports and confirm benchmarks before extending crews deeper into the incident.",
          },
          {
            text: "Prioritize rapid search ahead of line placement, hazard isolation, or water/resource confirmation.",
            scores: { tactical: 60, safety: 42, communications: 56, leadership: 58 },
            effects: { risk: 3, safety: -2 },
            better: "Search must be coordinated with protection, communication, and a survivable operational plan.",
          },
          {
            text: "Focus only on attack or hazard control and delay search status until the first tactical objective is complete.",
            scores: { tactical: 66, safety: 62, communications: 52, leadership: 54 },
            effects: { risk: 1 },
            better: "Command must balance life safety and incident control rather than treating them as separate incidents.",
          },
        ],
      },
      {
        key: "support",
        title: "Ventilation, Exposure Protection, and Safety",
        coverage: ["Ventilation", "Exposure protection", "Safety"],
        prompt: `The incident is extending. Support functions now matter as much as the initial objective. Which decision best protects crews and the incident profile?`,
        options: [
          {
            text: `${scenario.ventilation}; ${scenario.exposure}; assign safety observations; and require progress reports from operating units.`,
            scores: { tactical: 92, safety: 96, communications: 88, leadership: 90 },
            effects: { risk: -2, safety: 2 },
            better: "Match ventilation, exposure, and safety assignments to the same operational clock as attack or rescue.",
          },
          {
            text: "Order immediate ventilation or hazard opening before confirming attack, water, isolation, or exposure status.",
            scores: { tactical: 50, safety: 36, communications: 48, leadership: 45 },
            effects: { risk: 4, safety: -3 },
            better: "Uncoordinated ventilation or hazard movement can create the next emergency.",
          },
          {
            text: "Keep all companies focused on the main problem and address exposures and safety after knockdown or control.",
            scores: { tactical: 62, safety: 48, communications: 54, leadership: 50 },
            effects: { risk: 2 },
            better: "Exposure protection and safety are concurrent priorities, not cleanup tasks.",
          },
        ],
      },
      {
        key: "mayday",
        title: "Mayday Management",
        coverage: ["Mayday management", "Accountability", "RIT", "Safety"],
        prompt: () => state.risk > 3
          ? "A crew transmits an urgent message after conditions deteriorate. The radio traffic is congested and accountability is incomplete. What is your command action?"
          : "A simulated Mayday inject is announced during the incident. You still have active tactical work underway. What is your command action?",
        options: [
          {
            text: "Maintain command, clear radio traffic, confirm the Mayday location and unit, deploy RIT, request additional resources, obtain a PAR, and keep separate control of fire attack or hazard control.",
            scores: { tactical: 96, safety: 100, communications: 96, leadership: 98 },
            effects: { risk: -3, safety: 2 },
            better: "Separate rescue communications and keep command from being consumed by a single task.",
          },
          {
            text: "Leave the command post to personally locate the missing crew because the Captain knows the layout best.",
            scores: { tactical: 52, safety: 38, communications: 34, leadership: 35 },
            effects: { risk: 4, communications: -2 },
            better: "The Captain's highest-value Mayday function is command, coordination, resources, and accountability.",
          },
          {
            text: "Keep the original tactical plan moving and wait for the RIT officer to provide details before changing command priorities.",
            scores: { tactical: 55, safety: 35, communications: 42, leadership: 40 },
            effects: { risk: 4 },
            better: "A Mayday changes the command priority immediately; fire control may continue, but rescue command cannot wait.",
          },
        ],
      },
      {
        key: "demob",
        title: "Demobilization and Transfer of Command",
        coverage: ["Demobilization", "Accountability", "Radio reports"],
        prompt: "The incident is stabilizing and companies are requesting release. What is the strongest demobilization decision?",
        options: [
          {
            text: "Confirm benchmarks, complete PAR/accountability, address rehab and safety, preserve required information, release resources in a controlled order, and provide a final radio report.",
            scores: { tactical: 90, safety: 94, communications: 94, leadership: 92 },
            effects: { risk: -1 },
            better: "Treat demobilization as a command function with the same discipline as arrival.",
          },
          {
            text: "Release excess companies quickly once the main hazard is controlled so units return to service.",
            scores: { tactical: 68, safety: 58, communications: 60, leadership: 62 },
            effects: { risk: 1 },
            better: "Returning units matters, but not before accountability, rehab, investigation needs, and final communications are complete.",
          },
          {
            text: "Transfer all remaining details to the next-arriving chief without a structured summary because the incident is under control.",
            scores: { tactical: 58, safety: 60, communications: 44, leadership: 45 },
            effects: { communications: -2 },
            better: "A transfer or closeout needs conditions, actions taken, resources, accountability status, and remaining hazards.",
          },
        ],
      },
    ];
  }

  function escape(value) {
    return CMA.escapeHtml(value);
  }

  function average(values) {
    return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));
  }

  function applyEffects(effects = {}) {
    Object.entries(effects).forEach(([key, value]) => {
      state[key] = (state[key] || 0) + value;
    });
  }

  function scenarioQuestions(scenario, limit = 8) {
    const terms = scenario.referenceTerms.map((term) => CMA.normalize(term)).filter(Boolean);
    return allQuestions
      .map((question) => {
        const text = CMA.normalize(CMA.searchableText(question));
        const hits = terms.filter((term) => text.includes(term)).length;
        const areaBoost = scenario.type === "High-rise" && CMA.primaryArea(question) === "High-Rise" ? 3 : 0;
        const hazmatBoost = scenario.type === "Hazmat" && /hazmat|hazardous/i.test(text) ? 3 : 0;
        return { question, score: hits * 3 + areaBoost + hazmatBoost };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.question.question_id.localeCompare(b.question.question_id))
      .slice(0, limit)
      .map((row) => row.question);
  }

  function departmentReferences(scenario) {
    const refs = scenarioQuestions(scenario, 8).map((question) => CMA.sourceLabel(question));
    return [...new Set(refs)].slice(0, 5);
  }

  function relatedPolicies(scenario) {
    return [...new Set(scenarioQuestions(scenario, 12)
      .filter((question) => /policy|sop|procedure|incident|command|high-rise|hazard|rescue|safety/i.test([question.source_category, question.source, question.chapter_policy_sop_reference].join(" ")))
      .map((question) => CMA.sourceCode(question) || CMA.sourceLabel(question)))]
      .slice(0, 8);
  }

  function updateStatus() {
    if (!current) {
      stepValue.textContent = "0";
      scoreValue.textContent = "0%";
      progressLabel.textContent = "Not started";
      progressBar.style.width = "0%";
      checklist.innerHTML = COVERAGE.map((item) => `<span class="pill">${escape(item)}</span>`).join("");
      return;
    }
    const phases = phaseDefinitions(current);
    const pct = Math.round((step / phases.length) * 100);
    stepValue.textContent = `${Math.min(step + 1, phases.length)}/${phases.length}`;
    scoreValue.textContent = `${runningScore()}%`;
    progressLabel.textContent = `${pct}% complete`;
    progressBar.style.width = `${pct}%`;
    const completedCoverage = new Set(log.flatMap((row) => row.coverage || []));
    checklist.innerHTML = COVERAGE.map((item) => `<span class="pill ${completedCoverage.has(item) ? "active-mode" : ""}">${escape(item)}</span>`).join("");
  }

  function runningScore() {
    if (!log.length) return 0;
    return average(log.map((row) => average(Object.values(row.scores))));
  }

  function renderHistory() {
    const rows = CMA.incidentAttempts().slice(0, 6);
    if (!rows.length) {
      history.innerHTML = `<div class="empty">No completed incident scenarios yet.</div>`;
      return;
    }
    history.innerHTML = rows.map((row) => `
      <div class="list-item">
        <strong>${escape(row.scenarioTitle)}</strong>
        <span class="muted">${row.overallScore}% command score - ${new Date(row.completedAt || row.at).toLocaleDateString()}</span>
      </div>
    `).join("");
  }

  function renderScenarioIntro() {
    if (!current) return;
    const refs = departmentReferences(current);
    results.innerHTML = `
      <h2>Scenario Brief</h2>
      <div class="grid three">
        <div class="stat-card"><div class="label">Type</div><div class="value">${escape(current.type)}</div></div>
        <div class="stat-card"><div class="label">Complexity</div><div class="value">${escape(current.complexity)}</div></div>
        <div class="stat-card"><div class="label">Steps</div><div class="value">${phaseDefinitions(current).length}</div></div>
      </div>
      <p>${escape(current.dispatch)}</p>
      <p class="muted">${escape(current.conditions)}</p>
      <div class="list-item"><strong>Department reference anchors</strong><span class="muted">${escape(refs.join(", ") || "Related references will appear after completion.")}</span></div>
    `;
  }

  function renderPhase() {
    const phases = phaseDefinitions(current);
    if (step >= phases.length) {
      finishScenario();
      return;
    }
    const phase = phases[step];
    const prompt = typeof phase.prompt === "function" ? phase.prompt() : phase.prompt;
    card.innerHTML = `
      <div class="question-meta">
        <span class="pill">${escape(current.type)}</span>
        <span class="pill">${escape(current.complexity)}</span>
        <span class="pill">Step ${step + 1} of ${phases.length}</span>
      </div>
      <h2>${escape(phase.title)}</h2>
      <p>${escape(prompt)}</p>
      <div class="choice-list incident-options">
        ${phase.options.map((option, index) => `
          <button class="choice" type="button" data-decision="${index}">
            <span class="letter">${String.fromCharCode(65 + index)}</span>
            <span class="text">${escape(option.text)}</span>
          </button>
        `).join("")}
      </div>
    `;
    card.querySelectorAll("[data-decision]").forEach((button) => {
      button.addEventListener("click", () => chooseDecision(Number(button.dataset.decision)));
    });
    updateStatus();
  }

  function chooseDecision(index) {
    const phase = phaseDefinitions(current)[step];
    const selected = phase.options[index];
    const best = [...phase.options].sort((a, b) => average(Object.values(b.scores)) - average(Object.values(a.scores)))[0];
    applyEffects(selected.effects);
    log.push({
      phaseKey: phase.key,
      phaseTitle: phase.title,
      coverage: phase.coverage,
      selected: selected.text,
      scores: selected.scores,
      correctDecision: best.text,
      betterDecision: selected === best ? selected.better : best.better,
      lesson: selected === best ? selected.better : `Better decision: ${best.text}`,
      departmentReference: departmentReferences(current)[0] || "Related department reference unavailable",
    });
    step += 1;
    renderPhase();
  }

  function scoreBy(key) {
    return average(log.map((row) => row.scores[key] || 0));
  }

  function lessonsLearned(result) {
    const lessons = [];
    if (result.tacticalScore < 80) lessons.push("Tactical decisions need tighter sequencing between priorities, resources, and benchmarks.");
    if (result.safetyScore < 80) lessons.push("Safety, accountability, RIT, and Mayday readiness need earlier command attention.");
    if (result.communicationsScore < 80) lessons.push("Radio reports and progress reports should be more explicit and command-centered.");
    if (result.leadershipScore < 80) lessons.push("The command role needs stronger control of assignments, accountability, and closeout.");
    if (!lessons.length) lessons.push("Command pattern was strong; increase complexity or run a different occupancy type.");
    return lessons;
  }

  function finishScenario() {
    const tacticalScore = scoreBy("tactical");
    const safetyScore = scoreBy("safety");
    const communicationsScore = scoreBy("communications");
    const leadershipScore = scoreBy("leadership");
    const overallScore = average([tacticalScore, safetyScore, communicationsScore, leadershipScore]);
    const references = departmentReferences(current);
    const related = scenarioQuestions(current, 8);
    const result = CMA.setIncidentResult({
      scenarioId: current.id,
      scenarioTitle: current.title,
      scenarioType: current.type,
      complexity: current.complexity,
      overallScore,
      commandScore: overallScore,
      tacticalScore,
      safetyScore,
      communicationsScore,
      leadershipScore,
      decisionLog: log,
      departmentReferences: references,
      relatedPolicies: relatedPolicies(current),
      relatedQuestions: related.map((question) => question.question_id),
      lessonsLearned: lessonsLearned({ tacticalScore, safetyScore, communicationsScore, leadershipScore }),
      elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
    });
    const chiefDebrief = window.CMAChiefMentor ? window.CMAChiefMentor.recordIncidentDebrief(result, related) : null;
    Promise.resolve(window.CMASyncEngine?.manualSync?.("incident-scenario-complete")).catch(() => {});
    card.innerHTML = `
      <section class="stack">
        <p class="eyebrow">Scenario complete</p>
        <h2>${escape(current.title)}</h2>
        <div class="feedback show ${overallScore >= 80 ? "correct" : "incorrect"}">
          <p>${overallScore >= 80 ? "Strong command performance." : "This scenario exposed command gaps to review."}</p>
        </div>
        <div class="action-row">
          <button class="button" type="button" data-retry-scenario>Run Again</button>
          <button class="ghost-button" type="button" data-new-scenario>New Scenario</button>
        </div>
      </section>
    `;
    card.querySelector("[data-retry-scenario]").addEventListener("click", () => startScenario(current.id));
    card.querySelector("[data-new-scenario]").addEventListener("click", () => {
      current = null;
      card.innerHTML = `<div class="empty">Choose a scenario and start the command simulation.</div>`;
      updateStatus();
    });
    renderDebrief(result, related, chiefDebrief);
    renderHistory();
    updateStatus();
  }

  function renderDebrief(result, related, chiefDebrief = null) {
    results.innerHTML = `
      <section class="print-report stack">
        <h2>Scenario Debrief: ${escape(result.scenarioTitle)}</h2>
        <div class="grid five incident-score-grid">
          <div class="stat-card"><div class="label">Command</div><div class="value">${result.overallScore}%</div></div>
          <div class="stat-card"><div class="label">Tactical</div><div class="value">${result.tacticalScore}%</div></div>
          <div class="stat-card"><div class="label">Safety</div><div class="value">${result.safetyScore}%</div></div>
          <div class="stat-card"><div class="label">Comms</div><div class="value">${result.communicationsScore}%</div></div>
          <div class="stat-card"><div class="label">Leadership</div><div class="value">${result.leadershipScore}%</div></div>
        </div>
        <h3>Decision Review</h3>
        ${result.decisionLog.map((row) => `
          <div class="list-item">
            <strong>${escape(row.phaseTitle)}</strong>
            <span><strong>Your decision:</strong> ${escape(row.selected)}</span>
            <span class="muted"><strong>Correct decision:</strong> ${escape(row.correctDecision)}</span>
            <span class="muted"><strong>Better decision:</strong> ${escape(row.betterDecision)}</span>
            <span class="muted"><strong>Department reference:</strong> ${escape(row.departmentReference)}</span>
          </div>
        `).join("")}
        <div class="grid two">
          <div class="list-item">
            <strong>Related Policies / References</strong>
            <ul>${(result.relatedPolicies || []).map((item) => `<li>${escape(item)}</li>`).join("") || "<li>No related reference located.</li>"}</ul>
          </div>
          <div class="list-item">
            <strong>Related Questions</strong>
            <ul>${related.map((question) => `<li><strong>${escape(question.question_id)}</strong> ${escape(question.question_stem)}</li>`).join("") || "<li>No related questions located.</li>"}</ul>
          </div>
        </div>
        <div class="list-item">
          <strong>Lessons Learned</strong>
          <ul>${result.lessonsLearned.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
        </div>
        <div class="list-item">
          <strong>Recommended Study Plan</strong>
          <ul>${result.studyPlan.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
        </div>
        <div class="grid four">
          <div class="stat-card"><div class="label">Incident Mastery</div><div class="value">${result.profileAfter.mastery}%</div></div>
          <div class="stat-card"><div class="label">Readiness</div><div class="value">${result.profileAfter.readiness}%</div></div>
          <div class="stat-card"><div class="label">Confidence</div><div class="value">${result.profileAfter.confidence}%</div></div>
          <div class="stat-card"><div class="label">Retention</div><div class="value">${result.profileAfter.retention}%</div></div>
        </div>
        ${window.CMAChiefMentor ? window.CMAChiefMentor.renderIncidentDebrief(chiefDebrief) : ""}
      </section>
    `;
  }

  function startScenario(id = scenarioSelect.value) {
    current = SCENARIOS.find((scenario) => scenario.id === id) || SCENARIOS[0];
    step = 0;
    log = [];
    state = { risk: 0, resources: 0, accountability: 0, communications: 0, safety: 0 };
    startedAt = Date.now();
    renderScenarioIntro();
    renderPhase();
  }

  function populateScenarios() {
    const complexity = complexitySelect.value;
    const scenarios = SCENARIOS.filter((scenario) => !complexity || scenario.complexity === complexity);
    scenarioSelect.innerHTML = scenarios.map((scenario) => `<option value="${escape(scenario.id)}">${escape(scenario.type)} - ${escape(scenario.title)}</option>`).join("");
    if (!scenarios.some((scenario) => scenario.id === scenarioSelect.value)) scenarioSelect.value = scenarios[0]?.id || "";
  }

  try {
    const { questions } = await CMA.loadQuestions();
    allQuestions = questions;
    populateScenarios();
    updateStatus();
    renderHistory();
    startButton.addEventListener("click", () => startScenario());
    randomButton.addEventListener("click", () => {
      const available = SCENARIOS.filter((scenario) => !complexitySelect.value || scenario.complexity === complexitySelect.value);
      const scenario = available[Math.floor(Math.random() * available.length)] || SCENARIOS[0];
      scenarioSelect.value = scenario.id;
      startScenario(scenario.id);
    });
    complexitySelect.addEventListener("change", populateScenarios);
    printButton.addEventListener("click", () => window.print());
  } catch (error) {
    CMA.statusMessage(card, error.message);
  }
});
