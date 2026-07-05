# Cloud Architecture

## Phase 7 Objective

Captain Master Academy now has a Firebase-ready cloud layer while preserving GitHub Pages hosting, guest mode, and the existing Version 1.0 question database.

## Authoritative Question Count

- Current source of truth: `data/questions.json`
- Current authoritative count: 7000 questions
- Phase 7 does not modify, reduce, regenerate, renumber, or rewrite questions.

## Architecture

- Static app hosting remains GitHub Pages compatible.
- `questions.json` remains read-only app content and is not written to Firestore.
- `localStorage` remains the immediate source of truth for uninterrupted study.
- `js/syncEngine.js` initializes Firebase only when `js/firebase-config.js` contains a real Firebase web app config.
- Guest mode is local-only and does not attempt anonymous Firestore reads or writes.
- Signed-in mode supports Email/Password and Google through Firebase Authentication.
- Firestore stores per-user progress under `users/{uid}` and subcollections.

## Firebase SDK Basis

The implementation follows Firebase's browser-module setup pattern for the modular Web SDK. Firebase's web setup documentation shows `initializeApp` and the browser module CDN import format. Google sign-in follows the documented `GoogleAuthProvider` popup/redirect flow. Firestore offline persistence follows the documented persistent local cache with multiple-tab support.

Sources:

- https://firebase.google.com/docs/web/setup
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/firestore/manage-data/enable-offline

## Guest Mode

Guest mode continues to use localStorage only. A guest can study, bookmark, use flashcards, take exams, export progress, and later sign in to upload local progress.

## Cloud Mode

Cloud mode activates after sign-in and supports:

- session restore through Firebase Auth persistence
- initial merge of local and cloud progress
- automatic background sync
- offline queue replay
- manual Sync Now
- daily backup creation and restore
