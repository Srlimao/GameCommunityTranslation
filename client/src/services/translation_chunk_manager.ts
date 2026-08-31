import { KeyTranslationItem, TreeKeyItem } from '../types/client_types.ts';
import { RemoteJsonDb } from './remote_json_db.ts';
import { LocalCacheStore } from './local_cache_store.ts';
import { runWithConcurrency } from './concurrency_limiter.ts';

export const COLLECTION_TRANSLATIONS = 'lt_translations';
export const CHUNK_SIZE = 1000;
export const CONCURRENT_CHUNKS = 4;

export interface TranslationChunkDoc {
  chunk_id: string;
  game_id: string;
  language_code: string;
  chunk_index: number;
  items: KeyTranslationItem[];
}

export interface PaginatedResult {
  items: KeyTranslationItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class TranslationChunkManager {
  static async saveItemsInChunks(
    gameId: string,
    langCode: string,
    items: KeyTranslationItem[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    const totalChunks = Math.ceil(items.length / CHUNK_SIZE);
    const chunkIndexes = Array.from({ length: totalChunks }, (_, i) => i);

    await runWithConcurrency(chunkIndexes, CONCURRENT_CHUNKS, async (i) => {
      const chunkItems = items.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkId = `${gameId}_${langCode}_chunk_${i}`;
      const doc: TranslationChunkDoc = {
        chunk_id: chunkId,
        game_id: gameId,
        language_code: langCode,
        chunk_index: i,
        items: chunkItems,
      };
      await LocalCacheStore.set('translation_chunks', doc);
      await RemoteJsonDb.upsertDoc(COLLECTION_TRANSLATIONS, chunkId, doc);
    }, onProgress);

    const metaDoc = { game_id: gameId, language_code: langCode, totalChunks, totalItems: items.length };
    await RemoteJsonDb.upsertDoc(COLLECTION_TRANSLATIONS, `${gameId}_${langCode}_meta`, metaDoc);
  }

  static async getChunk(gameId: string, langCode: string, chunkIndex: number): Promise<TranslationChunkDoc | null> {
    const chunkId = `${gameId}_${langCode}_chunk_${chunkIndex}`;
    const cached = await LocalCacheStore.get<TranslationChunkDoc>('translation_chunks', chunkId);
    if (cached) return cached;
    const doc = await RemoteJsonDb.getDoc<TranslationChunkDoc>(COLLECTION_TRANSLATIONS, chunkId);
    if (doc) await LocalCacheStore.set('translation_chunks', doc);
    return doc;
  }

  static async ensureAllChunksCached(
    gameId: string,
    langCode: string,
    onSync?: (sync: { loaded: number; total: number }) => void
  ): Promise<TranslationChunkDoc[]> {
    const meta = await RemoteJsonDb.getDoc<{ totalChunks: number }>(COLLECTION_TRANSLATIONS, `${gameId}_${langCode}_meta`);
    const totalChunks = meta?.totalChunks || 1;

    const allCached = await LocalCacheStore.getAll<TranslationChunkDoc>('translation_chunks');
    const existingMap = new Map<number, TranslationChunkDoc>();
    allCached
      .filter((c) => c && c.game_id === gameId && c.language_code === langCode)
      .forEach((c) => existingMap.set(c.chunk_index, c));

    const missingIndexes: number[] = [];
    for (let i = 0; i < totalChunks; i++) {
      if (!existingMap.has(i)) {
        missingIndexes.push(i);
      }
    }

    if (missingIndexes.length > 0) {
      let loaded = totalChunks - missingIndexes.length;
      if (onSync) onSync({ loaded, total: totalChunks });

      await runWithConcurrency(missingIndexes, CONCURRENT_CHUNKS, async (chunkIdx) => {
        const chunk = await this.getChunk(gameId, langCode, chunkIdx);
        if (chunk) {
          existingMap.set(chunkIdx, chunk);
        }
        loaded++;
        if (onSync) onSync({ loaded, total: totalChunks });
      });
    } else if (onSync) {
      onSync({ loaded: totalChunks, total: totalChunks });
    }

    return Array.from(existingMap.values()).sort((a, b) => a.chunk_index - b.chunk_index);
  }

  static async getTreeItems(gameId: string, langCode: string): Promise<TreeKeyItem[]> {
    // 1. Fast path: check if local cache already has chunks
    let cached = await LocalCacheStore.getAll<TranslationChunkDoc>('translation_chunks');
    let matching = cached.filter((c) => c && c.game_id === gameId && c.language_code === langCode);

    if (matching.length === 0) {
      matching = await this.ensureAllChunksCached(gameId, langCode);
    } else {
      // Trigger background verification without blocking
      this.ensureAllChunksCached(gameId, langCode).catch(() => {});
    }

    matching.sort((a, b) => a.chunk_index - b.chunk_index);
    const treeItems: TreeKeyItem[] = [];

    for (const chunk of matching) {
      if (chunk.items) {
        for (const item of chunk.items) {
          treeItems.push({
            key_path: item.key_path,
            status: item.status,
            translated_text: item.translated_text,
            key_id: item.key_id,
            order_index: item.order_index,
          });
        }
      }
    }

    return treeItems;
  }
}

