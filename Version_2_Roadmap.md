# Captain Master Academy Version 2.0 Roadmap

Branch: `version-2-adaptive-study-coach`

Baseline: Version 1.0.0 stable release

Version 1.0 status: Frozen

Question database status: Do not modify `data/questions.json`

## Objective

Version 2.0 turns Captain Master Academy from a high-quality question bank into an adaptive intelligence study coach. The application should learn from every answer, identify the user's weak and fading areas, predict exam readiness, and generate focused study sessions without changing the underlying question database.

## Guiding Rules

- Preserve Version 1.0 on `main` and tag `v1.0.0`.
- Build Version 2.0 on a separate development branch.
- Do not modify or regenerate `data/questions.json`.
- Treat all study intelligence as derived user-progress data.
- Keep guest mode available.
- Keep Firebase cloud sync optional for signed-in users.
- Keep all Version 1.0 study, exam, flashcard, analytics, PWA, and cloud sync features working.

## Version 2.0 Scope

### Adaptive Learning Engine

Every answered question updates:

- Mastery score
- Confidence score
- Retention score
- Predicted exam readiness
- Topic strength
- Topic weakness
- Forgotten-material risk
- Recommended next session

### AI Study Coach Dashboard

The dashboard will display:

- Current readiness
- Predicted exam score
- Predicted pass probability
- Questions mastered
- Questions needing review
- Questions never seen
- Daily goal
- Weekly goal
- Estimated study hours remaining

### Weakness Heat Map

The heat map will show accuracy and risk by:

- Book
- Chapter
- Policy
- SOG/SOP
- Topic
- Difficulty
- Question source

### Smart Study Planner

The planner will generate daily sessions using:

- Weak areas
- Forgotten material
- Recent misses
- Low-confidence items
- Due flashcards
- Upcoming exam target
- Available study time

Example plan:

- 35 questions
- 18 flashcards
- Review High-Rise
- Review Union Contract
- Review Policy I-A-07

### Explain Every Question

Each question review screen should surface:

- Why the correct answer is correct
- Why each incorrect answer is wrong
- Source reference
- Related policies
- Related questions
- Related weak topics

This should use existing question metadata and derived relationships. It must not rewrite `questions.json`.

### Exam Prediction Engine

The prediction engine will estimate:

- Final exam score
- Passing probability
- Confidence interval
- Readiness trend
- Study hours remaining

### Study Streaks

Version 2.0 will track:

- Current streak
- Longest streak
- Questions per day
- Hours per day
- Consistency score

### Achievement System

Badges will include:

- 500 questions completed
- 1,000 questions completed
- Perfect exam
- Study streak milestones
- Mastered books
- Mastered source categories
- Missed-question recovery

### AI Review Mode

The review mode will automatically bring back:

- Forgotten questions
- Recent misses
- Low-confidence questions
- Low-retention flashcards
- Topics with falling trend lines

### Voice Coach Foundation

Version 2.0 will prepare architecture for future:

- Read questions aloud
- Voice answers
- Audio explanations
- Hands-free study sessions

No live speech service, microphone permission, or voice provider is required for this checkpoint.

## Implementation Phases

### Phase 2.0-A: Derived Intelligence Data Layer

- Add a derived progress model separate from `questions.json`.
- Define scoring formulas for mastery, confidence, retention, and readiness.
- Store computed intelligence in localStorage and Firebase user progress.
- Add migration logic that safely computes missing values from existing Version 1.0 progress.

### Phase 2.0-B: Adaptive Session Builder

- Build a session selector that weighs weak, forgotten, missed, and unseen questions.
- Preserve standard quiz, exam, flashcard, and search behavior.
- Add AI Review Mode as a new session type.

### Phase 2.0-C: Study Coach Dashboard

- Add readiness summary.
- Add predicted score and pass probability.
- Add daily and weekly plan cards.
- Add mastered, needs-review, never-seen, and forgotten counts.

### Phase 2.0-D: Heat Map and Planner

- Add grouped performance heat maps.
- Add daily plan generation.
- Add goal completion tracking.
- Add estimated study-hours remaining.

### Phase 2.0-E: Prediction Calibration

- Compare predicted score to completed 125-question exams.
- Adjust model weights based on exam simulator outcomes.
- Track confidence intervals and trend direction.

### Phase 2.0-F: Voice Coach Foundation

- Add voice-capability interfaces and settings placeholders.
- Keep voice disabled unless a future provider is configured.
- Avoid microphone prompts in Version 2.0 foundation work.

## Data Boundaries

The question bank remains immutable for Version 2.0. New intelligence belongs in progress state:

- `adaptive.mastery`
- `adaptive.confidence`
- `adaptive.retention`
- `adaptive.topicStats`
- `adaptive.studyPlans`
- `adaptive.predictions`
- `adaptive.achievements`
- `adaptive.voicePreferences`

## Validation Gates

Before Version 2.0 is merged or deployed:

- `questions.json` hash must match the Version 1.0 baseline unless explicitly approved.
- Existing quiz mode works.
- Existing exam simulator works.
- Existing flashcards work.
- Existing analytics work.
- Existing search works.
- Firebase sync works.
- Guest mode works.
- Regression suite passes.
- Adaptive scores update after each answer.
- Smart planner produces a valid daily plan.
- Prediction engine produces bounded outputs.
- Heat map renders on mobile and desktop.

## Stable Restore Point

Version 1.0 can be restored with:

```powershell
git fetch origin --tags
git checkout v1.0.0
```

The Version 2.0 branch should never rewrite or move the `v1.0.0` tag.
