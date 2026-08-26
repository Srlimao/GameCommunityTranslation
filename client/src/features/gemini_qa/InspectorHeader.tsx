import React from 'react';
import { TargetLanguage } from '../../types/client_types.ts';
import { Sparkles, Loader2, RotateCcw } from 'lucide-react';

interface InspectorHeaderProps {
  selectedLangCode: string;
  onSelectLangCode: (code: string) => void;
  languages?: TargetLanguage[];
  isAnalyzing: boolean;
  onRunAiInspector: () => void;
  hasStoredData: boolean;
  onClearResults: () => void;
}

export const InspectorHeader: React.FC<InspectorHeaderProps> = ({
  selectedLangCode,
  onSelectLangCode,
  languages,
  isAnalyzing,
  onRunAiInspector,
  hasStoredData,
  onClearResults,
}) => {
  return (
    <div className="bg-[#161B22] border border-[#30363D] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-[#E6EDF3] flex items-center gap-2 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-[#3FB950]" />
          <span>Google Gemini Terminology & QA Inspector</span>
        </h2>
        <p className="text-xs text-[#8B949E] max-w-2xl leading-relaxed">
          Audits tabs (\t), code symbols, format specifiers, and AI terminology consistency across translations.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedLangCode}
          onChange={(e) => onSelectLangCode(e.target.value)}
          className="bg-[#0D1117] border border-[#30363D] px-2.5 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
        >
          {languages?.map((l) => (
            <option key={l.language_id || l.id} value={l.language_code}>
              {l.language_name} ({l.language_code})
            </option>
          ))}
        </select>

        <button
          onClick={onRunAiInspector}
          disabled={isAnalyzing || !selectedLangCode}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-[#3FB950] hover:bg-[#56D364] text-slate-950 border border-[#3FB950] transition-colors disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>INSPECTING...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>RUN AI INSPECTOR</span>
            </>
          )}
        </button>

        {hasStoredData && (
          <button
            onClick={onClearResults}
            title="Clear stored results for this project"
            className="p-1.5 bg-[#0D1117] hover:bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
