# Promotion Dashboard

The Version 2.5 Promotion Dashboard is available at:

`tracking.html`

## Dashboard Sections

The page displays:

- Automatic study tracking metrics
- Promotional exam date configuration
- Current Captain Readiness Score
- Predicted written exam score
- Estimated probability of passing
- Estimated readiness by the configured exam date
- Estimated study hours remaining to reach 80%, 90%, 95%, and 98% readiness
- Daily Mission
- Completion and mastery counts
- Milestones
- Performance timeline
- Weekly report

## Readiness Projection

The dashboard uses the existing adaptive readiness model and projects readiness by exam date using:

- Current readiness score
- Current study pace
- Active study days
- Recent study hours
- Adaptive study efficiency
- Remaining days until the configured promotional exam date

## Hours Remaining

Estimated hours remaining are calculated against four readiness targets:

- 80%
- 90%
- 95%
- 98%

The estimate uses the current readiness gap and the adaptive study-efficiency score. The model intentionally stays conservative so the dashboard encourages continued review rather than overpromising readiness.

## Firebase Sync

Promotion tracking data is included in the existing Firebase summary and daily study session sync model. Guest mode remains available and continues to use local storage.
