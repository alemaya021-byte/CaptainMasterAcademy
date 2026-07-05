# Weekly Report Engine

Version 2.5 adds an automatic weekly report to the Promotion Dashboard.

## Schedule

The app generates a weekly report every Sunday from local progress data. The current week is calculated Sunday through Saturday.

## Report Fields

Each weekly report includes:

- Questions completed
- Hours studied
- Accuracy
- Readiness improvement
- Weakest areas
- Strongest areas
- Study consistency
- Recommended plan for the next week

## Storage

Weekly reports are saved under:

`progress.tracking.weeklyReports[weekOf]`

The report is also visible immediately on `tracking.html` even before the Sunday persistence event.

## Recommendation Logic

The weekly plan uses:

- Weak topic detection
- Due and overdue flashcard counts
- Current readiness category
- Practice exam status
- Existing adaptive recommendations

The recommendations stay local-first and synchronize through Firebase when the user is signed in.
