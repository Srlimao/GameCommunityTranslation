export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMGenerateOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
  timeoutMs?: number;
}

export interface ProviderConnectionTestResult {
  success: boolean;
  message: string;
  models: string[];
}

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface AIProvider {
  testConnection(credentials: ProviderCredentials): Promise<ProviderConnectionTestResult>;
  generateText(credentials: ProviderCredentials, options: LLMGenerateOptions): Promise<string>;
  generateJson<T>(credentials: ProviderCredentials, options: LLMGenerateOptions): Promise<T>;
}
