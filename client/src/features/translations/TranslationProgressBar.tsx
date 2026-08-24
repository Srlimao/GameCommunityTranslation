import React from 'react';
import { LanguageProgress } from '../../types/client_types.ts';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react';

interface TranslationProgressBarProps {
  progress?: LanguageProgress;
  totalKeys: number;
}

export const TranslationProgressBar: React.FC<TranslationProgressBarProps> = ({ progress, totalKeys }) => {
  const percentage = progress?.progress_percentage ?? 0;
  const translated = progress?.translated_keys ?? 0;
  const approved = progress?.approved_keys ?? 0;
  const missing = Math.max(0, totalKeys - translated);

  // Gradient color based on percentage
  const getProgressGradient = () => {
    if (percentage >= 100) return 'from-emerald-500 to-teal-400';
    if (percentage >= 50) return 'from-indigo-500 via-purple-500 to-pink-500';
    return 'from-amber-500 to-indigo-500';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-200">
            Translation Completion
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {percentage}%
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{translated} Translated</span>
          </div>
          {approved > 0 && (
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{approved} Approved</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{missing} Missing</span>
          </div>
          <div className="text-slate-400 font-mono">
            Total: {totalKeys}
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getProgressGradient()} transition-all duration-500 ease-out`}
          style={{ width: `${Math.max(percentage, totalKeys > 0 && translated > 0 ? 3 : 0)}%` }}
        />
      </div>
    </div>
  );
};
