import { v4 as uuidv4 } from 'uuid';
import { GameSummary, JsonSchemaConfig } from '../types/client_types.ts';
import { RemoteJsonDb } from './remote_json_db.ts';
import { LocalCacheStore } from './local_cache_store.ts';
import { runWithConcurrency } from './concurrency_limiter.ts';

const COLLECTION_GAMES = 'lt_games';
const COLLECTION_TEMPLATES = 'lt_templates';
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunk for raw templates

export class CloudGamesStore {
  private static readonly TAG_REGEX = /<[^<>]+>|\[\/?[a-zA-Z0-9_#:=."'\-\s\\\/]+\]/g;

  static extractTagsFromTexts(texts: string[]): string[] {
    const tagSet = new Set<string>();
    for (const text of texts) {
      if (!text) continue;
      const matches = text.match(this.TAG_REGEX) || [];
      for (const m of matches) tagSet.add(m.trim());
    }
    const tagArray = Array.from(tagSet);
    if (tagArray.some((t) => t.startsWith('<') && !t.startsWith('</'))) {
      tagSet.add('</>');
    }
    return Array.from(tagSet).sort();
  }

  static async getAllGames(): Promise<GameSummary[]> {
    try {
      const docs = await RemoteJsonDb.listAllDocs<GameSummary>(COLLECTION_GAMES);
      const games = docs.map((d) => d.data);
      for (const g of games) {
        await LocalCacheStore.set('games', g);
      }
      return games.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    } catch {
      const cached = await LocalCacheStore.getAll<GameSummary>('games');
      return cached.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    }
  }

  static async getGame(id: string): Promise<GameSummary | null> {
    const cached = await LocalCacheStore.get<GameSummary>('games', id);
    if (cached) return cached;

    const doc = await RemoteJsonDb.getDoc<GameSummary>(COLLECTION_GAMES, id);
    if (doc) {
      await LocalCacheStore.set('games', doc);
    }
    return doc;
  }

  static async createGame(data: {
    name: string;
    description?: string;
    context_prompt?: string;
    base_language?: string;
  }): Promise<GameSummary> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const game: GameSummary = {
      id,
      name: data.name,
      description: data.description || '',
      context_prompt: data.context_prompt || '',
      base_language: data.base_language || 'en-US',
      totalKeys: 0,
      glossaryCount: 0,
      languages: [],
      raw_json_template: '',
      schema_config: '',
      whitelist_tags: [],
      created_at: now,
      updated_at: now,
    };

    await RemoteJsonDb.upsertDoc(COLLECTION_GAMES, id, game);
    await LocalCacheStore.set('games', game);
    return game;
  }

  static async updateGame(id: string, partial: Partial<GameSummary>): Promise<GameSummary> {
    const current = (await this.getGame(id)) || {
      id,
      name: 'Untitled',
      description: '',
      context_prompt: '',
      base_language: 'en-US',
      totalKeys: 0,
      languages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated: GameSummary = {
      ...current,
      ...partial,
      updated_at: new Date().toISOString(),
    };

    await RemoteJsonDb.upsertDoc(COLLECTION_GAMES, id, updated);
    await LocalCacheStore.set('games', updated);
    return updated;
  }

  static async deleteGame(id: string): Promise<boolean> {
    await RemoteJsonDb.deleteDoc(COLLECTION_GAMES, id);
    await RemoteJsonDb.deleteDoc(COLLECTION_TEMPLATES, `${id}_template`);
    await LocalCacheStore.delete('games', id);
    return true;
  }

  static async saveTemplate(gameId: string, templateStr: string): Promise<void> {
    const chunksCount = Math.ceil(templateStr.length / CHUNK_SIZE);
    const indices = Array.from({ length: chunksCount }, (_, i) => i);
    await runWithConcurrency(indices, 3, async (i) => {
      const part = templateStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await RemoteJsonDb.upsertDoc(COLLECTION_TEMPLATES, `${gameId}_tpl_${i}`, { part, index: i, chunksCount });
    });
    await RemoteJsonDb.upsertDoc(COLLECTION_TEMPLATES, `${gameId}_tpl_meta`, { chunksCount });
  }

  static async loadTemplate(gameId: string): Promise<string> {
    const meta = await RemoteJsonDb.getDoc<{ chunksCount: number }>(COLLECTION_TEMPLATES, `${gameId}_tpl_meta`);
    if (!meta || !meta.chunksCount) return '';

    const indices = Array.from({ length: meta.chunksCount }, (_, i) => i);
    const parts = await runWithConcurrency(indices, 3, async (i) => {
      const doc = await RemoteJsonDb.getDoc<{ part: string }>(COLLECTION_TEMPLATES, `${gameId}_tpl_${i}`);
      return doc?.part || '';
    });
    return parts.join('');
  }
}
