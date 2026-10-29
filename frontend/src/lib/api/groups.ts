import { api } from './client';

export type UserRole = 'ADMIN' | 'MEMBER';

export interface GroupMember {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  role: UserRole;
  joinedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  currentUserRole: UserRole | null;
  members?: GroupMember[];
}

export interface CreateGroupData {
  name: string;
  description?: string;
  memberIds?: string[];
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface AddMemberData {
  userId: string;
}

export interface UpdateRoleData {
  role: UserRole;
}

export const groupsApi = {
  async create(data: CreateGroupData): Promise<Group> {
    return api.post<Group>('/groups', data);
  },

  async getAll(): Promise<Group[]> {
    return api.get<Group[]>('/groups');
  },

  async getById(groupId: string): Promise<Group> {
    return api.get<Group>(`/groups/${groupId}`);
  },

  async getPreview(groupId: string): Promise<Group> {
    return api.get<Group>(`/groups/${groupId}/preview`);
  },

  async update(groupId: string, data: UpdateGroupData): Promise<Group> {
    return api.patch<Group>(`/groups/${groupId}`, data);
  },

  async remove(groupId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/groups/${groupId}`);
  },

  async getMembers(groupId: string): Promise<GroupMember[]> {
    return api.get<GroupMember[]>(`/groups/${groupId}/members`);
  },

  async addMember(groupId: string, data: AddMemberData): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/groups/${groupId}/members`, data);
  },

  async removeMember(groupId: string, userId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/groups/${groupId}/members/${userId}`);
  },

  async updateRole(groupId: string, userId: string, data: UpdateRoleData): Promise<{ message: string }> {
    return api.patch<{ message: string }>(`/groups/${groupId}/members/${userId}/role`, data);
  },

  async leave(groupId: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/groups/${groupId}/leave`, {});
  },
};