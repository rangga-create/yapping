import { api } from './client';

export interface Invite {
  id: string;
  groupId: string;
  code: string;
  inviteUrl: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  createdAt: string;
}

export interface InvitePreview {
  group: {
    id: string;
    name: string;
    description: string | null;
    avatarUrl: string | null;
    memberCount: number;
  };
  invite: {
    id: string;
    code: string;
    expiresAt: string | null;
    maxUses: number | null;
    useCount: number;
    valid: boolean;
  };
}

export interface CreateInviteData {
  expiresIn?: number;
  maxUses?: number;
}

export const invitesApi = {
  async create(groupId: string, data: CreateInviteData = {}): Promise<Invite> {
    return api.post<Invite>(`/groups/${groupId}/invites`, data);
  },

  async getAll(groupId: string): Promise<Invite[]> {
    return api.get<Invite[]>(`/groups/${groupId}/invites`);
  },

  async revoke(groupId: string, inviteId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/groups/${groupId}/invites/${inviteId}`);
  },

  async preview(code: string): Promise<InvitePreview> {
    return api.get<InvitePreview>(`/invites/${code}`);
  },

  async join(code: string): Promise<{ message: string; groupId: string }> {
    return api.post<{ message: string; groupId: string }>(`/invites/${code}/join`, {});
  },
};