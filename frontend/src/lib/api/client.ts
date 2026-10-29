const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

function unwrapResponse<T>(body: T | ApiEnvelope<T>): T {
  if (
    typeof body === 'object' &&
    body !== null &&
    'data' in body &&
    'statusCode' in body &&
    'timestamp' in body
  ) {
    return (body as ApiEnvelope<T>).data;
  }

  return body as T;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  
  setAccessToken(accessToken: string | null) {
    this.accessToken = accessToken;
  }

  clearTokens() {
    this.accessToken = null;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const { getFirebaseAuth } = await import('../firebase');
        const currentUser = getFirebaseAuth().currentUser;
        if (!currentUser) throw new Error('Your Firebase session has ended.');
        const idToken = await currentUser.getIdToken(true);
        this.setAccessToken(idToken);
        return idToken;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async fetchApi(url: string, options: RequestInit): Promise<Response> {
    try {
      return await fetch(url, options);
    } catch (cause) {
      if (cause instanceof TypeError) {
        throw new Error(
          `Tidak dapat terhubung ke server (${API_BASE_URL}). Pastikan backend berjalan dan alamat frontend diizinkan oleh CORS.`,
        );
      }
      throw cause;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await this.fetchApi(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      try {
        const newAccessToken = await this.refreshAccessToken();
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`;
        response = await this.fetchApi(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } catch {
        this.clearTokens();
        if (typeof window !== 'undefined') {
          const { getFirebaseAuth } = await import('../firebase');
          const { signOut } = await import('firebase/auth');
          await signOut(getFirebaseAuth());
          window.location.href = '/login';
        }
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiError(response.status, error.message || 'Request failed', error);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return unwrapResponse<T>(await response.json());
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient();