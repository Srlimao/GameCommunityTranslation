import { db } from '../../database/sqlite_client.ts';
import { SystemSettings, AIProviderType } from '../../types/domain_types.ts';

const DEFAULT_SETTINGS: SystemSettings = {
  translation_provider: (process.env.TRANSLATION_PROVIDER as AIProviderType) || 'openai_compatible',
  translation_model: process.env.TRANSLATION_MODEL || process.env.LM_STUDIO_MODEL || 'translategemma-12b-it',
  translation_base_url: process.env.TRANSLATION_BASE_URL || process.env.LM_STUDIO_URL || 'http://localhost:1234/v1',
  translation_api_key: process.env.TRANSLATION_API_KEY || process.env.OPENAI_API_KEY || '',
  translation_temperature: parseFloat(process.env.TRANSLATION_TEMPERATURE || '0.2'),

  qa_provider: (process.env.QA_PROVIDER as AIProviderType) || 'gemini',
  qa_model: process.env.QA_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  qa_base_url: process.env.QA_BASE_URL || '',
  qa_api_key: process.env.QA_API_KEY || process.env.GEMINI_API_KEY || '',

  batch_concurrency: parseInt(process.env.BATCH_CONCURRENCY || '1', 10),
  request_timeout_ms: parseInt(process.env.REQUEST_TIMEOUT_MS || '60000', 10),
  custom_system_prompt: '',
  enable_two_pass_refiner: process.env.ENABLE_TWO_PASS_REFINER === 'true' || false,

  // Legacy mappings for backwards compatibility
  lm_studio_url: process.env.LM_STUDIO_URL || 'http://localhost:1234/v1',
  lm_studio_model: process.env.LM_STUDIO_MODEL || 'translategemma-12b-it',
  gemini_api_key: process.env.GEMINI_API_KEY || '',
  gemini_model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
};

export class SettingsRepository {
  static getSettings(): SystemSettings {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settingsMap = new Map(rows.map((r) => [r.key, r.value]));

    const translation_provider =
      (settingsMap.get('translation_provider') as AIProviderType) || DEFAULT_SETTINGS.translation_provider;
    const translation_model = settingsMap.get('translation_model') || settingsMap.get('lm_studio_model') || DEFAULT_SETTINGS.translation_model;
    const translation_base_url = settingsMap.get('translation_base_url') || settingsMap.get('lm_studio_url') || DEFAULT_SETTINGS.translation_base_url;
    const translation_api_key = settingsMap.get('translation_api_key') || DEFAULT_SETTINGS.translation_api_key;
    const translation_temperature = parseFloat(settingsMap.get('translation_temperature') || String(DEFAULT_SETTINGS.translation_temperature));

    const qa_provider = (settingsMap.get('qa_provider') as AIProviderType) || DEFAULT_SETTINGS.qa_provider;
    const qa_model = settingsMap.get('qa_model') || settingsMap.get('gemini_model') || DEFAULT_SETTINGS.qa_model;
    const qa_base_url = settingsMap.get('qa_base_url') || DEFAULT_SETTINGS.qa_base_url;
    const qa_api_key = settingsMap.get('qa_api_key') || settingsMap.get('gemini_api_key') || DEFAULT_SETTINGS.qa_api_key;

    const batch_concurrency = parseInt(settingsMap.get('batch_concurrency') || String(DEFAULT_SETTINGS.batch_concurrency), 10);
    const request_timeout_ms = parseInt(settingsMap.get('request_timeout_ms') || String(DEFAULT_SETTINGS.request_timeout_ms), 10);
    const custom_system_prompt = settingsMap.get('custom_system_prompt') || '';
    const enable_two_pass_refiner = settingsMap.has('enable_two_pass_refiner')
      ? settingsMap.get('enable_two_pass_refiner') === 'true'
      : DEFAULT_SETTINGS.enable_two_pass_refiner;

    return {
      translation_provider,
      translation_model,
      translation_base_url,
      translation_api_key,
      translation_temperature,
      qa_provider,
      qa_model,
      qa_base_url,
      qa_api_key,
      batch_concurrency,
      request_timeout_ms,
      custom_system_prompt,
      enable_two_pass_refiner,
      lm_studio_url: translation_base_url,
      lm_studio_model: translation_model,
      gemini_api_key: qa_api_key,
      gemini_model: qa_model,
    };
  }

  static getUserSettings(userId?: string): SystemSettings {
    const globalSettings = this.getSettings();
    if (!userId) return globalSettings;

    const rows = db.prepare('SELECT key, value FROM user_settings WHERE user_id = ?').all(userId) as {
      key: string;
      value: string;
    }[];

    if (rows.length === 0) return globalSettings;

    const userMap = new Map(rows.map((r) => [r.key, r.value]));

    return {
      translation_provider: (userMap.get('translation_provider') as AIProviderType) || globalSettings.translation_provider,
      translation_model: userMap.get('translation_model') || globalSettings.translation_model,
      translation_base_url: userMap.get('translation_base_url') || globalSettings.translation_base_url,
      translation_api_key: userMap.get('translation_api_key') || globalSettings.translation_api_key,
      translation_temperature: userMap.has('translation_temperature')
        ? parseFloat(userMap.get('translation_temperature')!)
        : globalSettings.translation_temperature,
      qa_provider: (userMap.get('qa_provider') as AIProviderType) || globalSettings.qa_provider,
      qa_model: userMap.get('qa_model') || globalSettings.qa_model,
      qa_base_url: userMap.get('qa_base_url') || globalSettings.qa_base_url,
      qa_api_key: userMap.get('qa_api_key') || globalSettings.qa_api_key,
      batch_concurrency: userMap.has('batch_concurrency')
        ? parseInt(userMap.get('batch_concurrency')!, 10)
        : globalSettings.batch_concurrency,
      request_timeout_ms: userMap.has('request_timeout_ms')
        ? parseInt(userMap.get('request_timeout_ms')!, 10)
        : globalSettings.request_timeout_ms,
      custom_system_prompt: userMap.has('custom_system_prompt')
        ? userMap.get('custom_system_prompt')
        : globalSettings.custom_system_prompt,
      enable_two_pass_refiner: userMap.has('enable_two_pass_refiner')
        ? userMap.get('enable_two_pass_refiner') === 'true'
        : globalSettings.enable_two_pass_refiner,
      lm_studio_url: userMap.get('translation_base_url') || globalSettings.translation_base_url,
      lm_studio_model: userMap.get('translation_model') || globalSettings.translation_model,
      gemini_api_key: userMap.get('qa_api_key') || globalSettings.qa_api_key,
      gemini_model: userMap.get('qa_model') || globalSettings.qa_model,
    };
  }

  static updateSettings(partial: Partial<SystemSettings>): SystemSettings {
    const current = this.getSettings();
    const updated: SystemSettings = { ...current, ...partial };

    if (partial.lm_studio_url) updated.translation_base_url = partial.lm_studio_url;
    if (partial.lm_studio_model) updated.translation_model = partial.lm_studio_model;
    if (partial.gemini_api_key) updated.qa_api_key = partial.gemini_api_key;
    if (partial.gemini_model) updated.qa_model = partial.gemini_model;

    const insertOrReplace = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    const updateTx = db.transaction((settings: SystemSettings) => {
      insertOrReplace.run('translation_provider', settings.translation_provider);
      insertOrReplace.run('translation_model', settings.translation_model);
      insertOrReplace.run('translation_base_url', settings.translation_base_url);
      insertOrReplace.run('translation_api_key', settings.translation_api_key);
      insertOrReplace.run('translation_temperature', settings.translation_temperature.toString());

      insertOrReplace.run('qa_provider', settings.qa_provider);
      insertOrReplace.run('qa_model', settings.qa_model);
      insertOrReplace.run('qa_base_url', settings.qa_base_url);
      insertOrReplace.run('qa_api_key', settings.qa_api_key);

      insertOrReplace.run('batch_concurrency', settings.batch_concurrency.toString());
      insertOrReplace.run('request_timeout_ms', settings.request_timeout_ms.toString());
      insertOrReplace.run('custom_system_prompt', settings.custom_system_prompt || '');
      insertOrReplace.run('enable_two_pass_refiner', String(settings.enable_two_pass_refiner ?? false));

      insertOrReplace.run('lm_studio_url', settings.translation_base_url);
      insertOrReplace.run('lm_studio_model', settings.translation_model);
      insertOrReplace.run('gemini_api_key', settings.qa_api_key);
      insertOrReplace.run('gemini_model', settings.qa_model);
    });

    updateTx(updated);
    return updated;
  }

  static updateUserSettings(userId: string, partial: Partial<SystemSettings>): SystemSettings {
    const insertOrReplace = db.prepare(`
      INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
    `);

    const updateTx = db.transaction((p: Partial<SystemSettings>) => {
      if (p.translation_provider !== undefined) insertOrReplace.run(userId, 'translation_provider', p.translation_provider);
      if (p.translation_model !== undefined) insertOrReplace.run(userId, 'translation_model', p.translation_model);
      if (p.translation_base_url !== undefined) insertOrReplace.run(userId, 'translation_base_url', p.translation_base_url);
      if (p.translation_api_key !== undefined) insertOrReplace.run(userId, 'translation_api_key', p.translation_api_key);
      if (p.translation_temperature !== undefined) insertOrReplace.run(userId, 'translation_temperature', p.translation_temperature.toString());

      if (p.qa_provider !== undefined) insertOrReplace.run(userId, 'qa_provider', p.qa_provider);
      if (p.qa_model !== undefined) insertOrReplace.run(userId, 'qa_model', p.qa_model);
      if (p.qa_base_url !== undefined) insertOrReplace.run(userId, 'qa_base_url', p.qa_base_url);
      if (p.qa_api_key !== undefined) insertOrReplace.run(userId, 'qa_api_key', p.qa_api_key);

      if (p.batch_concurrency !== undefined) insertOrReplace.run(userId, 'batch_concurrency', p.batch_concurrency.toString());
      if (p.request_timeout_ms !== undefined) insertOrReplace.run(userId, 'request_timeout_ms', p.request_timeout_ms.toString());
      if (p.custom_system_prompt !== undefined) insertOrReplace.run(userId, 'custom_system_prompt', p.custom_system_prompt || '');
      if (p.enable_two_pass_refiner !== undefined) insertOrReplace.run(userId, 'enable_two_pass_refiner', String(p.enable_two_pass_refiner));
    });

    updateTx(partial);
    return this.getUserSettings(userId);
  }
}
