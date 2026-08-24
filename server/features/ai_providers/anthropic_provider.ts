import { AIProvider, LLMGenerateOptions, ProviderConnectionTestResult, ProviderCredentials } from './types.ts';

export class AnthropicProvider implements AIProvider {
  private buildHeaders(apiKey?: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey?.trim() || '',
      'anthropic-version': '2023-06-01',
    };
  }

  async testConnection(credentials: ProviderCredentials): Promise<ProviderConnectionTestResult> {
    const apiKey = credentials.apiKey?.trim();
    const model = credentials.model?.trim() || 'claude-3-5-haiku-20241022';

    if (!apiKey) {
      return {
        success: false,
        message: 'No Anthropic API key provided.',
        models: [],
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // Test with a quick 1-token dummy ping
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: this.buildHeaders(apiKey),
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Anthropic API Error (${response.status}): ${errorText.slice(0, 150)}`,
          models: [],
        };
      }

      return {
        success: true,
        message: `Successfully connected to Anthropic API. Active model: ${model}`,
        models: [
          'claude-3-7-sonnet-20250219',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
        ],
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Anthropic API: ${err.message || err}`,
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

    const systemMsg = options.messages.find((m) => m.role === 'system')?.content;
    const userAndAssistantMsgs = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    if (userAndAssistantMsgs.length === 0 && systemMsg) {
      userAndAssistantMsgs.push({ role: 'user', content: systemMsg });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 60000);

    const body: any = {
      model,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature ?? 0.2,
      messages: userAndAssistantMsgs,
      ...(systemMsg ? { system: systemMsg } : {}),
    };

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
      const contentParts = data.content || [];
      const text = contentParts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');

      return this.cleanOutput(text);
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`Anthropic request failed: ${err.message || err}`);
    }
  }

  async generateJson<T>(credentials: ProviderCredentials, options: LLMGenerateOptions): Promise<T> {
    const raw = await this.generateText(credentials, {
      ...options,
      temperature: options.temperature ?? 0.1,
    });

    let clean = this.cleanOutput(raw);
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```/, '').replace(/```$/, '').trim();
    }

    return JSON.parse(clean) as T;
  }

  private cleanOutput(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith('```') && clean.endsWith('```')) {
      const lines = clean.split('\n');
      if (lines.length >= 2) {
        clean = lines.slice(1, -1).join('\n').trim();
      }
    }
    return clean;
  }
}
