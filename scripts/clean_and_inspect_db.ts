import dotenv from 'dotenv';
dotenv.config();

import { RemoteJsonDb } from '../client/src/services/remote_json_db.ts';
import { db } from '../server/database/sqlite_client.ts';

async function main() {
  console.log('--- 1. Inspecting SQLite Database ---');
  try {
    const sqliteGames = db.prepare('SELECT id, name FROM games').all();
    console.log(`SQLite Games (${sqliteGames.length}):`, sqliteGames);
    const sqliteUsers = db.prepare('SELECT id, username FROM users').all();
    console.log(`SQLite Users (${sqliteUsers.length}):`, sqliteUsers);
  } catch (err: any) {
    console.error('SQLite read error:', err.message);
  }

  console.log('\n--- 2. Inspecting Remote Cloud DB (db.dunhas.com) ---');
  try {
    const remoteGames = await RemoteJsonDb.listAllDocs('lt_games');
    console.log(`Remote Games (${remoteGames.length}):`, remoteGames.map(g => ({ id: g.id, name: g.data?.name })));

    const remoteUsers = await RemoteJsonDb.listAllDocs('lt_users');
    console.log(`Remote Users (${remoteUsers.length}):`, remoteUsers.map(u => ({ id: u.id, username: u.data?.username, role: u.data?.role })));
  } catch (err: any) {
    console.error('Remote DB read error:', err.message);
  }
}

main().catch(console.error);
