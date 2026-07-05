# Captain Master Academy v1.0.0 Stable Release

Release date: 2026-07-05

Public app: https://alemaya021-byte.github.io/CaptainMasterAcademy/

Repository: https://github.com/alemaya021-byte/CaptainMasterAcademy

Tag: `v1.0.0`

## Summary

Captain Master Academy v1.0.0 is the first stable production checkpoint for the deployed, cloud-synced, mobile-ready promotional exam study platform.

This release preserves the current deployed database exactly as-is. No questions were generated, removed, renumbered, or modified for this release checkpoint.

## Database

- Current database size: 7,000 questions
- Data source used by the app: `data/questions.json`
- Database integrity: unchanged during release validation
- Local SHA-256: `fd501a957200cc7c263d301b0ba2c84d278aed92ddccff36b4eaa919f455d775`

## Included App Capabilities

- Professional dashboard
- Practice quiz mode
- 125-question promotional exam simulator
- Adaptive study mode
- Question review panel
- Missed-question mastery tracking
- Bookmark and needs-review drills
- Spaced repetition flashcards
- Search and filters across all 7,000 questions
- Analytics by source, chapter, topic, and performance trend
- Readiness score
- Study coach recommendations
- Printable reports
- Local issue reporting with export
- Mobile/tablet responsive layout
- Progressive Web App support
- Offline local progress
- Firebase Authentication
- Firestore cloud synchronization
- Backup and restore
- Guest mode

## Firebase and Cloud Sync Status

Validated:

- Firebase Web configuration loads from GitHub Pages.
- Firebase initializes in the deployed app.
- Email/Password authentication works.
- Google sign-in provider flow is configured and validated through the automated provider mock.
- Firestore connectivity works.
- Firestore security rules block cross-user reads.
- Local-to-cloud merge works.
- Cloud-to-local merge works.
- Timestamp conflict resolution works.
- Offline queue and reconnect synchronization work.
- Cross-device synchronization works.
- Daily backup and restore work.
- Guest mode remains local-only.

## GitHub Pages

Deployment target:

```text
https://alemaya021-byte.github.io/CaptainMasterAcademy/
```

The GitHub Actions Pages workflow runs the cloud synchronization regression suite before deployment.

## Validation Result

Release validation result: PASS

Checks completed:

- GitHub Pages app loads.
- Live Firebase config returns HTTP 200.
- Live Firebase config contains no private key, service account, admin SDK, or server credential markers.
- Live deployed question database contains exactly 7,000 questions.
- Automated cloud sync regression suite passed.
- Local `questions.json` remains unchanged.

## Known Limitations

- Automated Google validation confirms provider configuration and sign-in flow availability; final credential entry requires an interactive Google account session.
- Guest mode does not sync to Firestore by design.
- Web client delete operations are blocked by Firestore rules.
- Cloud sync depends on Firebase service availability and browser network access.

## Restore Instructions

Restore the stable release locally:

```powershell
git fetch origin --tags
git checkout v1.0.0
```

Rollback production `main` to Version 1.0.0:

```powershell
git checkout main
git reset --hard v1.0.0
git push origin main --force-with-lease
```

Use rollback only when intentionally restoring the public GitHub Pages app to this release checkpoint.
