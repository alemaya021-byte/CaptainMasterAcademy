# Chief Debrief Engine

## Incident Debrief Flow

When an incident simulation is completed, `js/incident.js` calls `CMA.setIncidentResult()` first so the existing incident mastery, readiness, confidence, retention, daily progress, and synced incident report are preserved.

After that, `CMAChiefMentor.recordIncidentDebrief()` builds the Chief's Debrief from:

- Scenario type
- Scenario title
- Overall command score
- Tactical score
- Safety score
- Communications score
- Leadership score
- Decision log
- Department references
- Related policies and SOP references
- Related question matches
- Recommended study plan

## Scoring Interpretation

The Chief Debrief interprets scores by command domain:

- Tactical score drives tactical sequencing feedback.
- Safety score drives risk-management and accountability feedback.
- Communications score drives radio, benchmark, and progress-report feedback.
- Leadership score drives command presence and control-of-resources feedback.

Scores below 80 percent are treated as weak areas requiring focused review. Scores at or above 80 percent are treated as strengths unless another domain shows a related risk.

## Output Sections

Every completed scenario displays:

- Chief's Debrief
- Strengths
- Weaknesses
- Command presence
- Risk management
- Resource management
- Fireground communication
- Decision quality
- Recommendations
- Decision Analysis for each command phase

## Sync Behavior

Chief debriefs are saved locally and mirrored to the existing `reports` sync stream as `chief-mentor-review` records. The synced record includes the full debrief object, timestamp, source, and summary note.

## Offline Behavior

Because the engine uses localStorage through the existing app persistence layer, mentor reviews work offline and upload during the next successful sync.
