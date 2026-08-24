import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/sqlite_client.ts';
import { TargetLanguage, KeyTranslationItem, TranslationStatus } from '../../types/domain_types.ts';

export interface LanguageProgress {
  language_id: string;
  language_code: string;
  language_name: string;
  total_keys: number;
  translated_keys: number;
  approved_keys: number;
  progress_percentage: number;
}

export class TranslationsRepository {
  static getLanguages(gameId: string): LanguageProgress[] {
    const totalKeysRow = db.prepare('SELECT count(*) as total FROM base_keys WHERE game_id = ?').get(gameId) as { total: number };
    const totalKeys = totalKeysRow.total || 0;

    const languages = db.prepare('SELECT * FROM languages WHERE game_id = ? ORDER BY language_code ASC').all(gameId) as TargetLanguage[];

    return languages.map(lang => {
      const stats = db.prepare(`
        SELECT 
          SUM(CASE WHEN status != 'untranslated' AND translated_text != '' THEN 1 ELSE 0 END) as translated,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
        FROM translations
        WHERE language_id = ?
      `).get(lang.id) as { translated: number; approved: number };

      const translatedCount = stats.translated || 0;
      const approvedCount = stats.approved || 0;
      const progress = totalKeys > 0 ? Math.round((translatedCount / totalKeys) * 100) : 0;

      return {
        language_id: lang.id,
        language_code: lang.language_code,
        language_name: lang.language_name,
        total_keys: totalKeys,
        translated_keys: translatedCount,
        approved_keys: approvedCount,
        progress_percentage: progress,
      };
    });
  }

  static addLanguage(gameId: string, languageCode: string, languageName: string): TargetLanguage {
    const id = uuidv4();
    const now = new Date().toISOString();
    const lang: TargetLanguage = {
      id,
      game_id: gameId,
      language_code: languageCode.trim(),
      language_name: languageName.trim(),
      created_at: now,
    };

    const baseKeys = db.prepare('SELECT id FROM base_keys WHERE game_id = ?').all(gameId) as { id: string }[];
    const insertTrans = db.prepare(`
      INSERT INTO translations (id, key_id, language_id, translated_text, status, updated_at)
      VALUES (?, ?, ?, '', 'untranslated', ?)
    `);

    const addTx = db.transaction(() => {
      db.prepare('INSERT INTO languages (id, game_id, language_code, language_name, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(lang.id, lang.game_id, lang.language_code, lang.language_name, lang.created_at);

      for (const key of baseKeys) {
        insertTrans.run(uuidv4(), key.id, lang.id, now);
      }
    });

    addTx();
    return lang;
  }

  static deleteLanguage(languageId: string): boolean {
    const info = db.prepare('DELETE FROM languages WHERE id = ?').run(languageId);
    return info.changes > 0;
  }

  static getTranslations(gameId: string, languageCode: string, filter?: { status?: string; search?: string }): KeyTranslationItem[] {
    const lang = db.prepare('SELECT id, language_code FROM languages WHERE game_id = ? AND language_code = ?').get(gameId, languageCode) as TargetLanguage | undefined;
    if (!lang) return [];

    let query = `
      SELECT 
        t.id as id,
        k.id as key_id,
        k.key_path as key_path,
        k.source_text as source_text,
        COALESCE(k.context_note, '') as context_note,
        k.order_index as order_index,
        l.id as language_id,
        l.language_code as language_code,
        COALESCE(t.translated_text, '') as translated_text,
        COALESCE(t.status, 'untranslated') as status,
        t.model_used as model_used,
        t.updated_at as updated_at
      FROM base_keys k
      CROSS JOIN languages l ON l.id = ?
      LEFT JOIN translations t ON t.key_id = k.id AND t.language_id = l.id
      WHERE k.game_id = ?
    `;

    const params: any[] = [lang.id, gameId];

    if (filter?.status && filter.status !== 'all') {
      if (filter.status === 'untranslated') {
        query += ` AND (t.status = 'untranslated' OR t.translated_text = '' OR t.translated_text IS NULL)`;
      } else {
        query += ` AND t.status = ?`;
        params.push(filter.status);
      }
    }

    if (filter?.search) {
      query += ` AND (k.key_path LIKE ? OR k.source_text LIKE ? OR t.translated_text LIKE ?)`;
      const searchParam = `%${filter.search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    query += ` ORDER BY k.order_index ASC`;

    return db.prepare(query).all(...params) as KeyTranslationItem[];
  }

  static updateTranslation(params: {
    keyId: string;
    languageId: string;
    translatedText: string;
    status?: TranslationStatus;
    modelUsed?: string;
  }): void {
    const now = new Date().toISOString();
    const { keyId, languageId, translatedText, status = 'manual_translated', modelUsed = '' } = params;

    const existing = db.prepare('SELECT id FROM translations WHERE key_id = ? AND language_id = ?').get(keyId, languageId) as { id: string } | undefined;

    if (existing) {
      db.prepare(`
        UPDATE translations
        SET translated_text = ?, status = ?, model_used = ?, updated_at = ?
        WHERE id = ?
      `).run(translatedText, status, modelUsed, now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO translations (id, key_id, language_id, translated_text, status, model_used, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), keyId, languageId, translatedText, status, modelUsed, now);
    }
  }

  static getExportMap(gameId: string, languageCode: string): Record<string, string> {
    const items = this.getTranslations(gameId, languageCode);
    const map: Record<string, string> = {};
    for (const item of items) {
      map[item.key_path] = item.translated_text || item.source_text;
    }
    return map;
  }
}
