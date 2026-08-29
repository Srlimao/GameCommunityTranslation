import { RemoteJsonDb } from '../client/src/services/remote_json_db.ts';
import { db } from '../server/database/sqlite_client.ts';

export async function cleanupTestArtifacts(options?: {
  gamePrefixes?: string[];
  userPrefixes?: string[];
}) {
  const gamePrefixes = options?.gamePrefixes || [
    'Aetheria Lore Hub',
    'Chronicles of Solaria',
    'Custom Schema Game',
    'Performance Test Game',
    'Massive Scale Game',
    'Aetheria: Realm of Shadows',
  ];

  const userPrefixes = options?.userPrefixes || [
    'user_',
    'testuser_',
    'testadmin_',
    'localizer_',
  ];

  // 1. Clean Remote DB Games & Translations & Glossary
  try {
    const remoteGames = await RemoteJsonDb.listAllDocs('lt_games');
    for (const g of remoteGames) {
      const name = g.data?.name || '';
      if (gamePrefixes.some((p) => name.startsWith(p) || name.includes(p))) {
        await RemoteJsonDb.deleteDoc('lt_games', g.id);
        await RemoteJsonDb.deleteDoc('lt_templates', `${g.id}_template`);
        await RemoteJsonDb.deleteDoc('lt_templates', `${g.id}_tpl_meta`);
        await RemoteJsonDb.deleteDoc('lt_glossary', g.id);

        if (g.data?.languages) {
          for (const lang of g.data.languages) {
            await RemoteJsonDb.deleteDoc('lt_translations', `${g.id}_${lang.language_code}_meta`);
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[Cleanup Helper] Remote games cleanup notice:', err.message);
  }

  // 2. Clean Remote DB Users
  try {
    const remoteUsers = await RemoteJsonDb.listAllDocs('lt_users');
    for (const u of remoteUsers) {
      const username = u.data?.username || u.id || '';
      if (userPrefixes.some((p) => username.startsWith(p))) {
        await RemoteJsonDb.deleteDoc('lt_users', u.id);
      }
    }
  } catch (err: any) {
    console.warn('[Cleanup Helper] Remote users cleanup notice:', err.message);
  }

  // 3. Clean SQLite Database
  try {
    for (const prefix of gamePrefixes) {
      db.prepare("DELETE FROM games WHERE name LIKE ?").run(`${prefix}%`);
    }
    for (const prefix of userPrefixes) {
      db.prepare("DELETE FROM users WHERE username LIKE ?").run(`${prefix}%`);
    }
  } catch (err: any) {
    console.warn('[Cleanup Helper] SQLite cleanup notice:', err.message);
  }
}
