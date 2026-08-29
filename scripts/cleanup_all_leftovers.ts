import dotenv from 'dotenv';
dotenv.config();

import { RemoteJsonDb } from '../client/src/services/remote_json_db.ts';
import { db } from '../server/database/sqlite_client.ts';

async function cleanup() {
  console.log('🧹 Cleaning up leftover test artifacts...');

  // 1. Clean up remote test users
  console.log('\n--- 1. Cleaning Remote Users ---');
  try {
    const remoteUsers = await RemoteJsonDb.listAllDocs('lt_users');
    for (const u of remoteUsers) {
      if (u.data?.username?.startsWith('user_') || u.data?.username?.startsWith('testuser_') || u.data?.username?.startsWith('testadmin_') || u.data?.username?.startsWith('localizer_')) {
        console.log(`  Deleting remote test user: ${u.data.username} (${u.id})`);
        await RemoteJsonDb.deleteDoc('lt_users', u.id);
      }
    }
  } catch (err: any) {
    console.error('Remote users cleanup error:', err.message);
  }

  // 2. Clean up remote test games & orphaned translation chunks
  console.log('\n--- 2. Cleaning Remote Games & Templates ---');
  try {
    const remoteGames = await RemoteJsonDb.listAllDocs('lt_games');
    for (const g of remoteGames) {
      const name = g.data?.name || '';
      if (name.includes('Aetheria Lore Hub') || name.includes('Chronicles of Solaria') || name.includes('Custom Schema Game') || name.includes('Performance Test') || name.includes('Massive Scale')) {
        console.log(`  Deleting remote test game: ${name} (${g.id})`);
        await RemoteJsonDb.deleteDoc('lt_games', g.id);
        await RemoteJsonDb.deleteDoc('lt_templates', `${g.id}_template`);
        await RemoteJsonDb.deleteDoc('lt_templates', `${g.id}_tpl_meta`);
        await RemoteJsonDb.deleteDoc('lt_glossary', g.id);
      }
    }
  } catch (err: any) {
    console.error('Remote games cleanup error:', err.message);
  }

  // 3. Clean up SQLite database leftover test games & users
  console.log('\n--- 3. Cleaning SQLite Database ---');
  try {
    const validIds = ['7cb43673-83fb-4a34-ba3b-54c3ebb6d592', '469b1aa9-2d4a-4337-b7f9-79ba8f63b99d', '86c0644d-1edd-4cf1-88cd-af56e1feefd9'];
    const deletedGames = db.prepare("DELETE FROM games WHERE id NOT IN (?, ?, ?)").run(...validIds);
    console.log(`  Deleted ${deletedGames.changes} test games from SQLite.`);

    const deletedUsers = db.prepare("DELETE FROM users WHERE username LIKE 'user_%' OR username LIKE 'testuser_%' OR username LIKE 'testadmin_%' OR username LIKE 'localizer_%'").run();
    console.log(`  Deleted ${deletedUsers.changes} test users from SQLite.`);
  } catch (err: any) {
    console.error('SQLite cleanup error:', err.message);
  }

  console.log('\n✅ Cleanup complete!');
}

cleanup().catch(console.error);
