import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import { KeyTranslationItem } from '../client/src/types/client_types.ts';
import { TranslationChunkManager } from '../client/src/services/translation_chunk_manager.ts';
import { CloudTranslationsStore } from '../client/src/services/cloud_translations_store.ts';
import { LocalCacheStore } from '../client/src/services/local_cache_store.ts';
import { RemoteJsonDb } from '../client/src/services/remote_json_db.ts';

const inMemoryCache = new Map<string, Map<string, any>>();
const remoteDbMock = new Map<string, Map<string, any>>();

function getStoreMap(storeName: string): Map<string, any> {
  if (!inMemoryCache.has(storeName)) {
    inMemoryCache.set(storeName, new Map());
  }
  return inMemoryCache.get(storeName)!;
}

function getRemoteCollection(collection: string): Map<string, any> {
  if (!remoteDbMock.has(collection)) {
    remoteDbMock.set(collection, new Map());
  }
  return remoteDbMock.get(collection)!;
}

(LocalCacheStore as any).get = async <T>(storeName: string, key: string): Promise<T | null> => {
  const store = getStoreMap(storeName);
  return (store.get(key) as T) ?? null;
};

(LocalCacheStore as any).getAll = async <T>(storeName: string): Promise<T[]> => {
  const store = getStoreMap(storeName);
  return Array.from(store.values()) as T[];
};

(LocalCacheStore as any).set = async <T>(storeName: string, value: any): Promise<void> => {
  const store = getStoreMap(storeName);
  const key = value.chunk_id || value.id || value.key || uuidv4();
  store.set(key, value);
};

(RemoteJsonDb as any).getDoc = async <T>(collection: string, id: string): Promise<T | null> => {
  const col = getRemoteCollection(collection);
  return (col.get(id) as T) ?? null;
};

(RemoteJsonDb as any).upsertDoc = async <T>(collection: string, id: string, data: T): Promise<boolean> => {
  const col = getRemoteCollection(collection);
  col.set(id, data);
  return true;
};

describe('Tree Explorer & Top-50 Paginated Navigation Tests', () => {
  const gameId = 'game_tree_test_001';
  const langCode = 'de-DE';

  beforeEach(() => {
    inMemoryCache.clear();
    remoteDbMock.clear();
  });

  it('1. should build complete multi-level namespace tree from keys', async () => {
    const rawKeys: string[] = [
      'ui.menus.main.start_button',
      'ui.menus.main.options_button',
      'ui.menus.audio.master_volume',
      'ui.menus.audio.sfx_volume',
      'ui.dialogue.act1.scene1.intro',
      'ui.dialogue.act1.scene2.reply',
      'items.weapons.swords.iron_sword',
      'items.weapons.swords.steel_sword',
      'items.armor.helmets.iron_helmet',
    ];

    const items: KeyTranslationItem[] = rawKeys.map((k, idx) => ({
      id: "id_" + idx,
      key_id: "k_" + idx,
      key_path: k,
      source_text: "Source text for " + k,
      order_index: idx,
      language_id: 'lang_1',
      language_code: langCode,
      translated_text: idx % 2 === 0 ? "Translated " + k : '',
      status: idx % 2 === 0 ? 'manual_translated' : 'untranslated',
      updated_at: new Date().toISOString(),
    }));

    await TranslationChunkManager.saveItemsInChunks(gameId, langCode, items);

    const treeItems = await CloudTranslationsStore.getTreeItems(gameId, langCode);
    assert.strictEqual(treeItems.length, 9, 'Should retrieve all 9 tree key items');

    interface NamespaceNode {
      name: string;
      fullPath: string;
      count: number;
      translatedCount: number;
      subfolders: Record<string, NamespaceNode>;
    }

    const root: NamespaceNode = { name: 'root', fullPath: '', count: 0, translatedCount: 0, subfolders: {} };
    for (const it of treeItems) {
      root.count++;
      const isTranslated = Boolean(it.translated_text && it.status !== 'untranslated');
      if (isTranslated) root.translatedCount++;

      const parts = it.key_path.split(/[./:]/).filter(Boolean);
      let current = root;
      let currentPath = '';
      const limit = parts.length > 1 ? parts.length - 1 : 1;
      for (let p = 0; p < limit; p++) {
        const seg = parts[p];
        currentPath = currentPath ? currentPath + '.' + seg : seg;
        if (!current.subfolders[seg]) {
          current.subfolders[seg] = { name: seg, fullPath: currentPath, count: 0, translatedCount: 0, subfolders: {} };
        }
        current = current.subfolders[seg];
        current.count++;
        if (isTranslated) current.translatedCount++;
      }
    }

    assert.ok(root.subfolders['ui'], 'ui root branch exists');
    assert.ok(root.subfolders['items'], 'items root branch exists');
    assert.strictEqual(root.subfolders['ui'].count, 6, 'ui has 6 total keys');
    assert.strictEqual(root.subfolders['items'].count, 3, 'items has 3 total keys');
    assert.ok(root.subfolders['ui'].subfolders['menus'], 'ui.menus subfolder exists');
    assert.strictEqual(root.subfolders['ui'].subfolders['menus'].count, 4, 'ui.menus has 4 keys');
  });

  it('2. should only return top-50 items for the selected prefix node', async () => {
    const allItems: KeyTranslationItem[] = [];
    let order = 0;

    for (let i = 0; i < 120; i++) {
      allItems.push({
        id: "quest_" + i,
        key_id: "k_quest_" + i,
        key_path: "quests.act1.step_" + i,
        source_text: "Quest step " + i,
        order_index: order++,
        language_id: 'lang_1',
        language_code: langCode,
        translated_text: '',
        status: 'untranslated',
        updated_at: new Date().toISOString(),
      });
    }

    for (let i = 0; i < 80; i++) {
      allItems.push({
        id: "item_" + i,
        key_id: "k_item_" + i,
        key_path: "items.weapons.sword_" + i,
        source_text: "Weapon sword " + i,
        order_index: order++,
        language_id: 'lang_1',
        language_code: langCode,
        translated_text: '',
        status: 'untranslated',
        updated_at: new Date().toISOString(),
      });
    }

    await TranslationChunkManager.saveItemsInChunks(gameId, langCode, allItems);

    const page1 = await CloudTranslationsStore.getPaginatedTranslations({
      gameId,
      langCode,
      page: 1,
      pageSize: 50,
      prefix: 'quests.act1',
    });

    assert.strictEqual(page1.items.length, 50, 'Page 1 should only return top 50 items');
    assert.strictEqual(page1.totalCount, 120, 'Total count under quests.act1 should be 120');
    assert.strictEqual(page1.totalPages, 3, 'Total pages for 120 items at pageSize 50 should be 3');
    assert.ok(page1.items.every((i) => i.key_path.startsWith('quests.act1')), 'All items must belong to quests.act1');

    const page2 = await CloudTranslationsStore.getPaginatedTranslations({
      gameId,
      langCode,
      page: 2,
      pageSize: 50,
      prefix: 'quests.act1',
    });
    assert.strictEqual(page2.items.length, 50, 'Page 2 should return 50 items');
    assert.strictEqual(page2.items[0].key_path, 'quests.act1.step_50', 'Page 2 should start at item 50');

    const page3 = await CloudTranslationsStore.getPaginatedTranslations({
      gameId,
      langCode,
      page: 3,
      pageSize: 50,
      prefix: 'quests.act1',
    });
    assert.strictEqual(page3.items.length, 20, 'Page 3 should return remaining 20 items');
  });

  it('3. should filter out empty or whitespace-only source entries when hideEmptySource is true', async () => {
    const testItems: KeyTranslationItem[] = [
      {
        id: '1',
        key_id: 'k1',
        key_path: 'dialogue.greeting',
        source_text: 'Hello, traveler!',
        order_index: 0,
        language_id: 'lang_1',
        language_code: langCode,
        translated_text: 'Hallo, Reisender!',
        status: 'manual_translated',
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        key_id: 'k2',
        key_path: 'dialogue.blank1',
        source_text: '',
        order_index: 1,
        language_id: 'lang_1',
        language_code: langCode,
        translated_text: '',
        status: 'ai_translated',
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        key_id: 'k3',
        key_path: 'dialogue.whitespace',
        source_text: '   \n  ',
        order_index: 2,
        language_id: 'lang_1',
        language_code: langCode,
        translated_text: '',
        status: 'untranslated',
        updated_at: new Date().toISOString(),
      },
      {
        id: '4',
        key_id: 'k4',
        key_path: 'dialogue.farewell',
        source_text: 'Goodbye!',
        order_index: 3,
        language_id: 'lang_1',
        language_code: langCode,
        translated_text: 'Auf Wiedersehen!',
        status: 'manual_translated',
        updated_at: new Date().toISOString(),
      },
    ];

    await TranslationChunkManager.saveItemsInChunks(gameId, langCode, testItems);

    const allRes = await CloudTranslationsStore.getPaginatedTranslations({
      gameId,
      langCode,
      page: 1,
      pageSize: 10,
      hideEmptySource: false,
    });
    assert.strictEqual(allRes.totalCount, 4, 'Should include all 4 items when hideEmptySource is false');

    const filteredRes = await CloudTranslationsStore.getPaginatedTranslations({
      gameId,
      langCode,
      page: 1,
      pageSize: 10,
      hideEmptySource: true,
    });
    assert.strictEqual(filteredRes.totalCount, 2, 'Should only return 2 non-empty items when hideEmptySource is true');
    assert.strictEqual(filteredRes.items[0].key_path, 'dialogue.greeting');
    assert.strictEqual(filteredRes.items[1].key_path, 'dialogue.farewell');
  });
});
