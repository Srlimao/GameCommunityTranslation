import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/sqlite_client.ts';
import { Game, BaseKey } from '../../types/domain_types.ts';
import { FlattenedKeyItem } from './json_structure_parser.ts';

export class GamesRepository {
  private static readonly TAG_REGEX = /<[^<>]+>|\[\/?[a-zA-Z0-9_#:=."'\-\s\\\/]+\]/g;

  static extractTagsFromTexts(texts: string[]): string[] {
    const tagSet = new Set<string>();
    for (const text of texts) {
      if (!text) continue;
      const matches = text.match(this.TAG_REGEX) || [];
      for (const m of matches) {
        tagSet.add(m.trim());
      }
    }

    // Ensure common shorthand closing tags if opening tags exist
    const tagArray = Array.from(tagSet);
    const hasAngleTags = tagArray.some(t => t.startsWith('<') && !t.startsWith('</'));
    if (hasAngleTags) {
      tagSet.add('</>');
    }

    return Array.from(tagSet).sort();
  }

  static getAll(): Game[] {
    return db.prepare('SELECT * FROM games ORDER BY updated_at DESC').all() as Game[];
  }

  static getById(id: string): Game | undefined {
    return db.prepare('SELECT * FROM games WHERE id = ?').get(id) as Game | undefined;
  }

  static create(data: { name: string; description?: string; context_prompt?: string; base_language?: string }): Game {
    const id = uuidv4();
    const now = new Date().toISOString();
    const game: Game = {
      id,
      name: data.name,
      description: data.description || '',
      context_prompt: data.context_prompt || '',
      base_language: data.base_language || 'en-US',
      raw_json_template: '',
      schema_config: '',
      whitelist_tags: '[]',
      created_at: now,
      updated_at: now,
    };

    db.prepare(`
      INSERT INTO games (id, name, description, context_prompt, base_language, raw_json_template, schema_config, whitelist_tags, created_at, updated_at)
      VALUES (@id, @name, @description, @context_prompt, @base_language, @raw_json_template, @schema_config, @whitelist_tags, @created_at, @updated_at)
    `).run(game);

    return game;
  }

  static update(id: string, partial: Partial<Omit<Game, 'id' | 'created_at'>>): Game | undefined {
    const current = this.getById(id);
    if (!current) return undefined;

    let whitelistTagsStr = current.whitelist_tags;
    if (partial.whitelist_tags !== undefined) {
      whitelistTagsStr = Array.isArray(partial.whitelist_tags)
        ? JSON.stringify(partial.whitelist_tags)
        : partial.whitelist_tags;
    }

    const updated: Game = {
      ...current,
      ...partial,
      whitelist_tags: whitelistTagsStr,
      updated_at: new Date().toISOString(),
    };

    db.prepare(`
      UPDATE games
      SET name = @name, description = @description, context_prompt = @context_prompt,
          base_language = @base_language, raw_json_template = @raw_json_template,
          schema_config = @schema_config, whitelist_tags = @whitelist_tags, updated_at = @updated_at
      WHERE id = @id
    `).run(updated);

    return updated;
  }

  static delete(id: string): boolean {
    const info = db.prepare('DELETE FROM games WHERE id = ?').run(id);
    return info.changes > 0;
  }

  static importBaseKeys(
    gameId: string,
    keys: FlattenedKeyItem[],
    rawJsonTemplate?: string,
    schemaConfig?: string
  ): number {
    const now = new Date().toISOString();

    // Auto-discover tags from base keys
    const discoveredTags = this.extractTagsFromTexts(keys.map((k) => k.sourceText));
    const currentGame = this.getById(gameId);
    let existingTags: string[] = [];
    try {
      if (currentGame?.whitelist_tags) {
        existingTags = JSON.parse(currentGame.whitelist_tags as string);
      }
    } catch {}

    const mergedTags = Array.from(new Set([...existingTags, ...discoveredTags])).sort();
    const whitelistJson = JSON.stringify(mergedTags);

    const insertOrUpdateKey = db.prepare(`
      INSERT INTO base_keys (id, game_id, key_path, source_text, context_note, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(game_id, key_path) DO UPDATE SET
        source_text = excluded.source_text,
        context_note = excluded.context_note,
        order_index = excluded.order_index
    `);

    const languages = db.prepare('SELECT id FROM languages WHERE game_id = ?').all(gameId) as { id: string }[];
    const insertTranslation = db.prepare(`
      INSERT OR IGNORE INTO translations (id, key_id, language_id, translated_text, status, updated_at)
      VALUES (?, ?, ?, '', 'untranslated', ?)
    `);

    const importTx = db.transaction((items: FlattenedKeyItem[]) => {
      for (const item of items) {
        const keyId = uuidv4();
        insertOrUpdateKey.run(keyId, gameId, item.keyPath, item.sourceText, item.contextNote || '', item.orderIndex);

        const actualKey = db.prepare('SELECT id FROM base_keys WHERE game_id = ? AND key_path = ?').get(gameId, item.keyPath) as { id: string };

        for (const lang of languages) {
          insertTranslation.run(uuidv4(), actualKey.id, lang.id, now);
        }
      }

      if (rawJsonTemplate !== undefined) {
        db.prepare('UPDATE games SET raw_json_template = ?, schema_config = ?, whitelist_tags = ?, updated_at = ? WHERE id = ?')
          .run(rawJsonTemplate, schemaConfig || '', whitelistJson, now, gameId);
      } else {
        db.prepare('UPDATE games SET whitelist_tags = ?, updated_at = ? WHERE id = ?').run(whitelistJson, now, gameId);
      }
    });

    importTx(keys);
    return keys.length;
  }

  static discoverGameTags(gameId: string): string[] {
    const keys = this.getBaseKeys(gameId);
    const tags = this.extractTagsFromTexts(keys.map((k) => k.source_text));
    const now = new Date().toISOString();
    const jsonStr = JSON.stringify(tags);
    db.prepare('UPDATE games SET whitelist_tags = ?, updated_at = ? WHERE id = ?').run(jsonStr, now, gameId);
    return tags;
  }

  static updateWhitelistTags(gameId: string, tags: string[]): string[] {
    const sorted = Array.from(new Set(tags.map(t => t.trim()).filter(Boolean))).sort();
    const now = new Date().toISOString();
    const jsonStr = JSON.stringify(sorted);
    db.prepare('UPDATE games SET whitelist_tags = ?, updated_at = ? WHERE id = ?').run(jsonStr, now, gameId);
    return sorted;
  }

  static getBaseKeys(gameId: string): BaseKey[] {
    return db.prepare('SELECT * FROM base_keys WHERE game_id = ? ORDER BY order_index ASC').all(gameId) as BaseKey[];
  }

  static getBaseKeysCount(gameId: string): number {
    const row = db.prepare('SELECT count(*) as count FROM base_keys WHERE game_id = ?').get(gameId) as { count: number };
    return row.count || 0;
  }
}
