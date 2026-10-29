import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import {
  SendMessageDto,
  EditMessageDto,
  MessageQueryDto,
  PinMessageDto,
  MessageResponseDto,
} from './dto/messages.dto';

type UserRole = 'ADMIN' | 'MEMBER';
interface MessageRecord {
  id: string;
  groupId: string;
  senderId: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
  content: string;
  replyTo: MessageResponseDto['replyTo'];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  mentions: MessageResponseDto['mentions'];
}

@Injectable()
export class MessagesService {
  constructor(private readonly firebase: FirebaseService) {}

  async sendMessage(currentUserId: string, groupId: string, dto: SendMessageDto) {
    await this.requireMembership(groupId, currentUserId);
    const replyTo = dto.replyToId ? await this.getMessage(groupId, dto.replyToId) : null;
    if (dto.replyToId && !replyTo) throw new BadRequestException('Invalid reply target');
    const sender = await this.getUser(currentUserId);
    const mentionedUsers = await this.findMentionedMembers(groupId, dto.content);
    const now = new Date().toISOString();
    const messageRef = this.messages(groupId).doc();
    const record: MessageRecord = {
      id: messageRef.id,
      groupId,
      senderId: currentUserId,
      sender,
      content: dto.content,
      replyTo: replyTo ? {
        id: replyTo.id,
        content: replyTo.content,
        sender: { id: replyTo.sender.id, displayName: replyTo.sender.displayName },
      } : null,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      mentions: mentionedUsers.map((user) => ({
        id: user.id,
        mentionedUser: { id: user.id, username: user.username, displayName: user.displayName },
      })),
    };
    await messageRef.set(record);
    return this.toResponse(record);
  }

  async getMessages(currentUserId: string, groupId: string, query: MessageQueryDto) {
    await this.requireMembership(groupId, currentUserId);
    const limit = Math.min(query.limit ?? 50, 100);
    const before = query.before ?? new Date().toISOString();
    const snapshot = await this.messages(groupId)
      .where('createdAt', '<', before)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1)
      .get();
    let rows = snapshot.docs
      .map((document) => document.data() as MessageRecord)
      .filter((message) => !message.deletedAt);
    if (query.search) {
      const search = query.search.toLowerCase();
      rows = rows.filter((message) => message.content.toLowerCase().includes(search));
    }

    const hasMore = rows.length > limit;
    const results = hasMore ? rows.slice(0, limit) : rows;
    return {
      messages: results.reverse().map((message) => this.toResponse(message)),
      hasMore,
      nextCursor: hasMore ? results[0]?.createdAt ?? null : null,
    };
  }

  async editMessage(currentUserId: string, groupId: string, messageId: string, dto: EditMessageDto) {
    const message = await this.getMessage(groupId, messageId);
    if (!message || message.deletedAt) throw new NotFoundException('Message not found');
    if (message.senderId !== currentUserId) throw new ForbiddenException('Can only edit your own messages');

    const mentions = await this.findMentionedMembers(message.groupId, dto.content);
    const updated = {
      ...message,
      content: dto.content,
      updatedAt: new Date().toISOString(),
      mentions: mentions.map((user) => ({
        id: user.id,
        mentionedUser: { id: user.id, username: user.username, displayName: user.displayName },
      })),
    };
    await this.messages(message.groupId).doc(messageId).update({
      content: updated.content,
      updatedAt: updated.updatedAt,
      mentions: updated.mentions,
    });
    return this.toResponse(updated);
  }

  async deleteMessage(currentUserId: string, groupId: string, messageId: string) {
    const message = await this.getMessage(groupId, messageId);
    if (!message || message.deletedAt) throw new NotFoundException('Message not found');
    const membership = await this.getMembership(message.groupId, currentUserId);
    if (message.senderId !== currentUserId && membership?.role !== 'ADMIN') {
      throw new ForbiddenException('Can only delete your own messages');
    }
    await this.messages(message.groupId).doc(messageId).update({ deletedAt: new Date().toISOString() });
    return { id: messageId, deleted: true };
  }

  async pinMessage(currentUserId: string, groupId: string, messageId: string, dto: PinMessageDto) {
    const membership = await this.getMembership(groupId, currentUserId);
    if (membership?.role !== 'ADMIN') throw new ForbiddenException('Only admins can pin messages');
    const message = await this.getMessage(groupId, messageId);
    if (!message || message.deletedAt) throw new NotFoundException('Message not found in this group');
    await this.messages(groupId).doc(messageId).update({
      isPinned: dto.isPinned,
      updatedAt: new Date().toISOString(),
    });
    return { id: messageId, isPinned: dto.isPinned };
  }

  async getPinnedMessages(currentUserId: string, groupId: string) {
    await this.requireMembership(groupId, currentUserId);
    const snapshot = await this.messages(groupId)
      .where('isPinned', '==', true)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((message) => message.data() as MessageRecord)
      .filter((message) => !message.deletedAt)
      .map((message) => this.toResponse(message));
  }

  private messages(groupId: string) {
    return this.firebase.db.collection('groups').doc(groupId).collection('messages');
  }

  private async getMembership(groupId: string, userId: string) {
    const snapshot = await this.firebase.db.collection('groups').doc(groupId)
      .collection('members').doc(userId).get();
    return snapshot.exists ? snapshot.data() as { role: UserRole } : null;
  }

  private async requireMembership(groupId: string, userId: string) {
    if (!(await this.getMembership(groupId, userId))) {
      throw new ForbiddenException('Not a member of this group');
    }
  }

  private async getMessage(groupId: string, messageId: string) {
    const snapshot = await this.messages(groupId).doc(messageId).get();
    return snapshot.exists ? snapshot.data() as MessageRecord : null;
  }

  private async getUser(userId: string) {
    const snapshot = await this.firebase.db.collection('users').doc(userId).get();
    if (!snapshot.exists) throw new NotFoundException('User not found');
    const user = snapshot.data()!;
    return {
      id: userId,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  private async findMentionedMembers(groupId: string, content: string) {
    const usernames = [...new Set(
      [...content.matchAll(/@([a-zA-Z0-9_]{3,30})/g)].map((match) => match[1].toLowerCase()),
    )];
    if (usernames.length === 0) return [];

    const memberSnapshot = await this.firebase.db.collection('groups').doc(groupId)
      .collection('members').get();
    const memberIds = new Set(memberSnapshot.docs.map((member) => member.id));
    const users = await Promise.all(usernames.map(async (username) => {
      const usernameSnapshot = await this.firebase.db.collection('usernames').doc(username).get();
      const userId = usernameSnapshot.data()?.uid as string | undefined;
      if (!userId || !memberIds.has(userId)) return null;
      const user = await this.getUser(userId);
      return user;
    }));
    return users.filter((user): user is NonNullable<typeof user> => user !== null);
  }

  private toResponse(message: MessageRecord): MessageResponseDto {
    return {
      id: message.id,
      groupId: message.groupId,
      sender: message.sender,
      content: message.content,
      replyTo: message.replyTo,
      isPinned: message.isPinned,
      createdAt: new Date(message.createdAt),
      updatedAt: new Date(message.updatedAt),
      mentions: message.mentions ?? [],
    };
  }
}
