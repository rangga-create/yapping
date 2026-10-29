import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateInviteDto } from './dto/invites.dto';

interface InviteRecord {
  id: string;
  groupId: string;
  code: string;
  createdById: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  revokedAt: string | null;
  createdAt: string;
}

@Injectable()
export class InvitesService {
  constructor(private readonly firebase: FirebaseService) {}

  async createInvite(currentUserId: string, groupId: string, dto: CreateInviteDto) {
    const membership = await this.getMembership(groupId, currentUserId);
    if (membership?.role !== 'ADMIN') throw new ForbiddenException('Only admins can create invite links');
    const code = randomBytes(12).toString('hex');
    const createdAt = new Date().toISOString();
    const inviteRef = this.firebase.db.collection('groups').doc(groupId).collection('invites').doc();
    const invite: InviteRecord = {
      id: inviteRef.id,
      groupId,
      code,
      createdById: currentUserId,
      expiresAt: dto.expiresIn ? new Date(Date.now() + dto.expiresIn * 1000).toISOString() : null,
      maxUses: dto.maxUses ?? null,
      useCount: 0,
      revokedAt: null,
      createdAt,
    };
    await inviteRef.set(invite);
    await this.firebase.db.collection('inviteCodes').doc(code).set({ groupId, inviteId: invite.id });
    return this.formatInvite(invite);
  }

  async getInvites(currentUserId: string, groupId: string) {
    const membership = await this.getMembership(groupId, currentUserId);
    if (membership?.role !== 'ADMIN') throw new ForbiddenException('Only admins can view invite links');
    const snapshot = await this.firebase.db.collection('groups').doc(groupId).collection('invites')
      .orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((invite) => this.formatInvite(invite.data() as InviteRecord));
  }

  async previewInvite(code: string) {
    const codeSnapshot = await this.firebase.db.collection('inviteCodes').doc(code).get();
    if (!codeSnapshot.exists) throw new NotFoundException('Invalid invite link');
    const { groupId, inviteId } = codeSnapshot.data()!;
    const inviteSnapshot = await this.firebase.db.collection('groups').doc(groupId)
      .collection('invites').doc(inviteId).get();
    if (!inviteSnapshot.exists) throw new NotFoundException('Invalid invite link');
    const invite = inviteSnapshot.data() as InviteRecord;
    const groupSnapshot = await this.firebase.db.collection('groups').doc(groupId).get();
    if (!groupSnapshot.exists) throw new NotFoundException('Group not found');
    const members = await this.firebase.db.collection('groups').doc(groupId).collection('members').get();
    return {
      group: {
        id: groupId,
        name: groupSnapshot.data()!.name,
        description: groupSnapshot.data()!.description ?? null,
        avatarUrl: groupSnapshot.data()!.avatarUrl ?? null,
        memberCount: members.size,
      },
      invite: {
        id: invite.id,
        code: invite.code,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        useCount: invite.useCount,
        valid: this.isValid(invite),
      },
    };
  }

  async joinViaInvite(currentUserId: string, code: string) {
    const codeSnapshot = await this.firebase.db.collection('inviteCodes').doc(code).get();
    if (!codeSnapshot.exists) throw new NotFoundException('Invalid invite link');
    const { groupId, inviteId } = codeSnapshot.data()!;
    const inviteRef = this.firebase.db.collection('groups').doc(groupId)
      .collection('invites').doc(inviteId);
    const memberRef = this.firebase.db.collection('groups').doc(groupId)
      .collection('members').doc(currentUserId);

    await this.firebase.db.runTransaction(async (transaction) => {
      const [inviteSnapshot, memberSnapshot] = await Promise.all([
        transaction.get(inviteRef),
        transaction.get(memberRef),
      ]);
      if (!inviteSnapshot.exists) throw new NotFoundException('Invalid invite link');
      if (memberSnapshot.exists) throw new ConflictException('Already a member of this group');
      const invite = inviteSnapshot.data() as InviteRecord;
      if (!this.isValid(invite)) throw new BadRequestException('This invite link is no longer valid');
      transaction.set(memberRef, {
        userId: currentUserId,
        role: 'MEMBER',
        joinedAt: new Date().toISOString(),
      });
      transaction.update(inviteRef, { useCount: invite.useCount + 1 });
    });

    return { message: 'Successfully joined group', groupId };
  }

  async revokeInvite(currentUserId: string, groupId: string, inviteId: string) {
    const membership = await this.getMembership(groupId, currentUserId);
    if (membership?.role !== 'ADMIN') throw new ForbiddenException('Only admins can revoke invite links');
    const inviteRef = this.firebase.db.collection('groups').doc(groupId).collection('invites').doc(inviteId);
    const snapshot = await inviteRef.get();
    if (!snapshot.exists) throw new NotFoundException('Invite not found');
    const invite = snapshot.data() as InviteRecord;
    const batch = this.firebase.db.batch();
    batch.update(inviteRef, { revokedAt: new Date().toISOString() });
    batch.delete(this.firebase.db.collection('inviteCodes').doc(invite.code));
    await batch.commit();
    return { message: 'Invite link revoked' };
  }

  private async getMembership(groupId: string, userId: string) {
    const snapshot = await this.firebase.db.collection('groups').doc(groupId)
      .collection('members').doc(userId).get();
    return snapshot.exists ? snapshot.data() : null;
  }

  private isValid(invite: InviteRecord) {
    const expired = invite.expiresAt !== null && Date.parse(invite.expiresAt) <= Date.now();
    const exhausted = invite.maxUses !== null && invite.useCount >= invite.maxUses;
    return !invite.revokedAt && !expired && !exhausted;
  }

  private formatInvite(invite: InviteRecord) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return {
      id: invite.id,
      groupId: invite.groupId,
      code: invite.code,
      inviteUrl: `${frontendUrl}/invite/${invite.code}`,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      useCount: invite.useCount,
      createdAt: invite.createdAt,
    };
  }
}
