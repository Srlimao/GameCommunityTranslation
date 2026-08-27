import { v4 as uuidv4 } from 'uuid';
import { KeyTranslationItem, LanguageProgress, TargetLanguage, TranslationStatus } from '../types/client_types.ts';
import { RemoteJsonDb } from './remote_json_db.ts';
import { LocalCacheStore } from './local_cache_store.ts';
import { CloudGamesStore } from './cloud_games_store.ts';
import { FlattenedKeyItem } from '../features/games/utils/client_json_parser.ts';

const COLLECTION_TRANSLATIONS = 'lt_translations';
const CHUNK_SIZE = 500;

export interface TranslationChunkDoc {
  chunk_id: string;
  game_id: string;
  language_code: string;
  chunk_index: number;
  items: KeyTranslationItem[];
}

export class CloudTranslationsStore {
  static async importBaseKeys(
    gameId: string,
    keys: FlattenedKeyItem[],
    rawJsonTemplate?: string,
    schemaConfig?: string
  ): Promise<number> {
    const game = await CloudGamesStore.getGame(gameId);
    if (!game) throw new Error('Game not found');

    const discoveredTags = CloudGamesStore.extractTagsFromTexts(keys.map((k) => k.sourceText));
    const mergedTags = Array.from(new Set([...(game.whitelist_tags || []), ...discoveredTags])).sort();

    const languages = game.languages || [];
    const baseLanguageCode = game.base_language || 'en-US';

    // If no target language exists yet, add default target language if desired
    const targetLangs = languages.length > 0 ? languages : [];

    for (const lang of targetLangs) {
      const items: KeyTranslationItem[] = keys.map((k) => ({
        id: uuidv4(),
        key_id: uuidv4(),
        key_path: k.keyPath,
        source_text: k.sourceText,
        context_note: k.contextNote || '',
        order_index: k.orderIndex,
        language_id: lang.language_id,
        language_code: lang.language_code,
        translated_text: '',
        status: 'untranslated',
        updated_at: new Date().toISOString(),
      }));

      await this.saveItemsInChunks(gameId, lang.language_code, items);
    }

    if (rawJsonTemplate) {
      await CloudGamesStore.saveTemplate(gameId, rawJsonTemplate);
    }

    await CloudGamesStore.updateGame(gameId, {
      totalKeys: keys.length,
      whitelist_tags: mergedTags,
      schema_config: schemaConfig || game.schema_config,
    });

    return keys.length;
  }

  static async saveItemsInChunks(
    gameId: string,
    langCode: string,
    items: KeyTranslationItem[]
  ): Promise<void> {
    const totalChunks = Math.ceil(items.length / CHUNK_SIZE);
    const savePromises: Promise<any>[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const chunkItems = items.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkId = `${gameId}_${langCode}_chunk_${i}`;
      const doc: TranslationChunkDoc = {
        chunk_id: chunkId,
        game_id: gameId,
        language_code: langCode,
        chunk_index: i,
        items: chunkItems,
      };

      savePromises.push(LocalCacheStore.set('translation_chunks', doc));
      savePromises.push(RemoteJsonDb.upsertDoc(COLLECTION_TRANSLATIONS, chunkId, doc));
    }

    const metaDoc = { game_id: gameId, language_code: langCode, totalChunks, totalItems: items.length };
    savePromises.push(RemoteJsonDb.upsertDoc(COLLECTION_TRANSLATIONS, `${gameId}_${langCode}_meta`, metaDoc));

    await Promise.all(savePromises);
  }

  static async getTranslations(
    gameId: string,
    langCode: string,
    filters?: { status?: string; search?: string }
  ): Promise<KeyTranslationItem[]> {
    let allItems: KeyTranslationItem[] = [];

    const meta = await RemoteJsonDb.getDoc<{ totalChunks: number }>(
      COLLECTION_TRANSLATIONS,
      `${gameId}_${langCode}_meta`
    );

    if (meta && meta.totalChunks > 0) {
      const fetchPromises: Promise<TranslationChunkDoc | null>[] = [];
      for (let i = 0; i < meta.totalChunks; i++) {
        const chunkId = `${gameId}_${langCode}_chunk_${i}`;
        fetchPromises.push(
          LocalCacheStore.get<TranslationChunkDoc>('translation_chunks', chunkId).then(async (cached) => {
            if (cached) return cached;
            const doc = await RemoteJsonDb.getDoc<TranslationChunkDoc>(COLLECTION_TRANSLATIONS, chunkId);
            if (doc) await LocalCacheStore.set('translation_chunks', doc);
            return doc;
          })
        );
      }

      const chunks = await Promise.all(fetchPromises);
      for (const chunk of chunks) {
        if (chunk?.items) allItems.push(...chunk.items);
      }
    }

    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'untranslated') {
        allItems = allItems.filter((i) => i.status === 'untranslated' || !i.translated_text);
      } else {
        allItems = allItems.filter((i) => i.status === filters.status);
      }
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      allItems = allItems.filter(
        (i) =>
          i.key_path.toLowerCase().includes(q) ||
          i.source_text.toLowerCase().includes(q) ||
          (i.translated_text || '').toLowerCase().includes(q)
      );
    }

    return allItems.sort((a, b) => a.order_index - b.order_index);
  }

  static async updateTranslationItem(params: {
    key_id: string;
    language_id: string;
    translated_text: string;
    status?: TranslationStatus;
    model_used?: string;
  }): Promise<void> {
    const cachedChunks = await LocalCacheStore.getAll<TranslationChunkDoc>('translation_chunks');
    for (const chunk of cachedChunks) {
      const targetItem = chunk.items.find((i) => i.key_id === params.key_id || i.id === params.key_id);
      if (targetItem) {
        targetItem.translated_text = params.translated_text;
        targetItem.status = params.status || 'manual_translated';
        if (params.model_used) targetItem.model_used = params.model_used;
        targetItem.updated_at = new Date().toISOString();

        await LocalCacheStore.set('translation_chunks', chunk);
        await RemoteJsonDb.upsertDoc(COLLECTION_TRANSLATIONS, chunk.chunk_id, chunk);
        break;
      }
    }
  }

  static async addLanguage(gameId: string, langCode: string, langName: string): Promise<LanguageProgress> {
    const game = await CloudGamesStore.getGame(gameId);
    if (!game) throw new Error('Game not found');

    const newLang: LanguageProgress = {
      language_id: uuidv4(),
      language_code: langCode.trim(),
      language_name: langName.trim(),
      total_keys: game.totalKeys || 0,
      translated_keys: 0,
      approved_keys: 0,
      progress_percentage: 0,
    };

    const existingLangs = (game.languages || []).filter((l) => l.language_code !== langCode);
    existingLangs.push(newLang);

    // Populate base items from another language or generate from template
    const firstLang = game.languages?.[0]?.language_code;
    if (firstLang) {
      const baseItems = await this.getTranslations(gameId, firstLang);
      const newItems: KeyTranslationItem[] = baseItems.map((item) => ({
        ...item,
        id: uuidv4(),
        language_id: newLang.language_id,
        language_code: newLang.language_code,
        translated_text: '',
        status: 'untranslated',
        updated_at: new Date().toISOString(),
      }));
      await this.saveItemsInChunks(gameId, newLang.language_code, newItems);
    }

    await CloudGamesStore.updateGame(gameId, { languages: existingLangs });
    return newLang;
  }

  static async deleteLanguage(gameId: string, langId: string): Promise<boolean> {
    const game = await CloudGamesStore.getGame(gameId);
    if (!game) return false;

    const targetLang = game.languages?.find((l) => l.language_id === langId);
    const updatedLangs = (game.languages || []).filter((l) => l.language_id !== langId);
    await CloudGamesStore.updateGame(gameId, { languages: updatedLangs });

    if (targetLang) {
      await RemoteJsonDb.deleteDoc(COLLECTION_TRANSLATIONS, `${gameId}_${targetLang.language_code}_meta`);
    }
    return true;
  }

  static async getExportMap(gameId: string, langCode: string): Promise<Record<string, string>> {
    const items = await this.getTranslations(gameId, langCode);
    const map: Record<string, string> = {};
    for (const item of items) {
      map[item.key_path] = item.translated_text || item.source_text;
    }
    return map;
  }
}
