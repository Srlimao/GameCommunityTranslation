import { KeyTranslationItem } from '../types/client_types.ts';
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
}
