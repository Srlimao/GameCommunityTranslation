import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, StopCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ApiClient } from '../../services/api_client.ts';
import { SseTranslationStream } from '../../services/sse_translation_stream.ts';
import { BatchProgressData } from '../../types/client_types.ts';

interface BatchTranslateModalProps {
  isOpen: boolean;
  gameId: string;
  gameName: string;
  languageCode: string;
  languageName: string;
  untranslatedCount: number;
  totalCount: number;
  onClose: () => void;
  onBatchFinished: () => void;
}

export const BatchTranslateModal: React.FC<BatchTranslateModalProps> = ({
  isOpen,
  gameId,
  gameName,
  languageCode,
  languageName,
  untranslatedCount,
  totalCount,
  onClose,
  onBatchFinished,
}) => {
  const [onlyUntranslated, setOnlyUntranslated] = useState(true);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<BatchProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Check for any currently running batch job on initial open
    const active = SseTranslationStream.getActiveJob(gameId, languageCode) || SseTranslationStream.getActiveJob();
    if (active && active.status === 'running') {
      setProgress(active);
      setIsRunning(true);
      setCurrentJobId(active.jobId);
    }

    // Subscribe to SSE events
    const unsub = SseTranslationStream.onProgress((data) => {
      // Check if this progress event matches this language, or the active job, or if any job is currently running
      const isMatch =
        (data.gameId === gameId && data.languageCode === languageCode) ||
        (currentJobId && data.jobId === currentJobId) ||
        (data.status === 'running');

      if (isMatch) {
        setProgress(data);
        if (data.jobId) setCurrentJobId(data.jobId);

        if (data.status === 'running') {
          setIsRunning(true);
        } else if (data.status === 'completed' || data.status === 'cancelled' || data.status === 'error') {
          setIsRunning(false);
          onBatchFinished();
        }
      }
    });

    return () => {
      unsub();
    };
  }, [isOpen, gameId, languageCode, currentJobId]);

  if (!isOpen) return null;

  const handleStart = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const jobId = await ApiClient.startBatch({
        gameId,
        languageCode,
        onlyUntranslated,
        customInstructions: customInstructions.trim() || undefined,
      });
      setCurrentJobId(jobId);
    } catch (err: any) {
      setError(err.message || 'Failed to start batch translation');
      setIsRunning(false);
    }
  };

  const handleCancel = async () => {
    const targetJobId = currentJobId || progress?.jobId || SseTranslationStream.getActiveJob()?.jobId;
    if (targetJobId) {
      try {
        await ApiClient.cancelBatch(targetJobId);
      } catch (err: any) {
        console.error('Failed to cancel batch:', err);
      }
      setIsRunning(false);
      if (progress) {
        setProgress({ ...progress, status: 'cancelled' });
      }
      onBatchFinished();
    }
  };

  const isEffectivelyRunning = isRunning || progress?.status === 'running';
  const targetCount = onlyUntranslated ? untranslatedCount : totalCount;
  const percentage = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100">Batch Translation with LM Studio</h2>
              <p className="text-xs text-slate-400">Target: {languageName} ({languageCode})</p>
            </div>
          </div>
          {!isEffectivelyRunning && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-sm">
              {error}
            </div>
          )}

          {!isEffectivelyRunning && !progress && (
            <>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="batchScope"
                    checked={onlyUntranslated}
                    onChange={() => setOnlyUntranslated(true)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-200">
                      Translate Missing Keys Only ({untranslatedCount} keys)
                    </div>
                    <div className="text-xs text-slate-400">
                      Skips keys that have already been translated or approved.
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-slate-800">
                  <input
                    type="radio"
                    name="batchScope"
                    checked={!onlyUntranslated}
                    onChange={() => setOnlyUntranslated(false)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-200">
                      Translate All Keys ({totalCount} keys)
                    </div>
                    <div className="text-xs text-slate-400">
                      Re-translates all strings with current game context & glossary.
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Optional Batch Guidance / Custom Instructions
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Ensure all NPC lines sound formal; keep weapon names under 20 chars..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </>
          )}

          {/* Active / Finished Progress View */}
          {(isEffectivelyRunning || progress) && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">
                  {progress?.status === 'completed' ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Batch Complete!
                    </span>
                  ) : progress?.status === 'cancelled' ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Batch Cancelled
                    </span>
                  ) : (
                    <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" /> Translating with LM Studio...
                    </span>
                  )}
                </span>
                <span className="text-sm font-bold font-mono text-slate-200">
                  {progress ? `${progress.completed} / ${progress.total}` : `0 / ${targetCount}`} ({percentage}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {progress?.currentKey && isEffectivelyRunning && (
                <div className="text-xs text-slate-400 font-mono truncate bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  Translating: <span className="text-indigo-300 font-semibold">{progress.currentKey}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            {isEffectivelyRunning ? (
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                <span>Stop Batch</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {progress?.status === 'completed' ? 'Close' : 'Cancel'}
                </button>
                {progress?.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={targetCount === 0}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Start Batch ({targetCount} keys)</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
