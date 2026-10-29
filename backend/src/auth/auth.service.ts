import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FirebaseService, isMissingGoogleCredentials } from '../firebase/firebase.service';
import { RegisterDto, UpdateProfileDto } from './dto/auth.dto';

interface FirebaseIdentity {
  id: string;
  email?: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly firebase: FirebaseService) {}

  async registerFromIdToken(idToken: string | undefined, dto: RegisterDto) {
    if (!idToken?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Firebase ID token is required');
    }

    let identity: FirebaseIdentity;
    try {
      const decoded = await this.firebase.auth.verifyIdToken(idToken.slice(7));
      identity = { id: decoded.uid, email: decoded.email };
    } catch (error) {
      if (isMissingGoogleCredentials(error)) {
        throw new InternalServerErrorException(
          'Firebase Admin credentials are missing. Configure GOOGLE_APPLICATION_CREDENTIALS in backend/.env.',
        );
      }
      throw new UnauthorizedException('Invalid or expired Firebase ID token');
    }

    return this.register(identity, dto);
  }

  async register(identity: FirebaseIdentity, dto: RegisterDto) {
    if (!identity.email) {
      throw new UnauthorizedException('A Firebase email is required');
    }

    const username = dto.username.toLowerCase().trim();
    const userRef = this.firebase.db.collection('users').doc(identity.id);
    const usernameRef = this.firebase.db.collection('usernames').doc(username);

    return this.firebase.db.runTransaction(async (transaction) => {
      const [usernameSnapshot, existingUser] = await Promise.all([
        transaction.get(usernameRef),
        transaction.get(userRef),
      ]);
      if (usernameSnapshot.exists && usernameSnapshot.data()?.uid !== identity.id) {
        throw new ConflictException('Username already taken');
      }

      const now = new Date().toISOString();
      const previousUsername = existingUser.data()?.username as string | undefined;
      const user = {
        id: identity.id,
        username,
        email: identity.email,
        displayName: dto.displayName.trim(),
        bio: existingUser.data()?.bio ?? '',
        avatarUrl: existingUser.data()?.avatarUrl ?? null,
        createdAt: existingUser.data()?.createdAt ?? now,
        updatedAt: now,
      };

      if (previousUsername && previousUsername !== username) {
        transaction.delete(this.firebase.db.collection('usernames').doc(previousUsername));
      }
      transaction.set(usernameRef, { uid: identity.id });
      transaction.set(userRef, user, { merge: true });
      return user;
    });
  }

  async logout() {
    return { message: 'Signed out successfully' };
  }

  async getProfile(userId: string) {
    const snapshot = await this.firebase.db.collection('users').doc(userId).get();
    if (!snapshot.exists) throw new UnauthorizedException('User profile not found');
    return snapshot.data();
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const userRef = this.firebase.db.collection('users').doc(userId);
    const snapshot = await userRef.get();
    if (!snapshot.exists) throw new UnauthorizedException('User profile not found');

    const updatedAt = new Date().toISOString();
    await userRef.update({
      ...(dto.displayName !== undefined && { displayName: dto.displayName.trim() }),
      ...(dto.bio !== undefined && { bio: dto.bio.trim() }),
      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl.trim() }),
      updatedAt,
    });

    return { ...snapshot.data(), ...dto, updatedAt };
  }
}
