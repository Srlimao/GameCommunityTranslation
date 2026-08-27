import { AIProvider, LLMGenerateOptions, ProviderConnectionTestResult, ProviderCredentials } from './types.ts';

export class BrowserAnthropicProvider implements AIProvider {
  private buildHeaders(apiKey?: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey?.trim() || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }

  async testConnection(credentials: ProviderCredentials): Promise<ProviderConnectionTestResult> {
    const apiKey = credentials.apiKey?.trim();
    if (!apiKey) {
      return { success: false, message: 'No Anthropic API key provided.', models: [] };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: this.buildHeaders(apiKey),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Anthropic API Error (${response.status}): ${errorText.slice(0, 150)}`,
          models: [],
        };
      }

      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const models = (data.data || []).map((m) => m.id);

      return {
        success: true,
        message: 'Successfully connected to Anthropic Claude API.',
        models: models.length > 0 ? models : ['claude-3-7-sonnet-20250219', 'claude-3-5-haiku-20241022'],
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Anthropic: ${err.message || err}`,
        models: [],
      };
    }
  }

  async generateText(credentials: ProviderCredentials, options: LLMGenerateOptions): Promise<string> {
    const apiKey = credentials.apiKey?.trim();
    const model = credentials.model?.trim() || 'claude-3-5-haiku-20241022';

    if (!apiKey) {
      throw new Error('Anthropic API key is missing. Please set it in Settings.');
    }

    const systemMsg = options.messages.find((m) => m.role === 'system');
    const userMsgs = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    if (userMsgs.length === 0 && systemMsg) {
      userMsgs.push({ role: 'user', content: systemMsg.content });
    }

    const body: any = {
      model,
      max_tokens: options.maxTokens || 4096,
      messages: userMsgs,
      temperature: options.temperature ?? 0.2,
    };

    if (systemMsg && options.messages.length > 1) {
      body.system = systemMsg.content;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 60000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: this.buildHeaders(apiKey),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.content?.[0]?.text || '';
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`Anthropic request failed: ${err.message || err}`);
    }
  }

  async generateJson<T>(credentials: ProviderCredentials, options: LLMGenerateOptions): Promise<T> {
    const raw = await this.generateText(credentials, options);
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(clean) as T;
  }
}
