# Readiness Algorithm Report

Generated: 2026-07-03 12:15:36

## Current Model Inputs

- Overall accuracy
- Recent accuracy
- Hard-question accuracy
- Weak-category performance
- Exam simulator performance
- Missed-question recovery
- Study consistency
- Average response time

## Phase 6 Enhancements

- Metadata allows readiness logic to weight Bloom level, Captain competency, topic, subtopic, difficulty score, and exam-frequency estimate.
- Built-in exam blueprints support targeted readiness checks by source and weak topic.
- Study Coach recommendations are designed to show readiness, predicted pass probability, strong/weak subjects, recommended study time, recommended quiz, recommended chapters, flashcards, and missed-question work.

## Confidence Scoring

- High confidence: based on repeated answered-question history or exam simulator history.
- Moderate confidence: based on limited local progress plus source coverage metadata.
- Low confidence: based on initial diagnostic profile with little or no local progress.
