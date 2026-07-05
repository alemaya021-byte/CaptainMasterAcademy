# Question Explanation Engine

## Inputs

The engine uses only fields already present in the current question database:

- `question_id`
- `question_stem`
- `answer_choices`
- `correct_answer`
- `detailed_rationale`
- `incorrect_answer_explanations`
- `chapter_policy_sop_reference`
- `source`
- `source_category`
- `source_section`
- `source_page`
- `source_support`
- `difficulty`
- `estimated_exam_probability`
- `question_type`
- `bloom_level`
- `topic`
- `subtopic`
- `keywords`
- `tags`

## Explanation Model

For each question, the engine builds:

- Correct-answer explanation from `detailed_rationale`.
- Incorrect-answer explanations from `incorrect_answer_explanations`.
- Exact source reference from the chapter/policy/SOP reference, section, and page.
- Related policy and SOG/SOP lists from source category, source code, and related question matches.
- Related questions from shared source code, source category, topic, tags, keywords, and question type.
- Similar promotional questions from difficulty, probability, Bloom level, question type, area, and keyword overlap.

## Test-Writer Trap Detection

The engine identifies common traps using deterministic rules:

- Negative wording: EXCEPT and NOT stems.
- Mandatory vs discretionary wording: must, will, shall, may.
- Timing swaps: prior, after, promptly, immediately.
- Role swaps: OIC, Driver/Operator, Division Chief, bureau, or chain-of-command changes.
- Number traps: counts, time periods, percentages, and sequence requirements.

## Memory Aid Generation

Memory aids are generated from the question keywords, topic, source code, or exact source reference.

## Captain Tactical Considerations

The engine maps each question to a Captain-level application frame:

- EMS/MOM: patient care, documentation, timing, and accountability.
- SOP/High-Rise/Structural/NIMS/Safety: command objective, crew assignment, safety check, communications, and follow-up.
- CBA/Policies/Administrative Orders: exact rule application, documentation, approvals, and chain of command.

## Incorrect-Answer Learning Event

When a question is missed in quiz mode, the engine:

- Creates a mini lesson.
- Creates or refreshes a due flashcard.
- Marks the question Needs Review.
- Adds a review reminder.
- Reduces confidence, mastery, and retention on the adaptive profile.
- Stores a local tutor event for review history.

The primary source question remains unchanged.
