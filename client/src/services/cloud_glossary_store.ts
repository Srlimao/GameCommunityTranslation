import { v4 as uuidv4 } from 'uuid';
import { GlossaryEntry } from '../types/client_types.ts';
import { RemoteJsonDb } from './remote_json_db.ts';
import { LocalCacheStore } from './local_cache_store.ts';

const COLLECTION_GLOSSARY = 'lt_glossary';

export interface GameGlossaryDoc {
  game_id: string;
  entries: GlossaryEntry[];
}

export class CloudGlossaryStore {
  static async getGlossary(gameId: string, language?: string): Promise<GlossaryEntry[]> {
    const cached = await LocalCacheStore.get<GameGlossaryDoc>('glossary', gameId);
    let entries: GlossaryEntry[] = cached?.entries || [];

    if (entries.length === 0) {
      const doc = await RemoteJsonDb.getDoc<GameGlossaryDoc>(COLLECTION_GLOSSARY, gameId);
      if (doc?.entries) {
        entries = doc.entries;
        await LocalCacheStore.set('glossary', doc);
      }
    }

    if (language) {
      return entries.filter(
        (e) => !e.target_language || e.target_language.toLowerCase() === language.toLowerCase()
      );
    }

    return entries;
  }

  static async addEntry(gameId: string, entry: Partial<GlossaryEntry>): Promise<GlossaryEntry> {
    const entries = await this.getGlossary(gameId);
    const newEntry: GlossaryEntry = {
      id: uuidv4(),
      game_id: gameId,
      source_term: (entry.source_term || '').trim(),
      target_term: (entry.target_term || '').trim(),
      target_language: entry.target_language || '',
      category: entry.category || 'General',
      notes: entry.notes || '',
      created_at: new Date().toISOString(),
    };

    entries.push(newEntry);
    const doc: GameGlossaryDoc = { game_id: gameId, entries };
    await LocalCacheStore.set('glossary', doc);
    await RemoteJsonDb.upsertDoc(COLLECTION_GLOSSARY, gameId, doc);
    return newEntry;
  }

  static async batchAdd(gameId: string, candidates: Partial<GlossaryEntry>[]): Promise<number> {
    const entries = await this.getGlossary(gameId);
    let addedCount = 0;

    for (const c of candidates) {
      const src = (c.source_term || '').trim().toLowerCase();
      if (!src) continue;
      const exists = entries.some((e) => e.source_term.trim().toLowerCase() === src);
      if (!exists) {
        entries.push({
          id: uuidv4(),
          game_id: gameId,
          source_term: (c.source_term || '').trim(),
          target_term: (c.target_term || '').trim(),
          target_language: c.target_language || '',
          category: c.category || 'General',
          notes: c.notes || '',
          created_at: new Date().toISOString(),
        });
        addedCount++;
      }
    }

    const doc: GameGlossaryDoc = { game_id: gameId, entries };
    await LocalCacheStore.set('glossary', doc);
    await RemoteJsonDb.upsertDoc(COLLECTION_GLOSSARY, gameId, doc);
    return addedCount;
  }

  static async updateEntry(gameId: string, id: string, partial: Partial<GlossaryEntry>): Promise<GlossaryEntry> {
    const entries = await this.getGlossary(gameId);
    const index = entries.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Glossary entry not found');

    entries[index] = { ...entries[index], ...partial };
    const doc: GameGlossaryDoc = { game_id: gameId, entries };
    await LocalCacheStore.set('glossary', doc);
    await RemoteJsonDb.upsertDoc(COLLECTION_GLOSSARY, gameId, doc);
    return entries[index];
  }

  static async deleteEntry(gameId: string, id: string): Promise<boolean> {
    const entries = await this.getGlossary(gameId);
    const filtered = entries.filter((e) => e.id !== id);
    const doc: GameGlossaryDoc = { game_id: gameId, entries: filtered };
    await LocalCacheStore.set('glossary', doc);
    await RemoteJsonDb.upsertDoc(COLLECTION_GLOSSARY, gameId, doc);
    return true;
  }
}
