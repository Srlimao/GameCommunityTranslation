import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import { KeyTranslationItem, LanguageProgress, TranslationStatus } from '../client/src/types/client_types.ts';
import { CHUNK_SIZE, TranslationChunkDoc } from '../client/src/services/translation_chunk_manager.ts';
import { CloudTranslationsStore } from '../client/src/services/cloud_translations_store.ts';
import { LocalCacheStore } from '../client/src/services/local_cache_store.ts';
import { CloudGamesStore } from '../client/src/services/cloud_games_store.ts';
import { RemoteJsonDb } from '../client/src/services/remote_json_db.ts';

// In-Memory Storage Engine for Unit Testing
const inMemoryCache = new Map<string, Map<string, any>>();
const remoteDbMock = new Map<string, Map<string, any>>();

function getStoreMap(storeName: string): Map<string, any> {
  if (!inMemoryCache.has(storeName)) {
    inMemoryCache.set(storeName, new Map());
  }
  return inMemoryCache.get(storeName)!;
}

function getRemoteCollection(collection: string): Map<string, any> {
  if (!remoteDbMock.has(collection)) {
    remoteDbMock.set(collection, new Map());
  }
  return remoteDbMock.get(collection)!;
}

// Intercept LocalCacheStore calls
(LocalCacheStore as any).get = async <T>(storeName: string, key: string): Promise<T | null> => {
  const store = getStoreMap(storeName);
  return (store.get(key) as T) ?? null;
};

(LocalCacheStore as any).getAll = async <T>(storeName: string): Promise<T[]> => {
  const store = getStoreMap(storeName);
  return Array.from(store.values()) as T[];
};

(LocalCacheStore as any).set = async <T>(storeName: string, value: any): Promise<void> => {
  const store = getStoreMap(storeName);
  const key = value.chunk_id || value.id || value.key || uuidv4();
  store.set(key, value);
};

// Intercept RemoteJsonDb calls
(RemoteJsonDb as any).getDoc = async <T>(collection: string, id: string): Promise<T | null> => {
  const col = getRemoteCollection(collection);
  return (col.get(id) as T) ?? null;
};

(RemoteJsonDb as any).upsertDoc = async <T>(collection: string, id: string, data: T): Promise<boolean> => {
  const col = getRemoteCollection(collection);
  col.set(id, data);
  return true;
};

describe('Translation Optimization & Counter Unit Tests', () => {
  const testGameId = 'game_perf_test_001';
  const testLangCode = 'pt-BR';
  const testLangId = 'lang_pt_br_001';

  beforeEach(() => {
    inMemoryCache.clear();
    remoteDbMock.clear();
  });

  describe('1. Chunk Index Mathematical Addressing', () => {
    it('should correctly map any order_index to its respective chunk index', () => {
      assert.strictEqual(CHUNK_SIZE, 1000);
      assert.strictEqual(Math.floor(0 / CHUNK_SIZE), 0);
      assert.strictEqual(Math.floor(999 / CHUNK_SIZE), 0);
      assert.strictEqual(Math.floor(1000 / CHUNK_SIZE), 1);
      assert.strictEqual(Math.floor(1999 / CHUNK_SIZE), 1);
      assert.strictEqual(Math.floor(124426 / CHUNK_SIZE), 124);
    });

    it('should calculate the exact number of total chunks for 124,427 keys', () => {
      const totalKeys = 124427;
      const expectedChunks = Math.ceil(totalKeys / CHUNK_SIZE);
      assert.strictEqual(expectedChunks, 125);
    });
  });

  describe('2. Single Key Approval & Incremental Counter Deltas', () => {
    async function setupTestDataset(totalItems = 3000) {
      const totalChunks = Math.ceil(totalItems / CHUNK_SIZE);

      // Seed game
      const initialLanguage: LanguageProgress = {
        language_id: testLangId,
        language_code: testLangCode,
        language_name: 'Portuguese (Brazil)',
        total_keys: totalItems,
        translated_keys: 0,
        approved_keys: 0,
        progress_percentage: 0,
      };

      const gameData = {
        id: testGameId,
        name: 'Performance Test Game',
        totalKeys: totalItems,
        languages: [initialLanguage],
      };

      await LocalCacheStore.set('games', gameData);
      await RemoteJsonDb.upsertDoc('lt_games', testGameId, gameData);

      // Seed chunks
      for (let c = 0; c < totalChunks; c++) {
        const chunkItems: KeyTranslationItem[] = [];
        const start = c * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalItems);

        for (let i = start; i < end; i++) {
          chunkItems.push({
            id: `item_id_${i}`,
            key_id: `key_id_${i}`,
            key_path: `UI.Dialogues.line_${i}`,
            source_text: `Original dialogue sentence ${i}`,
            translated_text: '',
            status: 'untranslated',
            order_index: i,
            language_id: testLangId,
            language_code: testLangCode,
            updated_at: new Date().toISOString(),
          });
        }

        const chunkDoc: TranslationChunkDoc = {
          chunk_id: `${testGameId}_${testLangCode}_chunk_${c}`,
          game_id: testGameId,
          language_code: testLangCode,
          chunk_index: c,
          items: chunkItems,
        };

        await LocalCacheStore.set('translation_chunks', chunkDoc);
      }
    }

    it('should transition from untranslated to approved and increment both counters (+1 translated, +1 approved)', async () => {
      await setupTestDataset(3000);

      const targetOrderIndex = 1550; // Belongs to Chunk 1
      const targetKeyId = `key_id_${targetOrderIndex}`;

      const res = await CloudTranslationsStore.updateTranslationItem({
        key_id: targetKeyId,
        language_id: testLangId,
        game_id: testGameId,
        language_code: testLangCode,
        order_index: targetOrderIndex,
        translated_text: 'Texto traduzido e aprovado.',
        status: 'approved',
      });

      assert.strictEqual(res.updated, true);
      assert.ok(res.langProgress);
      assert.strictEqual(res.langProgress.translated_keys, 1);
      assert.strictEqual(res.langProgress.approved_keys, 1);
      assert.strictEqual(res.langProgress.total_keys, 3000);

      // Verify the targeted chunk in storage has the exact updated data
      const chunk1 = await LocalCacheStore.get<TranslationChunkDoc>(
        'translation_chunks',
        `${testGameId}_${testLangCode}_chunk_1`
      );
      assert.ok(chunk1);
      const updatedItem = chunk1.items.find((i) => i.key_id === targetKeyId);
      assert.ok(updatedItem);
      assert.strictEqual(updatedItem.status, 'approved');
      assert.strictEqual(updatedItem.translated_text, 'Texto traduzido e aprovado.');
    });

    it('should transition from untranslated to manual_translated (+1 translated, 0 approved)', async () => {
      await setupTestDataset(3000);

      const targetOrderIndex = 250; // Belongs to Chunk 0
      const targetKeyId = `key_id_${targetOrderIndex}`;

      const res = await CloudTranslationsStore.updateTranslationItem({
        key_id: targetKeyId,
        language_id: testLangId,
        game_id: testGameId,
        language_code: testLangCode,
        order_index: targetOrderIndex,
        translated_text: 'Tradução manual em andamento',
        status: 'manual_translated',
      });

      assert.strictEqual(res.updated, true);
      assert.ok(res.langProgress);
      assert.strictEqual(res.langProgress.translated_keys, 1);
      assert.strictEqual(res.langProgress.approved_keys, 0);
    });

    it('should transition from manual_translated to approved (+0 translated, +1 approved)', async () => {
      await setupTestDataset(3000);

      const targetOrderIndex = 250;
      const targetKeyId = `key_id_${targetOrderIndex}`;

      // Step 1: Save as manual_translated
      await CloudTranslationsStore.updateTranslationItem({
        key_id: targetKeyId,
        language_id: testLangId,
        game_id: testGameId,
        language_code: testLangCode,
        order_index: targetOrderIndex,
        translated_text: 'Primeira versão',
        status: 'manual_translated',
      });

      // Step 2: Now approve it
      const res = await CloudTranslationsStore.updateTranslationItem({
        key_id: targetKeyId,
        language_id: testLangId,
        game_id: testGameId,
        language_code: testLangCode,
        order_index: targetOrderIndex,
        translated_text: 'Versão aprovada final',
        status: 'approved',
      });

      assert.strictEqual(res.updated, true);
      assert.ok(res.langProgress);
      assert.strictEqual(res.langProgress.translated_keys, 1, 'translated_keys should not double count');
      assert.strictEqual(res.langProgress.approved_keys, 1, 'approved_keys should increment by 1');
    });

    it('should transition from approved back to manual_translated (+0 translated, -1 approved)', async () => {
      await setupTestDataset(3000);

      const targetOrderIndex = 500;
      const targetKeyId = `key_id_${targetOrderIndex}`;

      // Approve
      await CloudTranslationsStore.updateTranslationItem({
        key_id: targetKeyId,
        language_id: testLangId,
        game_id: testGameId,
        language_code: testLangCode,
        order_index: targetOrderIndex,
        translated_text: 'Versão aprovada',
        status: 'approved',
      });

      // Modify and mark manual
      const res = await CloudTranslationsStore.updateTranslationItem({
        key_id: targetKeyId,
        language_id: testLangId,
        game_id: testGameId,
        language_code: testLangCode,
        order_index: targetOrderIndex,
        translated_text: 'Versão modificada',
        status: 'manual_translated',
      });

      assert.strictEqual(res.updated, true);
      assert.ok(res.langProgress);
      assert.strictEqual(res.langProgress.translated_keys, 1);
      assert.strictEqual(res.langProgress.approved_keys, 0, 'approved_keys should decrement back to 0');
    });

    it('should transition from approved to cleared untranslated text (-1 translated, -1 approved)', async () => {
      await setupTestDataset(3000);

      const targetOrderIndex = 750;
      const targetKeyId = `key_id_${targetOrderIndex}`;

      // Approve
      await CloudTranslationsStore.updateTranslationItem({
        key_id: targetKeyId,
        language_id: testLangId,
        game_id: testGameId,
        language_code: testLangCode,
        order_index: targetOrderIndex,
        translated_text: 'Texto pronto',
        status: 'approved',
      });

      // Clear text
      const res = await CloudTranslationsStore.updateTranslationItem({
        key_id: targetKeyId,
        language_id: testLangId,
        game_id: testGameId,
        language_code: testLangCode,
        order_index: targetOrderIndex,
        translated_text: '',
        status: 'untranslated',
      });

      assert.strictEqual(res.updated, true);
      assert.ok(res.langProgress);
      assert.strictEqual(res.langProgress.translated_keys, 0);
      assert.strictEqual(res.langProgress.approved_keys, 0);
    });
  });

  describe('3. Large Scale 100k Key Dataset Benchmark (<100ms for 100 approvals)', () => {
    it('should perform 100 random approvals across 100,000 keys in < 100ms', async () => {
      const totalItems = 100000;
      const totalChunks = 100;

      // Seed 100k keys across 100 chunks
      const initialLanguage: LanguageProgress = {
        language_id: testLangId,
        language_code: testLangCode,
        language_name: 'Portuguese (Brazil)',
        total_keys: totalItems,
        translated_keys: 0,
        approved_keys: 0,
        progress_percentage: 0,
      };

      const gameData = {
        id: testGameId,
        name: 'Massive Scale Game',
        totalKeys: totalItems,
        languages: [initialLanguage],
      };

      await LocalCacheStore.set('games', gameData);

      for (let c = 0; c < totalChunks; c++) {
        const chunkItems: KeyTranslationItem[] = [];
        const start = c * CHUNK_SIZE;
        for (let i = start; i < start + CHUNK_SIZE; i++) {
          chunkItems.push({
            id: `item_${i}`,
            key_id: `key_${i}`,
            key_path: `Namespace.Key_${i}`,
            source_text: `Text sentence ${i}`,
            translated_text: '',
            status: 'untranslated',
            order_index: i,
            language_id: testLangId,
            language_code: testLangCode,
            updated_at: new Date().toISOString(),
          });
        }
        await LocalCacheStore.set('translation_chunks', {
          chunk_id: `${testGameId}_${testLangCode}_chunk_${c}`,
          game_id: testGameId,
          language_code: testLangCode,
          chunk_index: c,
          items: chunkItems,
        });
      }

      // Pick 100 distinct indices across 100k keys (1 from each chunk)
      const sampleIndices: number[] = [];
      for (let i = 0; i < 100; i++) {
        sampleIndices.push(i * CHUNK_SIZE + 42);
      }

      const t0 = performance.now();

      for (const idx of sampleIndices) {
        const res = await CloudTranslationsStore.updateTranslationItem({
          key_id: `key_${idx}`,
          language_id: testLangId,
          game_id: testGameId,
          language_code: testLangCode,
          order_index: idx,
          translated_text: `Tradução aprovada #${idx}`,
          status: 'approved',
        });
        assert.strictEqual(res.updated, true);
      }

      const elapsedMs = performance.now() - t0;

      // Verify that all 100 operations executed in < 100ms (< 1ms per approval)
      assert.ok(
        elapsedMs < 100,
        `100 approvals across 100k keys took ${elapsedMs.toFixed(2)}ms (must be < 100ms)`
      );

      // Verify final game stats reflect all 100 approvals
      const updatedGame = await CloudGamesStore.getGame(testGameId);
      assert.ok(updatedGame);
      const ptLang = updatedGame.languages?.find((l) => l.language_code === testLangCode);
      assert.ok(ptLang);
      assert.strictEqual(ptLang.approved_keys, 100);
      assert.strictEqual(ptLang.translated_keys, 100);
    });
  });
});
