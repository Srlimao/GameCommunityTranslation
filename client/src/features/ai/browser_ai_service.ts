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
    const whitelistInfo = params.whitelistTags?.length ? `Allowed Markup Tags: ${params.whitelistTags.join(', ')}` : '';
    const targetLang = params.targetLanguage || 'the target language';
    const isUntranslated = params.issue.issue_type === 'identical_to_source';

    const system = `You are an expert game localization and code/tag parity repair engine.
Your task is to fix localization issues and ensure tag/symbol parity between source and target text.

MANDATORY RULES:
1. TARGET LANGUAGE: The output MUST be in ${targetLang}.
${isUntranslated
  ? `2. FULL TRANSLATION: The current translation is untranslated (identical to base). Translate the Source Text faithfully into ${targetLang} while preserving all tags (<tag>...</tag>, </>), placeholders ({0}, %s), brackets [], tabs (\\t), and newlines (\\n).`
  : `2. INSERT MISSING TAGS: Find every tag (e.g. <tag>...</>, <tag>...</tag>), placeholder ({0}, %s), tab (\\t), bracket, or newline in the [Source Text], and wrap or place it around the corresponding translated words in the [Current Translation].
3. KEEP TRANSLATION: Do not alter the translated words themselves, only insert missing tags/symbols.`
}
${whitelistInfo ? `4. ${whitelistInfo}` : ''}
5. FORMAT: Return ONLY valid JSON: {"fixed_translation": "..."}

EXAMPLE:
Source: "<NPCName>Emma</> and <NPCName>Dippa</>'s wedding photo."
Current: "Foto do casamento de Emma e Dippa."
Fixed Output: {"fixed_translation": "Foto do casamento de <NPCName>Emma</> e <NPCName>Dippa</>."}`;

    const prompt = `### TARGET LANGUAGE:
${targetLang}

### DETECTED ERROR TO FIX:
${params.issue.message}

### SOURCE TEXT:
${params.issue.source_text}

### CURRENT TRANSLATION:
${params.issue.translated_text}

${isUntranslated
  ? `Translate the text into ${targetLang} while preserving all tags, placeholders, and formatting from the Source Text.`
  : 'Apply the tags and symbols from the Source Text to the Current Translation.'}
Return valid JSON with key "fixed_translation":`;

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

    const targetLang = params.targetLanguage || 'the target language';
    const itemsText = params.issues.map((iss, idx) =>
      `[Item ${idx + 1}]\nKey: ${iss.key_path}\nError: ${iss.message}\nSource Text: "${iss.source_text}"\nCurrent Translation (${targetLang}): "${iss.translated_text}"`
    ).join('\n\n');

    const whitelistInfo = params.whitelistTags?.length ? `Allowed Markup Tags: ${params.whitelistTags.join(', ')}` : '';
    const system = `You are an expert game localization and code/tag parity repair engine.
Your task is to fix localization issues and ensure tag/symbol parity in translated texts.

MANDATORY RULES:
1. TARGET LANGUAGE: All outputs MUST be in ${targetLang}.
2. If an item is flagged as untranslated (identical to base), translate it faithfully into ${targetLang} while keeping all tags (<tag>...</tag>, </>), placeholders, brackets, tabs, and newlines intact.
3. If an item has tag/symbol errors, preserve the translated words and insert/wrap the missing tags/symbols.
${whitelistInfo ? `4. ${whitelistInfo}` : ''}
5. FORMAT: Return ONLY valid JSON: {"fixes": [{"key_path": string, "fixed_translation": string}]}`;

    const prompt = `### TARGET LANGUAGE:
${targetLang}

Repair the issues in the following items to match their source texts. Ensure all fixed strings remain in ${targetLang}:

${itemsText}

Output valid JSON with key "fixes":`;

    const res = await this.generateStructuredJson<{ fixes?: Array<{ key_path: string; fixed_translation: string; explanation?: string }> }>(prompt, system, settings);
    return res.fixes || [];
  }
}
