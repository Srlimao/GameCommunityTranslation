import { v4 as uuidv4 } from 'uuid';
import { User, UserRole, AuthSession } from '../types/client_types.ts';
import { RemoteJsonDb } from './remote_json_db.ts';
import { LocalCacheStore } from './local_cache_store.ts';

const COLLECTION_USERS = 'lt_users';
const STORAGE_SESSION_KEY = 'lt_auth_session';

export interface UserRecord extends User {
  password_hash: string;
  salt: string;
}

export class CloudUsersStore {
  private static async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + ':' + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private static generateSalt(): string {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  static async getMe(): Promise<User | null> {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) {
        const session: AuthSession = JSON.parse(saved);
        if (new Date(session.expires_at) > new Date()) {
          return session.user;
        }
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch {}
    return null;
  }

  static async login(username: string, password: string): Promise<AuthSession> {
    const cleanUsername = username.trim().toLowerCase();
    let doc = await RemoteJsonDb.getDoc<UserRecord>(COLLECTION_USERS, cleanUsername);

    // If no users exist in the database at all, seed the default admin
    if (!doc && cleanUsername === 'admin' && password === 'admin123') {
      return await this.register('admin', 'admin123', 'Administrator');
    }

    if (!doc) {
      throw new Error('Invalid username or password.');
    }

    const computedHash = await this.hashPassword(password, doc.salt);
    if (computedHash !== doc.password_hash) {
      throw new Error('Invalid username or password.');
    }

    const user: User = {
      id: doc.id,
      username: doc.username,
      display_name: doc.display_name,
      role: doc.role,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };

    const session: AuthSession = {
      token: uuidv4(),
      user,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    return session;
  }

  static async register(username: string, password: string, displayName?: string): Promise<AuthSession> {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters.');
    }
    if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }

    const existing = await RemoteJsonDb.getDoc<UserRecord>(COLLECTION_USERS, cleanUsername);
    if (existing) {
      throw new Error(`Username "${cleanUsername}" is already registered.`);
    }

    const allUsers = await this.getAllUsers();
    const role: UserRole = allUsers.length === 0 || cleanUsername === 'admin' ? 'admin' : 'translator';
    const salt = this.generateSalt();
    const password_hash = await this.hashPassword(password, salt);
    const now = new Date().toISOString();

    const record: UserRecord = {
      id: uuidv4(),
      username: cleanUsername,
      display_name: displayName || cleanUsername,
      role,
      password_hash,
      salt,
      created_at: now,
      updated_at: now,
    };

    await RemoteJsonDb.upsertDoc(COLLECTION_USERS, cleanUsername, record);

    const user: User = {
      id: record.id,
      username: record.username,
      display_name: record.display_name,
      role: record.role,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };

    const session: AuthSession = {
      token: uuidv4(),
      user,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    return session;
  }

  static async createUser(username: string, password: string, displayName?: string): Promise<User> {
    const cleanUsername = username.trim().toLowerCase();
    const existing = await RemoteJsonDb.getDoc<UserRecord>(COLLECTION_USERS, cleanUsername);
    if (existing) {
      throw new Error(`User @${cleanUsername} already exists.`);
    }

    const salt = this.generateSalt();
    const password_hash = await this.hashPassword(password, salt);
    const now = new Date().toISOString();

    const record: UserRecord = {
      id: uuidv4(),
      username: cleanUsername,
      display_name: displayName || cleanUsername,
      role: 'translator',
      password_hash,
      salt,
      created_at: now,
      updated_at: now,
    };

    await RemoteJsonDb.upsertDoc(COLLECTION_USERS, cleanUsername, record);
    return {
      id: record.id,
      username: record.username,
      display_name: record.display_name,
      role: record.role,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }

  static async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  }

  static async getAllUsers(): Promise<User[]> {
    try {
      const docs = await RemoteJsonDb.listAllDocs<UserRecord>(COLLECTION_USERS);
      return docs.map((d) => ({
        id: d.data.id,
        username: d.data.username,
        display_name: d.data.display_name,
        role: d.data.role,
        created_at: d.data.created_at,
        updated_at: d.data.updated_at,
      }));
    } catch {
      return [];
    }
  }

  static async updateUserRole(id: string, role: UserRole): Promise<User> {
    const docs = await RemoteJsonDb.listAllDocs<UserRecord>(COLLECTION_USERS);
    const target = docs.find((d) => d.data.id === id);
    if (!target) throw new Error('User not found');

    const updated: UserRecord = {
      ...target.data,
      role,
      updated_at: new Date().toISOString(),
    };

    await RemoteJsonDb.upsertDoc(COLLECTION_USERS, target.id, updated);
    return {
      id: updated.id,
      username: updated.username,
      display_name: updated.display_name,
      role: updated.role,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  static async deleteUser(id: string): Promise<boolean> {
    const docs = await RemoteJsonDb.listAllDocs<UserRecord>(COLLECTION_USERS);
    const target = docs.find((d) => d.data.id === id);
    if (!target) return false;

    await RemoteJsonDb.deleteDoc(COLLECTION_USERS, target.id);
    return true;
  }
}
