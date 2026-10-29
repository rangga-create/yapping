import { api } from './client';

export interface MessageSender {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface MessageReply {
  id: string;
  content: string;
  sender: {
    id: string;
    displayName: string;
  };
}

export interface MessageMention {
  id: string;
  mentionedUser: {
    id: string;
    username: string;
    displayName: string;
  };
}

export interface Message {
  id: string;
  groupId: string;
  sender: MessageSender;
  content: string;
  replyTo: MessageReply | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  mentions: MessageMention[];
}

export interface PaginatedMessages {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface SendMessageData {
  content: string;
  replyToId?: string;
}

export interface EditMessageData {
  content: string;
}

export interface PinMessageData {
  isPinned: boolean;
}

export interface MessageQuery {
  limit?: number;
  before?: string;
  search?: string;
}

export const messagesApi = {
  async getMessages(groupId: string, query: MessageQuery = {}): Promise<PaginatedMessages> {
    const params = new URLSearchParams();
    if (query.limit) params.set('limit', query.limit.toString());
    if (query.before) params.set('before', query.before);
    if (query.search) params.set('search', query.search);
    const queryString = params.toString();
    return api.get<PaginatedMessages>(`/groups/${groupId}/messages${queryString ? `?${queryString}` : ''}`);
  },

  async getPinnedMessages(groupId: string): Promise<Message[]> {
    return api.get<Message[]>(`/groups/${groupId}/messages/pinned`);
  },

  async sendMessage(groupId: string, data: SendMessageData): Promise<Message> {
    return api.post<Message>(`/groups/${groupId}/messages`, data);
  },

  async editMessage(groupId: string, messageId: string, data: EditMessageData): Promise<Message> {
    return api.patch<Message>(`/groups/${groupId}/messages/${messageId}`, data);
  },

  async deleteMessage(groupId: string, messageId: string): Promise<{ id: string; deleted: boolean }> {
    return api.delete<{ id: string; deleted: boolean }>(`/groups/${groupId}/messages/${messageId}`);
  },

  async pinMessage(groupId: string, messageId: string, data: PinMessageData): Promise<{ id: string; isPinned: boolean }> {
    return api.patch<{ id: string; isPinned: boolean }>(`/groups/${groupId}/messages/${messageId}/pin`, data);
  },
};