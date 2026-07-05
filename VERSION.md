# Captain Master Academy Version

## Stable Release

Version: 1.0.0

Release date: 2026-07-05

Release type: Stable GitHub Pages production checkpoint

GitHub Pages URL: https://alemaya021-byte.github.io/CaptainMasterAcademy/

Repository: https://github.com/alemaya021-byte/CaptainMasterAcademy

Release tag: v1.0.0

## Database

Current deployed question count: 7,000

Question database path: `data/questions.json`

Database status: Preserved unchanged for this release checkpoint.

## Cloud Sync

Firebase status: Enabled with public Firebase Web configuration.

Authentication:

- Email/Password sign-in validated.
- Google sign-in provider flow validated by automated mock/provider check.
- Guest mode validated and remains local-only.

Firestore sync status:

- Firestore connectivity validated.
- Local-to-cloud merge validated.
- Cloud-to-local merge validated.
- Timestamp conflict resolution validated.
- Offline queue and reconnect synchronization validated.
- Cross-device synchronization validated.
- Backup and restore validated.
- Cross-user security rules validated.

## Current Features

- Dashboard with readiness and study overview.
- Practice quiz mode.
- 125-question promotional exam simulator.
- Adaptive study mode.
- Missed-question review.
- Bookmarked-question review.
- Needs-review workflow.
- Spaced repetition flashcards.
- Search and filtering across the full question bank.
- Analytics by source, chapter, topic, and performance history.
- Readiness score and study coach recommendations.
- Local issue reporting and export.
- Mobile-responsive Progressive Web App.
- Offline-first local progress.
- Firebase cloud synchronization for signed-in users.
- Guest mode for local-only study.

## Validation Summary

- GitHub Pages app loads: PASS
- Firebase Web config loads from GitHub Pages: PASS
- Firebase initializes: PASS
- Email/Password login: PASS
- Google provider flow: PASS
- Firestore sync: PASS
- Guest mode: PASS
- Cloud sync regression suite: PASS
- `questions.json` deployed count: 7,000
- `questions.json` local hash: `fd501a957200cc7c263d301b0ba2c84d278aed92ddccff36b4eaa919f455d775`

## Known Limitations

- Google sign-in full credential completion requires an interactive Google account session; automated validation verifies the configured Google provider flow.
- Guest mode is intentionally local-only and does not write to Firestore.
- Cloud sync uses client-side Firebase Web SDK configuration and Firestore security rules; no server-side admin SDK is included.
- Firestore web client deletes are intentionally denied by production security rules to reduce accidental data loss.

## Restore This Version

To restore the stable Version 1.0 release:

```powershell
git fetch origin --tags
git checkout v1.0.0
```

To return the main branch to this checkpoint:

```powershell
git checkout main
git reset --hard v1.0.0
git push origin main --force-with-lease
```

Only use the reset command when intentionally rolling production back to Version 1.0.0.
