import React, { useState, useRef } from 'react';
import { Sparkles, Loader2, StopCircle, CheckCircle2, AlertTriangle, Save } from 'lucide-react';
import { TranslationIssue } from '../../types/client_types.ts';
import { CloudGamesStore } from '../../services/cloud_games_store.ts';
import { CloudSettingsStore } from '../../services/cloud_settings_store.ts';
import { BrowserAIService } from '../ai/browser_ai_service.ts';
import { QaModal } from './QaModal.tsx';

interface BatchAiFixModalProps {
  isOpen: boolean;
  gameId: string;
  gameName: string;
  targetLanguageCode: string;
  targetLanguageName: string;
  issues: TranslationIssue[];
  onClose: () => void;
  onFixApplied: (fixes: Array<{ key_path: string; fixed_translation: string }>, autoApply?: boolean) => void;
  onSaveToCloud?: () => Promise<void>;
}

export const BatchAiFixModal: React.FC<BatchAiFixModalProps> = ({
  isOpen,
  gameId,
  gameName,
  targetLanguageCode,
  targetLanguageName,
  issues,
  onClose,
  onFixApplied,
  onSaveToCloud,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [autoApply, setAutoApply] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalToFix, setTotalToFix] = useState(0);
  const [currentIssue, setCurrentIssue] = useState<TranslationIssue | null>(null);
  const [currentFixedText, setCurrentFixedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixedTotalCount, setFixedTotalCount] = useState(0);
  const [isSavingCloud, setIsSavingCloud] = useState(false);

  const isCancelledRef = useRef(false);

  const unappliedCount = issues.filter((i) => !i.applied && Boolean(i.source_text && i.translated_text)).length;
  const displayTotal = isRunning || isCompleted || completedCount > 0 ? totalToFix : unappliedCount;
  const percentage = displayTotal > 0 ? Math.min(100, Math.round((completedCount / displayTotal) * 100)) : 0;

  const handleStart = async () => {
    const queue = issues.filter((i) => !i.applied && Boolean(i.source_text && i.translated_text));
    if (queue.length === 0) return;

    setTotalToFix(queue.length);
    setIsRunning(true);
    setIsCompleted(false);
    setError(null);
    setCompletedCount(0);
    setFixedTotalCount(0);
    isCancelledRef.current = false;

    // Pre-fetch game and settings once
    const [game, settings] = await Promise.all([
      CloudGamesStore.getGame(gameId),
      CloudSettingsStore.getSettings(),
    ]);

    const targetLangLabel = targetLanguageName
      ? `${targetLanguageName} (${targetLanguageCode})`
      : targetLanguageCode;

    let fixedCount = 0;
    const CHUNK_SIZE = 5;
    const chunks: TranslationIssue[][] = [];
    for (let i = 0; i < queue.length; i += CHUNK_SIZE) {
      chunks.push(queue.slice(i, i + CHUNK_SIZE));
    }

    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      if (isCancelledRef.current) break;
      const chunk = chunks[cIdx];
      setCurrentIssue(chunk[0]);
      setCurrentFixedText(null);

      try {
        // Attempt batch fix for chunk
        const fixes = await BrowserAIService.fixTranslationIssues({
          gameName: game?.name || gameName,
          contextPrompt: game?.context_prompt,
          targetLanguage: targetLangLabel,
          whitelistTags: game?.whitelist_tags,
          issues: chunk.map((iss) => ({
            key_path: iss.key_path,
            source_text: iss.source_text,
            translated_text: iss.translated_text,
            issue_type: iss.issue_type,
            message: iss.message,
          })),
        }, settings);

        if (fixes && fixes.length > 0) {
          const appliedFixes: Array<{ key_path: string; fixed_translation: string }> = [];
          for (const f of fixes) {
            if (f.fixed_translation) {
              appliedFixes.push({ key_path: f.key_path, fixed_translation: f.fixed_translation });
              fixedCount++;
              setCurrentFixedText(f.fixed_translation);
            }
          }
          if (appliedFixes.length > 0) {
            onFixApplied(appliedFixes, autoApply);
          }
        }
      } catch (err: any) {
        console.warn('[BatchAiFixModal] Chunk failed, falling back to single-key repairs:', err);
        // Fallback: iterate over chunk individually
        for (const iss of chunk) {
          if (isCancelledRef.current) break;
          try {
            const singleRes = await BrowserAIService.fixSingleIssue({
              gameName: game?.name || gameName,
              contextPrompt: game?.context_prompt,
              targetLanguage: targetLangLabel,
              whitelistTags: game?.whitelist_tags,
              issue: {
                key_path: iss.key_path,
                source_text: iss.source_text,
                translated_text: iss.translated_text,
                issue_type: iss.issue_type,
                message: iss.message,
              },
            }, settings);

            if (singleRes.fixed_translation) {
              fixedCount++;
              setCurrentFixedText(singleRes.fixed_translation);
              onFixApplied([{ key_path: iss.key_path, fixed_translation: singleRes.fixed_translation }], autoApply);
            }
          } catch (singleErr) {
            console.error(`[BatchAiFixModal] Fallback fix failed for ${iss.key_path}:`, singleErr);
          }
        }
      }

      setFixedTotalCount(fixedCount);
      setCompletedCount((prev) => Math.min(queue.length, prev + chunk.length));
    }

    setIsRunning(false);
    if (!isCancelledRef.current) {
      setIsCompleted(true);
    }

    // Auto-save batch fixes to database on completion
    if (onSaveToCloud) {
      setIsSavingCloud(true);
      try {
        await onSaveToCloud();
      } catch (err: any) {
        console.error('[BatchAiFixModal] Auto-save on batch end failed:', err);
      } finally {
        setIsSavingCloud(false);
      }
    }
  };

  const handleStop = async () => {
    isCancelledRef.current = true;
    setIsRunning(false);
    if (onSaveToCloud) {
      setIsSavingCloud(true);
      try {
        await onSaveToCloud();
      } catch (err: any) {
        console.error('[BatchAiFixModal] Auto-save on stop failed:', err);
      } finally {
        setIsSavingCloud(false);
      }
    }
  };

  const handleCloudSave = async () => {
    if (!onSaveToCloud) return;
    setIsSavingCloud(true);
    try {
      await onSaveToCloud();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save to cloud');
    } finally {
      setIsSavingCloud(false);
    }
  };

  const footer = (
    <>
      {isRunning ? (
        <button
          onClick={handleStop}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#E5534B] hover:bg-[#F85149] text-white border border-[#E5534B] cursor-pointer"
        >
          <StopCircle className="w-3.5 h-3.5" />
          <span>STOP QUEUE</span>
        </button>
      ) : isCompleted ? (
        <>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] bg-[#0D1117] cursor-pointer"
          >
            Close
          </button>
          {onSaveToCloud && (
            <button
              onClick={handleCloudSave}
              disabled={isSavingCloud}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#238636] hover:bg-[#2EA043] text-white border border-[#3FB950] cursor-pointer disabled:opacity-50"
            >
              {isSavingCloud ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>SAVE ALL FIXES TO CLOUD</span>
            </button>
          )}
        </>
      ) : (
        <>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] bg-[#0D1117] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={unappliedCount === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#A371F7] hover:bg-[#8957E5] text-white border border-[#A371F7] cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>START BATCH AI FIX ({unappliedCount} issues)</span>
          </button>
        </>
      )}
    </>
  );

  return (
    <QaModal
      isOpen={isOpen}
      onClose={isRunning ? handleStop : onClose}
      title="Batch AI Code & Symbol Repair"
      subtitle={`Target: ${targetLanguageName} (${targetLanguageCode})`}
      icon={Sparkles}
      iconClass="p-1.5 bg-[#A371F7]/20 border border-[#A371F7] text-[#BC8CFF]"
      maxWidthClass="max-w-xl"
      footer={footer}
    >
      {error && <div className="p-2.5 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149] text-xs">{error}</div>}

      {!isRunning && !isCompleted && (
        <div className="space-y-3">
          <div className="text-xs text-[#8B949E] bg-[#0D1117] p-3 border border-[#30363D] leading-relaxed">
            Fast chunked batching sends detected issues to AI to reconstruct tags (<code className="text-[#F778BA]">&lt;color&gt;</code>, <code className="text-[#F778BA]">&lt;b&gt;</code>, <code className="text-[#F778BA]">&lt;/&gt;</code>), tabs (<code className="text-[#58A6FF]">\t</code>), variables (<code className="text-[#BC8CFF]">&#123;name&#125;</code>), and format symbols while preserving localization.
          </div>

          <div className="flex items-center justify-between p-3 bg-[#0D1117] border border-[#30363D]">
            <span className="text-xs text-[#E6EDF3] font-bold">Unapplied Code Issues to Repair:</span>
            <span className="text-xs font-bold text-[#A371F7] bg-[#A371F7]/20 px-2 py-0.5 border border-[#A371F7]">{unappliedCount} issues</span>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#E6EDF3] cursor-pointer">
            <input
              type="checkbox"
              checked={autoApply}
              onChange={(e) => setAutoApply(e.target.checked)}
              className="rounded bg-[#0D1117] border-[#30363D] text-[#5865F2]"
            />
            <span>Auto-apply fixes locally as they complete</span>
          </label>
        </div>
      )}

      {/* Progress Section */}
      {(isRunning || isCompleted || completedCount > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#E6EDF3]">
              {isCompleted ? (
                <span className="text-[#3FB950] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> ALL {fixedTotalCount} ISSUES REPAIRED!</span>
              ) : isRunning ? (
                <span className="text-[#A371F7] flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin" /> REPAIRING WITH AI ({completedCount}/{displayTotal})...</span>
              ) : (
                <span className="text-[#E3B341] flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> BATCH STOPPED ({completedCount}/{displayTotal})</span>
              )}
            </span>
            <span className="text-[#E6EDF3]">{percentage}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-[#0D1117] border border-[#30363D] overflow-hidden">
            <div className="h-full bg-[#A371F7] transition-all duration-300" style={{ width: `${percentage}%` }} />
          </div>

          {/* Live Preview Card */}
          {currentIssue && (
            <div className="bg-[#0D1117] border border-[#30363D] p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#5865F2] bg-[#161B22] px-2 py-0.5 border border-[#30363D] truncate max-w-[320px] font-bold">{currentIssue.key_path}</span>
                <span className="text-[10px] text-[#F85149] uppercase font-bold">{currentIssue.issue_type}</span>
              </div>

              <div className="text-[11px] text-[#F85149] bg-[#E5534B]/10 p-2 border border-[#E5534B]/30">{currentIssue.message}</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#161B22] p-2 border border-[#30363D]">
                  <div className="text-[9px] uppercase font-bold text-[#8B949E] mb-0.5">Source</div>
                  <div className="text-[#E6EDF3] whitespace-pre-wrap break-words">{currentIssue.source_text}</div>
                </div>
                <div className="bg-[#161B22] p-2 border border-[#30363D]">
                  <div className="text-[9px] uppercase font-bold text-[#8B949E] mb-0.5">Original Translation</div>
                  <div className="text-[#8B949E] whitespace-pre-wrap break-words">{currentIssue.translated_text}</div>
                </div>
              </div>

              {currentFixedText && (
                <div className="bg-[#161B22] p-2 border border-[#3FB950]/50 space-y-1">
                  <div className="text-[9px] uppercase font-bold text-[#3FB950] flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Repaired Output</div>
                  <div className="text-[#56D364] whitespace-pre-wrap break-words font-bold">{currentFixedText}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </QaModal>
  );
};

