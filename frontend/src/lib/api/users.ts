import { api } from './client';

export interface User {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  online: boolean;
  createdAt: string;
}

export const usersApi = {
  async search(username: string): Promise<User[]> {
    return api.get<User[]>(`/users/search?username=${encodeURIComponent(username)}`);
  },

  async getById(id: string): Promise<User> {
    return api.get<User>(`/users/${id}`);
  },
};