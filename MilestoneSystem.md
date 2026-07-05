# Milestone System

Version 2.5 adds milestone detection and celebration to the Promotion Dashboard.

## Milestones

The system tracks:

- First study day
- 1,000 questions
- Every additional 1,000 questions
- First perfect quiz
- First perfect exam
- 30-day study streak
- 60-day study streak
- 100 study hours
- 250 study hours
- 500 study hours
- 90% readiness
- 95% readiness
- Promotion-ready status

## Storage

Completed milestones are saved under:

`progress.tracking.milestones`

Each saved milestone includes:

- Milestone ID
- Display label
- Achievement timestamp

## Promotion-Ready Status

Promotion-ready status requires:

- At least 90% readiness
- Strong practice exam performance

This status is intentionally stricter than simple question accuracy because the promotional exam requires sustained readiness across source areas, timing, retention, and application-level performance.
