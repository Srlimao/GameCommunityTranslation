import { KeyTranslationItem, SystemSettings, GlossaryEntry, BatchProgressData } from '../../types/client_types.ts';
import { BrowserAIService } from './browser_ai_service.ts';

export type BatchProgressCallback = (data: BatchProgressData) => void;

export interface BatchRunParams {
  jobId: string;
  gameId: string;
  gameName: string;
  gameContext: string;
  baseLanguage: string;
  targetLanguageName: string;
  targetLanguageCode: string;
  items: KeyTranslationItem[];
  glossary: GlossaryEntry[];
  customInstructions?: string;
  settings: SystemSettings;
  onProgress: BatchProgressCallback;
  onItemUpdated: (item: KeyTranslationItem) => Promise<void>;
}

export class BrowserBatchQueue {
  private static activeJobs = new Map<string, { isCancelled: boolean; isPaused: boolean }>();

  static cancelJob(jobId: string): void {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.isCancelled = true;
    }
  }

  static pauseJob(jobId: string): void {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.isPaused = true;
    }
  }

  static resumeJob(jobId: string): void {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.isPaused = false;
    }
  }

  static isJobActive(jobId: string): boolean {
    return this.activeJobs.has(jobId);
  }

  static async runBatch(params: BatchRunParams): Promise<void> {
    const {
      jobId,
      gameId,
      gameName,
      gameContext,
      baseLanguage,
      targetLanguageName,
      targetLanguageCode,
      items,
      glossary,
      customInstructions,
      settings,
      onProgress,
      onItemUpdated,
    } = params;

    const jobState = { isCancelled: false, isPaused: false };
    this.activeJobs.set(jobId, jobState);

    const concurrency = Math.max(1, Math.min(10, settings.batch_concurrency || 3));
    let completedCount = 0;
    let nextIndex = 0;

    const progressPayload: BatchProgressData = {
      jobId,
      gameId,
      languageCode: targetLanguageCode,
      status: 'running',
      total: items.length,
      completed: 0,
    };

    onProgress({ ...progressPayload });

    const worker = async (workerId: number): Promise<void> => {
      while (nextIndex < items.length) {
        if (jobState.isCancelled) break;

        while (jobState.isPaused && !jobState.isCancelled) {
          await new Promise((r) => setTimeout(r, 400));
        }

        const currentIndex = nextIndex++;
        if (currentIndex >= items.length) break;

        const item = items[currentIndex];

        try {
          progressPayload.currentKey = item.key_path;
          progressPayload.completed = completedCount;
          onProgress({ ...progressPayload });

          const result = await BrowserAIService.translate(
            {
              gameName,
              gameContext,
              baseLanguage,
              targetLanguageName,
              targetLanguageCode,
              keyPath: item.key_path,
              sourceText: item.source_text,
              glossary,
              customInstructions,
            },
            settings
          );

          item.translated_text = result.text;
          item.status = 'ai_translated';
          item.model_used = result.modelUsed;
          item.updated_at = new Date().toISOString();

          await onItemUpdated(item);

          completedCount++;
          progressPayload.completed = completedCount;
          onProgress({ ...progressPayload });
        } catch (err: any) {
          console.error(`[Worker ${workerId}] Translation error on key ${item.key_path}:`, err);
          // Wait briefly on failure to avoid rate limit spikes
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    };

    try {
      const workers: Promise<void>[] = [];
      for (let i = 0; i < concurrency; i++) {
        workers.push(worker(i + 1));
      }

      await Promise.all(workers);

      if (jobState.isCancelled) {
        progressPayload.status = 'cancelled';
      } else {
        progressPayload.status = 'completed';
        progressPayload.completed = completedCount;
      }
    } catch (err: any) {
      progressPayload.status = 'error';
      progressPayload.errorMessage = err.message || String(err);
    } finally {
      this.activeJobs.delete(jobId);
      onProgress({ ...progressPayload });
    }
  }
}
