import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, StopCircle, CheckCircle2, AlertTriangle, Play, Pause, RefreshCw, Layers } from 'lucide-react';
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
  selectedTreePrefix?: string | null;
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
  selectedTreePrefix,
  onClose,
  onBatchFinished,
}) => {
  const [onlyUntranslated, setOnlyUntranslated] = useState(true);
  const [useBranchScope, setUseBranchScope] = useState<boolean>(Boolean(selectedTreePrefix));
  const [concurrency, setConcurrency] = useState(3);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<BatchProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const active = SseTranslationStream.getActiveJob(gameId, languageCode) || SseTranslationStream.getActiveJob();
    if (active && (active.status === 'running' || active.status === 'paused')) {
      setProgress(active);
      setIsRunning(active.status === 'running' || active.status === 'paused');
      setCurrentJobId(active.jobId);
    }

    const unsub = SseTranslationStream.onProgress((data) => {
      const isMatch =
        (data.gameId === gameId && data.languageCode === languageCode) ||
        (currentJobId && data.jobId === currentJobId) ||
        (data.status === 'running' || data.status === 'paused');

      if (isMatch) {
        setProgress(data);
        if (data.jobId) setCurrentJobId(data.jobId);

        if (data.status === 'running' || data.status === 'paused') {
          setIsRunning(true);
        } else if (['completed', 'cancelled', 'error'].includes(data.status)) {
          setIsRunning(false);
          onBatchFinished();
        }
      }
    });

    return () => { unsub(); };
  }, [isOpen, gameId, languageCode, currentJobId]);

  if (!isOpen) return null;

  const handleStart = async (scopePrefixOverride?: string | null) => {
    setIsRunning(true);
    setError(null);
    try {
      const prefixToUse = scopePrefixOverride !== undefined
        ? scopePrefixOverride
        : (useBranchScope ? selectedTreePrefix : null);

      const jobId = await ApiClient.startBatch({
        gameId,
        languageCode,
        onlyUntranslated,
        customInstructions: customInstructions.trim() || undefined,
        scopePrefix: prefixToUse,
        concurrency,
      });
      setCurrentJobId(jobId);
    } catch (err: any) {
      setError(err.message || 'Failed to start batch translation');
      setIsRunning(false);
    }
  };

  const handlePause = async () => {
    const targetJobId = currentJobId || progress?.jobId;
    if (targetJobId) SseTranslationStream.pauseJob(targetJobId);
  };

  const handleResume = async () => {
    const targetJobId = currentJobId || progress?.jobId;
    if (targetJobId) SseTranslationStream.resumeJob(targetJobId);
  };

  const handleCancel = async () => {
    const targetJobId = currentJobId || progress?.jobId;
    if (targetJobId) {
      try { await ApiClient.cancelBatch(targetJobId); } catch {}
      setIsRunning(false);
      if (progress) setProgress({ ...progress, status: 'cancelled' });
      onBatchFinished();
    }
  };

  const isEffectivelyRunning = isRunning || progress?.status === 'running' || progress?.status === 'paused';
  const percentage = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const formatEta = (seconds?: number) => {
    if (!seconds || seconds <= 0) return 'calculating...';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    return `${mins}m ${rem}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D] shrink-0">
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

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-2.5 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149]">
              {error}
            </div>
          )}

          {!isEffectivelyRunning && !progress && (
            <>
              {/* Scope & Target Settings */}
              <div className="bg-[#0D1117] p-3 border border-[#30363D] space-y-2.5">
                <div className="text-[10px] font-bold uppercase text-[#8B949E] tracking-wider">Translation Target</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="batchScope"
                    checked={onlyUntranslated}
                    onChange={() => setOnlyUntranslated(true)}
                    className="accent-[#5865F2]"
                  />
                  <span className="text-[#E6EDF3]">Missing Keys Only (untranslated strings)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="batchScope"
                    checked={!onlyUntranslated}
                    onChange={() => setOnlyUntranslated(false)}
                    className="accent-[#5865F2]"
                  />
                  <span className="text-[#E6EDF3]">All Keys (re-translate with active context & glossary)</span>
                </label>
              </div>

              {/* Branch / Namespace Scope */}
              {selectedTreePrefix && (
                <div className="bg-[#0D1117] p-3 border border-[#5865F2]/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#5865F2]">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Tree Branch Selection Detected</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={useBranchScope}
                      onChange={(e) => setUseBranchScope(e.target.checked)}
                      className="accent-[#5865F2]"
                    />
                    <span className="text-[#E6EDF3]">
                      Translate only within branch: <strong className="text-[#5865F2]">{selectedTreePrefix}</strong>
                    </span>
                  </label>
                </div>
              )}

              {/* Concurrency & Custom Prompt */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                    Workers ({concurrency})
                  </label>
                  <select
                    value={concurrency}
                    onChange={(e) => setConcurrency(Number(e.target.value))}
                    className="w-full bg-[#0D1117] border border-[#30363D] px-2 py-1.5 text-xs text-[#E6EDF3] outline-none"
                  >
                    {[1, 2, 3, 4, 5, 8, 10].map((w) => (
                      <option key={w} value={w}>{w} parallel {w === 1 ? 'worker' : 'workers'}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                    Custom Batch Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g. Keep item names under 20 chars..."
                    className="w-full bg-[#0D1117] border border-[#30363D] px-2.5 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
                  />
                </div>
              </div>
            </>
          )}

          {/* Active / Finished Progress View */}
          {(isEffectivelyRunning || progress) && (
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  {progress?.status === 'completed' ? (
                    <span className="text-[#3FB950] flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED</span>
                  ) : progress?.status === 'paused' ? (
                    <span className="text-[#D29922] flex items-center gap-1"><Pause className="w-3.5 h-3.5" /> PAUSED</span>
                  ) : progress?.status === 'cancelled' ? (
                    <span className="text-[#E5534B] flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> CANCELLED</span>
                  ) : (
                    <span className="text-[#5865F2] flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> RUNNING</span>
                  )}
                  {progress?.scopePrefix && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]">
                      {progress.scopePrefix}
                    </span>
                  )}
                </span>
                <span className="font-bold text-[#E6EDF3]">
                  {progress?.completed || 0} / {progress?.total || 0} ({percentage}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-[#0D1117] border border-[#30363D] overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${progress?.status === 'paused' ? 'bg-[#D29922]' : 'bg-[#5865F2]'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 text-[10px] bg-[#0D1117] p-2 border border-[#30363D]">
                <div><span className="text-[#8B949E]">Speed:</span> <strong className="text-[#E6EDF3]">{progress?.keysPerSecond || 0} k/s</strong></div>
                <div><span className="text-[#8B949E]">Elapsed:</span> <strong className="text-[#E6EDF3]">{progress?.elapsedSeconds || 0}s</strong></div>
                <div><span className="text-[#8B949E]">ETA:</span> <strong className="text-[#E6EDF3]">{formatEta(progress?.estimatedRemainingSeconds)}</strong></div>
                <div><span className="text-[#8B949E]">Failures:</span> <strong className={progress?.failed ? 'text-[#E5534B]' : 'text-[#3FB950]'}>{progress?.failed || 0}</strong></div>
              </div>

              {/* Live Streaming Terminal */}
              {progress?.recentTranslations && progress.recentTranslations.length > 0 && (
                <div className="bg-[#090D13] p-2.5 border border-[#30363D] space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-[#8B949E] tracking-wider">Live Stream (Recent Translations)</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {progress.recentTranslations.map((rt, idx) => (
                      <div key={idx} className="text-[11px] font-mono flex items-start gap-1.5 border-b border-[#30363D]/30 pb-1">
                        <span className="text-[#5865F2] shrink-0">[{rt.key_path}]</span>
                        <span className="text-[#8B949E] truncate max-w-[40%]">"{rt.source_text}"</span>
                        <span className="text-[#56D364] truncate flex-1">→ "{rt.translated_text}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Keys List */}
              {progress?.failedKeys && progress.failedKeys.length > 0 && (
                <div className="bg-[#E5534B]/10 p-2.5 border border-[#E5534B] text-[11px] text-[#F85149]">
                  <div className="font-bold mb-1">Failed Keys ({progress.failedKeys.length}):</div>
                  <div className="max-h-20 overflow-y-auto space-y-0.5 font-mono text-[10px]">
                    {progress.failedKeys.map((fk, idx) => (
                      <div key={idx}>• {fk.key_path}: {fk.error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#30363D] bg-[#10141D] shrink-0">
          <div>
            {progress?.status === 'completed' && progress.failed > 0 && (
              <button
                type="button"
                onClick={() => handleStart()}
                className="flex items-center gap-1 text-xs text-[#D29922] hover:underline font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Missing Keys</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEffectivelyRunning ? (
              <>
                {progress?.status === 'running' && (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#D29922]/20 hover:bg-[#D29922]/30 text-[#D29922] border border-[#D29922] transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>PAUSE</span>
                  </button>
                )}
                {progress?.status === 'paused' && (
                  <button
                    type="button"
                    onClick={handleResume}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-[#5865F2] border border-[#5865F2] transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>RESUME</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#E5534B] hover:bg-[#F85149] text-white border border-[#E5534B] transition-colors"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>STOP BATCH</span>
                </button>
              </>
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
                    onClick={() => handleStart()}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>START BATCH</span>
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

