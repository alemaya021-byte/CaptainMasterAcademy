# Scenario Engine

## Files

- `incident.html`
- `js/incident.js`
- `css/style.css`
- `js/app.js`

## Engine Design

The scenario engine is deterministic. It does not call an external AI service and does not generate new question-bank content.

Each scenario has:

- ID
- Type
- Complexity
- Dispatch narrative
- Initial conditions
- Scenario target
- Water-supply consideration
- Ventilation consideration
- Exposure consideration
- Resource-request consideration
- Reference search terms

## Scenario Phases

Each scenario runs through six command phases:

1. Initial size-up, radio report, and command mode
2. Tactical priorities, resources, accountability, and RIT
3. Search, fire attack, and water supply
4. Ventilation, exposure protection, and safety
5. Mayday management
6. Demobilization and transfer/closeout

## Scoring Model

Each decision scores four domains:

- Tactical
- Safety
- Communications
- Leadership

The overall command score is the average of those four domain scores.

## Branch State

Each decision can modify command state:

- Risk
- Resources
- Accountability
- Communications
- Safety

The Mayday phase uses accumulated risk to branch the inject context.

## Reference Matching

The engine uses the current question database to locate reference anchors and related items by searching:

- Source category
- Source reference
- Tags
- Keywords
- Question stem
- Topic/subtopic
- Primary area

The result is displayed as department reference anchors, related questions, and related policies/SOP references.

## Persistence

On completion, `CMA.setIncidentResult()` stores:

- Local incident history
- Synced `incident-scenario` report
- Daily progress
- Incident profile
- Adaptive last-session summary

The existing Firebase sync engine uploads the mirrored report through the current `reports` collection.
