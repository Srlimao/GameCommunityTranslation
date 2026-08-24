import { AIProvider, ProviderConnectionTestResult, ProviderCredentials } from './types.ts';
import { GeminiProvider } from './gemini_provider.ts';
import { OpenAICompatibleProvider } from './openai_provider.ts';
import { AnthropicProvider } from './anthropic_provider.ts';
import { SettingsRepository } from '../settings/settings_repository.ts';
import { TranslationPromptBuilder, PromptInputParams } from '../lm_studio/translation_prompt_builder.ts';
import { AIProviderType } from '../../types/domain_types.ts';

export class AIService {
  private static geminiProvider = new GeminiProvider();
  private static openaiProvider = new OpenAICompatibleProvider();
  private static anthropicProvider = new AnthropicProvider();

  static getProviderInstance(type: AIProviderType): AIProvider {
    switch (type) {
      case 'gemini':
        return this.geminiProvider;
      case 'anthropic':
        return this.anthropicProvider;
      case 'openai_compatible':
      default:
        return this.openaiProvider;
    }
  }

  static async testProvider(
    providerType: AIProviderType,
    credentials: ProviderCredentials
  ): Promise<ProviderConnectionTestResult> {
    const provider = this.getProviderInstance(providerType);
    return await provider.testConnection(credentials);
  }

  static async translate(params: PromptInputParams, userId?: string): Promise<{ text: string; modelUsed: string }> {
    const settings = SettingsRepository.getUserSettings(userId);
    const providerType = settings.translation_provider || 'openai_compatible';
    const provider = this.getProviderInstance(providerType);

    const { system, user } = TranslationPromptBuilder.buildPrompt(params);

    // If custom system prompt exists in settings, append it
    let combinedSystem = system;
    if (settings.custom_system_prompt?.trim()) {
      combinedSystem = `${system}\n\n### GLOBAL TRANSLATION RULES:\n${settings.custom_system_prompt.trim()}`;
    }

    const credentials: ProviderCredentials = {
      apiKey: settings.translation_api_key,
      baseUrl: settings.translation_base_url,
      model: settings.translation_model,
    };

    const text = await provider.generateText(credentials, {
      messages: [
        { role: 'system', content: combinedSystem },
        { role: 'user', content: user },
      ],
      temperature: settings.translation_temperature ?? 0.2,
      timeoutMs: settings.request_timeout_ms || 60000,
    });

    const modelUsed = `${providerType}:${settings.translation_model || 'default'}`;
    return { text, modelUsed };
  }

  static async generateStructuredJson<T>(
    prompt: string,
    systemInstruction?: string,
    userId?: string
  ): Promise<T> {
    const settings = SettingsRepository.getUserSettings(userId);
    const providerType = settings.qa_provider || 'gemini';
    const provider = this.getProviderInstance(providerType);

    const credentials: ProviderCredentials = {
      apiKey: settings.qa_api_key,
      baseUrl: settings.qa_base_url,
      model: settings.qa_model,
    };

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system' as const, content: systemInstruction });
    }
    messages.push({ role: 'user' as const, content: prompt });

    return await provider.generateJson<T>(credentials, {
      messages,
      temperature: 0.1,
      responseFormatJson: true,
      timeoutMs: settings.request_timeout_ms || 60000,
    });
  }
}
