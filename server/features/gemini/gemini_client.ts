import { SettingsRepository } from '../settings/settings_repository.ts';

export class GeminiClient {
  static getApiKey(): string {
    const settings = SettingsRepository.getSettings();
    return settings.gemini_api_key;
  }

  static getModel(): string {
    const settings = SettingsRepository.getSettings();
    return settings.gemini_model || 'gemini-2.5-flash';
  }

  static async testConnection(apiKeyParam?: string, modelParam?: string): Promise<{ success: boolean; message: string; models: string[] }> {
    const apiKey = apiKeyParam || this.getApiKey();
    const model = modelParam || this.getModel();

    if (!apiKey) {
      return {
        success: false,
        message: 'No Google Gemini API key configured.',
        models: [],
      };
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Gemini API Error (HTTP ${response.status}): ${errorText}`,
          models: [],
        };
      }

      const data = await response.json() as { models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[] };
      const suitableModels = (data.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));

      return {
        success: true,
        message: `Successfully connected to Google Gemini API. Active model: ${model}`,
        models: suitableModels.length > 0 ? suitableModels : ['gemini-2.0-flash', 'gemini-1.5-flash'],
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Gemini API: ${err.message || err}`,
        models: [],
      };
    }
  }

  static async generateJson<T>(prompt: string, systemInstruction?: string): Promise<T> {
    const apiKey = this.getApiKey();
    const model = this.getModel();

    if (!apiKey) {
      throw new Error('Google Gemini API Key is missing. Please set it in Settings.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    try {
      return JSON.parse(rawText) as T;
    } catch (parseErr: any) {
      throw new Error(`Failed to parse Gemini JSON response: ${parseErr.message}\nRaw response:\n${rawText}`);
    }
  }
}
