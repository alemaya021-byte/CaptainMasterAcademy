# Sync Engine

## File

`js/syncEngine.js`

## Capabilities Implemented

- Firebase initialization only when `js/firebase-config.js` is configured
- Email/Password authentication
- Google authentication
- Guest mode fallback
- Automatic session restore
- Local-first persistence through localStorage
- Manual Sync Now
- Automatic background sync
- Offline queue
- Retry queue
- Incremental sync using `updatedAtMs`
- Timestamp conflict resolution
- Local/cloud merge
- Sync indicator events
- Daily backups
- Restore latest backup
- Restore specific date
- Export progress
- Import progress

## Conflict Resolution

Question records, flashcards, reports, exams, missed questions, and needs-review records compare `updatedAtMs` or equivalent timestamps. The newest record wins. Bookmark records merge active records so study flags are not lost across devices.

## Read/Write Performance

- No question-bank documents are stored in Firestore.
- The app writes progress only after local changes.
- Background sync is debounced and interval-based.
- Incremental cloud reads query documents newer than the last sync timestamp.
- Analytics remain local/lazy unless progress has changed.

## Offline Behavior

When offline, localStorage remains fully active. Sync requests are queued and replayed when the browser returns online.
