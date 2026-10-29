import { api, ApiError } from './client';

export interface RegisterData {
  username: string;
  displayName: string;
}

export interface AuthResponse {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export const authApi = {
  async register(data: RegisterData): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/register', data);
  },

  async logout(): Promise<void> {
    await api.post<void>('/auth/logout', {});
  },

  async getProfile(): Promise<UserProfile> {
    return api.get<UserProfile>('/auth/me');
  },

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    return api.patch<UserProfile>('/auth/me', data);
  },
};

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}