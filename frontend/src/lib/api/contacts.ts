import { api } from './client';

export type ContactStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Contact {
  id: string;
  requester: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  recipient: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContactRequest {
  id: string;
  requester: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  status: ContactStatus;
  createdAt: string;
}

export const contactsApi = {
  async getContacts(): Promise<Contact[]> {
    return api.get<Contact[]>('/contacts');
  },

  async getPendingRequests(): Promise<ContactRequest[]> {
    return api.get<ContactRequest[]>('/contacts/requests');
  },

  async sendRequest(username: string): Promise<Contact> {
    return api.post<Contact>('/contacts/requests', { username });
  },

  async respondToRequest(requestId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<Contact | { message: string }> {
    return api.patch<Contact | { message: string }>(`/contacts/requests/${requestId}`, { status });
  },

  async removeContact(userId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/contacts/${userId}`);
  },
};