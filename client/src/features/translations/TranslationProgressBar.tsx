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

  return (
    <div className="bg-[#161B22] border border-[#30363D] p-3 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#E6EDF3] uppercase tracking-wider text-[11px]">
            Translation Completion
          </span>
          <span className="px-2 py-0.5 text-xs font-bold font-mono bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/40">
            {percentage}%
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-[#3FB950]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{translated} Translated</span>
          </div>
          {approved > 0 && (
            <div className="flex items-center gap-1 text-[#5865F2]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{approved} Approved</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[#E5534B]">
            <Clock className="w-3.5 h-3.5" />
            <span>{missing} Missing</span>
          </div>
          <div className="text-[#8B949E] font-mono">
            Total: <strong className="text-[#E6EDF3]">{totalKeys}</strong>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-2 bg-[#0D1117] border border-[#30363D] overflow-hidden">
        <div
          className="h-full bg-[#5865F2] transition-all duration-300"
          style={{ width: `${Math.max(percentage, totalKeys > 0 && translated > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
};
