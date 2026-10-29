import {
  Injectable,
  ExecutionContext,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { FirebaseService, isMissingGoogleCredentials } from '../../firebase/firebase.service';
import type { Request } from 'express';

@Injectable()
export class FirebaseAuthGuard {
  constructor(
    private readonly reflector: Reflector,
    private readonly firebase: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: Record<string, unknown> }>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException('Firebase ID token is required');
    }

    let decoded;
    try {
      decoded = await this.firebase.auth.verifyIdToken(token);
    } catch (error) {
      if (isMissingGoogleCredentials(error)) {
        throw new InternalServerErrorException(
          'Firebase Admin credentials are missing. Configure GOOGLE_APPLICATION_CREDENTIALS in backend/.env.',
        );
      }
      throw new UnauthorizedException('Invalid or expired Firebase ID token');
    }

    const user = await this.firebase.db.collection('users').doc(decoded.uid).get();
    if (!user.exists) throw new UnauthorizedException('User profile not found');
    request.user = { id: decoded.uid, email: decoded.email, ...user.data() };
    return true;
  }
}