import { Injectable } from '@nestjs/common';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

export function isMissingGoogleCredentials(error: unknown): boolean {
  return error instanceof Error
    && error.message.includes('Could not load the default credentials');
}

@Injectable()
export class FirebaseService {
  constructor(
    readonly auth: Auth,
    readonly db: Firestore,
  ) {}
}
