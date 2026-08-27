import { User, AuthSession, UserRole } from '../types/client_types.ts';
import { CloudUsersStore } from './cloud_users_store.ts';

export const AuthApi = {
  getToken(): string | null {
    return localStorage.getItem('lt_auth_session');
  },

  async getMe(): Promise<User | null> {
    return await CloudUsersStore.getMe();
  },

  async login(username: string, password: string): Promise<AuthSession> {
    return await CloudUsersStore.login(username, password);
  },

  async register(username: string, password: string, displayName?: string): Promise<AuthSession> {
    return await CloudUsersStore.register(username, password, displayName);
  },

  async createUser(username: string, password: string, displayName?: string): Promise<User> {
    return await CloudUsersStore.createUser(username, password, displayName);
  },

  async logout(): Promise<void> {
    await CloudUsersStore.logout();
  },

  async getAllUsers(): Promise<User[]> {
    return await CloudUsersStore.getAllUsers();
  },

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    return await CloudUsersStore.updateUserRole(id, role);
  },

  async deleteUser(id: string): Promise<boolean> {
    return await CloudUsersStore.deleteUser(id);
  },
};
