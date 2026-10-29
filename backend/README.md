# Chattrix Backend

NestJS REST API backed by Firebase Authentication and Cloud Firestore.

## Setup

1. Enable Email/Password in Firebase Authentication and create a Firestore
   database in the Firebase Console.
2. Create a Firebase service account JSON key and store it outside this
   repository. Never commit or share the key.
3. Copy `.env.example` to `.env`, then set `FIREBASE_PROJECT_ID` and
   `GOOGLE_APPLICATION_CREDENTIALS` to your project ID and local key path.
4. Install and start the backend:

```powershell
npm install
npm run dev
```

For Google Cloud deployments, use Application Default Credentials instead of
shipping a service-account key file.

## Firestore collections

- `users/{uid}` — application profile linked to Firebase Auth.
- `usernames/{username}` — username-to-UID lookup.
- `contacts/{requesterUid__recipientUid}` — contact requests and accepted links.
- `groups/{groupId}` — group metadata.
- `groups/{groupId}/members/{uid}` — group membership and role.
- `groups/{groupId}/messages/{messageId}` — chat messages.
- `groups/{groupId}/invites/{inviteId}` and `inviteCodes/{code}` — invite links.

The Admin SDK bypasses Firestore client security rules. Browser clients can only
read messages for groups where their Firebase UID has a member document. All
Firestore writes go through the authenticated NestJS API.

## API

The versioned API is available at `/api/v1`; Swagger is at `/api/docs`.
Requests use a Firebase ID token in the `Authorization: Bearer <token>` header.
Email/password account creation and sign-in happen in Firebase Authentication.
The API's `POST /auth/register` creates the matching Firestore profile and
reserves the username.

The frontend subscribes to the active group's Firestore messages collection for
live updates. REST endpoints provide message creation, edit, deletion, pinning,
and pagination; the client listener observes those database changes.

## Configuration

See the project [README](../README.md) for Firebase Console setup, frontend
configuration, and Firestore rule deployment.
