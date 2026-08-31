import { v4 as uuidv4 } from 'uuid';
import { KeyTranslationItem, TreeKeyItem, LanguageProgress, TranslationStatus, JsonSchemaConfig } from '../types/client_types.ts';
import { RemoteJsonDb } from './remote_json_db.ts';
import { LocalCacheStore } from './local_cache_store.ts';
import { CloudGamesStore } from './cloud_games_store.ts';
import { FlattenedKeyItem, ClientJsonParser } from '../features/games/utils/client_json_parser.ts';
import { runWithConcurrency } from './concurrency_limiter.ts';

import {
  TranslationChunkManager,
  COLLECTION_TRANSLATIONS,
  CHUNK_SIZE,
  CONCURRENT_CHUNKS,
  TranslationChunkDoc,
  PaginatedResult,
} from './translation_chunk_manager.ts';

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

      await TranslationChunkManager.saveItemsInChunks(gameId, lang.language_code, items, (c, t) => {
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
    return await TranslationChunkManager.saveItemsInChunks(gameId, langCode, items, onProgress);
  }

  static async getChunk(gameId: string, langCode: string, chunkIndex: number): Promise<TranslationChunkDoc | null> {
    return await TranslationChunkManager.getChunk(gameId, langCode, chunkIndex);
  }

  static async ensureAllChunksCached(
    gameId: string,
    langCode: string,
    onSync?: (sync: { loaded: number; total: number }) => void
  ): Promise<TranslationChunkDoc[]> {
    return await TranslationChunkManager.ensureAllChunksCached(gameId, langCode, onSync);
  }

  static async getTreeItems(gameId: string, langCode: string): Promise<TreeKeyItem[]> {
    return await TranslationChunkManager.getTreeItems(gameId, langCode);
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
      await TranslationChunkManager.ensureAllChunksCached(gameId, langCode);
      const cached = await LocalCacheStore.getAll<TranslationChunkDoc>('translation_chunks');
      let list: KeyTranslationItem[] = [];
      cached
        .filter((c) => c && c.game_id === gameId && c.language_code === langCode)
        .sort((a, b) => a.chunk_index - b.chunk_index)
        .forEach((c) => {
          if (c.items) list.push(...c.items);
        });

      if (prefix) {
        const pLower = prefix.toLowerCase();
        list = list.filter((i) => {
          let k = i.key_path.toLowerCase();
          if (k.startsWith('$$$') && k.endsWith('$$')) k = k.slice(3, -2);
          return k.startsWith(pLower) || k.startsWith(`.${pLower}`) || k.startsWith(`/${pLower}`) || k.startsWith(`:${pLower}`);
        });
      }
      if (status && status !== 'all') {
        list = status === 'untranslated' ? list.filter((i) => i.status === 'untranslated' || !i.translated_text) : list.filter((i) => i.status === status);
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter((i) => i.key_path.toLowerCase().includes(q) || i.source_text.toLowerCase().includes(q) || (i.translated_text || '').toLowerCase().includes(q));
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

  static async getTranslations(
    gameId: string,
    langCode: string,
    filters?: { status?: string; search?: string },
    onSync?: (sync: { loaded: number; total: number }) => void
  ): Promise<KeyTranslationItem[]> {
    const meta = await RemoteJsonDb.getDoc<{ totalChunks: number }>(COLLECTION_TRANSLATIONS, `${gameId}_${langCode}_meta`);
    const totalChunks = meta?.totalChunks || 1;
    const chunkMap = new Map<number, KeyTranslationItem[]>();
    let loaded = 0;
    await runWithConcurrency(Array.from({ length: totalChunks }, (_, i) => i), CONCURRENT_CHUNKS, async (i) => {
      const chunk = await this.getChunk(gameId, langCode, i);
      if (chunk?.items) chunkMap.set(i, chunk.items);
      loaded++;
      if (onSync) onSync({ loaded, total: totalChunks });
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
    key_id: string;
    language_id?: string;
    game_id?: string;
    language_code?: string;
    order_index?: number;
    translated_text: string;
    status?: TranslationStatus;
    model_used?: string;
  }): Promise<{ updated: boolean; langProgress?: LanguageProgress }> {
    let targetChunk: TranslationChunkDoc | null = null;
    let targetItem: KeyTranslationItem | null = null;

    // 1. Fast O(1) Path: Target exact chunk index via order_index
    if (typeof params.order_index === 'number' && params.game_id && params.language_code) {
      const chunkIndex = Math.floor(params.order_index / CHUNK_SIZE);
      const chunk = await this.getChunk(params.game_id, params.language_code, chunkIndex);
      if (chunk && chunk.items) {
        const it = chunk.items.find(
          (i) => i.key_id === params.key_id || i.id === params.key_id || i.key_path === params.key_id
        );
        if (it) {
          targetChunk = chunk;
          targetItem = it;
        }
      }
    }

    // 2. Fallback: Search in-memory/IDB cached chunks if order_index is omitted
    if (!targetChunk || !targetItem) {
      const cached = await LocalCacheStore.getAll<TranslationChunkDoc>('translation_chunks');
      for (const chunk of cached) {
        if (params.game_id && chunk.game_id !== params.game_id) continue;
        if (params.language_code && chunk.language_code !== params.language_code) continue;
        const it = chunk.items?.find(
          (i) => i.key_id === params.key_id || i.id === params.key_id || i.key_path === params.key_id
        );
        if (it) {
          targetChunk = chunk;
          targetItem = it;
          break;
        }
      }
    }

    if (!targetChunk || !targetItem) {
      return { updated: false };
    }

    // 3. Calculate state deltas
    const oldStatus = targetItem.status || 'untranslated';
    const oldHasText = Boolean(targetItem.translated_text && targetItem.translated_text.trim().length > 0);

    const newStatus = params.status || (params.translated_text.trim() ? 'manual_translated' : 'untranslated');
    const newHasText = Boolean(params.translated_text.trim().length > 0);

    const deltaTranslated = (newHasText ? 1 : 0) - (oldHasText ? 1 : 0);
    const deltaApproved = (newStatus === 'approved' ? 1 : 0) - (oldStatus === 'approved' ? 1 : 0);

    // Apply mutations to the item
    targetItem.translated_text = params.translated_text;
    targetItem.status = newStatus;
    if (params.model_used) targetItem.model_used = params.model_used;
    targetItem.updated_at = new Date().toISOString();

    // 4. Instant IndexedDB write (< 15ms)
    await LocalCacheStore.set('translation_chunks', targetChunk);

    // 5. O(1) Incremental Language Counter Update
    let updatedLangProgress: LanguageProgress | undefined = undefined;
    const gameId = targetChunk.game_id;
    const langCode = targetChunk.language_code;

    const game = await CloudGamesStore.getGame(gameId);
    if (game && game.languages) {
      const lang = game.languages.find(
        (l) => l.language_code === langCode || l.language_id === params.language_id
      );
      if (lang) {
        lang.translated_keys = Math.max(0, (lang.translated_keys || 0) + deltaTranslated);
        lang.approved_keys = Math.max(0, (lang.approved_keys || 0) + deltaApproved);
        const total = lang.total_keys || game.totalKeys || 0;
        lang.progress_percentage = total > 0 ? Math.round((lang.translated_keys / total) * 100) : 0;
        updatedLangProgress = { ...lang };
        // Update local cache for game summary immediately
        await LocalCacheStore.set('games', game);
      }
    }

    // 6. Background Asynchronous Remote Sync (Non-blocking)
    const chunkToSync = targetChunk;
    const gameToSync = game;
    (async () => {
      try {
        await RemoteJsonDb.upsertDoc(COLLECTION_TRANSLATIONS, chunkToSync.chunk_id, chunkToSync);
        if (gameToSync && gameToSync.languages) {
          await RemoteJsonDb.upsertDoc('lt_games', gameId, gameToSync);
        }
      } catch (err) {
        console.warn('Background remote sync notice:', err);
      }
    })();

    return { updated: true, langProgress: updatedLangProgress };
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
      newLang.total_keys = newItems.length;
    } else {
      const rawTemplate = game.raw_json_template || await CloudGamesStore.loadTemplate(gameId);
      if (rawTemplate) {
        try {
          const parsed = JSON.parse(rawTemplate);
          const schema: JsonSchemaConfig | undefined = game.schema_config
            ? (typeof game.schema_config === 'string' ? JSON.parse(game.schema_config) : game.schema_config)
            : undefined;
          const flattened = ClientJsonParser.flattenWithConfig(parsed, schema);
          const newItems: KeyTranslationItem[] = flattened.map(k => ({
            id: uuidv4(),
            key_id: uuidv4(),
            key_path: k.keyPath,
            source_text: k.sourceText,
            context_note: k.contextNote || '',
            order_index: k.orderIndex,
            language_id: newLang.language_id,
            language_code: newLang.language_code,
            translated_text: '',
            status: 'untranslated',
            updated_at: new Date().toISOString(),
          }));
          await this.saveItemsInChunks(gameId, newLang.language_code, newItems);
          newLang.total_keys = newItems.length;
        } catch (e) {
          console.warn('Could not parse base template during addLanguage:', e);
        }
      }
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
