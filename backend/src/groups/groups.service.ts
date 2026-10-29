import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { AddMemberDto, CreateGroupDto, UpdateGroupDto, UpdateMemberRoleDto } from './dto/groups.dto';

type UserRole = 'ADMIN' | 'MEMBER';
interface GroupRecord {
  name: string;
  description: string | null;
  avatarUrl: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class GroupsService {
  constructor(private readonly firebase: FirebaseService) {}

  async createGroup(currentUserId: string, dto: CreateGroupDto) {
    const now = new Date().toISOString();
    const groupRef = this.firebase.db.collection('groups').doc();
    const memberIds = [...new Set([currentUserId, ...(dto.memberIds ?? [])])];
    const batch = this.firebase.db.batch();
    batch.set(groupRef, {
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      avatarUrl: null,
      createdById: currentUserId,
      createdAt: now,
      updatedAt: now,
    });
    memberIds.forEach((userId) => batch.set(groupRef.collection('members').doc(userId), {
      userId,
      role: userId === currentUserId ? 'ADMIN' : 'MEMBER',
      joinedAt: now,
    }));
    await batch.commit();
    return this.getGroupById(currentUserId, groupRef.id);
  }

  async getGroups(currentUserId: string) {
    const groupSnapshots = await this.firebase.db.collection('groups').get();
    const groups = await Promise.all(groupSnapshots.docs.map(async (group) => {
      const membership = await group.ref.collection('members').doc(currentUserId).get();
      if (!membership.exists) return null;
      return this.formatGroup(group.id, group.data() as GroupRecord, currentUserId);
    }));
    return groups.filter((group): group is NonNullable<typeof group> => group !== null);
  }

  async getGroupById(currentUserId: string, groupId: string) {
    const group = await this.getGroup(groupId);
    const membership = await this.getMember(groupId, currentUserId);
    if (!membership) throw new ForbiddenException('Not a member of this group');
    return this.formatGroup(groupId, group, currentUserId);
  }

  async getGroupForPreview(currentUserId: string, groupId: string) {
    const group = await this.getGroup(groupId);
    return this.formatGroup(groupId, group, currentUserId, true);
  }

  async updateGroup(currentUserId: string, groupId: string, dto: UpdateGroupDto) {
    const membership = await this.requireMembership(groupId, currentUserId);
    if (membership.role !== 'ADMIN') throw new ForbiddenException('Only admins can update group');
    const groupRef = this.firebase.db.collection('groups').doc(groupId);
    await groupRef.update({
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.description !== undefined && { description: dto.description.trim() || null }),
      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl.trim() || null }),
      updatedAt: new Date().toISOString(),
    });
    return this.getGroupById(currentUserId, groupId);
  }

  async deleteGroup(currentUserId: string, groupId: string) {
    const membership = await this.requireMembership(groupId, currentUserId);
    if (membership.role !== 'ADMIN') throw new ForbiddenException('Only admins can delete a group');
    const groupRef = this.firebase.db.collection('groups').doc(groupId);
    await this.firebase.db.recursiveDelete(groupRef);
    return { message: 'Group deleted successfully' };
  }

  async getMembers(currentUserId: string, groupId: string) {
    await this.requireMembership(groupId, currentUserId);
    const members = await this.firebase.db.collection('groups').doc(groupId)
      .collection('members').orderBy('role', 'desc').get();
    return Promise.all(members.docs.map(async (member) => ({
      id: member.id,
      user: await this.getPublicUser(member.id),
      role: member.data().role as UserRole,
      joinedAt: member.data().joinedAt,
    })));
  }

  async addMember(currentUserId: string, groupId: string, dto: AddMemberDto) {
    const membership = await this.requireMembership(groupId, currentUserId);
    if (membership.role !== 'ADMIN') throw new ForbiddenException('Only admins can add members');
    await this.getGroup(groupId);
    const user = await this.firebase.db.collection('users').doc(dto.userId).get();
    if (!user.exists) throw new NotFoundException('User not found');
    const memberRef = this.firebase.db.collection('groups').doc(groupId).collection('members').doc(dto.userId);
    if ((await memberRef.get()).exists) throw new ConflictException('User is already a member');
    await memberRef.set({ userId: dto.userId, role: 'MEMBER', joinedAt: new Date().toISOString() });
    return { message: 'Member added successfully' };
  }

  async removeMember(currentUserId: string, groupId: string, targetUserId: string) {
    const membership = await this.requireMembership(groupId, currentUserId);
    const target = await this.requireMembership(groupId, targetUserId);
    if (currentUserId !== targetUserId && membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can remove other members');
    }

    const group = await this.getGroup(groupId);
    if (group.createdById === targetUserId && currentUserId !== targetUserId) {
      throw new ForbiddenException('Cannot remove group creator');
    }

    const members = this.firebase.db.collection('groups').doc(groupId).collection('members');
    await this.firebase.db.runTransaction(async (transaction) => {
      const [targetSnapshot, admins] = await Promise.all([
        transaction.get(members.doc(targetUserId)),
        transaction.get(members.where('role', '==', 'ADMIN')),
      ]);
      if (!targetSnapshot.exists) throw new NotFoundException('Not a member of this group');
      if (target.role === 'ADMIN' && admins.size <= 1) throw new BadRequestException('Cannot remove the last admin');
      transaction.delete(members.doc(targetUserId));
    });
    return { message: 'Member removed successfully' };
  }

  async updateMemberRole(currentUserId: string, groupId: string, targetUserId: string, dto: UpdateMemberRoleDto) {
    const membership = await this.requireMembership(groupId, currentUserId);
    if (membership.role !== 'ADMIN') throw new ForbiddenException('Only admins can change roles');
    if (currentUserId === targetUserId) throw new BadRequestException('Cannot change your own role');
    const target = await this.requireMembership(groupId, targetUserId);
    const members = this.firebase.db.collection('groups').doc(groupId).collection('members');
    await this.firebase.db.runTransaction(async (transaction) => {
      const admins = await transaction.get(members.where('role', '==', 'ADMIN'));
      if (target.role === 'ADMIN' && dto.role === 'MEMBER' && admins.size <= 1) {
        throw new BadRequestException('Cannot demote the last admin');
      }
      transaction.update(members.doc(targetUserId), { role: dto.role });
    });
    return { message: 'Role updated successfully' };
  }

  async leaveGroup(currentUserId: string, groupId: string) {
    const membership = await this.requireMembership(groupId, currentUserId);
    const group = await this.getGroup(groupId);
    const members = this.firebase.db.collection('groups').doc(groupId).collection('members');
    if (group.createdById === currentUserId && membership.role === 'ADMIN') {
      const [admins, allMembers] = await Promise.all([
        members.where('role', '==', 'ADMIN').get(),
        members.get(),
      ]);
      if (admins.size <= 1 && allMembers.size > 1) {
        throw new BadRequestException('As the creator, you must promote another admin before leaving');
      }
      if (allMembers.size === 1) return this.deleteGroup(currentUserId, groupId);
    }
    await members.doc(currentUserId).delete();
    return { message: 'Left group successfully' };
  }

  private async getGroup(groupId: string): Promise<GroupRecord> {
    const snapshot = await this.firebase.db.collection('groups').doc(groupId).get();
    if (!snapshot.exists) throw new NotFoundException('Group not found');
    return snapshot.data() as GroupRecord;
  }

  private async getMember(groupId: string, userId: string) {
    const snapshot = await this.firebase.db.collection('groups').doc(groupId)
      .collection('members').doc(userId).get();
    return snapshot.exists ? snapshot.data() as { role: UserRole; joinedAt: string } : null;
  }

  private async requireMembership(groupId: string, userId: string) {
    const membership = await this.getMember(groupId, userId);
    if (!membership) throw new NotFoundException('Not a member of this group');
    return membership;
  }

  private async formatGroup(groupId: string, group: GroupRecord, currentUserId: string, allowPreview = false) {
    const membersSnapshot = await this.firebase.db.collection('groups').doc(groupId)
      .collection('members').get();
    const members = await Promise.all(membersSnapshot.docs.map(async (member) => ({
      id: member.id,
      user: await this.getPublicUser(member.id),
      role: member.data().role as UserRole,
      joinedAt: member.data().joinedAt,
    })));
    const currentMembership = members.find((member) => member.user.id === currentUserId);
    if (!allowPreview && !currentMembership) throw new ForbiddenException('Not a member of this group');
    return {
      id: groupId,
      ...group,
      memberCount: members.length,
      currentUserRole: currentMembership?.role ?? null,
      members,
    };
  }

  private async getPublicUser(userId: string) {
    const snapshot = await this.firebase.db.collection('users').doc(userId).get();
    if (!snapshot.exists) throw new NotFoundException('User not found');
    const user = snapshot.data()!;
    return {
      id: snapshot.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
    };
  }
}
