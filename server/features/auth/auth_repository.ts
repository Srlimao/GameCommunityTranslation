import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/sqlite_client.ts';
import { User, UserRole, UserWithCredentials, AuthSession } from '../../types/domain_types.ts';

export class AuthRepository {
  private static hashPassword(password: string, salt: string): string {
    return crypto.scryptSync(password, salt, 64).toString('hex');
  }

  private static generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  static ensureDefaultAdmin(): void {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (countRow.count === 0) {
      const id = uuidv4();
      const salt = this.generateSalt();
      const passwordHash = this.hashPassword('admin123', salt);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, username, password_hash, salt, role, display_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, 'admin', passwordHash, salt, 'admin', 'Administrator', now, now);

      console.log('👑 [Auth] Default admin account seeded: username: "admin" / password: "admin123"');
    }
  }

  static createUser(params: {
    username: string;
    password: string;
    role?: UserRole;
    displayName?: string;
  }): User {
    const { username, password, role = 'translator', displayName = '' } = params;
    const cleanUsername = username.trim().toLowerCase();

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      throw new Error(`Username "${cleanUsername}" is already taken.`);
    }

    const id = uuidv4();
    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(password, salt);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, password_hash, salt, role, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, cleanUsername, passwordHash, salt, role, displayName || cleanUsername, now, now);

    return {
      id,
      username: cleanUsername,
      role,
      display_name: displayName || cleanUsername,
      created_at: now,
      updated_at: now,
    };
  }

  static validateUser(username: string, password: string): User | null {
    const cleanUsername = username.trim().toLowerCase();
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername) as UserWithCredentials | undefined;

    if (!row) return null;

    const computedHash = this.hashPassword(password, row.salt);
    if (crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(row.password_hash, 'hex'))) {
      return {
        id: row.id,
        username: row.username,
        role: row.role,
        display_name: row.display_name,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }

    return null;
  }

  static getUserById(id: string): User | null {
    const row = db.prepare('SELECT id, username, role, display_name, created_at, updated_at FROM users WHERE id = ?').get(id) as User | undefined;
    return row || null;
  }

  static getAllUsers(): User[] {
    return db.prepare('SELECT id, username, role, display_name, created_at, updated_at FROM users ORDER BY created_at ASC').all() as User[];
  }

  static updateUserRole(id: string, role: UserRole): User {
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, now, id);
    const user = this.getUserById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  static deleteUser(id: string): boolean {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  }

  static createSession(userId: string): AuthSession {
    const token = crypto.randomBytes(32).toString('hex');
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found for session creation');

    // 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, expiresAt, now);

    return { token, user, expires_at: expiresAt };
  }

  static validateSession(token: string): User | null {
    if (!token) return null;
    const session = db.prepare(`
      SELECT s.token, s.expires_at, u.id, u.username, u.role, u.display_name, u.created_at, u.updated_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
    `).get(token) as (User & { token: string; expires_at: string }) | undefined;

    if (!session) return null;

    // Check expiration
    if (new Date(session.expires_at).getTime() < Date.now()) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return null;
    }

    return {
      id: session.id,
      username: session.username,
      role: session.role,
      display_name: session.display_name,
      created_at: session.created_at,
      updated_at: session.updated_at,
    };
  }

  static deleteSession(token: string): boolean {
    const result = db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return result.changes > 0;
  }
}
