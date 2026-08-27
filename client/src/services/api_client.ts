import {
  GameSummary,
  LanguageProgress,
  KeyTranslationItem,
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
import { CloudGlossaryStore } from './cloud_glossary_store.ts';
import { CloudSettingsStore } from './cloud_settings_store.ts';
import { BrowserAIService } from '../features/ai/browser_ai_service.ts';
import { BrowserBatchQueue } from '../features/ai/browser_batch_queue.ts';
import { ClientJsonSchemaDetector } from '../features/games/utils/client_json_schema_detector.ts';
import { ClientJsonParser } from '../features/games/utils/client_json_parser.ts';

export const ApiClient = {
  // Games
  async getGames(): Promise<GameSummary[]> {
    return await CloudGamesStore.getAllGames();
  },

  async getGame(id: string): Promise<GameSummary> {
    const game = await CloudGamesStore.getGame(id);
    if (!game) throw new Error('Game not found');
    return game;
  },

  async createGame(game: { name: string; description?: string; context_prompt?: string; base_language?: string }): Promise<GameSummary> {
    return await CloudGamesStore.createGame(game);
  },

  async updateGame(id: string, partial: Partial<GameSummary>): Promise<GameSummary> {
    return await CloudGamesStore.updateGame(id, partial);
  },

  async deleteGame(id: string): Promise<boolean> {
    return await CloudGamesStore.deleteGame(id);
  },

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
    return { importedCount: count, message: `Successfully imported ${count} strings.` };
  },

  // Languages & Translations
  async getLanguages(gameId: string): Promise<LanguageProgress[]> {
    const game = await CloudGamesStore.getGame(gameId);
    return game?.languages || [];
  },

  async addLanguage(gameId: string, code: string, name: string): Promise<LanguageProgress> {
    return await CloudTranslationsStore.addLanguage(gameId, code, name);
  },

  async deleteLanguage(gameId: string, languageId: string): Promise<boolean> {
    return await CloudTranslationsStore.deleteLanguage(gameId, languageId);
  },

  async getTranslations(
    gameId: string,
    languageCode: string,
    filters?: { status?: string; search?: string }
  ): Promise<KeyTranslationItem[]> {
    return await CloudTranslationsStore.getTranslations(gameId, languageCode, filters);
  },

  async getPaginatedTranslations(params: {
    gameId: string;
    langCode: string;
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
    prefix?: string | null;
  }) {
    return await CloudTranslationsStore.getPaginatedTranslations(params);
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
    key_id: string; language_id?: string; game_id?: string; language_code?: string; order_index?: number;
    translated_text: string; status?: TranslationStatus; model_used?: string;
  }): Promise<void> {
    await CloudTranslationsStore.updateTranslationItem(params);
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

    return await BrowserAIService.translateSingle(
      params.sourceText,
      game.name,
      game.context_prompt,
      targetLang?.language_name || params.languageCode,
      glossary,
      settings,
      game.whitelist_tags || [],
      params.customInstructions
    );
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
      ? allItems.filter((i) => !i.translated_text || i.status === 'untranslated')
      : allItems;

    if (itemsToTranslate.length === 0) {
      return { totalProcessed: 0, completedCount: 0, failedCount: 0, message: 'No keys to translate.' };
    }

    const glossary = await CloudGlossaryStore.getGlossary(params.gameId, params.languageCode);
    const settings = await CloudSettingsStore.getSettings();

    const queue = new BrowserBatchQueue({
      concurrency: settings.batch_concurrency || 2,
      onProgress: (p) => params.onProgress?.(p),
      onItemCompleted: async (keyId, text, model) => {
        const item = allItems.find((i) => i.key_id === keyId || i.id === keyId);
        if (item) {
          item.translated_text = text;
          item.status = 'ai_translated';
          item.model_used = model;
          await this.updateTranslationItem({
            key_id: keyId,
            language_id: item.language_id,
            translated_text: text,
            status: 'ai_translated',
            model_used: model,
          });
        }
      },
      onError: (k, m) => params.onError?.({ keyPath: k, message: m }),
    });

    const result = await queue.start(
      itemsToTranslate,
      game.name,
      params.contextPrompt || game.context_prompt,
      params.targetLanguageName,
      glossary,
      settings,
      params.whitelistTags || game.whitelist_tags || []
    );

    return {
      totalProcessed: itemsToTranslate.length,
      completedCount: result.completed,
      failedCount: result.failed,
      message: `Batch translation completed: ${result.completed} succeeded, ${result.failed} failed.`,
    };
  },

  async exportJson(gameId: string, languageCode: string): Promise<Record<string, string>> {
    return await CloudTranslationsStore.getExportMap(gameId, languageCode);
  },

  async exportJsonWithStructure(gameId: string, languageCode: string): Promise<any> {
    const game = await this.getGame(gameId);
    const translationMap = await CloudTranslationsStore.getExportMap(gameId, languageCode);
    const rawTemplate = await CloudGamesStore.loadTemplate(gameId);
    if (!rawTemplate) return translationMap;
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
  async batchAddGlossary(gameId: string, entries: Partial<GlossaryEntry>[]): Promise<number> {
    return await CloudGlossaryStore.batchAdd(gameId, entries);
  },
  async updateGlossaryEntry(gameId: string, id: string, entry: Partial<GlossaryEntry>): Promise<GlossaryEntry> {
    return await CloudGlossaryStore.updateEntry(gameId, id, entry);
  },
  async deleteGlossaryEntry(gameId: string, id: string): Promise<boolean> {
    return await CloudGlossaryStore.deleteEntry(gameId, id);
  },

  // Gemini QA
  async analyzeWithGemini(gameId: string, languageCode: string): Promise<{ candidates: GlossaryCandidate[]; issues: TranslationIssue[]; message?: string }> {
    const game = await this.getGame(gameId);
    const targetLang = game.languages?.find((l) => l.language_code === languageCode);
    const glossary = await CloudGlossaryStore.getGlossary(gameId, languageCode);
    const translations = await CloudTranslationsStore.getTranslations(gameId, languageCode);
    const settings = await CloudSettingsStore.getSettings();

    const validPairs = translations.filter((t) => t.source_text?.trim() && t.translated_text?.trim()).slice(0, 100);
    if (validPairs.length === 0) return { candidates: [], issues: [], message: 'No translated pairs to inspect.' };

    const glossaryList = glossary.map((g) => `- "${g.source_term}" -> "${g.target_term}"`).join('\n');
    const pairsList = validPairs.map((p, idx) => `[Item ${idx + 1}] Key: ${p.key_path}\nSource: "${p.source_text}"\nTranslation: "${p.translated_text}"`).join('\n\n');
    const systemInstruction = 'You are a Lead Game Localization Director. Analyze translated pairs against source text and lore. Output valid JSON with "candidates" and "issues".';
    const prompt = `Game: ${game.name}\n${game.context_prompt ? `Lore:\n${game.context_prompt}\n` : ''}Target: ${targetLang?.language_name || languageCode} (${languageCode})\nGlossary:\n${glossaryList || 'None'}\n\nTranslation Pairs:\n${pairsList}`;

    const res = await BrowserAIService.generateStructuredJson<{ candidates?: GlossaryCandidate[]; issues?: TranslationIssue[] }>(prompt, systemInstruction, settings);
    return { candidates: res.candidates || [], issues: res.issues || [] };
  },

  async fixSingleIssue(params: {
    gameId: string; languageCode: string; issue: { key_path: string; source_text: string; translated_text: string; issue_type: string; message: string };
  }): Promise<{ fixed_translation: string; explanation?: string }> {
    const game = await this.getGame(params.gameId);
    const targetLang = game.languages?.find((l) => l.language_code === params.languageCode);
    const settings = await CloudSettingsStore.getSettings();
    return await BrowserAIService.fixSingleIssue({
      gameName: game.name, contextPrompt: game.context_prompt,
      targetLanguage: targetLang?.language_name || params.languageCode,
      whitelistTags: game.whitelist_tags, issue: params.issue,
    }, settings);
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
