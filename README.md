# Captain Master Academy

Clean public deployment package for the Captain Master Academy interactive web app.

## Contents

- Dashboard: `index.html`
- Practice quiz: `quiz.html`
- Promotional exam simulator: `exam.html`
- Flashcards: `flashcards.html`
- Search and filters: `search.html`
- Analytics: `statistics.html`
- App styles: `css/`
- App scripts: `js/`
- Question database: `data/questions.json`
- PWA manifest: `manifest.json`
- Service worker: `service-worker.js`
- App icons: `icons/`

This repository intentionally does not include official study materials, PDFs, books, source documents, workbooks, generation scripts, development reports, temporary files, or internal project folders.

## Run Locally

Start a local server from this folder:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8765/index.html
```

Do not open `index.html` directly with `file://`; browser security rules can block loading `data/questions.json`.

## GitHub Pages

This repository is intended to publish from the root of the `main` branch through GitHub Pages.

Expected URL:

```text
https://alemaya021-byte.github.io/CaptainMasterAcademy/
```

## Data

The app loads questions from:

```text
data/questions.json
```

The deployment database contains exactly 7,000 questions.

## Professional Features

- Question review panel with source references, rationales, tags, keywords, and issue reporting.
- Local issue reports with JSON and CSV export.
- Readiness score, predicted pass probability, strongest and weakest topics, trends, and missed-question analytics.
- Missed-question mastery workflow requiring two consecutive correct answers.
- Bookmark and needs-review drills.
- Spaced repetition flashcards with Again, Hard, Good, and Easy ratings.
- Offline-capable PWA with cache refresh through `service-worker.js`.
- Phase 6 coverage metadata, built-in exam blueprints, and Study Coach recommendations.
