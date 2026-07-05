# Version 2.4 AI Chief Mentor

## Purpose

The AI Chief Mentor adds a senior-command review layer to Captain Master Academy without modifying `data/questions.json`. It reviews missed quiz answers, missed exam answers, and completed incident simulations using the existing question metadata, source references, rationales, answer explanations, and scenario decision logs.

The mentor is deterministic and runs locally in the browser. It does not call an external AI service.

## Review Coverage

For every incorrect quiz answer or missed exam item, the mentor provides:

- What happened
- Why it was incorrect
- Better decision
- Best decision
- Tactical considerations
- Safety considerations
- Leadership considerations
- Communication considerations
- Relevant department policy
- Relevant SOP or operational reference
- Related questions
- Similar historical mistakes
- Memory strategy

For every incident simulation, the mentor produces a Chief's Debrief with:

- Strengths
- Weaknesses
- Command presence
- Risk management
- Resource management
- Fireground communication
- Decision quality
- Recommendations
- Per-phase decision analysis

## Persistence

Chief Mentor reviews are stored in `progress.chiefMentor` and mirrored into the existing synced `reports` stream as `chief-mentor-review` reports. This preserves Firebase compatibility with the current cloud sync architecture and avoids requiring a new Firestore collection.

## Learning Updates

Each mentor review updates the local Chief Mentor profile:

- Mastery
- Confidence
- Retention
- Readiness
- Study plan

The mentor also updates the adaptive last-session summary so the dashboard and study coach can use the latest recommendations.

## Files

- `js/chiefMentor.js`
- `quiz.html`
- `exam.html`
- `incident.html`
- `js/quiz.js`
- `js/exam.js`
- `js/incident.js`
- `css/style.css`
- `service-worker.js`
