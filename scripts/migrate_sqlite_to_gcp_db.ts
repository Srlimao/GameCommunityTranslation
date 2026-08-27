import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.SQLITE_DB_PATH || './data/translator.db';
const GCP_DB_BASE_URL = process.env.GCP_DB_BASE_URL || process.env.VITE_GCP_DB_BASE_URL || 'https://db.dunhas.com/api';
const GCP_API_KEY = process.env.GCP_API_KEY || process.env.VITE_GCP_DB_API_KEY || '';
const CHUNK_SIZE = 500;
const TEMPLATE_CHUNK_SIZE = 3 * 1024 * 1024; // 3MB

async function upsertDoc(collection: string, id: string, data: any) {
  const url = `${GCP_DB_BASE_URL}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': GCP_API_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to upsert [${collection}/${id}]: ${res.status} ${txt}`);
  }
}

async function migrate() {
  console.log('====================================================');
  console.log('🚀 Starting SQLite to GCP JSON Storage Migration...');
  console.log(`📁 Source SQLite: ${path.resolve(DB_PATH)}`);
  console.log(`🌐 Target GCP DB: ${GCP_DB_BASE_URL}`);
  console.log('====================================================\n');

  const db = new Database(DB_PATH);

  // 1. Migrate Games
  const games = db.prepare('SELECT * FROM games').all() as any[];
  console.log(`[1/4] Found ${games.length} games to migrate...`);

  for (const g of games) {
    const languages = db.prepare('SELECT * FROM languages WHERE game_id = ?').all(g.id) as any[];
    const totalKeysRow = db.prepare('SELECT count(*) as c FROM base_keys WHERE game_id = ?').get(g.id) as any;
    const glossaryCountRow = db.prepare('SELECT count(*) as c FROM glossary WHERE game_id = ?').get(g.id) as any;

    let whitelistTags: string[] = [];
    try {
      if (g.whitelist_tags) whitelistTags = JSON.parse(g.whitelist_tags);
    } catch {}

    const gameDoc = {
      id: g.id,
      name: g.name,
      description: g.description || '',
      context_prompt: g.context_prompt || '',
      base_language: g.base_language || 'en-US',
      totalKeys: totalKeysRow.c || 0,
      glossaryCount: glossaryCountRow.c || 0,
      languages: languages.map((l) => ({
        language_id: l.id,
        language_code: l.language_code,
        language_name: l.language_name,
        total_keys: totalKeysRow.c || 0,
        translated_keys: 0,
        approved_keys: 0,
        progress_percentage: 0,
      })),
      schema_config: g.schema_config || '',
      whitelist_tags: whitelistTags,
      created_at: g.created_at || new Date().toISOString(),
      updated_at: g.updated_at || new Date().toISOString(),
    };

    await upsertDoc('lt_games', g.id, gameDoc);
    console.log(`  ✓ Migrated game metadata: "${g.name}" (${g.id})`);

    // Migrate Raw Template if present
    if (g.raw_json_template) {
      const tpl = g.raw_json_template;
      const chunksCount = Math.ceil(tpl.length / TEMPLATE_CHUNK_SIZE);
      for (let i = 0; i < chunksCount; i++) {
        const part = tpl.slice(i * TEMPLATE_CHUNK_SIZE, (i + 1) * TEMPLATE_CHUNK_SIZE);
        await upsertDoc('lt_templates', `${g.id}_tpl_${i}`, { part, index: i, chunksCount });
      }
      await upsertDoc('lt_templates', `${g.id}_tpl_meta`, { chunksCount });
      console.log(`  ✓ Migrated template (${(tpl.length / 1024 / 1024).toFixed(2)} MB in ${chunksCount} chunks)`);
    }

    // 2. Migrate Glossary
    const glossaryEntries = db.prepare('SELECT * FROM glossary WHERE game_id = ?').all(g.id) as any[];
    if (glossaryEntries.length > 0) {
      const glossaryDoc = {
        game_id: g.id,
        entries: glossaryEntries.map((e) => ({
          id: e.id,
          game_id: e.game_id,
          source_term: e.source_term,
          target_term: e.target_term,
          target_language: e.target_language || '',
          category: e.category || 'General',
          notes: e.notes || '',
          created_at: e.created_at,
        })),
      };
      await upsertDoc('lt_glossary', g.id, glossaryDoc);
      console.log(`  ✓ Migrated ${glossaryEntries.length} glossary terms`);
    }

    // 3. Migrate Base Keys & Translations
    for (const lang of languages) {
      console.log(`  📦 Migrating translations for [${lang.language_code}]...`);
      const query = `
        SELECT 
          t.id as id,
          k.id as key_id,
          k.key_path as key_path,
          k.source_text as source_text,
          COALESCE(k.context_note, '') as context_note,
          k.order_index as order_index,
          l.id as language_id,
          l.language_code as language_code,
          COALESCE(t.translated_text, '') as translated_text,
          COALESCE(t.status, 'untranslated') as status,
          t.model_used as model_used,
          t.updated_at as updated_at
        FROM base_keys k
        CROSS JOIN languages l ON l.id = ?
        LEFT JOIN translations t ON t.key_id = k.id AND t.language_id = l.id
        WHERE k.game_id = ?
        ORDER BY k.order_index ASC
      `;
      const allRows = db.prepare(query).all(lang.id, g.id) as any[];
      const totalChunks = Math.ceil(allRows.length / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        const chunkItems = allRows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const chunkId = `${g.id}_${lang.language_code}_chunk_${i}`;
        const doc = {
          chunk_id: chunkId,
          game_id: g.id,
          language_code: lang.language_code,
          chunk_index: i,
          items: chunkItems,
        };
        await upsertDoc('lt_translations', chunkId, doc);
        if (i % 20 === 0 || i === totalChunks - 1) {
          process.stdout.write(`    ↳ Chunk ${i + 1}/${totalChunks} uploaded\r`);
        }
      }

      await upsertDoc('lt_translations', `${g.id}_${lang.language_code}_meta`, {
        game_id: g.id,
        language_code: lang.language_code,
        totalChunks,
        totalItems: allRows.length,
      });

      console.log(`\n    ✓ Completed ${allRows.length} strings in ${totalChunks} chunks for ${lang.language_code}`);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 Migration to GCP JSON Storage completed successfully!');
  console.log('====================================================\n');
}

migrate().catch((err) => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
