import { AIProvider, LLMGenerateOptions, ProviderConnectionTestResult, ProviderCredentials } from './types.ts';

export class BrowserOpenAIProvider implements AIProvider {
  private formatBaseUrl(baseUrl?: string): string {
    let url = (baseUrl || 'http://localhost:1234/v1').trim();
    return url.replace(/\/+$/, '');
  }

  private buildHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey?.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }
    return headers;
  }

  async testConnection(credentials: ProviderCredentials): Promise<ProviderConnectionTestResult> {
    const baseUrl = this.formatBaseUrl(credentials.baseUrl);
    const headers = this.buildHeaders(credentials.apiKey);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Endpoint returned HTTP ${response.status}: ${errorText.slice(0, 150)}`,
          models: [],
        };
      }

      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const models = (data.data || []).map((m) => m.id);

      return {
        success: true,
        message: `Successfully connected to endpoint at ${baseUrl}`,
        models,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection failed to ${baseUrl}: ${err.message || err}`,
        models: [],
      };
    }
  }

  async generateText(credentials: ProviderCredentials, options: LLMGenerateOptions): Promise<string> {
    const baseUrl = this.formatBaseUrl(credentials.baseUrl);
    const headers = this.buildHeaders(credentials.apiKey);
    const model = credentials.model?.trim() || 'translategemma-12b-it';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 60000);

    const body: any = {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.2,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    };

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI-compatible error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '';
      return this.cleanOutput(rawContent);
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`OpenAI-compatible request failed: ${err.message || err}`);
    }
  }

  async generateJson<T>(credentials: ProviderCredentials, options: LLMGenerateOptions): Promise<T> {
    const baseUrl = this.formatBaseUrl(credentials.baseUrl);
    const headers = this.buildHeaders(credentials.apiKey);
    const model = credentials.model?.trim() || 'gpt-4o-mini';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 60000);

    const body: any = {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.1,
      response_format: { type: 'json_object' },
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    };

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return await this.generateJsonFallback<T>(baseUrl, headers, model, options);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '{}';
      return this.parseJsonSafe<T>(rawContent);
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`JSON generation failed: ${err.message || err}`);
    }
  }

  private async generateJsonFallback<T>(
    baseUrl: string,
    headers: Record<string, string>,
    model: string,
    options: LLMGenerateOptions
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 60000);

    const body: any = {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.1,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    };

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI-compatible error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '{}';
      return this.parseJsonSafe<T>(rawContent);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private cleanOutput(raw: string): string {
    let clean = raw.trim();
    clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    if (clean.startsWith('```') && clean.endsWith('```')) {
      const lines = clean.split('\n');
      if (lines.length >= 2) {
        clean = lines.slice(1, -1).join('\n').trim();
      }
    }
    return clean;
  }

  private parseJsonSafe<T>(raw: string): T {
    let text = raw.trim();
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1)) as T;
      }

      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        return JSON.parse(text.substring(firstBracket, lastBracket + 1)) as T;
      }

      throw new Error(`Failed to parse JSON: ${raw.slice(0, 150)}`);
    }
  }
}
