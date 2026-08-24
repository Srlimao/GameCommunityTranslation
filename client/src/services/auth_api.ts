import { User, AuthSession, UserRole } from '../types/client_types.ts';

const API_BASE = '/api/auth';

export const AuthApi = {
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  setToken(token: string | null): void {
    if (token) localStorage.setItem('auth_token', token);
    else localStorage.removeItem('auth_token');
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },

  async getMe(): Promise<User | null> {
    try {
      const res = await fetch(`${API_BASE}/me`, { headers: this.getAuthHeaders() });
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  },

  async login(username: string, password: string): Promise<AuthSession> {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Login failed');
    this.setToken(data.session.token);
    return data.session;
  },

  async register(username: string, password: string, displayName?: string): Promise<AuthSession> {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Registration failed');
    this.setToken(data.session.token);
    return data.session;
  },

  async createUser(username: string, password: string, displayName?: string): Promise<User> {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create user');
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/logout`, { method: 'POST', headers: this.getAuthHeaders() });
    } finally {
      this.setToken(null);
    }
  },

  async getAllUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, { headers: this.getAuthHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch users');
    return data.users || [];
  },

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}/role`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update user role');
    return data.user;
  },

  async deleteUser(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to delete user');
    return data.success;
  },
};
