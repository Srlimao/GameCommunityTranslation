import React, { useState, useRef } from 'react';
import { X, Sparkles, Loader2, StopCircle, CheckCircle2, AlertTriangle, ArrowRight, Save } from 'lucide-react';
import { TranslationIssue } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';

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
  const [currentIssue, setCurrentIssue] = useState<TranslationIssue | null>(null);
  const [currentFixedText, setCurrentFixedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixedTotalCount, setFixedTotalCount] = useState(0);
  const [isSavingCloud, setIsSavingCloud] = useState(false);

  const isCancelledRef = useRef(false);

  if (!isOpen) return null;

  const fixableIssues = issues.filter((i) => !i.applied && Boolean(i.source_text && i.translated_text));
  const totalToFix = fixableIssues.length;
  const percentage = totalToFix > 0 ? Math.round((completedCount / totalToFix) * 100) : 0;

  const handleStart = async () => {
    if (totalToFix === 0) return;
    setIsRunning(true);
    setIsCompleted(false);
    setError(null);
    setCompletedCount(0);
    setFixedTotalCount(0);
    isCancelledRef.current = false;

    let fixedCount = 0;

    for (let i = 0; i < fixableIssues.length; i++) {
      if (isCancelledRef.current) break;
      const issue = fixableIssues[i];
      setCurrentIssue(issue);
      setCurrentFixedText(null);

      try {
        const res = await ApiClient.fixSingleIssue({
          gameId,
          languageCode: targetLanguageCode,
          issue: {
            key_path: issue.key_path,
            source_text: issue.source_text,
            translated_text: issue.translated_text,
            issue_type: issue.issue_type,
            message: issue.message,
          },
        });

        setCurrentFixedText(res.fixed_translation);
        fixedCount++;
        setFixedTotalCount(fixedCount);

        onFixApplied([{ key_path: issue.key_path, fixed_translation: res.fixed_translation }], autoApply);
      } catch (err: any) {
        console.error(`[BatchAiFixModal] Error fixing ${issue.key_path}:`, err);
      }

      setCompletedCount(i + 1);
    }

    setIsRunning(false);
    if (!isCancelledRef.current) setIsCompleted(true);
  };

  const handleStop = () => {
    isCancelledRef.current = true;
    setIsRunning(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#A371F7]/20 border border-[#A371F7] text-[#BC8CFF]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">Batch AI Code & Symbol Repair</h2>
              <p className="text-[10px] text-[#8B949E]">Target: {targetLanguageName} ({targetLanguageCode})</p>
            </div>
          </div>
          <button onClick={isRunning ? handleStop : onClose} className="text-[#8B949E] hover:text-[#E6EDF3] p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {error && <div className="p-2.5 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149] text-xs">{error}</div>}

          {!isRunning && !isCompleted && (
            <div className="space-y-3">
              <div className="text-xs text-[#8B949E] bg-[#0D1117] p-3 border border-[#30363D] leading-relaxed">
                Sends each detected issue <strong className="text-[#E6EDF3]">one by one</strong> to Gemini AI to reconstruct tags (<code className="text-[#F778BA]">&lt;color&gt;</code>, <code className="text-[#F778BA]">&lt;b&gt;</code>, <code className="text-[#F778BA]">&lt;/&gt;</code>), tabs (<code className="text-[#58A6FF]">\t</code>), variables (<code className="text-[#BC8CFF]">&#123;name&#125;</code>), and format symbols while preserving localization.
              </div>

              <div className="flex items-center justify-between p-3 bg-[#0D1117] border border-[#30363D]">
                <span className="text-xs text-[#E6EDF3] font-bold">Unapplied Code Issues to Repair:</span>
                <span className="text-xs font-bold text-[#A371F7] bg-[#A371F7]/20 px-2 py-0.5 border border-[#A371F7]">{totalToFix} issues</span>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#E6EDF3] cursor-pointer">
                <input type="checkbox" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} className="rounded bg-[#0D1117] border-[#30363D] text-[#5865F2]" />
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
                    <span className="text-[#A371F7] flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin" /> REPAIRING WITH GEMINI ({completedCount}/{totalToFix})...</span>
                  ) : (
                    <span className="text-[#E3B341] flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> BATCH STOPPED ({completedCount}/{totalToFix})</span>
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

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363D]">
            {isRunning ? (
              <button onClick={handleStop} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#E5534B] hover:bg-[#F85149] text-white border border-[#E5534B] cursor-pointer">
                <StopCircle className="w-3.5 h-3.5" />
                <span>STOP QUEUE</span>
              </button>
            ) : isCompleted ? (
              <>
                <button onClick={onClose} className="px-3 py-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] bg-[#0D1117] cursor-pointer">
                  Close
                </button>
                {onSaveToCloud && (
                  <button onClick={handleCloudSave} disabled={isSavingCloud} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#238636] hover:bg-[#2EA043] text-white border border-[#3FB950] cursor-pointer disabled:opacity-50">
                    {isSavingCloud ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>SAVE ALL FIXES TO CLOUD</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button onClick={onClose} className="px-3 py-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] bg-[#0D1117] cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleStart} disabled={totalToFix === 0} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#A371F7] hover:bg-[#8957E5] text-white border border-[#A371F7] cursor-pointer disabled:opacity-50">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>START BATCH AI FIX ({totalToFix} issues)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
