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
} from '../types/client_types.ts';

const API_BASE = '/api';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const ApiClient = {
  // Games
  async getGames(): Promise<GameSummary[]> {
    const res = await fetch(`${API_BASE}/games`, { headers: getAuthHeaders() });
    const data = await res.json();
    return data.games || [];
  },

  async getGame(id: string): Promise<GameSummary> {
    const res = await fetch(`${API_BASE}/games/${id}`);
    const data = await res.json();
    return data.game;
  },

  async createGame(game: { name: string; description?: string; context_prompt?: string; base_language?: string }): Promise<GameSummary> {
    const res = await fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(game),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create game');
    return data.game;
  },

  async updateGame(id: string, partial: Partial<GameSummary>): Promise<GameSummary> {
    const res = await fetch(`${API_BASE}/games/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update game');
    return data.game;
  },

  async deleteGame(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/games/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  async analyzeJson(gameId: string, jsonContent: string | object): Promise<JsonAnalysisResult> {
    const res = await fetch(`${API_BASE}/games/${gameId}/analyze-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonContent }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to analyze JSON structure');
    return data.analysis;
  },

  async importBaseJson(
    gameId: string,
    jsonContent: string | object,
    schemaConfig?: JsonSchemaConfig
  ): Promise<{ importedCount: number; message: string }> {
    const res = await fetch(`${API_BASE}/games/${gameId}/import-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonContent, schemaConfig }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to import JSON');
    return data;
  },

  // Languages & Translations
  async getLanguages(gameId: string): Promise<LanguageProgress[]> {
    const res = await fetch(`${API_BASE}/games/${gameId}/languages`);
    const data = await res.json();
    return data.languages || [];
  },

  async addLanguage(gameId: string, language_code: string, language_name: string): Promise<any> {
    const res = await fetch(`${API_BASE}/games/${gameId}/languages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language_code, language_name }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to add language');
    return data.language;
  },

  async deleteLanguage(gameId: string, languageId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/games/${gameId}/languages/${languageId}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  async getTranslations(gameId: string, languageCode: string, filters?: { status?: string; search?: string }): Promise<KeyTranslationItem[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);

    const res = await fetch(`${API_BASE}/games/${gameId}/translations/${languageCode}?${params.toString()}`);
    const data = await res.json();
    return data.items || [];
  },

  async updateTranslationItem(params: {
    key_id: string;
    language_id: string;
    translated_text: string;
    status?: TranslationStatus;
    model_used?: string;
  }): Promise<void> {
    const res = await fetch(`${API_BASE}/games/dummy/translations/item`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update translation');
  },

  async translateSingleKey(params: {
    gameId: string;
    languageCode: string;
    keyId: string;
    keyPath: string;
    sourceText: string;
    customInstructions?: string;
  }): Promise<string> {
    const res = await fetch(`${API_BASE}/translate/single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Translation failed');
    return data.translatedText;
  },

  async startBatch(params: {
    gameId: string;
    languageCode: string;
    onlyUntranslated?: boolean;
    customInstructions?: string;
  }): Promise<string> {
    const res = await fetch(`${API_BASE}/translate/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to start batch');
    return data.jobId;
  },

  async cancelBatch(jobId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/translate/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    });
    const data = await res.json();
    return data.success;
  },

  // Glossary
  async getGlossary(gameId: string, language?: string): Promise<GlossaryEntry[]> {
    const url = language ? `${API_BASE}/games/${gameId}/glossary?language=${language}` : `${API_BASE}/games/${gameId}/glossary`;
    const res = await fetch(url);
    const data = await res.json();
    return data.glossary || [];
  },

  async addGlossaryEntry(gameId: string, entry: Partial<GlossaryEntry>): Promise<GlossaryEntry> {
    const res = await fetch(`${API_BASE}/games/${gameId}/glossary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to add glossary entry');
    return data.entry;
  },

  async batchAddGlossary(gameId: string, entries: Partial<GlossaryEntry>[]): Promise<number> {
    const res = await fetch(`${API_BASE}/games/${gameId}/glossary/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to add candidate glossary entries');
    return data.addedCount;
  },

  async updateGlossaryEntry(gameId: string, id: string, entry: Partial<GlossaryEntry>): Promise<GlossaryEntry> {
    const res = await fetch(`${API_BASE}/games/${gameId}/glossary/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update glossary entry');
    return data.entry;
  },

  async deleteGlossaryEntry(gameId: string, id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/games/${gameId}/glossary/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  // Gemini QA & Glossary Miner
  async analyzeWithGemini(gameId: string, languageCode: string): Promise<{ candidates: GlossaryCandidate[]; issues: TranslationIssue[]; message?: string }> {
    const res = await fetch(`${API_BASE}/gemini/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, languageCode }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gemini analysis failed');
    return data;
  },

  // Settings & Testing
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`, { headers: getAuthHeaders() });
    const data = await res.json();
    return data.settings;
  },

  async updateSettings(settings: Partial<SystemSettings>, scope?: 'user' | 'system'): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ settings, scope }),
    });
    const data = await res.json();
    return data.settings;
  },

  async testProvider(params: {
    provider: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }): Promise<{ success: boolean; message: string; models: string[] }> {
    const res = await fetch(`${API_BASE}/settings/test-provider`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return await res.json();
  },

  async testLmStudio(): Promise<{ success: boolean; message: string; models: string[] }> {
    const res = await fetch(`${API_BASE}/settings/test-lm-studio`, { method: 'POST', headers: getAuthHeaders() });
    return await res.json();
  },

  async testGemini(apiKey?: string, model?: string): Promise<{ success: boolean; message: string; models: string[] }> {
    const res = await fetch(`${API_BASE}/gemini/test`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ apiKey, model }),
    });
    return await res.json();
  },
};
