import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { FirebaseService } from './firebase.service';

@Module({
  providers: [
    {
      provide: FirebaseService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const projectId = config.get<string>('FIREBASE_PROJECT_ID');
        if (!projectId) {
          throw new Error('FIREBASE_PROJECT_ID is required to connect Firebase.');
        }

        const usingEmulator = Boolean(
          process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST,
        );
        const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

        if (Boolean(clientEmail) !== Boolean(privateKey)) {
          throw new Error(
            'Set both FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in backend/.env.',
          );
        }

        const credential = clientEmail && privateKey
          ? cert({ projectId, clientEmail, privateKey })
          : usingEmulator
            ? undefined
            : applicationDefault();
        const app = getApps()[0] ?? initializeApp({
          ...(credential ? { credential } : {}),
          projectId,
        });

        return new FirebaseService(getAuth(app), getFirestore(app));
      },
    },
  ],
  exports: [FirebaseService],
})
export class FirebaseModule {}
