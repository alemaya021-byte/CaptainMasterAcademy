# Captain Master Academy Version 2.3 Incident Simulator

## Purpose

Version 2.3 adds an interactive Captain incident command simulator for promotional preparation. The simulator does not modify `data/questions.json`; it uses the existing question bank only for reference anchors, related questions, and related policy/SOP links.

## Scenario Types

The simulator includes seven scenario families:

- Residential
- High-rise
- Commercial
- Warehouse
- Hazmat
- Technical rescue
- Multi-company response

## Required Command Decisions

Each scenario requires decisions covering:

- Initial size-up
- Radio reports
- Command mode
- Tactical priorities
- Resource requests
- Accountability
- RIT
- Search
- Fire attack
- Ventilation
- Water supply
- Exposure protection
- Safety
- Mayday management
- Demobilization

## Branching Logic

Scenario choices adjust the command state. Poor early command, accountability, safety, or communications decisions increase risk and change the Mayday inject context. Strong decisions reduce risk and improve the incident profile.

## Debrief Outputs

After completion, the simulator provides:

- Overall command score
- Tactical score
- Safety score
- Communications score
- Leadership score
- Correct decision
- Better decision
- Department reference anchor
- Related questions
- Related policies and SOP references
- Lessons learned
- Recommended study plan

## Progress Updates

Completed scenarios update:

- Incident mastery
- Incident readiness
- Incident confidence
- Incident retention
- Daily study minutes
- Adaptive last-session summary
- Recommended study plan

## Cloud Sync

Incident attempts are saved locally in `progress.incidents` and mirrored into the existing synced `reports` stream as `incident-scenario` reports. This keeps Firebase compatibility with the current production security rules and avoids requiring a new Firestore collection.
