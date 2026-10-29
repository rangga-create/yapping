# Chattrix

The project is split into two independently runnable applications:

- `frontend/` — Next.js client application.
- `backend/` — NestJS API connected to Firebase Authentication and Cloud Firestore.
- `firestore.rules` — Read-only Firestore access for authenticated group members'
  realtime message listeners. Writes go through the NestJS API.

## Run locally

### 1. Create and configure a Firebase project

In Firebase Console:

1. Enable **Authentication → Email/Password**.
2. Create a **Cloud Firestore** database.
3. Register a Web App and copy its config values into `frontend/.env.local`,
   using [frontend/.env.example](./frontend/.env.example) as the template.
4. Open **Project settings → Service accounts → Firebase Admin SDK** and create
   a new private key. In `backend/.env`, set `FIREBASE_CLIENT_EMAIL` to the
   JSON's `client_email` value and `FIREBASE_PRIVATE_KEY` to its `private_key`
   value, keeping the `\n` sequences on one quoted line:

   ```dotenv
   FIREBASE_PROJECT_ID=yapp-b0304
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@yapp-b0304.iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

   Keep `backend/.env` private and never commit or share it. Restart the backend
   after changing its Firebase credentials.
5. Set `FIREBASE_PROJECT_ID` and the other backend settings in `backend/.env`,
   using [backend/.env.example](./backend/.env.example) as the template.

The local `backend/.env` may still contain old PostgreSQL/JWT settings. Replace
those settings with the Firebase values above; the app no longer uses Prisma or
PostgreSQL. Existing PostgreSQL data is not automatically migrated.

Install and authenticate the Firebase CLI, then deploy the Firestore security
rules and indexes from the project root:

```powershell
npm install -g firebase-tools
firebase login
firebase deploy --only firestore
```

### 2. Install dependencies

```powershell
npm --prefix frontend install
npm --prefix backend install
```

### 3. Start both apps in separate terminals from the project root:

```powershell
npm run dev:backend
npm run dev
```

The frontend runs at `http://localhost:3000`; the API and Swagger UI run at
`http://localhost:3001` and `http://localhost:3001/api/docs`.

You can also start the frontend with `npm run dev` inside `frontend/`, or the
backend with `npm run dev` inside `backend/`.

Root scripts also provide `build`, `build:backend`, `typecheck`, and
`typecheck:backend`. In the backend folder, `npm run start:dev` is also
available as an alias for `npm run dev`.
