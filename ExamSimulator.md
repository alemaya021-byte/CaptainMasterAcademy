# Captain Master Academy Version 2.1 Exam Simulator

## Purpose

Version 2.1 adds a dedicated MDFR Captain promotional exam simulator on top of the existing Version 2.0 adaptive learning platform. Version 1.0 remains frozen, Version 2.0 adaptive learning files are preserved, and `data/questions.json` is not modified.

## Simulator Rules

- Exam length: 125 questions for the official simulation mode.
- Timer: 3 hours for the 125-question Official Captain Simulation.
- Feedback: no correct answer, rationale, or source feedback is shown until final submission.
- Selection: answer choices are randomized per active exam session only.
- Persistence: the active exam auto-saves to browser storage and syncs through the existing Firebase sync engine when the user is signed in.
- Pause/resume: pausing stops the timer, preserves the active question, preserves elapsed active time, and allows the exam to resume later.
- Navigation: candidates can move Previous/Next, jump from the 1-125 navigator, and flag questions for review.
- Review screen: final submission routes through a review screen showing answered, unanswered, and flagged counts.

## Subject Weighting

The official simulation uses the existing built-in Captain blueprint distribution:

- Policies & Procedures
- SOPs
- Medical Operations Manual
- Collective Bargaining Agreement
- Administrative Orders

The simulator samples from the full current database, applies the existing blueprint sampler, and then orders the selected questions through a promotional-style difficulty progression.

## Difficulty Progression

The selected 125-question set is ordered into a realistic progression:

- Opening section favors Easy and Moderate questions.
- Middle section emphasizes Moderate questions.
- Late-middle section introduces more Hard questions.
- Final section favors Hard questions with Moderate fallback.

Questions remain randomized inside each difficulty band. Answer positions remain independently randomized and do not alter `questions.json`.

## Candidate Controls

- Select A-D answer choices.
- Flag/unflag questions.
- Previous and Next navigation.
- Question navigator with answered, flagged, and unanswered states.
- Pause and resume.
- Auto-save on answer selection, navigation, visibility change, and page unload.
- Final review before submission.
- Printable score report after completion.

## Adaptive Integration

Every submitted exam answer records:

- Correctness
- Response time
- Exam mode
- Last reviewed timestamp
- Missed-question status
- Adaptive mastery score
- Confidence score
- Retention score
- Recommended review timing

The simulator calls the existing adaptive engine after completion and queues Firebase synchronization through the existing sync engine.
