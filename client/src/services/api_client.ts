import {
  GameSummary,
  LanguageProgress,
  KeyTranslationItem,
  TreeKeyItem,
  GlossaryEntry,
  SystemSettings,
  GlossaryCandidate,
  TranslationIssue,
  TranslationStatus,
  JsonAnalysisResult,
  JsonSchemaConfig,
  AIProviderType,
} from '../types/client_types.ts';
import { CloudGamesStore } from './cloud_games_store.ts';
import { CloudTranslationsStore } from './cloud_translations_store.ts';
import { isItemTranslated } from './translation_chunk_manager.ts';
import { CloudGlossaryStore } from './cloud_glossary_store.ts';
import { CloudSettingsStore } from './cloud_settings_store.ts';
import { BrowserAIService } from '../features/ai/browser_ai_service.ts';
import { BrowserBatchQueue } from '../features/ai/browser_batch_queue.ts';
import { ClientJsonSchemaDetector } from '../features/games/utils/client_json_schema_detector.ts';
import { ClientJsonParser } from '../features/games/utils/client_json_parser.ts';

export const ApiClient = {
  // Games
  async getGames(): Promise<GameSummary[]> { return await CloudGamesStore.getAllGames(); },
  async getGame(id: string): Promise<GameSummary> {
    const game = await CloudGamesStore.getGame(id);
    if (!game) throw new Error('Game not found');
    return game;
  },
  async createGame(game: { name: string; description?: string; context_prompt?: string; base_language?: string }): Promise<GameSummary> {
    return await CloudGamesStore.createGame(game);
  },
  async updateGame(id: string, partial: Partial<GameSummary>): Promise<GameSummary> { return await CloudGamesStore.updateGame(id, partial); },
  async deleteGame(id: string): Promise<boolean> { return await CloudGamesStore.deleteGame(id); },

  async discoverGameTags(id: string): Promise<{ tags: string[]; message: string }> {
    const game = await this.getGame(id);
    const firstLang = game.languages?.[0]?.language_code;
    const items = firstLang ? await CloudTranslationsStore.getTranslations(id, firstLang) : [];
    const tags = CloudGamesStore.extractTagsFromTexts(items.map((i) => i.source_text));
    await CloudGamesStore.updateGame(id, { whitelist_tags: tags });
    return { tags, message: `Discovered ${tags.length} unique tags.` };
  },

  async updateTagWhitelist(id: string, tags: string[]): Promise<string[]> {
    const sorted = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean))).sort();
    await CloudGamesStore.updateGame(id, { whitelist_tags: sorted });
    return sorted;
  },

  async analyzeJson(_gameId: string, jsonContent: string | object): Promise<JsonAnalysisResult> {
    return ClientJsonSchemaDetector.analyze(typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent);
  },

  async importBaseJson(
    gameId: string, rawJson: string, schemaConfig?: JsonSchemaConfig, onProgress?: (completed: number, total: number) => void
  ): Promise<{ importedCount: number; message: string }> {
    const parsed = JSON.parse(rawJson);
    const count = await CloudTranslationsStore.importBaseKeys(
      gameId, ClientJsonParser.flattenWithConfig(parsed, schemaConfig), JSON.stringify(parsed), schemaConfig ? JSON.stringify(schemaConfig) : undefined, onProgress
    );
    return { importedCount: count, message: `Successfully imported ${count} base reference keys` };
  },

  // Languages & Translations
  async getLanguages(gameId: string): Promise<LanguageProgress[]> {
    const game = await CloudGamesStore.getGame(gameId);
    return game?.languages || [];
  },
  async addLanguage(gameId: string, code: string, name: string): Promise<LanguageProgress> { return await CloudTranslationsStore.addLanguage(gameId, code, name); },
  async deleteLanguage(gameId: string, languageId: string): Promise<boolean> { return await CloudTranslationsStore.deleteLanguage(gameId, languageId); },

  async getTranslations(
    gameId: string,
    languageCode: string,
    filters?: { status?: string; search?: string },
    onSync?: (sync: { loaded: number; total: number }) => void
  ): Promise<KeyTranslationItem[]> {
    return await CloudTranslationsStore.getTranslations(gameId, languageCode, filters, onSync);
  },

  async syncTranslations(
    gameId: string,
    languageCode: string,
    onSync?: (sync: { loaded: number; total: number }) => void
  ): Promise<void> {
    await CloudTranslationsStore.syncFromRemote(gameId, languageCode, onSync);
  },

  async getPaginatedTranslations(params: {
    gameId: string; langCode: string; page: number; pageSize: number; status?: string; search?: string; prefix?: string | null; hideEmptySource?: boolean;
  }) {
    return await CloudTranslationsStore.getPaginatedTranslations(params);
  },

  async getTreeItems(gameId: string, langCode: string): Promise<TreeKeyItem[]> {
    return await CloudTranslationsStore.getTreeItems(gameId, langCode);
  },

  async reconcileLanguageProgress(gameId: string, langCode: string): Promise<LanguageProgress | undefined> {
    return await CloudTranslationsStore.reconcileLanguageProgress(gameId, langCode);
  },

  async importPartialTranslations(
    gameId: string,
    languageCode: string,
    entries: Array<{ keyPath: string; text: string }>,
    options?: { overwriteExisting?: boolean; status?: TranslationStatus; onProgress?: (completed: number, total: number) => void }
  ): Promise<{ updatedCount: number; matchedCount: number; totalImported: number }> {
    return await CloudTranslationsStore.importPartialTranslations(gameId, languageCode, entries, options);
  },

  async updateTranslationItem(params: {
    key_id: string;
    language_id?: string;
    game_id?: string;
    language_code?: string;
    order_index?: number;
    translated_text: string;
    status?: TranslationStatus;
    model_used?: string;
  }): Promise<{ updated: boolean; langProgress?: LanguageProgress }> {
    return await CloudTranslationsStore.updateTranslationItem(params);
  },

  async updateMultipleTranslationItems(
    gameId: string,
    languageCode: string,
    updates: Array<{ key_path?: string; key_id?: string; translated_text: string; status?: TranslationStatus }>
  ): Promise<number> {
    return await CloudTranslationsStore.updateMultipleTranslationItems(gameId, languageCode, updates);
  },

  async translateSingleKey(params: {
    gameId: string;
    languageCode: string;
    keyId: string;
    keyPath: string;
    sourceText: string;
    customInstructions?: string;
  }): Promise<string> {
    const game = await this.getGame(params.gameId);
    const glossary = await CloudGlossaryStore.getGlossary(params.gameId, params.languageCode);
    const settings = await CloudSettingsStore.getSettings();
    const targetLang = game.languages?.find((l) => l.language_code === params.languageCode);

    const { text } = await BrowserAIService.translate(
      {
        gameName: game.name,
        gameContext: game.context_prompt,
        baseLanguage: game.base_language || 'en',
        targetLanguageName: targetLang?.language_name || params.languageCode,
        targetLanguageCode: params.languageCode,
        keyPath: params.keyPath,
        sourceText: params.sourceText,
        glossary,
        customInstructions: params.customInstructions,
      },
      settings
    );
    return text;
  },

  async startBatch(params: {
    gameId: string;
    languageCode: string;
    onlyUntranslated?: boolean;
    customInstructions?: string;
    scopePrefix?: string | null;
    concurrency?: number;
  }): Promise<string> {
    const game = await this.getGame(params.gameId);
    const targetLang = game.languages?.find((l) => l.language_code === params.languageCode);
    const allItems = await CloudTranslationsStore.getTranslations(params.gameId, params.languageCode);
    const glossary = await CloudGlossaryStore.getGlossary(params.gameId, params.languageCode);
    const settings = await CloudSettingsStore.getSettings();

    let itemsToTranslate = params.onlyUntranslated
      ? allItems.filter((i) => !isItemTranslated(i))
      : allItems;

    if (params.scopePrefix) {
      const pLower = params.scopePrefix.toLowerCase();
      itemsToTranslate = itemsToTranslate.filter((i) => {
        let k = i.key_path.toLowerCase();
        if (k.startsWith('$$$') && k.endsWith('$$')) k = k.slice(3, -2);
        return k.startsWith(pLower) || k.startsWith(`.${pLower}`) || k.startsWith(`/${pLower}`) || k.startsWith(`:${pLower}`);
      });
    }

    const jobId = `job_${Date.now()}`;
    const dirtyChunks = new Map<string, any>();

    BrowserBatchQueue.runBatch({
      jobId,
      gameId: params.gameId,
      gameName: game.name,
      gameContext: game.context_prompt || '',
      baseLanguage: game.base_language || 'en',
      targetLanguageName: targetLang?.language_name || params.languageCode,
      targetLanguageCode: params.languageCode,
      items: itemsToTranslate,
      glossary,
      settings,
      customInstructions: params.customInstructions,
      scopePrefix: params.scopePrefix,
      concurrency: params.concurrency,
      onItemUpdated: async (item) => {
        const res = await this.updateTranslationItem({
          key_id: item.key_id,
          language_id: item.language_id,
          game_id: params.gameId,
          language_code: params.languageCode,
          order_index: item.order_index,
          translated_text: item.translated_text,
          status: item.status,
          model_used: item.model_used,
        });
        if (res.langProgress) {
          // Progress updated in IDB
        }
      },
      onFlushChunks: async () => {
        // Periodic background flush handler
      },
    }).catch((err) => console.error('Batch error:', err));

    return jobId;
  },

  async pauseBatch(jobId: string): Promise<boolean> {
    BrowserBatchQueue.pauseJob(jobId);
    return true;
  },

  async resumeBatch(jobId: string): Promise<boolean> {
    BrowserBatchQueue.resumeJob(jobId);
    return true;
  },

  async cancelBatch(jobId: string): Promise<boolean> {
    BrowserBatchQueue.cancelJob(jobId);
    return true;
  },

  async batchTranslate(params: {
    gameId: string;
    languageCode: string;
    targetLanguageName: string;
    contextPrompt: string;
    filter: 'untranslated' | 'all';
    whitelistTags?: string[];
    onProgress?: (progress: { completed: number; total: number; percentage: number; currentKey: string }) => void;
    onError?: (error: { keyPath: string; message: string }) => void;
  }): Promise<{ totalProcessed: number; completedCount: number; failedCount: number; message: string }> {
    const game = await this.getGame(params.gameId);
    const allItems = await CloudTranslationsStore.getTranslations(params.gameId, params.languageCode);
    const itemsToTranslate = params.filter === 'untranslated'
      ? allItems.filter((i) => !isItemTranslated(i))
      : allItems;

    if (itemsToTranslate.length === 0) {
      return { totalProcessed: 0, completedCount: 0, failedCount: 0, message: 'No keys to translate.' };
    }

    const glossary = await CloudGlossaryStore.getGlossary(params.gameId, params.languageCode);
    const settings = await CloudSettingsStore.getSettings();

    const jobId = `job_${Date.now()}`;
    let completedCount = 0;
    let failedCount = 0;

    await BrowserBatchQueue.runBatch({
      jobId,
      gameId: params.gameId,
      gameName: game.name,
      gameContext: params.contextPrompt || game.context_prompt || '',
      baseLanguage: game.base_language || 'en',
      targetLanguageName: params.targetLanguageName,
      targetLanguageCode: params.languageCode,
      items: itemsToTranslate,
      glossary,
      settings,
      onProgress: (p) => {
        const percent = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
        params.onProgress?.({
          completed: p.completed,
          total: p.total,
          percentage: percent,
          currentKey: p.currentKey || '',
        });
      },
      onItemUpdated: async (item) => {
        if (item.status === 'ai_translated') {
          completedCount++;
        }
        await this.updateTranslationItem({
          key_id: item.key_id,
          language_id: item.language_id,
          translated_text: item.translated_text,
          status: item.status,
          model_used: item.model_used,
        });
      },
    });

    return {
      totalProcessed: itemsToTranslate.length,
      completedCount,
      failedCount,
      message: `Batch translation completed: ${completedCount} succeeded, ${failedCount} failed.`,
    };
  },

  async getExportMap(gameId: string, languageCode: string): Promise<Record<string, string>> {
    return await CloudTranslationsStore.getExportMap(gameId, languageCode);
  },

  async exportJson(gameId: string, languageCode: string): Promise<Record<string, string>> {
    return await CloudTranslationsStore.getExportMap(gameId, languageCode);
  },

  async exportJsonWithStructure(gameId: string, languageCode: string): Promise<any> {
    const game = await this.getGame(gameId);
    const translationMap = await CloudTranslationsStore.getExportMap(gameId, languageCode);
    const rawTemplate = game.raw_json_template || await CloudGamesStore.loadTemplate(gameId);
    const { ClientJsonExporter } = await import('../features/games/utils/client_json_exporter.ts');
    return ClientJsonExporter.unflattenWithTemplate(translationMap, rawTemplate, game.schema_config);
  },

  // Glossary
  async getGlossary(gameId: string, languageCode?: string): Promise<GlossaryEntry[]> {
    return await CloudGlossaryStore.getGlossary(gameId, languageCode);
  },
  async addGlossaryEntry(gameId: string, entry: Partial<GlossaryEntry>): Promise<GlossaryEntry> {
    return await CloudGlossaryStore.addEntry(gameId, entry);
  },
  async batchAddGlossary(gameId: string, entries: Partial<GlossaryEntry>[], overwriteExisting = false): Promise<number> {
    return await CloudGlossaryStore.batchAdd(gameId, entries, overwriteExisting);
  },
  async updateGlossaryEntry(gameId: string, id: string, entry: Partial<GlossaryEntry>): Promise<GlossaryEntry> {
    return await CloudGlossaryStore.updateEntry(gameId, id, entry);
  },
  async deleteGlossaryEntry(gameId: string, id: string): Promise<boolean> {
    return await CloudGlossaryStore.deleteEntry(gameId, id);
  },

  // Gemini QA
  async analyzeWithGemini(gameId: string, languageCode: string): Promise<{ candidates: GlossaryCandidate[]; issues: TranslationIssue[]; message?: string }> {
    const { QaApiService } = await import('./qa_api_service.ts');
    return await QaApiService.analyzeWithGemini(gameId, languageCode);
  },

  async fixSingleIssue(params: {
    gameId: string; languageCode: string; issue: { key_path: string; source_text: string; translated_text: string; issue_type: string; message: string };
  }): Promise<{ fixed_translation: string; explanation?: string }> {
    const { QaApiService } = await import('./qa_api_service.ts');
    return await QaApiService.fixSingleIssue(params);
  },

  // Settings
  async getSettings(): Promise<SystemSettings> { return await CloudSettingsStore.getSettings(); },
  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> { return await CloudSettingsStore.updateSettings(settings); },
  async testProvider(params: { provider: string; apiKey?: string; baseUrl?: string; model?: string }): Promise<{ success: boolean; message: string; models: string[] }> {
    return await BrowserAIService.testProvider(params.provider as AIProviderType, { apiKey: params.apiKey, baseUrl: params.baseUrl, model: params.model });
  },
  async testLmStudio(): Promise<{ success: boolean; message: string; models: string[] }> {
    const settings = await CloudSettingsStore.getSettings();
    return await BrowserAIService.testProvider('openai_compatible', { baseUrl: settings.translation_base_url || 'http://localhost:1234/v1', model: settings.translation_model });
  },
  async testGemini(apiKey?: string, model?: string): Promise<{ success: boolean; message: string; models: string[] }> {
    return await BrowserAIService.testProvider('gemini', { apiKey, model });
  },
};
