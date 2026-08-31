import { KeyTranslationItem, SystemSettings, GlossaryEntry, BatchProgressData, RecentBatchItem, BatchFailedKey } from '../../types/client_types.ts';
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
  scopePrefix?: string | null;
  concurrency?: number;
  settings: SystemSettings;
  onProgress?: BatchProgressCallback;
  onItemUpdated?: (item: KeyTranslationItem) => Promise<void>;
  onFlushChunks?: () => Promise<void>;
}

interface JobControlState {
  isCancelled: boolean;
  isPaused: boolean;
  progressPayload: BatchProgressData;
}

export class BrowserBatchQueue {
  private static activeJobs = new Map<string, JobControlState>();

  private static emitProgress(payload: BatchProgressData, onProgress?: BatchProgressCallback): void {
    onProgress?.({ ...payload });
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent<BatchProgressData>('batch_translation_progress', {
          detail: { ...payload },
        })
      );
    }
  }

  static cancelJob(jobId: string): void {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.isCancelled = true;
      job.progressPayload.status = 'cancelled';
      this.emitProgress(job.progressPayload);
    }
  }

  static pauseJob(jobId: string): void {
    const job = this.activeJobs.get(jobId);
    if (job && !job.isCancelled) {
      job.isPaused = true;
      job.progressPayload.status = 'paused';
      this.emitProgress(job.progressPayload);
    }
  }

  static resumeJob(jobId: string): void {
    const job = this.activeJobs.get(jobId);
    if (job && !job.isCancelled) {
      job.isPaused = false;
      job.progressPayload.status = 'running';
      this.emitProgress(job.progressPayload);
    }
  }

  static isJobActive(jobId: string): boolean {
    return this.activeJobs.has(jobId);
  }

  static getJobProgress(jobId: string): BatchProgressData | undefined {
    return this.activeJobs.get(jobId)?.progressPayload;
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
      scopePrefix,
      concurrency: customConcurrency,
      settings,
      onProgress,
      onItemUpdated,
      onFlushChunks,
    } = params;

    const startTime = Date.now();
    const concurrency = Math.max(1, Math.min(10, customConcurrency || settings.batch_concurrency || 3));
    let completedCount = 0;
    let succeededCount = 0;
    let failedCount = 0;
    let nextIndex = 0;
    const recentTranslations: RecentBatchItem[] = [];
    const failedKeys: BatchFailedKey[] = [];

    const progressPayload: BatchProgressData = {
      jobId,
      gameId,
      languageCode: targetLanguageCode,
      status: 'running',
      total: items.length,
      completed: 0,
      succeeded: 0,
      failed: 0,
      scopePrefix: scopePrefix || null,
      keysPerSecond: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: 0,
      recentTranslations: [],
      failedKeys: [],
    };

    const jobState: JobControlState = { isCancelled: false, isPaused: false, progressPayload };
    this.activeJobs.set(jobId, jobState);

    this.emitProgress(progressPayload, onProgress);

    // Periodic chunk buffer flush interval (every 2.5 seconds)
    let pendingFlushCount = 0;
    const flushInterval = setInterval(async () => {
      if (pendingFlushCount > 0 && onFlushChunks) {
        pendingFlushCount = 0;
        try { await onFlushChunks(); } catch {}
      }
    }, 2500);

    const translateWithRetry = async (item: KeyTranslationItem, maxRetries = 3) => {
      let attempt = 0;
      while (attempt < maxRetries) {
        if (jobState.isCancelled) return null;
        try {
          return await BrowserAIService.translate(
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
        } catch (err: any) {
          attempt++;
          if (attempt >= maxRetries) throw err;
          // Exponential backoff: 1s, 2s, 4s
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
        }
      }
      return null;
    };

    const worker = async (workerId: number): Promise<void> => {
      while (nextIndex < items.length) {
        if (jobState.isCancelled) break;

        while (jobState.isPaused && !jobState.isCancelled) {
          await new Promise((r) => setTimeout(r, 400));
        }

        const currentIndex = nextIndex++;
        if (currentIndex >= items.length) break;

        const item = items[currentIndex];

        // Update active key progress
        const elapsed = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
        const speed = completedCount > 0 ? Number((completedCount / elapsed).toFixed(2)) : 0;
        const eta = speed > 0 ? Math.round((items.length - completedCount) / speed) : 0;

        progressPayload.currentKey = item.key_path;
        progressPayload.completed = completedCount;
        progressPayload.succeeded = succeededCount;
        progressPayload.failed = failedCount;
        progressPayload.elapsedSeconds = elapsed;
        progressPayload.keysPerSecond = speed;
        progressPayload.estimatedRemainingSeconds = eta;
        this.emitProgress(progressPayload, onProgress);

        // Fast-path: Skip calling AI provider if source text is blank or whitespace
        if (!item.source_text || !item.source_text.trim()) {
          item.translated_text = item.source_text || '';
          item.status = 'ai_translated';
          item.model_used = 'system:empty_source';
          item.updated_at = new Date().toISOString();

          if (onItemUpdated) {
            await onItemUpdated(item);
            pendingFlushCount++;
          }

          succeededCount++;
          completedCount++;
          progressPayload.completed = completedCount;
          progressPayload.succeeded = succeededCount;
          this.emitProgress(progressPayload, onProgress);
          continue;
        }

        try {
          const result = await translateWithRetry(item);
          if (!result) continue;

          item.translated_text = result.text;
          item.status = 'ai_translated';
          item.model_used = result.modelUsed;
          item.updated_at = new Date().toISOString();

          if (onItemUpdated) {
            await onItemUpdated(item);
            pendingFlushCount++;
          }

          succeededCount++;
          completedCount++;

          // Maintain recent 5 translations for live streaming preview
          recentTranslations.unshift({
            key_path: item.key_path,
            source_text: item.source_text,
            translated_text: item.translated_text,
            status: 'ai_translated',
          });
          if (recentTranslations.length > 5) recentTranslations.pop();

          progressPayload.recentTranslations = [...recentTranslations];
          progressPayload.completed = completedCount;
          progressPayload.succeeded = succeededCount;
          this.emitProgress(progressPayload, onProgress);
        } catch (err: any) {
          console.error(`[Worker ${workerId}] Batch failed on key ${item.key_path}:`, err);
          failedCount++;
          completedCount++;
          failedKeys.push({ key_path: item.key_path, error: err.message || String(err) });

          progressPayload.failed = failedCount;
          progressPayload.completed = completedCount;
          progressPayload.failedKeys = [...failedKeys];
          this.emitProgress(progressPayload, onProgress);
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
        progressPayload.succeeded = succeededCount;
        progressPayload.failed = failedCount;
      }
    } catch (err: any) {
      progressPayload.status = 'error';
      progressPayload.errorMessage = err.message || String(err);
    } finally {
      clearInterval(flushInterval);
      if (onFlushChunks) {
        try { await onFlushChunks(); } catch {}
      }
      this.activeJobs.delete(jobId);
      this.emitProgress(progressPayload, onProgress);
    }
  }
}

