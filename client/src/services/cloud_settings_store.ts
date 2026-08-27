import { SystemSettings } from '../types/client_types.ts';
import { RemoteJsonDb } from './remote_json_db.ts';
import { LocalCacheStore } from './local_cache_store.ts';

const COLLECTION_SETTINGS = 'lt_settings';
const DEFAULT_SETTINGS_DOC_ID = 'global';

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  translation_provider: 'openai_compatible',
  translation_model: 'translategemma-12b-it',
  translation_base_url: 'http://localhost:1234/v1',
  translation_api_key: '',
  translation_temperature: 0.2,

  qa_provider: 'gemini',
  qa_model: 'gemini-2.5-flash',
  qa_base_url: '',
  qa_api_key: '',

  batch_concurrency: 3,
  request_timeout_ms: 60000,
  enable_two_pass_refiner: false,
  custom_system_prompt: '',
};

export class CloudSettingsStore {
  static async getSettings(): Promise<SystemSettings> {
    try {
      const doc = await RemoteJsonDb.getDoc<SystemSettings>(
        COLLECTION_SETTINGS,
        DEFAULT_SETTINGS_DOC_ID
      );
      if (doc) {
        await LocalCacheStore.set('settings', { key: 'global', value: doc });
        return { ...DEFAULT_SYSTEM_SETTINGS, ...doc };
      }
    } catch {}

    const cached = await LocalCacheStore.get<{ key: string; value: SystemSettings }>(
      'settings',
      'global'
    );
    if (cached?.value) {
      return { ...DEFAULT_SYSTEM_SETTINGS, ...cached.value };
    }

    return { ...DEFAULT_SYSTEM_SETTINGS };
  }

  static async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const current = await this.getSettings();
    const updated: SystemSettings = {
      ...current,
      ...settings,
    };

    await LocalCacheStore.set('settings', { key: 'global', value: updated });
    try {
      await RemoteJsonDb.upsertDoc(COLLECTION_SETTINGS, DEFAULT_SETTINGS_DOC_ID, updated);
    } catch (err) {
      console.warn('[CloudSettingsStore] Failed to persist settings remotely, saved to local cache:', err);
    }

    return updated;
  }
}
