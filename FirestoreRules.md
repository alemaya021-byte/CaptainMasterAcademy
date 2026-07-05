# Firestore Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null
        && request.auth.token.firebase.sign_in_provider != 'anonymous';
    }

    function owns(userId) {
      return signedIn() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow create, read, update, delete: if owns(userId);

      match /progress/{docId} {
        allow read, write: if owns(userId);
      }

      match /questions/{questionId} {
        allow read, write: if owns(userId);
      }

      match /bookmarks/{questionId} {
        allow read, write: if owns(userId);
      }

      match /needsReview/{questionId} {
        allow read, write: if owns(userId);
      }

      match /missedQuestions/{questionId} {
        allow read, write: if owns(userId);
      }

      match /flashcards/{questionId} {
        allow read, write: if owns(userId);
      }

      match /examAttempts/{attemptId} {
        allow read, write: if owns(userId);
      }

      match /studySessions/{sessionId} {
        allow read, write: if owns(userId);
      }

      match /reports/{reportId} {
        allow read, write: if owns(userId);
      }

      match /dailyBackups/{backupDate} {
        allow read, write: if owns(userId);
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Security Intent

- Users can access only their own `users/{uid}` tree.
- Anonymous Firebase users are explicitly denied.
- Guest mode is local-only and never reads or writes Firestore.
- All unrelated paths are denied.

Firebase Security Rules documentation confirms that every mobile/web request is evaluated against rules before data access and shows `request.auth != null` as the baseline authenticated check.

Source: https://firebase.google.com/docs/firestore/security/get-started
