# AI Study Coach

## Purpose

The AI Study Coach turns progress data into clear next actions. It should help the user decide what to study today, why it matters, and how close they are to being exam ready.

## Dashboard Metrics

The Version 2.0 dashboard should display:

- Current readiness
- Predicted exam score
- Predicted pass probability
- Questions mastered
- Questions needing review
- Questions never seen
- Forgotten questions
- Daily goal
- Weekly goal
- Estimated study hours remaining
- Current streak
- Longest streak
- Questions per day
- Hours per day
- Consistency score

## Readiness Categories

Suggested categories:

- 0 to 54: Not ready
- 55 to 71: Developing
- 72 to 84: Near ready
- 85 to 100: Exam ready

The coach should show the category, score, and next recommended action.

## Smart Study Planner

The planner generates a daily plan using:

- Weakest topics
- Forgotten questions
- Recent misses
- Due flashcards
- Never-seen questions
- Exam simulator performance
- Available study time
- Daily and weekly goals

Example output:

```text
Today:
- 35 questions
- 18 flashcards
- Review High-Rise
- Review Union Contract
- Review Policy I-A-07
```

## Plan Structure

Each plan should include:

- Date
- Target questions
- Target flashcards
- Primary topics
- Secondary topics
- Missed-question drill count
- Estimated minutes
- Completion status
- Confidence level

Suggested data shape:

```json
{
  "date": "YYYY-MM-DD",
  "questions": 35,
  "flashcards": 18,
  "topics": ["High-Rise", "Union Contract", "Policy I-A-07"],
  "missedQuestionDrill": 10,
  "estimatedMinutes": 60,
  "reason": "Weak retention and recent misses",
  "confidence": "High",
  "completed": false
}
```

## Explain Every Question

The coach should make every question review more useful by showing:

- Why the correct answer is correct
- Why each incorrect answer is wrong
- Source reference
- Related policies
- Related SOG/SOP entries
- Related questions
- Whether the item is mastered, weak, forgotten, or unseen

Related questions can be derived from shared:

- Source reference
- Topic
- Subtopic
- Tags
- Keywords
- Difficulty

This feature must not rewrite the question record. Related items should be computed at runtime or cached in derived metadata.

## AI Review Mode

AI Review Mode automatically chooses:

- Forgotten questions
- Recent misses
- Low-confidence questions
- Due flashcards
- Hard questions in weak topics
- Never-seen questions from high-probability sources

Default session mix:

- 30 percent forgotten material
- 25 percent recent misses
- 20 percent weak topics
- 15 percent due flashcards
- 10 percent never-seen questions

## Study Streaks

Track:

- Current streak
- Longest streak
- Questions per day
- Minutes per day
- Hours per day
- Consistency score

Consistency should reward repeated study days more than one large cram session.

## Achievement System

Initial badges:

- 500 Questions Completed
- 1,000 Questions Completed
- First Perfect Exam
- Three-Day Streak
- Seven-Day Streak
- Thirty-Day Streak
- Mastered Administrative Orders
- Mastered Policies
- Mastered SOPs/SOGs
- Mastered Fire Officer
- Mastered High-Rise
- Missed Question Recovery

Each badge should include:

- Badge ID
- Name
- Description
- Earned timestamp
- Progress toward unlock
- Source or topic if applicable

## Voice Coach Foundation

Version 2.0 should prepare interfaces for future voice support:

- `readQuestion(questionId)`
- `readExplanation(questionId)`
- `acceptVoiceAnswer(transcript)`
- `startHandsFreeSession(planId)`
- `stopHandsFreeSession()`

No microphone permission should be requested until a future voice provider is implemented and enabled.

## User Experience Principles

- Give one clear recommended next action.
- Explain why the recommendation matters.
- Keep the dashboard scannable on mobile.
- Avoid hiding the existing quiz, exam, flashcard, and analytics tools.
- Treat coach outputs as guidance, not as a replacement for manual study.

## Validation

The coach is valid when:

- It loads without cloud sign-in.
- It uses only local progress in guest mode.
- It uses synced progress when signed in.
- It produces a daily plan with valid question IDs.
- It never recommends unavailable questions.
- It updates after quiz, exam, and flashcard activity.
- It does not modify `questions.json`.
