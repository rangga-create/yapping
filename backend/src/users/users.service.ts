import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { SearchUsersDto, UserResponseDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly firebase: FirebaseService) {}

  async searchUsers(currentUserId: string, dto: SearchUsersDto): Promise<UserResponseDto[]> {
    const username = dto.username.toLowerCase().trim();
    const snapshot = await this.firebase.db.collection('users')
      .orderBy('username')
      .startAt(username)
      .endAt(`${username}\uf8ff`)
      .limit(21)
      .get();

    return snapshot.docs
      .filter((user) => user.id !== currentUserId)
      .slice(0, 20)
      .map((user) => this.toResponse(user.id, user.data() as FirebaseUser));
  }

  async getUserById(userId: string): Promise<UserResponseDto> {
    const snapshot = await this.firebase.db.collection('users').doc(userId).get();
    if (!snapshot.exists) throw new NotFoundException('User not found');
    return this.toResponse(snapshot.id, snapshot.data() as FirebaseUser);
  }

  async getUsersByIds(userIds: string[]): Promise<UserResponseDto[]> {
    const snapshots = await Promise.all(
      [...new Set(userIds)].map((userId) => this.firebase.db.collection('users').doc(userId).get()),
    );
    return snapshots.filter((user) => user.exists)
      .map((user) => this.toResponse(user.id, user.data() as FirebaseUser));
  }

  async getUserAvatarInitials(userId: string): Promise<string> {
    const snapshot = await this.firebase.db.collection('users').doc(userId).get();
    const user = snapshot.data();
    if (!user) return '?';
    return String(user.displayName || user.username)
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private toResponse(id: string, user: FirebaseUser): UserResponseDto {
    return {
      id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio ?? null,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
      online: false,
    };
  }
}

interface FirebaseUser {
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}
