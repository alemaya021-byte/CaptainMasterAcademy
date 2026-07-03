# Captain Master Academy Analytics Validation Report

Date: July 3, 2026

## Validated Features

- Overall readiness score renders on the home dashboard and analytics page.
- Predicted pass probability is included in the readiness model.
- Overall accuracy, total completed, bookmarked count, needs-review count, reviewed-today count, study streak, and average response time render from local storage.
- Accuracy by source renders in analytics.
- Accuracy by chapter/policy/SOP/article renders in analytics.
- Strongest topics, weakest topics, and missed questions by source render from local progress data.
- 7-day, 30-day, and 90-day trend graph sections render.
- Recommended next study actions render from the readiness model.
- Local issue reports display in analytics and export through JSON and CSV controls.

## Validation Method

- Local server: `http://127.0.0.1:8771/`
- Automated browser pass: headless Chromium using the app through the local web server.
- Database check: `data/questions.json` loaded through the app and verified at 5,000 questions.
- Storage check: bookmark, needs-review, and issue-report state persisted across page navigation through local storage.

## Result

Passed. No analytics runtime errors were detected.

