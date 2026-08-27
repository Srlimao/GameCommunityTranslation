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

  async createGame(game: {
    name: string;
    description?: string;
    context_prompt?: string;
    base_language?: string;
  }): Promise<GameSummary> {
    return await CloudGamesStore.createGame(game);
  },

  async updateGame(id: string, partial: Partial<GameSummary>): Promise<GameSummary> {
    return await CloudGamesStore.updateGame(id, partial);
  },

  async deleteGame(id: string): Promise<boolean> {
    return await CloudGamesStore.deleteGame(id);
  },

  async discoverGameTags(id: string): Promise<{ tags: string[]; message: string }> {
    const game = await CloudGamesStore.getGame(id);
    if (!game) throw new Error('Game not found');
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
    const parsed = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
    return ClientJsonSchemaDetector.analyze(parsed);
  },

  async importBaseJson(
    gameId: string,
    jsonContent: string | object,
    schemaConfig?: JsonSchemaConfig
  ): Promise<{ importedCount: number; message: string }> {
    const parsed = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
    const rawTemplate = typeof jsonContent === 'string' ? jsonContent : JSON.stringify(jsonContent);
    const flattened = ClientJsonParser.flattenWithConfig(parsed, schemaConfig);
    const count = await CloudTranslationsStore.importBaseKeys(
      gameId,
      flattened,
      rawTemplate,
      schemaConfig ? JSON.stringify(schemaConfig) : undefined
    );
    return { importedCount: count, message: `Successfully imported ${count} strings.` };
  },

  // Languages & Translations
  async getLanguages(gameId: string): Promise<LanguageProgress[]> {
    const game = await CloudGamesStore.getGame(gameId);
    return game?.languages || [];
  },

  async addLanguage(gameId: string, language_code: string, language_name: string): Promise<LanguageProgress> {
    return await CloudTranslationsStore.addLanguage(gameId, language_code, language_name);
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

  async updateTranslationItem(params: {
    key_id: string;
    language_id: string;
    translated_text: string;
    status?: TranslationStatus;
    model_used?: string;
  }): Promise<void> {
    await CloudTranslationsStore.updateTranslationItem(params);
  },

  async translateSingleKey(params: {
    gameId: string;
    languageCode: string;
    keyId: string;
    keyPath: string;
    sourceText: string;
    customInstructions?: string;
  }): Promise<string> {
    const game = await CloudGamesStore.getGame(params.gameId);
    if (!game) throw new Error('Game not found');

    const targetLang = game.languages?.find((l) => l.language_code === params.languageCode);
    const targetLangName = targetLang?.language_name || params.languageCode;
    const glossary = await CloudGlossaryStore.getGlossary(params.gameId, params.languageCode);
    const settings = await CloudSettingsStore.getSettings();

    const result = await BrowserAIService.translate(
      {
        gameName: game.name,
        gameContext: game.context_prompt,
        baseLanguage: game.base_language,
        targetLanguageName: targetLangName,
        targetLanguageCode: params.languageCode,
        keyPath: params.keyPath,
        sourceText: params.sourceText,
        glossary,
        customInstructions: params.customInstructions,
      },
      settings
    );

    if (targetLang) {
      await CloudTranslationsStore.updateTranslationItem({
        key_id: params.keyId,
        language_id: targetLang.language_id,
        translated_text: result.text,
        status: 'ai_translated',
        model_used: result.modelUsed,
      });
    }

    return result.text;
  },

  async startBatch(params: {
    gameId: string;
    languageCode: string;
    onlyUntranslated?: boolean;
    customInstructions?: string;
  }): Promise<string> {
    const jobId = `job_${Date.now()}`;
    const game = await CloudGamesStore.getGame(params.gameId);
    if (!game) throw new Error('Game not found');

    const targetLang = game.languages?.find((l) => l.language_code === params.languageCode);
    const targetLangName = targetLang?.language_name || params.languageCode;
    const glossary = await CloudGlossaryStore.getGlossary(params.gameId, params.languageCode);
    const settings = await CloudSettingsStore.getSettings();

    let items = await CloudTranslationsStore.getTranslations(params.gameId, params.languageCode);
    if (params.onlyUntranslated) {
      items = items.filter((i) => i.status === 'untranslated' || !i.translated_text);
    }

    // Run batch translation asynchronously
    BrowserBatchQueue.runBatch({
      jobId,
      gameId: params.gameId,
      gameName: game.name,
      gameContext: game.context_prompt,
      baseLanguage: game.base_language,
      targetLanguageName: targetLangName,
      targetLanguageCode: params.languageCode,
      items,
      glossary,
      customInstructions: params.customInstructions,
      settings,
      onProgress: (data) => {
        window.dispatchEvent(new CustomEvent('batch_translation_progress', { detail: data }));
      },
      onItemUpdated: async (item) => {
        await CloudTranslationsStore.updateTranslationItem({
          key_id: item.key_id,
          language_id: item.language_id,
          translated_text: item.translated_text,
          status: item.status,
          model_used: item.model_used,
        });
      },
    });

    return jobId;
  },

  async cancelBatch(jobId: string): Promise<boolean> {
    BrowserBatchQueue.cancelJob(jobId);
    return true;
  },

  // Glossary
  async getGlossary(gameId: string, language?: string): Promise<GlossaryEntry[]> {
    return await CloudGlossaryStore.getGlossary(gameId, language);
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

  // Gemini QA & Glossary Miner
  async analyzeWithGemini(
    gameId: string,
    languageCode: string
  ): Promise<{ candidates: GlossaryCandidate[]; issues: TranslationIssue[]; message?: string }> {
    const game = await CloudGamesStore.getGame(gameId);
    if (!game) throw new Error('Game not found');

    const targetLang = game.languages?.find((l) => l.language_code === languageCode);
    const glossary = await CloudGlossaryStore.getGlossary(gameId, languageCode);
    const translations = await CloudTranslationsStore.getTranslations(gameId, languageCode);
    const settings = await CloudSettingsStore.getSettings();

    const validPairs = translations
      .filter((t) => t.source_text?.trim() && t.translated_text?.trim())
      .slice(0, 100);

    if (validPairs.length === 0) {
      return { candidates: [], issues: [], message: 'No translated pairs to inspect.' };
    }

    const glossaryList = glossary.map((g) => `- "${g.source_term}" -> "${g.target_term}"`).join('\n');
    const pairsList = validPairs
      .map((p, idx) => `[Item ${idx + 1}] Key: ${p.key_path}\nSource: "${p.source_text}"\nTranslation: "${p.translated_text}"`)
      .join('\n\n');

    const systemInstruction = `You are a Lead Game Localization Director & Terminology Specialist.
Analyze translated game text pairs against the source text and world lore.
Output valid JSON with "candidates" and "issues".`;

    const prompt = `Game: ${game.name}
${game.context_prompt ? `Lore:\n${game.context_prompt}` : ''}
Target Language: ${targetLang?.language_name || languageCode} (${languageCode})
Existing Glossary:\n${glossaryList || 'None'}

Translation Pairs:
${pairsList}`;

    const res = await BrowserAIService.generateStructuredJson<{
      candidates?: GlossaryCandidate[];
      issues?: TranslationIssue[];
    }>(prompt, systemInstruction, settings);

    return {
      candidates: res.candidates || [],
      issues: res.issues || [],
    };
  },

  // Settings & Testing
  async getSettings(): Promise<SystemSettings> {
    return await CloudSettingsStore.getSettings();
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    return await CloudSettingsStore.updateSettings(settings);
  },

  async testProvider(params: {
    provider: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }): Promise<{ success: boolean; message: string; models: string[] }> {
    return await BrowserAIService.testProvider(params.provider as AIProviderType, {
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      model: params.model,
    });
  },

  async testLmStudio(): Promise<{ success: boolean; message: string; models: string[] }> {
    const settings = await CloudSettingsStore.getSettings();
    return await BrowserAIService.testProvider('openai_compatible', {
      baseUrl: settings.translation_base_url || 'http://localhost:1234/v1',
      model: settings.translation_model,
    });
  },

  async testGemini(apiKey?: string, model?: string): Promise<{ success: boolean; message: string; models: string[] }> {
    return await BrowserAIService.testProvider('gemini', {
      apiKey,
      model,
    });
  },
};
