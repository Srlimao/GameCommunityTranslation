import { v4 as uuidv4 } from 'uuid';
import { KeyTranslationItem, LanguageProgress, TranslationStatus } from '../types/client_types.ts';
import { RemoteJsonDb } from './remote_json_db.ts';
import { LocalCacheStore } from './local_cache_store.ts';
import { CloudGamesStore } from './cloud_games_store.ts';
import { FlattenedKeyItem } from '../features/games/utils/client_json_parser.ts';
import { runWithConcurrency } from './concurrency_limiter.ts';

const COLLECTION_TRANSLATIONS = 'lt_translations';
const CHUNK_SIZE = 1000;
const CONCURRENT_CHUNKS = 4;

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

export class CloudTranslationsStore {
  static async importBaseKeys(
    gameId: string,
    keys: FlattenedKeyItem[],
    rawJsonTemplate?: string,
    schemaConfig?: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<number> {
    const game = await CloudGamesStore.getGame(gameId);
    if (!game) throw new Error('Game not found');

    const discoveredTags = CloudGamesStore.extractTagsFromTexts(keys.map((k) => k.sourceText));
    const mergedTags = Array.from(new Set([...(game.whitelist_tags || []), ...discoveredTags])).sort();
    const targetLangs = game.languages && game.languages.length > 0 ? game.languages : [];

    for (let lIdx = 0; lIdx < targetLangs.length; lIdx++) {
      const lang = targetLangs[lIdx];
      const items: KeyTranslationItem[] = keys.map((k) => ({
        id: uuidv4(), key_id: uuidv4(), key_path: k.keyPath, source_text: k.sourceText,
        context_note: k.contextNote || '', order_index: k.orderIndex,
        language_id: lang.language_id, language_code: lang.language_code,
        translated_text: '', status: 'untranslated', updated_at: new Date().toISOString(),
      }));

      await this.saveItemsInChunks(gameId, lang.language_code, items, (c, t) => {
        if (onProgress) onProgress(lIdx * t + c, targetLangs.length * t);
      });
    }

    if (rawJsonTemplate) await CloudGamesStore.saveTemplate(gameId, rawJsonTemplate);
    await CloudGamesStore.updateGame(gameId, {
      totalKeys: keys.length, whitelist_tags: mergedTags, schema_config: schemaConfig || game.schema_config,
    });
    return keys.length;
  }

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
        chunk_id: chunkId, game_id: gameId, language_code: langCode, chunk_index: i, items: chunkItems,
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

  static async getPaginatedTranslations(params: {
    gameId: string;
    langCode: string;
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
    prefix?: string | null;
  }): Promise<PaginatedResult> {
    const { gameId, langCode, page, pageSize, status, search, prefix } = params;

    if ((search && search.trim()) || (status && status !== 'all') || prefix) {
      const cached = await LocalCacheStore.getAll<TranslationChunkDoc>('translation_chunks');
      let list: KeyTranslationItem[] = [];
      cached.filter(c => c && c.game_id === gameId && c.language_code === langCode).sort((a, b) => a.chunk_index - b.chunk_index).forEach(c => { if (c.items) list.push(...c.items); });

      if (prefix) list = list.filter(i => i.key_path.toLowerCase().startsWith(prefix.toLowerCase()));
      if (status && status !== 'all') {
        list = status === 'untranslated' ? list.filter(i => i.status === 'untranslated' || !i.translated_text) : list.filter(i => i.status === status);
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter(i => i.key_path.toLowerCase().includes(q) || i.source_text.toLowerCase().includes(q) || (i.translated_text || '').toLowerCase().includes(q));
      }
      const totalCount = list.length, totalPages = Math.max(1, Math.ceil(totalCount / pageSize)), validPage = Math.min(Math.max(1, page), totalPages);
      return { items: list.slice((validPage - 1) * pageSize, validPage * pageSize), totalCount, page: validPage, pageSize, totalPages };
    }

    const meta = await RemoteJsonDb.getDoc<{ totalChunks: number; totalItems: number }>(COLLECTION_TRANSLATIONS, `${gameId}_${langCode}_meta`);
    const totalCount = meta?.totalItems || 0, totalPages = Math.max(1, Math.ceil(totalCount / pageSize)), validPage = Math.min(Math.max(1, page), totalPages);
    const globalStart = (validPage - 1) * pageSize, chunkIdx = Math.floor(globalStart / CHUNK_SIZE), inChunkOffset = globalStart % CHUNK_SIZE;

    const chunk = await this.getChunk(gameId, langCode, chunkIdx);
    let items = (chunk?.items || []).slice(inChunkOffset, inChunkOffset + pageSize);
    if (items.length < pageSize && (globalStart + items.length) < totalCount) {
      const nextChunk = await this.getChunk(gameId, langCode, chunkIdx + 1);
      if (nextChunk?.items) items = items.concat(nextChunk.items.slice(0, pageSize - items.length));
    }
    return { items, totalCount: totalCount || items.length, page: validPage, pageSize, totalPages };
  }

  static async getTranslations(gameId: string, langCode: string, filters?: { status?: string; search?: string }): Promise<KeyTranslationItem[]> {
    const meta = await RemoteJsonDb.getDoc<{ totalChunks: number }>(COLLECTION_TRANSLATIONS, `${gameId}_${langCode}_meta`);
    const totalChunks = meta?.totalChunks || 1;
    const chunkMap = new Map<number, KeyTranslationItem[]>();
    await runWithConcurrency(Array.from({ length: totalChunks }, (_, i) => i), CONCURRENT_CHUNKS, async (i) => {
      const chunk = await this.getChunk(gameId, langCode, i);
      if (chunk?.items) chunkMap.set(i, chunk.items);
    });

    let all: KeyTranslationItem[] = [];
    for (let i = 0; i < totalChunks; i++) { const it = chunkMap.get(i); if (it) all.push(...it); }
    if (filters?.status && filters.status !== 'all') {
      all = filters.status === 'untranslated' ? all.filter(i => i.status === 'untranslated' || !i.translated_text) : all.filter(i => i.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      all = all.filter(i => i.key_path.toLowerCase().includes(q) || i.source_text.toLowerCase().includes(q) || (i.translated_text || '').toLowerCase().includes(q));
    }
    return all.sort((a, b) => a.order_index - b.order_index);
  }

  static async updateTranslationItem(params: {
    key_id: string; language_id?: string; game_id?: string; language_code?: string; order_index?: number;
    translated_text: string; status?: TranslationStatus; model_used?: string;
  }): Promise<void> {
    const cached = await LocalCacheStore.getAll<TranslationChunkDoc>('translation_chunks');
    for (const chunk of cached) {
      const it = chunk.items.find(i => i.key_id === params.key_id || i.id === params.key_id || i.key_path === params.key_id);
      if (it) {
        it.translated_text = params.translated_text;
        it.status = params.status || 'manual_translated';
        if (params.model_used) it.model_used = params.model_used;
        it.updated_at = new Date().toISOString();
        await LocalCacheStore.set('translation_chunks', chunk);
        await RemoteJsonDb.upsertDoc(COLLECTION_TRANSLATIONS, chunk.chunk_id, chunk);
        return;
      }
    }
  }

  static async updateMultipleTranslationItems(
    gameId: string,
    langCode: string,
    updates: Array<{ key_path?: string; key_id?: string; translated_text: string; status?: TranslationStatus }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<number> {
    const updateMap = new Map<string, { text: string; status?: TranslationStatus }>();
    for (const u of updates) {
      const val = { text: u.translated_text, status: u.status };
      if (u.key_path) updateMap.set(u.key_path, val);
      if (u.key_id) updateMap.set(u.key_id, val);
    }
    if (updateMap.size === 0) return 0;

    const meta = await RemoteJsonDb.getDoc<{ totalChunks: number }>(COLLECTION_TRANSLATIONS, `${gameId}_${langCode}_meta`);
    const totalChunks = meta?.totalChunks || 1;
    const modifiedChunks: TranslationChunkDoc[] = [];
    let updatedCount = 0;

    for (let i = 0; i < totalChunks; i++) {
      const chunk = await this.getChunk(gameId, langCode, i);
      if (!chunk?.items) continue;

      let chunkModified = false;
      for (const item of chunk.items) {
        const match = updateMap.get(item.key_path) || updateMap.get(item.key_id);
        if (match && match.text.trim()) {
          item.translated_text = match.text;
          item.status = match.status || 'manual_translated';
          item.updated_at = new Date().toISOString();
          updatedCount++;
          chunkModified = true;
        }
      }
      if (chunkModified) {
        await LocalCacheStore.set('translation_chunks', chunk);
        modifiedChunks.push(chunk);
      }
    }

    if (modifiedChunks.length > 0) {
      await runWithConcurrency(modifiedChunks, CONCURRENT_CHUNKS, async (chunk) => {
        await RemoteJsonDb.upsertDoc(COLLECTION_TRANSLATIONS, chunk.chunk_id, chunk);
      }, onProgress);
    }
    return updatedCount;
  }

  static async addLanguage(gameId: string, langCode: string, langName: string): Promise<LanguageProgress> {
    const game = await CloudGamesStore.getGame(gameId);
    if (!game) throw new Error('Game not found');
    const newLang: LanguageProgress = {
      language_id: uuidv4(), language_code: langCode.trim(), language_name: langName.trim(),
      total_keys: game.totalKeys || 0, translated_keys: 0, approved_keys: 0, progress_percentage: 0,
    };
    const existingLangs = (game.languages || []).filter(l => l.language_code !== langCode);
    existingLangs.push(newLang);
    const firstLang = game.languages?.[0]?.language_code;
    if (firstLang) {
      const baseItems = await this.getTranslations(gameId, firstLang);
      const newItems: KeyTranslationItem[] = baseItems.map(item => ({
        ...item, id: uuidv4(), language_id: newLang.language_id, language_code: newLang.language_code,
        translated_text: '', status: 'untranslated', updated_at: new Date().toISOString(),
      }));
      await this.saveItemsInChunks(gameId, newLang.language_code, newItems);
    }
    await CloudGamesStore.updateGame(gameId, { languages: existingLangs });
    return newLang;
  }

  static async deleteLanguage(gameId: string, langId: string): Promise<boolean> {
    const game = await CloudGamesStore.getGame(gameId);
    if (!game) return false;
    const targetLang = game.languages?.find(l => l.language_id === langId);
    const updatedLangs = (game.languages || []).filter(l => l.language_id !== langId);
    await CloudGamesStore.updateGame(gameId, { languages: updatedLangs });
    if (targetLang) await RemoteJsonDb.deleteDoc(COLLECTION_TRANSLATIONS, `${gameId}_${targetLang.language_code}_meta`);
    return true;
  }

  static async getExportMap(gameId: string, langCode: string): Promise<Record<string, string>> {
    const items = await this.getTranslations(gameId, langCode);
    const map: Record<string, string> = {};
    items.forEach(i => { map[i.key_path] = i.translated_text || i.source_text; });
    return map;
  }

  static async importPartialTranslations(
    gameId: string,
    langCode: string,
    importedEntries: Array<{ keyPath: string; text: string }>,
    options?: {
      overwriteExisting?: boolean;
      status?: TranslationStatus;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<{ updatedCount: number; matchedCount: number; totalImported: number }> {
    const game = await CloudGamesStore.getGame(gameId);
    if (!game) throw new Error('Game not found');

    const updates = importedEntries
      .filter(e => e.text && e.text.trim())
      .map(e => ({ key_path: e.keyPath, translated_text: e.text, status: options?.status }));

    const updatedCount = await this.updateMultipleTranslationItems(gameId, langCode, updates, options?.onProgress);

    if (game.languages?.length) {
      const targetLang = game.languages.find(l => l.language_code === langCode);
      const total = targetLang?.total_keys || game.totalKeys || 0;
      const translated = Math.min(total, (targetLang?.translated_keys || 0) + updatedCount);
      const progress = total > 0 ? Math.round((translated / total) * 100) : 0;
      const updatedLangs = game.languages.map(l => l.language_code === langCode
        ? { ...l, translated_keys: translated, progress_percentage: progress }
        : l
      );
      await CloudGamesStore.updateGame(gameId, { languages: updatedLangs });
    }

    return { updatedCount, matchedCount: updatedCount, totalImported: importedEntries.length };
  }
}
