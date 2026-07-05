# Captain Promotional Exam Analytics

## Score Outputs

After each completed exam, the simulator displays:

- Raw final score
- Raw percentage
- Pass/fail status against the simulator threshold
- Estimated promotional exam score
- Estimated probability of passing
- Estimated percentile
- Confidence score
- Estimated study hours required to reach 90% readiness

## Prediction Inputs

The prediction model uses:

- Current exam performance
- Existing adaptive readiness score
- Predicted written exam score from Version 2.0
- Adaptive confidence
- Completion rate
- Recent performance already stored in browser/Firebase progress

## Heat Maps

The final report includes heat maps for:

- Weakest books/source categories
- Weakest chapters/references
- Weakest policies/codes

Heat map bands:

- Strong: 82% and above
- Moderate: 70% to 81%
- Weak: below 70%

## Weakness Detection

The simulator calculates weakest areas from the completed exam attempt using:

- Total questions in each area
- Correct answers in each area
- Missed or unanswered questions
- Accuracy percentage

Weakest lists are sorted by lowest accuracy, then by higher question count.

## Recommended Study Plan

After submission, the simulator recommends targeted follow-up work based on:

- Weakest books
- Weakest chapters
- Weakest policies
- Missed questions from the exam
- Current readiness gap to 90%

The plan is local-first and sync-ready through the existing Firebase progress model.

## Firebase Synchronization

Exam attempts are stored in the existing `progress.exams` collection and exposed to Firebase through the current sync model as `examAttempts`. Per-question adaptive data is also written to the synced question progress documents.
