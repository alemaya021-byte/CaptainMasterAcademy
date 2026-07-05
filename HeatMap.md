# Weakness Heat Map

## Purpose

The Weakness Heat Map identifies where the user is strongest, weakest, and most likely to forget material. It should make source-level and topic-level gaps obvious without requiring the user to manually inspect thousands of questions.

## Required Dimensions

Display accuracy and readiness by:

- Book
- Chapter
- Policy
- SOG/SOP
- Topic
- Difficulty
- Question source

## Metrics Per Cell

Each heat map cell should track:

- Attempts
- Correct answers
- Accuracy
- Recent accuracy
- Mastery score
- Confidence score
- Retention score
- Miss count
- Due flashcards
- Never-seen question count
- Readiness risk

## Color Bands

Suggested bands:

- 85 to 100: Strong
- 72 to 84: Near ready
- 55 to 71: Developing
- 0 to 54: Weak
- No data: Unseen

Color must not be the only signal. Each cell should include a label, percentage, or status for accessibility.

## Grouping Rules

The heat map should derive groups from existing question metadata:

- Book: `source_category` or derived source family
- Chapter: `chapter_policy_sop_reference`
- Policy: policy identifiers found in references or tags
- SOG/SOP: SOG/SOP identifiers found in references or tags
- Topic: `topic`, `subtopic`, tags, or keyword clusters
- Difficulty: `difficulty`
- Question source: normalized source label

No group extraction should modify the source question.

## Risk Score

Suggested risk score:

```text
risk =
  (100 - mastery) * 0.35
  + (100 - retention) * 0.30
  + missed_rate * 0.15
  + unseen_weight * 0.10
  + low_confidence_penalty * 0.10
```

Higher risk means the topic should be prioritized by the study planner.

## Views

### Overview

Shows all major source families with readiness, risk, and question coverage.

### Source Detail

Shows chapters, policies, SOGs/SOPs, or articles inside a selected source.

### Difficulty Detail

Shows whether the user is weak on Easy, Moderate, or Hard questions within a topic.

### Forgotten Material

Shows topics where retention has fallen despite prior mastery.

### Never Seen

Shows high-value areas where the user has not attempted questions.

## Mobile Behavior

On small screens:

- Use stacked cards instead of dense grids.
- Keep tap targets large.
- Show top weak areas first.
- Allow expanding a source for details.
- Provide direct buttons to start a focused drill.

## Drill Actions

Each heat map row or cell should allow:

- Start focused quiz
- Start AI Review Mode
- Review flashcards
- View related questions
- Bookmark topic
- Add to today's plan

## Validation

The heat map is valid when:

- It renders with no attempts.
- It renders with partial progress.
- It renders with full progress.
- Percentages remain within 0 to 100.
- Empty groups are labeled as unseen.
- Drill links produce valid sessions.
- Mobile layout remains readable.
- `questions.json` remains unchanged.
