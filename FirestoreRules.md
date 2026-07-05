# Firestore Rules

Production rules published for Captain Master Academy.

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedInWithAllowedProvider() {
      return request.auth != null
        && request.auth.uid != null
        && request.auth.token.firebase.sign_in_provider in ['password', 'google.com'];
    }

    function owns(userId) {
      return signedInWithAllowedProvider()
        && request.auth.uid == userId;
    }

    function hasRequiredSyncFields() {
      return request.resource.data.updatedAtMs is number
        && request.resource.data.deviceId is string;
    }

    function validQuestionId(questionId) {
      return questionId.matches('^CMA-P[0-9]+-[0-9]{4}$');
    }

    function validDateId(dateId) {
      return dateId.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
    }

    match /users/{userId} {
      allow get, list: if owns(userId);

      allow create, update: if owns(userId)
        && request.resource.data.keys().hasOnly([
          'profile',
          'preferences',
          'devices',
          'analytics',
          'updatedAt',
          'updatedAtMs'
        ])
        && request.resource.data.profile is map
        && request.resource.data.preferences is map
        && request.resource.data.devices is map
        && request.resource.data.analytics is map
        && request.resource.data.updatedAt is string
        && request.resource.data.updatedAtMs is number;

      allow delete: if false;

      match /progress/{docId} {
        allow get, list: if owns(userId);

        allow create, update: if owns(userId)
          && docId == 'summary'
          && request.resource.data.keys().hasOnly([
            'attempts',
            'correct',
            'accuracy',
            'answeredQuestions',
            'bookmarks',
            'needsReview',
            'missedQuestions',
            'flashcards',
            'examAttempts',
            'updatedAt',
            'updatedAtMs'
          ])
          && request.resource.data.updatedAt is string
          && request.resource.data.updatedAtMs is number;

        allow delete: if false;
      }

      match /questions/{questionId} {
        allow get, list: if owns(userId);

        allow create, update: if owns(userId)
          && validQuestionId(questionId)
          && request.resource.data.questionId == questionId
          && hasRequiredSyncFields();

        allow delete: if false;
      }

      match /bookmarks/{questionId} {
        allow get, list: if owns(userId);

        allow create, update: if owns(userId)
          && validQuestionId(questionId)
          && request.resource.data.questionId == questionId
          && request.resource.data.active is bool
          && hasRequiredSyncFields();

        allow delete: if false;
      }

      match /needsReview/{questionId} {
        allow get, list: if owns(userId);

        allow create, update: if owns(userId)
          && validQuestionId(questionId)
          && request.resource.data.questionId == questionId
          && request.resource.data.active is bool
          && hasRequiredSyncFields();

        allow delete: if false;
      }

      match /missedQuestions/{questionId} {
        allow get, list: if owns(userId);

        allow create, update: if owns(userId)
          && validQuestionId(questionId)
          && request.resource.data.questionId == questionId
          && request.resource.data.active is bool
          && hasRequiredSyncFields();

        allow delete: if false;
      }

      match /flashcards/{questionId} {
        allow get, list: if owns(userId);

        allow create, update: if owns(userId)
          && validQuestionId(questionId)
          && request.resource.data.questionId == questionId
          && hasRequiredSyncFields();

        allow delete: if false;
      }

      match /examAttempts/{attemptId} {
        allow get, list: if owns(userId);

        allow create, update: if owns(userId)
          && hasRequiredSyncFields()
          && (
            request.resource.data.attemptId == attemptId
            || request.resource.data.id == attemptId
          );

        allow delete: if false;
      }

      match /studySessions/{sessionId} {
        allow get, list: if owns(userId);

        allow create, update: if owns(userId)
          && validDateId(sessionId)
          && request.resource.data.sessionId == sessionId
          && hasRequiredSyncFields();

        allow delete: if false;
      }

      match /reports/{reportId} {
        allow get, list: if owns(userId);

        allow create, update: if owns(userId)
          && hasRequiredSyncFields()
          && (
            request.resource.data.reportId == reportId
            || request.resource.data.id == reportId
          );

        allow delete: if false;
      }

      match /dailyBackups/{backupDate} {
        allow get, list: if owns(userId);

        allow create, update: if owns(userId)
          && validDateId(backupDate)
          && request.resource.data.day == backupDate
          && request.resource.data.progress is map
          && request.resource.data.summary is map
          && request.resource.data.deviceId is string
          && request.resource.data.createdAt is string
          && request.resource.data.updatedAtMs is number;

        allow delete: if false;
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Security Intent

- Email/Password and Google users can access only their own `users/{uid}` tree.
- Anonymous users are denied Firestore access.
- Guest mode remains local-only.
- Deletes are denied from the web client to reduce accidental data loss.
- All unrelated paths are denied.
