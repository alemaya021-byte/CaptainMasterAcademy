# Captain Command Performance Center

## Purpose

The Captain Command Performance Center is a unified executive dashboard for Captain Master Academy. It combines quiz, exam, AI Tutor, AI Chief Mentor, incident simulator, flashcard, daily study, and Firebase-synced history into one readiness view.

The feature does not modify `data/questions.json`.

## Dashboard Inputs

The center reads from the existing browser/Firebase-synced progress model:

- Quiz answer history in `progress.answers`
- Exam attempts in `progress.exams`
- AI Tutor and AI Chief Mentor reports in `progress.reports`
- Incident simulator attempts in `progress.incidents` and synced incident reports
- Flashcard reviews in `progress.flashcards`
- Study sessions and daily totals in `progress.daily`
- Adaptive mastery profiles in `progress.adaptive`
- Firebase sync status from `CMASyncEngine.state`

## Displayed Metrics

The dashboard displays:

- Overall Captain Readiness Score
- Predicted written exam score
- Estimated probability of passing
- Readiness trend for 7, 30, and 90 days
- Daily study streak
- Weekly study hours
- Total questions answered
- Total incident simulations completed
- Total flashcards reviewed
- Average confidence
- Average mastery
- Average retention
- Firebase/cloud history status

## Files

- `performance.html`
- `js/performanceCenter.js`
- `css/style.css`
- `js/app.js`
- `service-worker.js`
