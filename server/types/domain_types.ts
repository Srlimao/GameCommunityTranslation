export interface Game {
  id: string;
  name: string;
  description: string;
  context_prompt: string;
  base_language: string;
  raw_json_template?: string;
  schema_config?: string;
  whitelist_tags?: string | string[];
  created_at: string;
  updated_at: string;
}

export interface JsonSchemaConfig {
  mode: 'nested_tree' | 'array_of_objects' | 'record_map' | 'dictionary_kv' | 'grouped_dictionary';
  rootPath?: string; // e.g. "Translations" or "" for root array
  keyField?: string; // e.g. "Key", "id", "_index", "_key"
  textFields: string[]; // e.g. ["Value"], ["text", "name"]
  contextField?: string; // e.g. "Comment", "speaker", "note"
}

export interface DetectedListPath {
  path: string;
  count: number;
  sampleFields: string[];
}

export interface JsonAnalysisResult {
  structureType: 'nested_tree' | 'array_of_objects' | 'record_map' | 'dictionary_kv' | 'grouped_dictionary';
  totalItemsCount: number;
  detectedListPaths: DetectedListPath[];
  selectedListPath?: string;
  availableFields: string[];
  suggestedKeyField?: string;
  suggestedTextFields: string[];
  suggestedContextField?: string;
  samplePreview: Array<{
    keyPath: string;
    sourceText: string;
    contextNote?: string;
    ignoredAttributes?: Record<string, any>;
  }>;
}

export interface BaseKey {
  id: string;
  game_id: string;
  key_path: string;
  source_text: string;
  context_note?: string;
  order_index: number;
}

export interface TargetLanguage {
  id: string;
  game_id: string;
  language_code: string;
  language_name: string;
  created_at: string;
}

export type TranslationStatus = 'untranslated' | 'ai_translated' | 'manual_translated' | 'approved';

export interface KeyTranslationItem {
  id: string;
  key_id: string;
  key_path: string;
  source_text: string;
  context_note?: string;
  order_index: number;
  language_id: string;
  language_code: string;
  translated_text: string;
  status: TranslationStatus;
  model_used?: string;
  updated_at?: string;
}

export interface GlossaryEntry {
  id: string;
  game_id: string;
  source_term: string;
  target_term: string;
  target_language?: string;
  category: 'Character' | 'Item' | 'Location' | 'UI' | 'Lore' | 'General';
  notes?: string;
  created_at: string;
}

export type AIProviderType = 'gemini' | 'openai_compatible' | 'anthropic';

export interface SystemSettings {
  // Translation Provider Configuration
  translation_provider: AIProviderType;
  translation_model: string;
  translation_base_url: string;
  translation_api_key: string;
  translation_temperature: number;

  // QA & Glossary Extractor Configuration
  qa_provider: AIProviderType;
  qa_model: string;
  qa_base_url: string;
  qa_api_key: string;

  // Performance & System Tuning
  batch_concurrency: number;
  request_timeout_ms: number;
  custom_system_prompt?: string;
  enable_two_pass_refiner?: boolean;

  // Backwards compatibility legacy fields
  lm_studio_url?: string;
  lm_studio_model?: string;
  gemini_api_key?: string;
  gemini_model?: string;
}

export interface GlossaryCandidate {
  source_term: string;
  suggested_translation: string;
  category: 'Character' | 'Item' | 'Location' | 'UI' | 'Lore' | 'General';
  explanation: string;
  sample_context?: string;
}

export interface TranslationIssue {
  key_id?: string;
  language_id?: string;
  key_path: string;
  source_text: string;
  translated_text: string;
  issue_type: 'placeholder_mismatch' | 'tag_mismatch' | 'terminology_inconsistency' | 'formatting_loss' | 'meaning_drift' | 'tab_mismatch' | 'symbol_mismatch';
  message: string;
  suggestion?: string;
  applied?: boolean;
}

export type UserRole = 'admin' | 'translator' | 'viewer';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  display_name?: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithCredentials extends User {
  password_hash: string;
  salt: string;
}

export interface AuthSession {
  token: string;
  user: User;
  expires_at: string;
}

