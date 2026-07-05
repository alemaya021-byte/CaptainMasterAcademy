# Captain Master Academy Version 2.2 AI Captain Tutor

## Purpose

Version 2.2 turns each question into an interactive learning experience without modifying `data/questions.json`. The tutor is deterministic and source-bound: it uses the existing question stem, rationale, answer explanations, references, tags, keywords, topic metadata, and the current question catalog.

## User Controls

Every question action area now includes:

- Explain Question
- Teach Me
- Show Reference
- Show Related Questions

These open the AI Captain Tutor overlay for the selected question.

## Tutor Content

For each question the tutor displays:

- Why the correct answer is correct
- Why each incorrect answer is wrong
- Exact source reference
- Related policies
- Related SOGs / SOPs
- Related questions
- Similar Captain promotional questions
- Common test-writer traps
- Keywords to remember
- Memory aid
- Captain tactical considerations
- What the examiner is testing

## Incorrect Answer Learning Flow

After every incorrect quiz answer:

- A 30-90 second mini lesson appears immediately.
- A flashcard is automatically created or updated.
- The question is marked Needs Review with a same-day reminder.
- The adaptive profile receives an additional confidence adjustment.
- The adaptive profile receives an additional mastery and retention adjustment.

The existing adaptive learning engine still records the answer first. The tutor then adds the extra learning support.

## Data Protection

The tutor does not regenerate, rewrite, or renumber questions. It reads the deployed database and writes only user progress data, such as flashcards, needs-review status, and tutor learning events.
