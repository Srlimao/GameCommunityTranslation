import { db } from '../database/sqlite_client.ts';
import { AuthRepository } from '../features/auth/auth_repository.ts';

const targetUsername = process.argv[2] || 'whell2';

try {
  const user = db.prepare('SELECT id, username, role FROM users WHERE username = ?').get(targetUsername.trim().toLowerCase()) as { id: string; username: string; role: string } | undefined;

  if (!user) {
    console.error(`❌ User "${targetUsername}" not found in database.`);
    console.log('Available users:', AuthRepository.getAllUsers().map(u => `${u.username} (${u.role})`).join(', '));
    process.exit(1);
  }

  AuthRepository.updateUserRole(user.id, 'admin');
  console.log(`🎉 Successfully promoted "${user.username}" to ADMIN!`);
} catch (err: any) {
  console.error('❌ Error updating user role:', err.message);
  process.exit(1);
}
