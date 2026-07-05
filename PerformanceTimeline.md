# Performance Timeline

## Purpose

The Performance Timeline gives a chronological view of study progress and command performance.

## Timeline Data

The timeline combines:

- Daily readiness score
- Daily mastery score
- Daily confidence score
- Daily retention score
- Daily question attempts
- Exam simulator scores
- Incident simulator scores
- Study minutes
- Study streak activity
- Major milestones
- Version upgrades

## Filters

The timeline supports four ranges:

- Week
- Month
- Quarter
- Entire study history

The filters are handled client-side in `js/performanceCenter.js` and do not alter stored progress.

## Implementation

Readiness and study activity are built from `CMA.adaptiveTrend()`, adaptive prediction snapshots, exam attempts, incident attempts, and the local/cloud-merged daily progress object.

Version milestones are shown as timeline markers so major platform upgrades appear alongside study activity.
