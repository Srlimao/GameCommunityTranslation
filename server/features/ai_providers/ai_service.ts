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
    if (!params.sourceText || !params.sourceText.trim()) {
      return { text: params.sourceText || '', modelUsed: 'system:empty_source' };
    }

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

    // Pass 1: Initial Draft Translation
    const draftText = await provider.generateText(credentials, {
      messages: [
        { role: 'system', content: combinedSystem },
        { role: 'user', content: user },
      ],
      temperature: settings.translation_temperature ?? 0.2,
      timeoutMs: settings.request_timeout_ms || 60000,
    });

    let finalText = draftText.trim();

    // Pass 2: Auditor / Verification & Tag Refiner Call (Optional based on configuration)
    if (settings.enable_two_pass_refiner) {
      try {
        const useQaProvider = !!(settings.qa_api_key || (settings.qa_base_url && settings.qa_base_url !== settings.translation_base_url));
        const refinerProviderType = useQaProvider ? (settings.qa_provider || 'openai_compatible') : providerType;
        const refinerProvider = this.getProviderInstance(refinerProviderType);

        const refinerCredentials: ProviderCredentials = useQaProvider
          ? {
              apiKey: settings.qa_api_key,
              baseUrl: settings.qa_base_url,
              model: settings.qa_model,
            }
          : credentials;

        const { system: refinerSystem, user: refinerUser } = TranslationPromptBuilder.buildRefinerPrompt({
          ...params,
          draftTranslation: draftText,
        });

        const refinedText = await refinerProvider.generateText(refinerCredentials, {
          messages: [
            { role: 'system', content: refinerSystem },
            { role: 'user', content: refinerUser },
          ],
          temperature: 0.1,
          timeoutMs: settings.request_timeout_ms || 60000,
        });

        if (refinedText && refinedText.trim()) {
          finalText = refinedText.trim();
        }
      } catch (refinerErr) {
        console.warn('[AIService] Pass 2 refiner skipped/failed, using pass 1 draft:', refinerErr);
      }
    }

    const modelUsed = `${providerType}:${settings.translation_model || 'default'}${settings.enable_two_pass_refiner ? '+refiner' : ''}`;
    return { text: finalText, modelUsed };
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
