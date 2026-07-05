# Prediction Dashboard

## Purpose

The Prediction Dashboard explains the student's likely written exam outcome, what is driving the prediction, and which study actions most improve the score.

## Primary Outputs

### Overall Readiness Score

Show:

- Current readiness
- Category
- 7-day change
- 30-day change
- Confidence level

### Predicted Written Exam Score

Show:

- Predicted score
- Confidence interval
- Best recent simulator score
- Average recent simulator score
- Score trend

Suggested formula:

```text
predictedWrittenExamScore =
  simulatorAverage * 0.35
  + retentionWeightedMastery * 0.25
  + recentAccuracy * 0.15
  + hardQuestionAccuracy * 0.10
  + weakTopicFloor * 0.10
  + sourceCoverage * 0.05
```

When no simulator exists:

```text
predictedWrittenExamScore =
  adaptiveQuizAccuracy * 0.35
  + retentionWeightedMastery * 0.25
  + recentAccuracy * 0.15
  + hardQuestionAccuracy * 0.10
  + weakTopicFloor * 0.10
  + sourceCoverage * 0.05
  - lowConfidencePenalty
```

### Probability of Passing

Show:

- Probability percentage
- Risk category
- Main risk driver
- Next action to raise probability

Risk categories:

- Low probability: below `55`
- Developing probability: `55-71`
- Competitive probability: `72-84`
- High probability: `85-100`

### Estimated Rank

Use rank band unless reliable cohort data exists:

- Top tier
- Competitive
- Borderline
- At risk

Do not present this as an official promotional rank.

### Study Efficiency

Show:

- Readiness points per study hour
- Predicted score points per study hour
- Correct answers per hour
- Missed-question recoveries per hour

## Confidence Interval

Confidence interval should narrow when:

- More questions are answered.
- More books and policies are covered.
- Exam simulator attempts exist.
- Recent scores are stable.
- Confidence heat map improves.

Confidence interval should widen when:

- Attempt count is low.
- Many topics are unseen.
- Scores are volatile.
- Retention is decaying.
- Hard-question performance is weak.

Example:

```text
Predicted written exam score: 82
Confidence interval: 76-88
Probability of passing: 84 percent
Rank band: Competitive
```

## Readiness Trend

Store and render daily prediction snapshots:

```json
{
  "date": "YYYY-MM-DD",
  "readiness": 0,
  "predictedScore": 0,
  "passProbability": 0,
  "confidenceLow": 0,
  "confidenceHigh": 0,
  "studyEfficiency": 0
}
```

Trend labels:

- Improving
- Stable
- Declining
- Insufficient data

## Score Driver Breakdown

Show the top factors improving the prediction:

- High retention
- Strong exam simulator score
- Strong hard-question performance
- Improved weak topics
- Strong study consistency

Show the top factors hurting the prediction:

- Forgotten material
- Weakest books
- Weakest policies
- Low confidence topics
- Never-seen high-probability areas
- Poor recent hard-question accuracy

## Tomorrow Recommendation

After each session, the dashboard should generate:

- Exact topics to study tomorrow
- Question count
- Flashcard count
- Estimated minutes required
- Estimated score improvement

Example:

```text
Tomorrow:
- 18 CBA questions
- 12 High-Rise flashcards
- 10 Policy I-A-07 questions
- 5 recent misses

Estimated time: 48 minutes
Estimated score improvement: +1.2 to +2.6 points
```

## Prediction Calibration

After every 125-question exam:

1. Store prediction before the exam.
2. Store actual exam score.
3. Calculate prediction error.
4. Update rolling calibration error.
5. Adjust confidence interval width.
6. Identify whether the model overestimated or underestimated readiness.

## Data Boundaries

Use:

- Existing progress records
- Existing exam history
- Existing flashcard records
- Existing question metadata
- Derived adaptive profiles

Do not modify:

- `data/questions.json`
- Version 1.0 release tag
- Official source files

## Validation

The Prediction Dashboard is valid when:

- New users receive conservative low-confidence predictions.
- Experienced users receive calibrated predictions.
- All outputs are bounded from `0` to `100`.
- Confidence interval lower bound is not greater than upper bound.
- Estimated rank is shown as a band unless cohort data exists.
- Tomorrow recommendation is specific and actionable.
- `data/questions.json` remains unchanged.
