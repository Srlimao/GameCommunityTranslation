import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/sqlite_client.ts';
import { GlossaryEntry } from '../../types/domain_types.ts';

export class GlossaryRepository {
  static getByGame(gameId: string, targetLanguage?: string): GlossaryEntry[] {
    let query = 'SELECT * FROM glossary WHERE game_id = ?';
    const params: any[] = [gameId];

    if (targetLanguage) {
      query += " AND (target_language = ? OR target_language = '' OR target_language IS NULL)";
      params.push(targetLanguage);
    }

    query += ' ORDER BY source_term ASC';
    return db.prepare(query).all(...params) as GlossaryEntry[];
  }

  static add(data: {
    game_id: string;
    source_term: string;
    target_term: string;
    target_language?: string;
    category?: 'Character' | 'Item' | 'Location' | 'UI' | 'Lore' | 'General';
    notes?: string;
  }): GlossaryEntry {
    const id = uuidv4();
    const entry: GlossaryEntry = {
      id,
      game_id: data.game_id,
      source_term: data.source_term.trim(),
      target_term: data.target_term.trim(),
      target_language: data.target_language || '',
      category: data.category || 'General',
      notes: data.notes || '',
      created_at: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO glossary (id, game_id, source_term, target_term, target_language, category, notes, created_at)
      VALUES (@id, @game_id, @source_term, @target_term, @target_language, @category, @notes, @created_at)
    `).run(entry);

    return entry;
  }

  static addBatch(entries: Array<{
    game_id: string;
    source_term: string;
    target_term: string;
    target_language?: string;
    category?: 'Character' | 'Item' | 'Location' | 'UI' | 'Lore' | 'General';
    notes?: string;
  }>): number {
    const insert = db.prepare(`
      INSERT INTO glossary (id, game_id, source_term, target_term, target_language, category, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    let count = 0;

    const batchTx = db.transaction(() => {
      for (const item of entries) {
        // Skip if source term already exists for this game and language
        const existing = db.prepare(`
          SELECT id FROM glossary 
          WHERE game_id = ? AND LOWER(source_term) = LOWER(?) AND target_language = ?
        `).get(item.game_id, item.source_term.trim(), item.target_language || '');

        if (!existing) {
          insert.run(
            uuidv4(),
            item.game_id,
            item.source_term.trim(),
            item.target_term.trim(),
            item.target_language || '',
            item.category || 'General',
            item.notes || '',
            now
          );
          count++;
        }
      }
    });

    batchTx();
    return count;
  }

  static update(id: string, partial: Partial<Omit<GlossaryEntry, 'id' | 'game_id' | 'created_at'>>): GlossaryEntry | undefined {
    const current = db.prepare('SELECT * FROM glossary WHERE id = ?').get(id) as GlossaryEntry | undefined;
    if (!current) return undefined;

    const updated: GlossaryEntry = {
      ...current,
      ...partial,
    };

    db.prepare(`
      UPDATE glossary
      SET source_term = @source_term, target_term = @target_term, target_language = @target_language,
          category = @category, notes = @notes
      WHERE id = @id
    `).run(updated);

    return updated;
  }

  static delete(id: string): boolean {
    const info = db.prepare('DELETE FROM glossary WHERE id = ?').run(id);
    return info.changes > 0;
  }
}
