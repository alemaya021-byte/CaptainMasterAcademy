# Exam Prediction Engine

## Purpose

The Exam Prediction Engine estimates likely promotional exam performance from actual study behavior. It should make readiness measurable while clearly showing uncertainty.

## Outputs

The engine estimates:

- Final exam score
- Passing probability
- Confidence interval
- Readiness trend
- Estimated study hours remaining
- Most important score-improvement targets

## Inputs

The model uses:

- Overall accuracy
- Recent accuracy
- Hard-question accuracy
- Weak-topic scores
- Retention scores
- Exam simulator scores
- Missed-question recovery
- Study consistency
- Response time
- Source coverage
- Never-seen high-value topics

## Predicted Exam Score

Suggested starting formula:

```text
predicted_score =
  exam_simulator_average * 0.30
  + retention_weighted_mastery * 0.25
  + recent_accuracy * 0.15
  + hard_question_accuracy * 0.10
  + weak_topic_floor * 0.10
  + source_coverage * 0.05
  + consistency * 0.05
```

If the user has not completed a 125-question exam, substitute adaptive quiz accuracy with a penalty for low confidence.

## Passing Probability

The model should produce a probability from 0 to 100 percent.

Suggested approach:

```text
pass_probability = logistic(
  predicted_score
  - pass_threshold
  + confidence_adjustment
  - weak_area_penalty
)
```

The initial pass threshold should be configurable because official promotional exam scoring rules may vary.

## Confidence Interval

Confidence interval width should shrink when:

- The user completes more questions.
- The user completes full exam simulations.
- Source coverage improves.
- Recent results are consistent.

Confidence interval width should grow when:

- Attempt count is low.
- Study history is old.
- Source coverage is uneven.
- Recent performance is volatile.
- Many high-probability topics are unseen.

Example:

```text
Predicted score: 82 percent
Confidence interval: 76 to 88 percent
Pass probability: 84 percent
```

## Readiness Trend

Track trend over:

- 7 days
- 30 days
- 90 days

Trend labels:

- Improving
- Stable
- Declining
- Insufficient data

Trend should use rolling readiness, not just daily question volume.

## Study Hours Remaining

Estimated study hours should consider:

- Gap to readiness target
- Weak-topic count
- Forgotten-material count
- Flashcard backlog
- Question pace
- Accuracy trend

Suggested categories:

- Exam ready: maintenance plan
- Near ready: 10 to 20 focused hours
- Developing: 25 to 45 focused hours
- Not ready: 50 or more focused hours

## Calibration Loop

After each 125-question exam simulator:

1. Compare predicted score to actual exam score.
2. Store prediction error.
3. Update rolling calibration error.
4. Adjust confidence interval width.
5. Re-rank weakest high-impact topics.

The first Version 2.0 implementation should use transparent formulas before adding any opaque model.

## Score Improvement Targets

The engine should identify the best next areas to raise predicted score:

- High blueprint weight
- Low mastery
- Low retention
- High miss rate
- High exam probability
- Large number of unseen questions

Each target should include:

- Topic/source
- Current score
- Expected gain
- Recommended activity
- Confidence level

## Known Boundaries

- Prediction is a study estimate, not a guarantee.
- Official exam content and scoring can vary.
- The model depends on representative study behavior.
- Low attempt counts should show low confidence.

## Validation

The prediction engine is valid when:

- Outputs are bounded between 0 and 100.
- Confidence intervals are ordered and realistic.
- Predictions update after quiz and exam activity.
- Predictions become more confident with more data.
- The model handles users with no exam attempts.
- The model handles guest and signed-in modes.
- `questions.json` remains unchanged.
