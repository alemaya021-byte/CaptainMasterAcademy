# Heat Map Dashboards

## Purpose

Version 2.0 heat maps translate the adaptive engine into visual coaching surfaces. They show weakness, confidence, study trend, retention decay, and predicted exam trend across the Captain study universe.

## Dashboards

### Weakness Heat Map

Shows low mastery and high-risk areas.

Dimensions:

- Book
- Chapter
- Policy
- SOG/SOP
- Topic
- Difficulty
- Question source

Metrics:

- Accuracy
- Mastery
- Retention
- Miss rate
- Never-seen count
- Overdue-review count
- Risk score

Risk formula:

```text
risk =
  (100 - mastery) * 0.30
  + (100 - retention) * 0.25
  + missRate * 0.20
  + unseenPenalty * 0.15
  + hardQuestionPenalty * 0.10
```

### Confidence Heat Map

Shows where the system has enough evidence to trust the readiness estimate.

Metrics:

- Attempts
- Source coverage
- Recency
- Exam-mode evidence
- Consistency
- Confidence score

Low confidence means the user needs more attempts, even if accuracy is high.

### Study Trend

Shows whether the user is improving or declining over time.

Metrics:

- Daily attempts
- Daily accuracy
- Readiness score
- Mastery score
- Retention score
- Study minutes
- Study efficiency

Windows:

- 7 days
- 30 days
- 90 days

### Retention Curve

Shows expected forgetting over time.

Metrics:

- Retention today
- Expected forgetting date
- Review interval
- Overdue days
- Prior mastery
- Flashcard due date

Retention curve statuses:

- Fresh
- Due soon
- Due today
- Overdue
- Forgotten

### Predicted Exam Trend

Shows the projected written exam score and pass probability over time.

Metrics:

- Predicted written exam score
- Probability of passing
- Confidence interval
- Last exam simulator result
- Rolling readiness
- Weak-area penalty

## Heat Map Cell Model

Each cell should expose:

```json
{
  "key": "",
  "label": "",
  "dimension": "book",
  "attempts": 0,
  "correct": 0,
  "accuracy": 0,
  "mastery": 0,
  "confidence": 0,
  "retention": 0,
  "risk": 0,
  "unseen": 0,
  "forgotten": 0,
  "overdue": 0,
  "trend": "insufficient data",
  "recommendedAction": ""
}
```

## Color and Status Bands

Use color plus text labels.

Weakness:

- Critical: `0-54`
- Needs work: `55-71`
- Near ready: `72-84`
- Strong: `85-100`

Confidence:

- Low: `0-49`
- Moderate: `50-74`
- High: `75-100`

Retention:

- Forgotten: below `55`
- At risk: `55-69`
- Due soon: `70-79`
- Fresh: `80-100`

## Drill Actions

Each row or cell should offer:

- Start focused quiz
- Start AI review
- Review flashcards
- Review missed questions
- Add to tomorrow's plan
- Open related questions

The drill must use valid question IDs selected from the existing database.

## Immediate Review Queue

A topic enters immediate review when:

- Risk score is at least `70`
- Retention is below `55`
- Recent miss occurred in the last 7 days
- High-probability source has low coverage
- Hard-question accuracy is below `60`

## Empty-State Behavior

For new users:

- Show all major books as unseen.
- Explain that confidence will grow after attempts.
- Offer a balanced first study plan.

For partial progress:

- Prioritize attempted topics with low scores.
- Include never-seen high-probability areas.

## Accessibility and Mobile

- Do not rely on color alone.
- Include numeric score and status text.
- Use stacked cards on phones.
- Keep source labels readable.
- Provide direct drill buttons with large touch targets.

## Validation

The heat maps are valid when:

- All requested dimensions can be grouped.
- Scores remain between `0` and `100`.
- Never-seen areas appear.
- Forgotten material appears.
- Drill actions produce valid sessions.
- Heat maps work in guest and cloud mode.
- `data/questions.json` remains unchanged.
