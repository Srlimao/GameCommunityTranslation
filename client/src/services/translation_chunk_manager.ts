import { KeyTranslationItem, TreeKeyItem, LanguageProgress } from '../types/client_types.ts';
import { RemoteJsonDb } from './remote_json_db.ts';
import { LocalCacheStore } from './local_cache_store.ts';
import { CloudGamesStore } from './cloud_games_store.ts';
import { runWithConcurrency } from './concurrency_limiter.ts';

export const COLLECTION_TRANSLATIONS = 'lt_translations';
export const CHUNK_SIZE = 1000;
export const CONCURRENT_CHUNKS = 8;

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

export function isItemTranslated(item: {
  source_text?: string;
  translated_text?: string;
  status?: string;
}): boolean {
  if (!item.status || item.status === 'untranslated') return false;
  if (Boolean(item.translated_text && item.translated_text.trim().length > 0)) return true;
  // Empty source strings that were explicitly processed/approved count as completed
  return Boolean(!item.source_text || item.source_text.trim().length === 0);
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

  static async getChunk(
    gameId: string,
    langCode: string,
    chunkIndex: number,
    forceRemote: boolean = false
  ): Promise<TranslationChunkDoc | null> {
    const chunkId = `${gameId}_${langCode}_chunk_${chunkIndex}`;
    if (!forceRemote) {
      const cached = await LocalCacheStore.get<TranslationChunkDoc>('translation_chunks', chunkId);
      if (cached) return cached;
    }
    const doc = await RemoteJsonDb.getDoc<TranslationChunkDoc>(COLLECTION_TRANSLATIONS, chunkId);
    if (doc) await LocalCacheStore.set('translation_chunks', doc);
    return doc;
  }

  static async syncFromRemote(
    gameId: string,
    langCode: string,
    onSync?: (sync: { loaded: number; total: number }) => void
  ): Promise<TranslationChunkDoc[]> {
    const meta = await RemoteJsonDb.getDoc<{ totalChunks: number }>(COLLECTION_TRANSLATIONS, `${gameId}_${langCode}_meta`);
    const totalChunks = meta?.totalChunks || 1;
    const chunkMap = new Map<number, TranslationChunkDoc>();
    let loaded = 0;

    await runWithConcurrency(Array.from({ length: totalChunks }, (_, i) => i), CONCURRENT_CHUNKS, async (i) => {
      const doc = await this.getChunk(gameId, langCode, i, true);
      if (doc) chunkMap.set(i, doc);
      loaded++;
      if (onSync) onSync({ loaded, total: totalChunks });
    });

    return Array.from(chunkMap.values()).sort((a, b) => a.chunk_index - b.chunk_index);
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
            source_text: item.source_text,
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

  static async reconcileLanguageProgress(
    gameId: string,
    langCode: string,
    providedChunks?: TranslationChunkDoc[]
  ): Promise<LanguageProgress | undefined> {
    let chunks = providedChunks;
    if (!chunks) {
      const cached = await LocalCacheStore.getAll<TranslationChunkDoc>('translation_chunks');
      chunks = cached.filter((c) => c && c.game_id === gameId && c.language_code === langCode);
      if (chunks.length === 0) return undefined;
    }

    let totalItems = 0;
    let translatedCount = 0;
    let approvedCount = 0;

    for (const chunk of chunks) {
      for (const item of chunk.items || []) {
        totalItems++;
        if (isItemTranslated(item)) translatedCount++;
        if (item.status === 'approved') approvedCount++;
      }
    }

    const game = await CloudGamesStore.getGame(gameId);
    if (!game || !game.languages) return undefined;

    const lang = game.languages.find((l) => l.language_code === langCode);
    if (!lang) return undefined;

    const total = totalItems || lang.total_keys || game.totalKeys || 0;
    const progress = total > 0 ? Math.round((translatedCount / total) * 100) : 0;

    const hasDrift =
      lang.total_keys !== total ||
      lang.translated_keys !== translatedCount ||
      lang.approved_keys !== approvedCount ||
      lang.progress_percentage !== progress;

    if (hasDrift) {
      lang.total_keys = total;
      lang.translated_keys = translatedCount;
      lang.approved_keys = approvedCount;
      lang.progress_percentage = progress;
      if (!game.totalKeys && total > 0) game.totalKeys = total;
      await CloudGamesStore.updateGame(gameId, {
        totalKeys: game.totalKeys || total,
        languages: [...game.languages],
      });
    }

    return { ...lang };
  }
}

