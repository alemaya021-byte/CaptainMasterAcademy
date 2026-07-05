# Device Sync Validation

## Local Validation Scope

- `questions.json` was not modified by Phase 7.
- Current authoritative database count: 7000 questions.
- Guest mode remains localStorage-based.
- Cloud sync initializes only when Firebase config is present.
- Account page, sync controls, backup controls, restore controls, export/import controls, and sync indicator are present.

## Device Matrix To Run After Firebase Configuration

| Scenario | Expected Result |
| --- | --- |
| Laptop sign-in | Existing local progress merges into `users/{uid}`. |
| Desktop sign-in | Cloud progress downloads and merges with local progress. |
| Android phone | Same account restores bookmarks, missed questions, flashcards, exams, and analytics. |
| Android tablet | Background sync keeps progress aligned after quiz/exam work. |
| iPhone Safari | Session restores and local-first study continues offline. |
| iPad Safari | Offline changes queue and upload after reconnect. |
| Simultaneous devices | Newer timestamps win per record; bookmark records merge active flags. |
| Daily backup | `dailyBackups/YYYY-MM-DD` is written. |
| Restore latest | Local progress is replaced by latest backup and queued for upload. |
| Restore date | Selected backup restores if present. |

## Not Fully Executed In This Workspace

Real Firebase authentication and Firestore writes require a configured Firebase project, enabled Email/Password and Google providers, and deployed Firestore rules. Without project credentials, Phase 7 runs in guest mode by design.
