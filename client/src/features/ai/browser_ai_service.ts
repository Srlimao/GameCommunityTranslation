import { AIProvider, ProviderConnectionTestResult, ProviderCredentials } from './types.ts';
import { BrowserGeminiProvider } from './browser_gemini_provider.ts';
import { BrowserOpenAIProvider } from './browser_openai_provider.ts';
import { BrowserAnthropicProvider } from './browser_anthropic_provider.ts';
import { BrowserPromptBuilder, PromptInputParams } from './browser_prompt_builder.ts';
import { AIProviderType, SystemSettings } from '../../types/client_types.ts';

export class BrowserAIService {
  private static geminiProvider = new BrowserGeminiProvider();
  private static openaiProvider = new BrowserOpenAIProvider();
  private static anthropicProvider = new BrowserAnthropicProvider();

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

  static async translate(
    params: PromptInputParams,
    settings: SystemSettings
  ): Promise<{ text: string; modelUsed: string }> {
    const providerType = settings.translation_provider || 'openai_compatible';
    const provider = this.getProviderInstance(providerType);

    const { system, user } = BrowserPromptBuilder.buildPrompt(params);

    let combinedSystem = system;
    if (settings.custom_system_prompt?.trim()) {
      combinedSystem = `${system}\n\n### GLOBAL TRANSLATION RULES:\n${settings.custom_system_prompt.trim()}`;
    }

    const credentials: ProviderCredentials = {
      apiKey: settings.translation_api_key,
      baseUrl: settings.translation_base_url,
      model: settings.translation_model,
    };

    const draftText = await provider.generateText(credentials, {
      messages: [
        { role: 'system', content: combinedSystem },
        { role: 'user', content: user },
      ],
      temperature: settings.translation_temperature ?? 0.2,
      timeoutMs: settings.request_timeout_ms || 60000,
    });

    let finalText = draftText.trim();

    if (settings.enable_two_pass_refiner) {
      try {
        const useQaProvider = !!(
          settings.qa_api_key ||
          (settings.qa_base_url && settings.qa_base_url !== settings.translation_base_url)
        );
        const refinerProviderType = useQaProvider
          ? settings.qa_provider || 'openai_compatible'
          : providerType;
        const refinerProvider = this.getProviderInstance(refinerProviderType);

        const refinerCredentials: ProviderCredentials = useQaProvider
          ? {
              apiKey: settings.qa_api_key,
              baseUrl: settings.qa_base_url,
              model: settings.qa_model,
            }
          : credentials;

        const { system: refinerSystem, user: refinerUser } = BrowserPromptBuilder.buildRefinerPrompt({
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
        console.warn('[BrowserAIService] Pass 2 refiner skipped/failed:', refinerErr);
      }
    }

    const modelUsed = `${providerType}:${settings.translation_model || 'default'}${
      settings.enable_two_pass_refiner ? '+refiner' : ''
    }`;
    return { text: finalText, modelUsed };
  }

  static async generateStructuredJson<T>(
    prompt: string,
    systemInstruction: string | undefined,
    settings: SystemSettings
  ): Promise<T> {
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
