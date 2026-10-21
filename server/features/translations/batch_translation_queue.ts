import EventEmitter from 'events';
import { GamesRepository } from '../games/games_repository.ts';
import { TranslationsRepository } from './translations_repository.ts';
import { GlossaryRepository } from '../glossary/glossary_repository.ts';
import { AIService } from '../ai_providers/ai_service.ts';
import { SettingsRepository } from '../settings/settings_repository.ts';
import { KeyTranslationItem } from '../../types/domain_types.ts';

export interface BatchJobProgress {
  jobId: string;
  gameId: string;
  languageCode: string;
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  total: number;
  completed: number;
  currentKey?: string;
  errorMessage?: string;
}

export class BatchTranslationQueue extends EventEmitter {
  private static instance: BatchTranslationQueue;
  private activeJobs = new Map<
    string,
    {
      progress: BatchJobProgress;
      cancelled: boolean;
      paused: boolean;
    }
  >();

  private constructor() {
    super();
  }

  static getInstance(): BatchTranslationQueue {
    if (!BatchTranslationQueue.instance) {
      BatchTranslationQueue.instance = new BatchTranslationQueue();
    }
    return BatchTranslationQueue.instance;
  }

  getJobProgress(jobId: string): BatchJobProgress | undefined {
    return this.activeJobs.get(jobId)?.progress;
  }

  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.cancelled = true;
      job.progress.status = 'cancelled';
      this.emit('progress', job.progress);
      return true;
    }
    return false;
  }

  async startBatch(params: {
    gameId: string;
    languageCode: string;
    onlyUntranslated?: boolean;
    customInstructions?: string;
    userId?: string;
  }): Promise<string> {
    const { gameId, languageCode, onlyUntranslated = true, customInstructions, userId } = params;
    const jobId = `${gameId}_${languageCode}_${Date.now()}`;

    const game = GamesRepository.getById(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    const languages = TranslationsRepository.getLanguages(gameId);
    const targetLang = languages.find((l) => l.language_code === languageCode);
    if (!targetLang) {
      throw new Error(`Language ${languageCode} not configured for game`);
    }

    const glossary = GlossaryRepository.getByGame(gameId, languageCode);
    const filter = onlyUntranslated ? { status: 'untranslated' } : undefined;
    const items = TranslationsRepository.getTranslations(gameId, languageCode, filter);

    const progress: BatchJobProgress = {
      jobId,
      gameId,
      languageCode,
      status: 'running',
      total: items.length,
      completed: 0,
    };

    const jobState = { progress, cancelled: false, paused: false };
    this.activeJobs.set(jobId, jobState);

    // Launch async processing in the background
    this.processQueue(jobId, game, targetLang, items, glossary, customInstructions, userId).catch((err) => {
      progress.status = 'error';
      progress.errorMessage = err.message || String(err);
      this.emit('progress', progress);
    });

    return jobId;
  }

  private async processQueue(
    jobId: string,
    game: any,
    targetLang: any,
    items: KeyTranslationItem[],
    glossary: any[],
    customInstructions?: string,
    userId?: string
  ): Promise<void> {
    const jobState = this.activeJobs.get(jobId);
    if (!jobState) return;

    const settings = SettingsRepository.getUserSettings(userId);
    const concurrency = Math.max(1, Math.min(10, settings.batch_concurrency || 1));

    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < items.length) {
        if (jobState.cancelled) {
          return;
        }

        const itemIndex = currentIndex++;
        const item = items[itemIndex];
        if (!item) break;

        jobState.progress.currentKey = item.key_path;
        this.emit('progress', jobState.progress);

        if (!item.source_text || !item.source_text.trim()) {
          TranslationsRepository.updateTranslation({
            keyId: item.key_id,
            languageId: targetLang.language_id,
            translatedText: item.source_text || '',
            status: 'ai_translated',
            modelUsed: 'system:empty_source',
          });
          jobState.progress.completed++;
          this.emit('progress', jobState.progress);
          continue;
        }

        try {
          const { text: translated, modelUsed } = await AIService.translate({
            gameName: game.name,
            gameContext: game.context_prompt,
            baseLanguage: game.base_language || 'en-US',
            targetLanguageName: targetLang.language_name,
            targetLanguageCode: targetLang.language_code,
            keyPath: item.key_path,
            sourceText: item.source_text,
            glossary,
            customInstructions,
          }, userId);

          TranslationsRepository.updateTranslation({
            keyId: item.key_id,
            languageId: targetLang.language_id,
            translatedText: translated,
            status: 'ai_translated',
            modelUsed,
          });

          jobState.progress.completed++;
          this.emit('progress', jobState.progress);
          this.emit('keyTranslated', {
            jobId,
            keyId: item.key_id,
            keyPath: item.key_path,
            translatedText: translated,
          });
        } catch (err: any) {
          console.error(`[BatchQueue] Error translating key ${item.key_path}:`, err);
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, items.length || 1) }, () => worker());
    await Promise.all(workers);

    if (!jobState.cancelled) {
      jobState.progress.status = 'completed';
      jobState.progress.currentKey = undefined;
      this.emit('progress', jobState.progress);
    }
  }
}
