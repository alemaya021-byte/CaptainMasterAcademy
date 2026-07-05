# Readiness Dashboard

## Purpose

The Readiness Dashboard is the main Version 2.0 coach surface. It should answer: Am I ready, what score am I tracking toward, what should I do next, and how much work remains?

## Primary Cards

### Current Readiness

Display:

- Readiness score from `0` to `100`
- Readiness category
- Trend arrow
- Last updated timestamp

Categories:

- Not ready: `0-54`
- Developing: `55-71`
- Near ready: `72-84`
- Exam ready: `85-100`

### Predicted Written Exam Score

Display:

- Predicted score
- Confidence interval
- Last 125-question exam score
- Difference between prediction and last exam

### Probability of Passing

Display:

- Passing probability
- Risk level
- Main reason for risk
- Top action to improve probability

### Estimated Rank

Display a rank band when cohort data is not available:

- Top tier
- Competitive
- Borderline
- At risk

Explain that this is a readiness band, not an official promotional list rank.

### Study Efficiency

Display:

- Readiness points gained per study hour
- Questions completed per hour
- Correct answers per hour
- Missed-question recoveries per hour

## Mastery Counts

Show:

- Questions mastered
- Questions needing review
- Questions forgotten
- Questions never seen
- Questions overdue for review

Suggested thresholds:

- Mastered: mastery at least `85`, retention at least `75`, confidence at least `70`
- Needs review: mastery below `70` or retention below `65`
- Forgotten: expected forgetting date passed and retention below `65`
- Never seen: attempts equal `0`

## Goal Cards

### Daily Goal

Show:

- Target questions
- Target flashcards
- Target review minutes
- Completion percentage
- Main topics for today

### Weekly Goal

Show:

- Weekly question target
- Weekly flashcard target
- Weekly exam simulator target
- Progress toward weekly study hours
- Weak areas targeted this week

### Estimated Study Hours Remaining

Estimate the time needed to reach `Exam ready`:

```text
hoursRemaining =
  readinessGap / max(0.5, studyEfficiencyPerHour)
```

Use conservative minimums:

- Exam ready: maintenance plan
- Near ready: 10 to 20 focused hours
- Developing: 25 to 45 focused hours
- Not ready: 50 or more focused hours

## Strongest and Weakest Areas

Display:

- Strongest books
- Weakest books
- Strongest policies
- Weakest policies
- Most forgotten material
- Topics requiring immediate review

Each item should include:

- Current score
- Reason
- Recommended action
- Estimated minutes

## Study Trend

Display rolling trends:

- 7-day readiness
- 30-day readiness
- 90-day readiness
- Accuracy trend
- Retention trend
- Confidence trend
- Study efficiency trend

Trend labels:

- Improving
- Stable
- Declining
- Insufficient data

## Completed Session Report

After every session, show:

- What improved today
- What got worse
- Exactly what to study tomorrow
- Estimated minutes required
- Estimated score improvement

Example:

```text
Improved today:
- High-Rise Operations retention +6
- Policy I-A-07 confidence +4

Got worse:
- CBA Article 7 retention fell below 65

Study tomorrow:
- 20 CBA Article 7 questions
- 10 High-Rise flashcards
- 5 missed Policy I-A-07 questions

Estimated time:
- 42 minutes

Estimated score improvement:
- +1.5 to +2.8 readiness points
```

## Mobile Layout

Mobile dashboard order:

1. Current readiness
2. Today's plan
3. Probability of passing
4. Questions needing review
5. Weakest areas
6. Study trend
7. Session report

Cards should remain readable without horizontal scrolling.

## Data Sources

Use:

- Existing progress history
- Existing flashcard history
- Existing exam attempts
- Existing bookmarks and needs-review data
- Existing question metadata
- Derived adaptive profiles

Do not read or write changes to `data/questions.json`.

## Validation

The dashboard is valid when:

- It renders for a new user with no progress.
- It renders for a heavy user with thousands of attempts.
- All scores are bounded from `0` to `100`.
- Daily and weekly goals are specific.
- The session report names exact topics or policies.
- Guest mode works.
- Cloud mode works.
- `data/questions.json` remains unchanged.
