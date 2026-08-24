import { SettingsRepository } from '../settings/settings_repository.ts';
import { TranslationPromptBuilder, PromptInputParams } from './translation_prompt_builder.ts';

export interface LMStudioModelInfo {
  id: string;
  object: string;
}

export class LMStudioClient {
  static getBaseUrl(): string {
    const settings = SettingsRepository.getSettings();
    return settings.lm_studio_url.replace(/\/+$/, '');
  }

  static getModel(): string {
    const settings = SettingsRepository.getSettings();
    return settings.lm_studio_model;
  }

  static async testConnection(): Promise<{ success: boolean; message: string; models: string[] }> {
    const baseUrl = this.getBaseUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          message: `LM Studio responded with HTTP ${response.status}: ${response.statusText}`,
          models: [],
        };
      }

      const data = (await response.json()) as { data?: LMStudioModelInfo[] };
      const modelNames = (data.data || []).map(m => m.id);

      return {
        success: true,
        message: `Connected successfully to LM Studio at ${baseUrl}`,
        models: modelNames,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect to LM Studio at ${baseUrl}: ${error.message || error}`,
        models: [],
      };
    }
  }

  static async translate(params: PromptInputParams): Promise<string> {
    const baseUrl = this.getBaseUrl();
    const model = this.getModel();
    const { system, user } = TranslationPromptBuilder.buildPrompt(params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: model || 'translategemma-12b-it',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.2, // Low temperature for deterministic & accurate translations
          max_tokens: 1024,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LM Studio error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '';

      // Clean up any extraneous quotes or leading/trailing formatting
      return this.cleanTranslationOutput(rawContent);
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`LM Studio Translation Failed: ${err.message || err}`);
    }
  }

  private static cleanTranslationOutput(raw: string): string {
    let clean = raw.trim();
    // Strip surrounding markdown code fences if model returned ```
    if (clean.startsWith('```') && clean.endsWith('```')) {
      const lines = clean.split('\n');
      if (lines.length >= 2) {
        clean = lines.slice(1, -1).join('\n').trim();
      }
    }
    return clean;
  }
}
