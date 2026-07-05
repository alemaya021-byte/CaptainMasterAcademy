# Cloud Sync Regression Test

Last local run: 2026-07-05T18:20:31.646Z

Question database checked: 7000 questions

Result: PASS

## Automated Coverage

This suite runs before GitHub Pages deployment through `.github/workflows/pages.yml`.

It validates:

- Email/Password sign-in
- Google sign-in provider mock
- Firestore connectivity
- Guest mode denial of cloud writes
- Local-to-cloud merge
- Cloud-to-local merge
- Timestamp conflict resolution
- Offline queue behavior
- Reconnect synchronization
- Bookmarks
- Missed questions
- Flashcards
- Exam history
- Readiness score calculation
- Cross-device synchronization
- Daily backup and restore
- Cross-user Firestore security
- `questions.json` remains unchanged

## Run Locally

```powershell
node tests/cloud-sync-regression.mjs
```

To refresh this report after a local run:

```powershell
node tests/cloud-sync-regression.mjs --write-report
```

## Latest Result

| Status | Test | Detail |
| --- | --- | --- |
| PASS | Email/Password sign-in |  |
| PASS | Google sign-in mock |  |
| PASS | Firestore connectivity |  |
| PASS | Guest mode |  |
| PASS | Local-to-cloud merge |  |
| PASS | Cloud-to-local merge |  |
| PASS | Conflict resolution |  |
| PASS | Offline queue |  |
| PASS | Reconnect synchronization |  |
| PASS | Bookmarks |  |
| PASS | Missed questions |  |
| PASS | Flashcards |  |
| PASS | Exam history |  |
| PASS | Readiness score |  |
| PASS | Cross-device synchronization |  |
| PASS | Backup and restore |  |
| PASS | Cross-user security |  |
| PASS | questions.json unchanged |  |
