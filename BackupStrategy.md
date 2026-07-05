# Backup Strategy

## Daily Backup Path

`users/{uid}/dailyBackups/{YYYY-MM-DD}`

## Backup Contents

- full local progress snapshot
- computed summary
- device ID
- backup creation timestamp
- `updatedAtMs`

## Restore

The Account page supports:

- Restore Latest
- Restore Specific Date
- Export Progress
- Import Progress

Restores write back to localStorage first, then queue a cloud sync so the restored state propagates to other signed-in devices.

## Retention

No automatic deletion is performed in Phase 7. A future retention policy can keep the latest 90 daily backups or archive older snapshots.
