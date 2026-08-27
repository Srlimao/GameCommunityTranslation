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

  static async fixSingleIssue(
    params: {
      gameName: string;
      contextPrompt?: string;
      targetLanguage: string;
      whitelistTags?: string[];
      issue: { key_path: string; source_text: string; translated_text: string; issue_type: string; message: string };
    },
    settings: SystemSettings
  ): Promise<{ fixed_translation: string; explanation?: string }> {
    const whitelistInfo = params.whitelistTags?.length ? `Allowed Markup Tags Whitelist: ${params.whitelistTags.join(', ')}` : '';
    const system = `You are a Lead Game Localization Engineer specializing in code, tag, tab, bracket, placeholder, and symbol parity repair.
Your task is to fix translated game text with code/symbol errors.

CRITICAL RULES:
1. Maintain the natural target language localization and tone.
2. Fix all syntax, markup tags (<tag>...</tag>, </>), variables ({player_name}), placeholders (%s), brackets [], tabs (\\t), and newlines (\\n) so they match the source text structure.
3. Allowed tags: ${params.whitelistTags?.join(', ') || 'Preserve source tags exactly'}.
4. Return a JSON object with: {"fixed_translation": string, "explanation": string}.`;

    const prompt = `Game: ${params.gameName}\n${params.contextPrompt ? `Lore/Context:\n${params.contextPrompt}\n` : ''}Target Language: ${params.targetLanguage}\n${whitelistInfo}\n\nItem with issue to repair:\nKey: ${params.issue.key_path}\nSource Text: "${params.issue.source_text}"\nCurrent Translation: "${params.issue.translated_text}"\nIssue Detected: ${params.issue.issue_type} - ${params.issue.message}`;

    const res = await this.generateStructuredJson<{ fixed_translation?: string; explanation?: string }>(prompt, system, settings);
    return {
      fixed_translation: res.fixed_translation || params.issue.translated_text,
      explanation: res.explanation,
    };
  }

  static async fixTranslationIssues(
    params: {
      gameName: string;
      contextPrompt?: string;
      targetLanguage: string;
      whitelistTags?: string[];
      issues: Array<{ key_path: string; source_text: string; translated_text: string; issue_type: string; message: string }>;
    },
    settings: SystemSettings
  ): Promise<Array<{ key_path: string; fixed_translation: string; explanation?: string }>> {
    if (params.issues.length === 0) return [];

    const itemsText = params.issues.map((iss, idx) =>
      `[Item ${idx + 1}]\nKey: ${iss.key_path}\nSource Text: "${iss.source_text}"\nCurrent Translation: "${iss.translated_text}"\nIssue Detected: ${iss.issue_type} - ${iss.message}`
    ).join('\n\n');

    const whitelistInfo = params.whitelistTags?.length ? `Allowed Markup Tags Whitelist: ${params.whitelistTags.join(', ')}` : '';
    const system = `You are a Lead Game Localization Engineer specializing in code, tag, tab, bracket, and symbol parity repair.
Your task is to fix translated game text with syntax/parity errors.

CRITICAL RULES:
1. Maintain the target language localization and tone naturally.
2. Fix all syntax, markup tags, variables, bracket parity, tab characters (\\t), and placeholders (%s, {name}) to match the source text structure.
3. Allowed tags: ${params.whitelistTags?.join(', ') || 'Preserve source tags exactly'}.
4. Return a JSON object with key "fixes", where each element is {"key_path": string, "fixed_translation": string, "explanation": string}.`;

    const prompt = `Game: ${params.gameName}\n${params.contextPrompt ? `Lore/Context:\n${params.contextPrompt}\n` : ''}Target Language: ${params.targetLanguage}\n${whitelistInfo}\n\nItems with syntax/parity issues to repair:\n${itemsText}`;

    const res = await this.generateStructuredJson<{ fixes?: Array<{ key_path: string; fixed_translation: string; explanation?: string }> }>(prompt, system, settings);
    return res.fixes || [];
  }
}
