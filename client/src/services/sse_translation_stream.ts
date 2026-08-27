import { BatchProgressData } from '../types/client_types.ts';

export type ProgressCallback = (progress: BatchProgressData) => void;
export type KeyDoneCallback = (data: { jobId: string; keyId: string; keyPath: string; translatedText: string }) => void;

export class SseTranslationStream {
  private static progressListeners = new Set<ProgressCallback>();
  private static keyDoneListeners = new Set<KeyDoneCallback>();
  private static latestProgressByGameLang = new Map<string, BatchProgressData>();
  private static latestRunningJob: BatchProgressData | null = null;
  private static isListeningToWindow = false;

  static connect(): void {
    if (this.isListeningToWindow) return;
    this.isListeningToWindow = true;

    // Listen to client-side browser batch events
    window.addEventListener('batch_translation_progress', ((e: CustomEvent<BatchProgressData>) => {
      const data = e.detail;
      if (data?.gameId && data?.languageCode) {
        this.latestProgressByGameLang.set(`${data.gameId}_${data.languageCode}`, data);
      }
      if (data?.status === 'running') {
        this.latestRunningJob = data;
      } else if (this.latestRunningJob?.jobId === data?.jobId) {
        this.latestRunningJob = null;
      }

      this.progressListeners.forEach((cb) => cb(data));
    }) as EventListener);
  }

  static getActiveJob(gameId?: string, languageCode?: string): BatchProgressData | null {
    if (gameId && languageCode) {
      const p = this.latestProgressByGameLang.get(`${gameId}_${languageCode}`);
      if (p && p.status === 'running') return p;
    }
    if (this.latestRunningJob && this.latestRunningJob.status === 'running') {
      return this.latestRunningJob;
    }
    for (const p of this.latestProgressByGameLang.values()) {
      if (p.status === 'running') return p;
    }
    return null;
  }

  static getLatestProgress(gameId: string, languageCode: string): BatchProgressData | undefined {
    return this.latestProgressByGameLang.get(`${gameId}_${languageCode}`);
  }

  static onProgress(cb: ProgressCallback): () => void {
    this.connect();
    this.progressListeners.add(cb);
    return () => {
      this.progressListeners.delete(cb);
    };
  }

  static onKeyDone(cb: KeyDoneCallback): () => void {
    this.connect();
    this.keyDoneListeners.add(cb);
    return () => {
      this.keyDoneListeners.delete(cb);
    };
  }
}

SseTranslationStream.connect();
