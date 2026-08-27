import { AIProvider, LLMGenerateOptions, ProviderConnectionTestResult, ProviderCredentials } from './types.ts';

export class BrowserGeminiProvider implements AIProvider {
  async testConnection(credentials: ProviderCredentials): Promise<ProviderConnectionTestResult> {
    const apiKey = credentials.apiKey?.trim();
    const model = credentials.model?.trim() || 'gemini-2.5-flash';

    if (!apiKey) {
      return {
        success: false,
        message: 'No Google Gemini API key provided.',
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
          message: `Gemini API Error (${response.status}): ${errorText}`,
          models: [],
        };
      }

      const data = (await response.json()) as {
        models?: { name: string; supportedGenerationMethods?: string[] }[];
      };
      const suitableModels = (data.models || [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace('models/', ''));

      return {
        success: true,
        message: `Successfully connected to Google Gemini API. Active model: ${model}`,
        models: suitableModels.length > 0 ? suitableModels : ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-2.5-pro'],
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Gemini API: ${err.message || err}`,
        models: [],
      };
    }
  }

  async generateText(credentials: ProviderCredentials, options: LLMGenerateOptions): Promise<string> {
    const apiKey = credentials.apiKey?.trim();
    const model = credentials.model?.trim() || 'gemini-2.5-flash';

    if (!apiKey) {
      throw new Error('Google Gemini API Key is missing. Please set it in Settings.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const systemMsg = options.messages.find((m) => m.role === 'system');
    const conversationMsgs = options.messages.filter((m) => m.role !== 'system');

    const contents = conversationMsgs.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (contents.length === 0 && systemMsg) {
      contents.push({ role: 'user', parts: [{ text: systemMsg.content }] });
    }

    const body: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
      },
    };

    if (systemMsg && options.messages.length > 1) {
      body.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 60000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`Gemini request failed: ${err.message || err}`);
    }
  }

  async generateJson<T>(credentials: ProviderCredentials, options: LLMGenerateOptions): Promise<T> {
    const apiKey = credentials.apiKey?.trim();
    const model = credentials.model?.trim() || 'gemini-2.5-flash';

    if (!apiKey) {
      throw new Error('Google Gemini API Key is missing. Please set it in Settings.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const systemMsg = options.messages.find((m) => m.role === 'system');
    const conversationMsgs = options.messages.filter((m) => m.role !== 'system');

    const contents = conversationMsgs.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (contents.length === 0 && systemMsg) {
      contents.push({ role: 'user', parts: [{ text: systemMsg.content }] });
    }

    const body: any = {
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: options.temperature ?? 0.1,
        ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
      },
    };

    if (systemMsg && options.messages.length > 1) {
      body.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 60000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      return JSON.parse(rawText) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`Gemini JSON generation failed: ${err.message || err}`);
    }
  }
}
