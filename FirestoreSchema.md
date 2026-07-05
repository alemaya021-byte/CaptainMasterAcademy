# Firestore Schema

## Root

`users/{uid}`

Fields:

- `profile`
- `preferences`
- `devices`
- `analytics`
- `updatedAt`
- `updatedAtMs`

## Subcollections

`users/{uid}/progress/summary`

Stores progress totals, accuracy, bookmarks count, needs-review count, missed-question count, flashcard count, exam-attempt count, and update timestamps.

`users/{uid}/questions/{questionId}`

Stores attempts, correct/incorrect counts, last answer, source, chapter, difficulty, mode, response time, and recent history.

`users/{uid}/bookmarks/{questionId}`

Stores active bookmark state and timestamps.

`users/{uid}/needsReview/{questionId}`

Stores needs-review state and timestamps.

`users/{uid}/missedQuestions/{questionId}`

Stores missed-question mastery state, correct streak, miss count, and timestamps.

`users/{uid}/flashcards/{questionId}`

Stores spaced repetition rating, interval, ease, due date, review count, and timestamps.

`users/{uid}/examAttempts/{attemptId}`

Stores exam score, percent, missed IDs, flagged IDs, submission status, and timestamps.

`users/{uid}/studySessions/{sessionId}`

Stores daily reviewed-question IDs and reviewed count.

`users/{uid}/reports/{reportId}`

Stores user-reported question issues.

`users/{uid}/dailyBackups/{YYYY-MM-DD}`

Stores a daily progress snapshot plus summary and device metadata.

## Performance Notes

- The question bank is not duplicated in Firestore.
- Sync queries use `updatedAtMs` for incremental reads.
- Single-field indexes are automatic in Firestore.
- Future compound analytics queries should add explicit composite indexes.
