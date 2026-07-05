# Study Tracking

Version 2.5 adds automatic study tracking around the existing Captain Master Academy workflows without modifying the question database.

## Tracked Activity

The application now records the following activity in the existing progress store:

- Study start date
- First study timestamp
- Last study activity timestamp
- User-configurable promotional exam date
- Total study seconds and derived study hours
- Active study days
- Consecutive and longest study streaks
- Total question attempts, correct answers, incorrect answers, and overall accuracy
- Questions answered today, this week, and this month
- Quiz, adaptive study, exam, flashcard, AI Tutor, and incident activity counters
- Practice exam attempts, average score, and highest score
- Incident simulator completions and command scores
- Flashcards reviewed through spaced repetition
- AI Tutor sessions triggered by incorrect answers
- Mastered policies, books, chapters, and topics
- Weak topics and forgotten material remaining

## Data Model

Study tracking is stored under `progress.tracking`:

```json
{
  "studyStartDate": "",
  "promotionalExamDate": "",
  "firstStudyAt": "",
  "lastActivityAt": "",
  "totalStudySeconds": 0,
  "milestones": {},
  "weeklyReports": {},
  "dailyMissions": {},
  "updatedAt": "",
  "updatedAtMs": 0
}
```

Daily activity remains in `progress.daily[YYYY-MM-DD]` so the existing Firebase `studySessions` synchronization path can continue merging device progress.

## Activity Hooks

The tracker updates automatically when a student:

- Answers quiz or adaptive study questions
- Submits a practice exam
- Reviews flashcards
- Completes an incident simulator scenario
- Triggers an AI Tutor learning event after an incorrect answer
- Saves a promotional exam date

Existing quiz, exam, flashcard, tutor, incident, and Firebase flows remain intact.

## Question Bank Protection

No changes were made to `data/questions.json`. The current database remains the source of truth for all study, exam, flashcard, search, and analytics workflows.
