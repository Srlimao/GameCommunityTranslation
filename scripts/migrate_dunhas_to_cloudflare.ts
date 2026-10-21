/**
 * Migrates all LocalTranslator collections (lt_games, lt_users, lt_settings, lt_glossary, lt_templates, lt_translations)
 * from a source RemoteJsonDb endpoint (default: https://db.dunhas.com/api) to a target endpoint
 * (default: https://translator.dunhas.com/api).
 */
import dotenv from 'dotenv';
dotenv.config();

const SOURCE_API = process.env.SOURCE_DB_URL || 'https://db.dunhas.com/api';
const TARGET_API = process.env.TARGET_DB_URL || 'https://translator.dunhas.com/api';
const API_KEY = process.env.VITE_GCP_DB_API_KEY || '1b4a19fdc1eda3f481543b0f25b01ab428e0f6467ad7c9c1';

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
};

async function listAllFromSource(collection: string): Promise<Array<{ id: string; data: any }>> {
  const all: Array<{ id: string; data: any }> = [];
  const limit = 50;
  let offset = 0;

  while (true) {
    const res = await fetch(`${SOURCE_API}/${encodeURIComponent(collection)}?limit=${limit}&offset=${offset}`, {
      headers,
    });
    if (!res.ok) throw new Error(`Source list failed [${collection}]: ${res.status}`);
    const json: any = await res.json();
    const results = json.results || [];
    for (const r of results) {
      all.push({ id: r.id, data: r.data });
    }
    offset += limit;
    if (results.length < limit || all.length >= (json.count || 0)) break;
  }
  return all;
}

async function getDocFromSource(collection: string, id: string): Promise<any | null> {
  const res = await fetch(`${SOURCE_API}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
    headers,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Source getDoc failed [${collection}/${id}]: ${res.status}`);
  const json: any = await res.json();
  return json.data ?? null;
}

async function upsertToTarget(collection: string, id: string, data: any): Promise<void> {
  const res = await fetch(`${TARGET_API}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Target upsert failed [${collection}/${id}] (${res.status}): ${txt}`);
  }
}

async function batchUpsertToTarget(collection: string, docs: Array<{ id: string; data: any }>): Promise<void> {
  if (docs.length === 0) return;
  const res = await fetch(`${TARGET_API}/_batch/${encodeURIComponent(collection)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ docs }),
  });
  if (!res.ok) {
    // Fallback to individual upserts
    for (const d of docs) {
      await upsertToTarget(collection, d.id, d.data);
    }
  }
}

async function migrateSimpleCollection(collection: string) {
  console.log(`\n📦 Migrating collection: ${collection}...`);
  const docs = await listAllFromSource(collection);
  console.log(`   Found ${docs.length} documents in ${collection}. Uploading to Cloudflare D1...`);
  await batchUpsertToTarget(collection, docs);
  console.log(`   ✅ Migrated ${docs.length} documents in ${collection}.`);
  return docs;
}

async function main() {
  console.log(`🚀 Starting Migration from ${SOURCE_API} -> ${TARGET_API}`);

  // 1. Check Target Health
  const healthRes = await fetch(`${TARGET_API}/health`);
  if (!healthRes.ok) {
    throw new Error(`Target API (${TARGET_API}/health) is not reachable yet: ${healthRes.status}`);
  }
  console.log(`✅ Target Cloudflare Edge API healthy:`, await healthRes.json());

  // 2. Migrate core metadata collections
  const games = await migrateSimpleCollection('lt_games');
  await migrateSimpleCollection('lt_users');
  await migrateSimpleCollection('lt_settings');
  await migrateSimpleCollection('lt_glossary');

  // 3. Migrate templates & translation chunks per game
  for (const gDoc of games) {
    const game = gDoc.data;
    console.log(`\n🎮 Migrating Game Assets: ${game.name} (${game.id})`);

    // 3a. Templates (lt_templates)
    const tplMeta = await getDocFromSource('lt_templates', `${game.id}_tpl_meta`);
    if (tplMeta && tplMeta.chunksCount) {
      await upsertToTarget('lt_templates', `${game.id}_tpl_meta`, tplMeta);
      for (let i = 0; i < tplMeta.chunksCount; i++) {
        const partId = `${game.id}_tpl_${i}`;
        const partDoc = await getDocFromSource('lt_templates', partId);
        if (partDoc) {
          await upsertToTarget('lt_templates', partId, partDoc);
          console.log(`   Uploaded template chunk ${i + 1}/${tplMeta.chunksCount}`);
        }
      }
    }

    // 3b. Translation Chunks (lt_translations)
    for (const lang of game.languages || []) {
      const metaId = `${game.id}_${lang.language_code}_meta`;
      const meta = await getDocFromSource('lt_translations', metaId);
      if (!meta || !meta.totalChunks) continue;

      await upsertToTarget('lt_translations', metaId, meta);
      console.log(`   Migrating ${meta.totalChunks} translation chunks for ${lang.language_code}...`);

      const BATCH_SIZE = 8;
      for (let c = 0; c < meta.totalChunks; c += BATCH_SIZE) {
        const sliceIndices = Array.from(
          { length: Math.min(BATCH_SIZE, meta.totalChunks - c) },
          (_, idx) => c + idx
        );
        const docs = await Promise.all(
          sliceIndices.map(async (chunkIdx) => {
            const chunkId = `${game.id}_${lang.language_code}_chunk_${chunkIdx}`;
            const data = await getDocFromSource('lt_translations', chunkId);
            return data ? { id: chunkId, data } : null;
          })
        );
        const validDocs = docs.filter(Boolean) as Array<{ id: string; data: any }>;
        await batchUpsertToTarget('lt_translations', validDocs);
        process.stdout.write(`   -> ${Math.min(c + BATCH_SIZE, meta.totalChunks)}/${meta.totalChunks} chunks\r`);
      }
      console.log(`\n   ✅ Completed ${meta.totalChunks} chunks for ${game.name} (${lang.language_code})`);
    }
  }

  console.log(`\n🎉 ALL DATA MIGRATED TO CLOUDFLARE D1 SUCCESSFULLY!`);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
