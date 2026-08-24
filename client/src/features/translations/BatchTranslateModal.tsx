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

    const active = SseTranslationStream.getActiveJob(gameId, languageCode) || SseTranslationStream.getActiveJob();
    if (active && active.status === 'running') {
      setProgress(active);
      setIsRunning(true);
      setCurrentJobId(active.jobId);
    }

    const unsub = SseTranslationStream.onProgress((data) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-xl overflow-hidden shadow-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#5865F2]" />
            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">Batch Translation Queue</h2>
              <p className="text-[10px] text-[#8B949E]">Target: {languageName} ({languageCode})</p>
            </div>
          </div>
          {!isEffectivelyRunning && (
            <button onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3] p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-4 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149]">
              {error}
            </div>
          )}

          {!isEffectivelyRunning && !progress && (
            <>
              <div className="bg-[#0D1117] p-3 border border-[#30363D] space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="batchScope"
                    checked={onlyUntranslated}
                    onChange={() => setOnlyUntranslated(true)}
                    className="accent-[#5865F2]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#E6EDF3]">
                      Translate Missing Keys Only ({untranslatedCount} keys)
                    </div>
                    <div className="text-[10px] text-[#8B949E]">
                      Skips keys that have already been translated or approved.
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-[#30363D]">
                  <input
                    type="radio"
                    name="batchScope"
                    checked={!onlyUntranslated}
                    onChange={() => setOnlyUntranslated(false)}
                    className="accent-[#5865F2]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#E6EDF3]">
                      Translate All Keys ({totalCount} keys)
                    </div>
                    <div className="text-[10px] text-[#8B949E]">
                      Re-translates all strings with current game context & glossary.
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                  Optional Batch Guidance / Custom Instructions
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Ensure all NPC lines sound formal; keep weapon names under 20 chars..."
                  className="w-full bg-[#0D1117] border border-[#30363D] px-2.5 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
                />
              </div>
            </>
          )}

          {/* Active / Finished Progress View */}
          {(isEffectivelyRunning || progress) && (
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#E6EDF3]">
                  {progress?.status === 'completed' ? (
                    <span className="text-[#3FB950] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> BATCH COMPLETE!
                    </span>
                  ) : progress?.status === 'cancelled' ? (
                    <span className="text-[#E5534B] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> BATCH CANCELLED
                    </span>
                  ) : (
                    <span className="text-[#5865F2] flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> TRANSLATING BATCH...
                    </span>
                  )}
                </span>
                <span className="font-bold text-[#E6EDF3]">
                  {progress ? `${progress.completed} / ${progress.total}` : `0 / ${targetCount}`} ({percentage}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-[#0D1117] border border-[#30363D] overflow-hidden">
                <div
                  className="h-full bg-[#5865F2] transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {progress?.currentKey && isEffectivelyRunning && (
                <div className="text-[10px] text-[#8B949E] font-mono truncate bg-[#0D1117] p-2 border border-[#30363D]">
                  Translating: <span className="text-[#E6EDF3] font-bold">{progress.currentKey}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363D]">
            {isEffectivelyRunning ? (
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#E5534B] hover:bg-[#F85149] text-white border border-[#E5534B] transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>STOP BATCH</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] bg-[#0D1117]"
                >
                  {progress?.status === 'completed' ? 'Close' : 'Cancel'}
                </button>
                {progress?.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={targetCount === 0}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>START BATCH ({targetCount} keys)</span>
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
