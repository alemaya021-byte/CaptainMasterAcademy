# Adaptive Learning Engine

## Purpose

The adaptive learning engine converts raw answer history into actionable study intelligence. It does not modify `data/questions.json`; it reads question metadata and writes derived progress data.

## Inputs

The engine uses:

- Question ID
- Source category
- Book
- Chapter
- Policy
- SOG/SOP
- Topic
- Difficulty
- Answer correctness
- Response time
- Date answered
- Review mode
- Flashcard rating
- Exam simulator history
- Bookmark and needs-review status

## Derived Scores

### Mastery Score

Range: 0 to 100

Meaning: How well the user has demonstrated command of a question, topic, or source.

Inputs:

- Correct-answer rate
- Number of attempts
- Performance on hard questions
- Recent performance
- Missed-question recovery
- Exam-mode performance

Suggested starting formula:

```text
mastery =
  accuracy * 0.45
  + recent_accuracy * 0.20
  + hard_question_accuracy * 0.15
  + recovery_score * 0.10
  + exam_mode_score * 0.10
```

### Confidence Score

Range: 0 to 100

Meaning: How reliable the mastery estimate is.

Inputs:

- Number of attempts
- Number of days studied
- Distribution across sources
- Completed exam simulations
- Consistency of answer history

Suggested starting formula:

```text
confidence =
  attempt_depth * 0.30
  + source_coverage * 0.25
  + consistency * 0.20
  + exam_attempt_depth * 0.15
  + recent_activity * 0.10
```

### Retention Score

Range: 0 to 100

Meaning: Probability that the user still remembers the material today.

Inputs:

- Last correct answer date
- Last miss date
- Flashcard interval
- Spaced repetition rating
- Time since last review
- Historical volatility

Suggested decay model:

```text
retention = mastery * e^(-days_since_review / retention_half_life)
```

Half-life should grow after repeated correct answers and shrink after misses.

### Predicted Exam Readiness

Range: 0 to 100

Meaning: Overall estimate of promotional exam readiness.

Inputs:

- Overall mastery
- Retention-weighted mastery
- Weak-topic penalty
- Exam simulator average
- Recent trend
- Confidence score
- Study consistency

Suggested starting formula:

```text
readiness =
  retention_weighted_mastery * 0.30
  + exam_average * 0.25
  + recent_accuracy * 0.15
  + hard_question_accuracy * 0.10
  + weak_topic_floor * 0.10
  + consistency * 0.05
  + confidence * 0.05
```

## Topic Classification

Each question should be projected into derived topic keys:

- `book`
- `chapter`
- `policy`
- `sog`
- `sop`
- `sourceCategory`
- `difficulty`
- `topic`
- `subtopic`
- `tags`

When a field is missing, the engine should infer from existing metadata without changing the source question record.

## Answer Update Flow

On every answer:

1. Record the answer event.
2. Update question-level attempt history.
3. Update missed-question mastery status.
4. Update topic-level stats.
5. Recalculate mastery score.
6. Recalculate confidence score.
7. Recalculate retention score.
8. Recalculate readiness estimate.
9. Refresh strongest and weakest topics.
10. Refresh recommended next study session.
11. Queue cloud sync if signed in.

## Forgotten Material Detection

A question or topic becomes forgotten when:

- Retention score falls below threshold.
- Time since last correct answer exceeds expected interval.
- Recent misses appear after prior mastery.
- Flashcard is overdue.
- Topic trend is declining.

Default thresholds:

- Forgotten question: retention below 55
- At-risk question: retention between 55 and 70
- Mastered question: mastery at least 85 and retention at least 75

## Recommended Next Session

The engine should produce a balanced recommendation:

- 40 percent weak topics
- 25 percent forgotten material
- 15 percent recent misses
- 10 percent unseen questions
- 10 percent maintenance review

Weights may shift when an exam date is near or when a source is critically weak.

## Storage Model

Derived intelligence should live under progress, not in `questions.json`:

```json
{
  "adaptive": {
    "version": 1,
    "lastComputedAt": "",
    "questions": {},
    "topics": {},
    "readiness": {},
    "recommendations": {},
    "plans": {},
    "achievements": {}
  }
}
```

## Firebase Sync

Adaptive data should sync as user progress:

- Preserve guest mode in localStorage.
- Sync signed-in user progress to Firestore.
- Use timestamp conflict resolution.
- Merge topic stats by newest computation timestamp.
- Never require cloud sync to study.

## Validation

The engine is valid when:

- Existing Version 1.0 progress can be read.
- Missing adaptive fields are computed safely.
- Each answer updates adaptive scores.
- Scores remain within 0 to 100.
- Recommendations are deterministic enough to test.
- `questions.json` remains unchanged.
