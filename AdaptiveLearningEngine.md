# Version 2.0 Phase 1: Adaptive Learning Engine

Branch: `version-2-adaptive-study-coach`

Version 1.0 status: Frozen on `main` and tag `v1.0.0`

Question database rule: Do not modify `data/questions.json`

## Objective

Every answered question continuously updates the student's mastery profile. The engine must convert ordinary quiz, exam, missed-question, bookmark, and flashcard activity into a living model of readiness, retention, confidence, topic strength, topic weakness, and next-best study action.

All calculations are derived from progress data and question metadata. The source question database remains immutable.

## Per-Question Adaptive Profile

Each question should have a derived adaptive record keyed by question ID:

```json
{
  "questionId": "CMA-P1-0001",
  "attempts": 0,
  "correct": 0,
  "incorrect": 0,
  "correctPercent": 0,
  "confidence": 0,
  "difficulty": "Moderate",
  "difficultyScore": 5,
  "retention": 0,
  "mastery": 0,
  "lastSeenAt": "",
  "lastCorrectAt": "",
  "lastMissedAt": "",
  "reviewIntervalDays": 1,
  "expectedForgettingAt": "",
  "status": "never seen",
  "updatedAt": ""
}
```

## Per-Question Metrics

### Correct Percent

```text
correctPercent = correct / attempts * 100
```

If attempts are zero, the value is `0` and the question status is `never seen`.

### Confidence

Confidence estimates how trustworthy the question-level score is.

```text
attemptDepth = min(100, attempts / 4 * 100)
recencySignal = lastSeenWithin14Days ? 100 : max(0, 100 - daysSinceSeen * 4)
consistencySignal = 100 - abs(recentCorrectPercent - lifetimeCorrectPercent)

confidence =
  attemptDepth * 0.45
  + recencySignal * 0.25
  + consistencySignal * 0.20
  + examModeBonus * 0.10
```

Exam mode bonus is `100` when the question was answered in a timed exam or simulator, otherwise `0`.

### Difficulty

The engine should preserve the source difficulty label and derive a numeric score:

- Easy: 3
- Moderate: 6
- Hard: 9
- Unknown: 5

Difficulty affects mastery because a correct answer on a hard question should carry more weight than a correct answer on an easy question.

### Retention

Retention estimates whether the student still remembers the material today.

```text
daysSinceReview = days_between(now, lastSeenAt)
halfLife = reviewIntervalDays * 1.6
retention = mastery * e^(-daysSinceReview / halfLife)
```

Retention should be clamped from `0` to `100`.

### Mastery

Mastery estimates durable command of the item.

```text
mastery =
  correctPercent * 0.40
  + recentCorrectSignal * 0.20
  + difficultyAdjustedCorrectSignal * 0.15
  + missedRecoverySignal * 0.15
  + retention * 0.10
```

Missed recovery signal should improve only after the student answers the item correctly after a miss.

### Last Seen

`lastSeenAt` updates on every answer, flashcard rating, review panel completion, or AI review exposure.

### Review Interval

Review interval should expand when the user answers correctly and shrink when the user misses:

```text
if incorrect:
  reviewIntervalDays = 1
if correct and confidence < 50:
  reviewIntervalDays = 2
if correct and confidence between 50 and 75:
  reviewIntervalDays = 4
if correct and confidence >= 75:
  reviewIntervalDays = min(30, previousInterval * 1.8)
```

### Expected Forgetting Date

```text
expectedForgettingAt = lastSeenAt + reviewIntervalDays
```

The question is considered forgotten when today is past `expectedForgettingAt` and retention is below `65`.

## Overall Readiness Outputs

### Overall Readiness Score

```text
overallReadiness =
  retentionWeightedMastery * 0.30
  + topicCoverage * 0.15
  + recentAccuracy * 0.15
  + hardQuestionAccuracy * 0.10
  + examSimulatorAverage * 0.15
  + weakTopicFloor * 0.10
  + studyConsistency * 0.05
```

### Predicted Written Exam Score

```text
predictedWrittenExamScore =
  examSimulatorAverage * 0.35
  + readinessScore * 0.30
  + recentAccuracy * 0.15
  + retentionWeightedMastery * 0.10
  + hardQuestionAccuracy * 0.10
```

When no 125-question exam exists, replace `examSimulatorAverage` with adaptive quiz accuracy and apply a low-confidence penalty.

### Probability of Passing

```text
probabilityOfPassing = logistic(predictedWrittenExamScore - passingThreshold - riskPenalty)
```

Default passing threshold should be configurable. Initial default: `70`.

### Estimated Rank

Estimated rank is a relative readiness indicator, not an official promotional list prediction.

```text
estimatedRankBand =
  top tier: readiness >= 90 and confidence >= 80
  competitive: readiness >= 82
  borderline: readiness >= 72
  at risk: readiness < 72
```

If cohort data is unavailable, show rank band instead of a numeric rank.

### Study Efficiency

```text
studyEfficiency =
  scoreGainLast7Days / max(1, studyMinutesLast7Days / 60)
```

Show as predicted readiness points gained per study hour.

## Automatic Detection

### Strongest Books

Books with:

- Mastery at least `85`
- Retention at least `75`
- Confidence at least `70`
- At least 20 attempted questions or 30 percent of book coverage

### Weakest Books

Books with:

- Mastery below `70`
- Retention below `65`
- High miss rate
- Low hard-question accuracy
- Large unseen count

### Strongest Policies

Policies with high mastery, high retention, repeated correct answers, and no recent misses.

### Weakest Policies

Policies with low accuracy, recent misses, low confidence, or missing coverage.

### Most Forgotten Material

Questions and topics where:

- Expected forgetting date has passed
- Retention below `65`
- Prior mastery above `70`
- Last seen more than review interval ago

### Topics Requiring Immediate Review

Immediate review is required when:

- Retention below `55`
- Recent miss in the last 7 days
- Hard question mastery below `60`
- High exam probability topic has low coverage
- Flashcards are overdue

## Completed Study Session Summary

Every completed session should produce:

```json
{
  "sessionId": "",
  "completedAt": "",
  "whatImprovedToday": [],
  "whatGotWorse": [],
  "studyTomorrow": [],
  "estimatedMinutesRequired": 0,
  "estimatedScoreImprovement": 0
}
```

### What Improved Today

Detect topics where mastery, retention, or confidence increased by at least 3 points.

### What Got Worse

Detect topics where:

- Retention decayed below threshold
- New misses occurred
- Accuracy dropped
- Hard-question performance declined

### Exactly What To Study Tomorrow

Prioritize:

1. Forgotten high-probability questions
2. Recent misses
3. Weakest policies and books
4. Due flashcards
5. Never-seen high-value topics

### Estimated Minutes Required

```text
minutes =
  targetQuestions * averageSecondsPerQuestion / 60
  + targetFlashcards * 0.5
  + readingReviewMinutes
```

### Estimated Score Improvement

```text
estimatedScoreImprovement =
  weightedRiskReduction * confidenceFactor
```

Display as a range, such as `+1.5 to +3.0 readiness points`.

## Storage Contract

Adaptive data should live under progress:

```json
{
  "adaptive": {
    "version": 1,
    "questions": {},
    "books": {},
    "policies": {},
    "topics": {},
    "readiness": {},
    "predictions": {},
    "sessions": [],
    "updatedAt": ""
  }
}
```

## Validation

The Phase 1 engine is ready for implementation when:

- Each answer can update the per-question profile.
- All computed percentages are clamped from `0` to `100`.
- Never-seen questions remain identifiable.
- Forgotten questions are detected from dates and retention.
- Strongest and weakest books/policies can be derived.
- Session summaries produce specific next-day actions.
- `data/questions.json` remains unchanged.
