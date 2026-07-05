# Version 2.1 Exam Simulator Validation

## Scope

Validation covers the Captain Promotional Exam Simulator implementation and confirms `data/questions.json` remains unchanged.

## Required Checks

- App loads.
- 7,000 questions load.
- 125-question simulator starts.
- Official simulation timer starts at 3:00:00.
- Answer positions randomize without changing source data.
- Question flagging works.
- Question navigator works.
- Pause and resume work.
- Auto-save writes an active exam.
- Review screen appears before final submission.
- Final score is generated.
- Pass/fail prediction is generated.
- Detailed analytics are generated.
- Heat maps are generated.
- Confidence score is generated.
- Mastery and retention update through the adaptive engine.
- Firebase sync queue is triggered through the existing sync engine.
- Printable score report is available.

## Validation Results

Date: 2026-07-05

Question database:

- `data/questions.json` count: 7,000 questions.
- SHA-256 before/after implementation: `FD501A957200CC7C263D301B0BA2C84D278AED92DDCCFF36B4EAA919F455D775`.
- Result: unchanged.

Static checks:

- `js/exam.js` syntax check: pass.
- `service-worker.js` syntax check: pass.

Browser validation:

- App loaded from a local web server: pass.
- Correct script set loaded: `firebase-config.js`, `storage.js`, `adaptiveEngine.js`, `sync.js`, `syncEngine.js`, `app.js`, and `exam.js`.
- 125-question simulator starts: pass.
- Official simulation timer starts at `3:00:00`: pass.
- Subject weighting displayed: pass.
- 125-button navigator renders: pass.
- A-D answer selection works: pass.
- Flagging works: pass.
- Next/previous flow works: pass.
- Pause screen appears and stops the timer: pass.
- Resume returns to the active exam: pass.
- Auto-save/reload resume panel appears with saved answered count: pass.
- Review screen appears before final submission: pass.
- Final score report appears: pass.
- Pass/fail prediction appears: pass.
- Estimated promotional exam score appears: pass.
- Estimated percentile appears: pass.
- Confidence score appears: pass.
- Weakest books, chapters, and policies appear: pass.
- Heat maps render: pass.
- Missed-question review renders references, correct answer, selected answer, rationale, and review actions: pass.
- Printable report button appears: pass.
- Mobile viewport check has no horizontal overflow: pass.
- Mobile answer buttons, toolbar controls, and navigator touch targets render at usable sizes: pass.

Randomized answer validation:

- Verified a shuffled question whose displayed choices mapped to original labels in non-source order.
- Selected the source-correct original label after shuffle.
- Final score credited the answer correctly.
- Result: randomized answer positions preserve correct-answer mapping.

Cloud/Firebase validation:

- Existing cloud-sync regression suite: pass.
- Email/Password sign-in: pass.
- Google sign-in mock: pass.
- Firestore connectivity: pass.
- Guest mode: pass.
- Local-to-cloud merge: pass.
- Cloud-to-local merge: pass.
- Conflict resolution: pass.
- Offline queue and reconnect sync: pass.
- Bookmarks, missed questions, flashcards, exam history, readiness score: pass.
- Cross-device synchronization model: pass.
- Backup and restore: pass.
- Cross-user security check: pass.

Notes:

- Browser validation used a local static server because direct `file://` launch would block `fetch()`.
- A previous local service-worker cache on an older port served stale assets during initial validation; the service-worker cache name was bumped and the final pass used a fresh local server origin.
