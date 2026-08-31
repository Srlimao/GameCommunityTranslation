import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import { KeyTranslationItem, SystemSettings, BatchProgressData } from '../client/src/types/client_types.ts';
import { BrowserBatchQueue } from '../client/src/features/ai/browser_batch_queue.ts';
import { BrowserAIService } from '../client/src/features/ai/browser_ai_service.ts';

describe('Batch Translation Queue Unit Tests', () => {
  const dummySettings: SystemSettings = {
    translation_provider: 'openai_compatible',
    translation_model: 'test-model',
    translation_base_url: 'http://localhost:1234/v1',
    translation_api_key: 'test-key',
    translation_temperature: 0.2,
    qa_provider: 'gemini',
    qa_model: 'gemini-2.5-flash',
    qa_base_url: '',
    qa_api_key: '',
    batch_concurrency: 3,
    request_timeout_ms: 5000,
  };

  it('1. should execute batch translation with concurrency and report progress metrics', async () => {
    // Mock translate
    let callCount = 0;
    (BrowserAIService as any).translate = async (params: any) => {
      callCount++;
      return { text: "Translated: " + params.sourceText, modelUsed: 'test-model' };
    };

    const items: KeyTranslationItem[] = Array.from({ length: 15 }, (_, i) => ({
      id: "id_" + i,
      key_id: "k_" + i,
      key_path: "menu.btn_" + i,
      source_text: "Button " + i,
      order_index: i,
      language_id: 'lang_1',
      language_code: 'es-ES',
      translated_text: '',
      status: 'untranslated',
      updated_at: new Date().toISOString(),
    }));

    const progressUpdates: BatchProgressData[] = [];
    const updatedItems: KeyTranslationItem[] = [];

    await BrowserBatchQueue.runBatch({
      jobId: 'job_test_01',
      gameId: 'game_01',
      gameName: 'Test Game',
      gameContext: 'Context',
      baseLanguage: 'en',
      targetLanguageName: 'Spanish',
      targetLanguageCode: 'es-ES',
      items,
      glossary: [],
      concurrency: 3,
      settings: dummySettings,
      onProgress: (p) => {
        progressUpdates.push({ ...p });
      },
      onItemUpdated: async (item) => {
        updatedItems.push({ ...item });
      },
    });

    assert.strictEqual(callCount, 15, 'All 15 keys translated');
    assert.strictEqual(updatedItems.length, 15, 'All 15 items updated');
    assert.strictEqual(updatedItems[0].translated_text, 'Translated: Button 0');
    assert.strictEqual(updatedItems[0].status, 'ai_translated');

    const lastProgress = progressUpdates[progressUpdates.length - 1];
    assert.strictEqual(lastProgress.status, 'completed');
    assert.strictEqual(lastProgress.completed, 15);
    assert.strictEqual(lastProgress.succeeded, 15);
    assert.strictEqual(lastProgress.failed, 0);
  });

  it('2. should retry transient errors and record failures if attempts exhausted', async () => {
    let attemptsOnKey2 = 0;
    (BrowserAIService as any).translate = async (params: any) => {
      if (params.keyPath === 'menu.btn_fail') {
        attemptsOnKey2++;
        throw new Error('429 Rate limit exceeded');
      }
      return { text: "Translated: " + params.sourceText, modelUsed: 'test-model' };
    };

    const items: KeyTranslationItem[] = [
      {
        id: 'id_1', key_id: 'k_1', key_path: 'menu.btn_ok', source_text: 'OK',
        order_index: 0, language_id: 'lang_1', language_code: 'es-ES',
        translated_text: '', status: 'untranslated', updated_at: new Date().toISOString(),
      },
      {
        id: 'id_2', key_id: 'k_2', key_path: 'menu.btn_fail', source_text: 'Fail',
        order_index: 1, language_id: 'lang_1', language_code: 'es-ES',
        translated_text: '', status: 'untranslated', updated_at: new Date().toISOString(),
      },
    ];

    let finalProgress: BatchProgressData | null = null;

    await BrowserBatchQueue.runBatch({
      jobId: 'job_test_retry',
      gameId: 'game_01',
      gameName: 'Test Game',
      gameContext: 'Context',
      baseLanguage: 'en',
      targetLanguageName: 'Spanish',
      targetLanguageCode: 'es-ES',
      items,
      glossary: [],
      concurrency: 1,
      settings: dummySettings,
      onProgress: (p) => { finalProgress = { ...p }; },
    });

    assert.strictEqual(attemptsOnKey2, 3, 'Should have retried the failed key 3 times');
    assert.ok(finalProgress, 'Progress recorded');
    assert.strictEqual((finalProgress as any).completed, 2);
    assert.strictEqual((finalProgress as any).succeeded, 1);
    assert.strictEqual((finalProgress as any).failed, 1);
    assert.strictEqual((finalProgress as any).failedKeys.length, 1);
    assert.strictEqual((finalProgress as any).failedKeys[0].key_path, 'menu.btn_fail');
  });

  it('3. should support pause, resume, and cancellation lifecycle', async () => {
    let translatedCount = 0;
    (BrowserAIService as any).translate = async (params: any) => {
      translatedCount++;
      return { text: "Translated " + params.sourceText, modelUsed: 'test-model' };
    };

    const items: KeyTranslationItem[] = Array.from({ length: 20 }, (_, i) => ({
      id: "id_" + i,
      key_id: "k_" + i,
      key_path: "dialogue.scene_" + i,
      source_text: "Line " + i,
      order_index: i,
      language_id: 'lang_1',
      language_code: 'es-ES',
      translated_text: '',
      status: 'untranslated',
      updated_at: new Date().toISOString(),
    }));

    const jobId = 'job_test_cancel';
    const batchPromise = BrowserBatchQueue.runBatch({
      jobId,
      gameId: 'game_01',
      gameName: 'Test Game',
      gameContext: 'Context',
      baseLanguage: 'en',
      targetLanguageName: 'Spanish',
      targetLanguageCode: 'es-ES',
      items,
      glossary: [],
      concurrency: 1,
      settings: dummySettings,
      onItemUpdated: async () => {
        // Cancel after 3 items
        if (translatedCount >= 3) {
          BrowserBatchQueue.cancelJob(jobId);
        }
      },
    });

    await batchPromise;
    assert.ok(translatedCount >= 3 && translatedCount < 20, 'Job stopped early on cancel');
  });

  it('4. should instantly fast-path empty or whitespace-only source texts without calling AI', async () => {
    let aiCallCount = 0;
    (BrowserAIService as any).translate = async (params: any) => {
      aiCallCount++;
      return { text: "Translated: " + params.sourceText, modelUsed: 'test-model' };
    };

    const items: KeyTranslationItem[] = [
      {
        id: 'id_empty', key_id: 'k_empty', key_path: 'ui.empty', source_text: '',
        order_index: 0, language_id: 'lang_1', language_code: 'es-ES',
        translated_text: '', status: 'untranslated', updated_at: new Date().toISOString(),
      },
      {
        id: 'id_spaces', key_id: 'k_spaces', key_path: 'ui.spaces', source_text: '   ',
        order_index: 1, language_id: 'lang_1', language_code: 'es-ES',
        translated_text: '', status: 'untranslated', updated_at: new Date().toISOString(),
      },
      {
        id: 'id_normal', key_id: 'k_normal', key_path: 'ui.normal', source_text: 'Play Game',
        order_index: 2, language_id: 'lang_1', language_code: 'es-ES',
        translated_text: '', status: 'untranslated', updated_at: new Date().toISOString(),
      },
    ];

    const updated: KeyTranslationItem[] = [];

    await BrowserBatchQueue.runBatch({
      jobId: 'job_test_empty',
      gameId: 'game_01',
      gameName: 'Test Game',
      gameContext: 'Context',
      baseLanguage: 'en',
      targetLanguageName: 'Spanish',
      targetLanguageCode: 'es-ES',
      items,
      glossary: [],
      concurrency: 1,
      settings: dummySettings,
      onItemUpdated: async (item) => {
        updated.push({ ...item });
      },
    });

    assert.strictEqual(aiCallCount, 1, 'Only 1 normal key was sent to AI model');
    assert.strictEqual(updated.length, 3, 'All 3 items updated');
    assert.strictEqual(updated[0].translated_text, '', 'Empty string preserved');
    assert.strictEqual(updated[0].model_used, 'system:empty_source');
    assert.strictEqual(updated[1].translated_text, '   ', 'Whitespace string preserved');
    assert.strictEqual(updated[1].model_used, 'system:empty_source');
    assert.strictEqual(updated[2].translated_text, 'Translated: Play Game');
  });
});
