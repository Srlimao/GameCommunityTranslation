import React from 'react';
import { GameSummary, LanguageProgress, BatchProgressData } from '../../types/client_types.ts';
import { Globe2, Plus, Upload, Download, Sparkles, Loader2, StopCircle, FileUp } from 'lucide-react';

interface TranslationTopBarProps {
  game: GameSummary;
  selectedLangCode: string;
  onSelectLangCode: (code: string) => void;
  onOpenAddLang: () => void;
  onOpenImportJson: () => void;
  onOpenImportPartialJson?: () => void;
  onExportJson: () => void;
  onNavigateToGeminiQA: (code: string) => void;
  onOpenBatch: () => void;
  activeBatch: BatchProgressData | null;
  onStopBatch: () => void;
}

export const TranslationTopBar: React.FC<TranslationTopBarProps> = ({
  game,
  selectedLangCode,
  onSelectLangCode,
  onOpenAddLang,
  onOpenImportJson,
  onOpenImportPartialJson,
  onExportJson,
  onNavigateToGeminiQA,
  onOpenBatch,
  activeBatch,
  onStopBatch,
}) => {
  return (
    <div className="space-y-2 font-mono">
      {/* Top Language Bar & Main Actions */}
      <div className="bg-[#161B22] border border-[#30363D] p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Language Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <div className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider flex items-center gap-1 mr-1">
            <Globe2 className="w-3.5 h-3.5 text-[#5865F2]" />
            <span>Target:</span>
          </div>

          {game.languages?.map((lang) => (
            <div key={lang.language_id} className="flex items-center">
              <button
                onClick={() => onSelectLangCode(lang.language_code)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border transition-colors cursor-pointer ${
                  selectedLangCode === lang.language_code
                    ? 'bg-[#5865F2] text-white border-[#5865F2]'
                    : 'bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
                }`}
              >
                <span>{lang.language_name}</span>
                <span className="text-[10px]">({lang.language_code})</span>
                <span className="px-1 py-0.2 text-[10px] bg-black/40 border border-black/30">
                  {lang.progress_percentage}%
                </span>
              </button>
            </div>
          ))}

          <button
            onClick={onOpenAddLang}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#0D1117] hover:bg-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Language</span>
          </button>
        </div>

        {/* Global Game Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onOpenImportJson}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#0D1117] hover:bg-[#30363D] text-[#E6EDF3] border border-[#30363D] transition-colors cursor-pointer"
            title="Import or update base reference JSON"
          >
            <Upload className="w-3.5 h-3.5 text-[#5865F2]" />
            <span>Import Base JSON</span>
          </button>

          {selectedLangCode && (
            <>
              <button
                onClick={onOpenImportPartialJson}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#0D1117] hover:bg-[#30363D] text-[#E6EDF3] border border-[#30363D] transition-colors cursor-pointer"
                title={`Import translated or partial JSON for ${selectedLangCode}`}
              >
                <FileUp className="w-3.5 h-3.5 text-[#5865F2]" />
                <span>Import Partial JSON</span>
              </button>

              <button
                onClick={onExportJson}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#0D1117] hover:bg-[#30363D] text-[#E6EDF3] border border-[#30363D] transition-colors cursor-pointer"
                title="Download translated JSON file"
              >
                <Download className="w-3.5 h-3.5 text-[#3FB950]" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={() => onNavigateToGeminiQA(selectedLangCode)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#0D1117] hover:bg-[#30363D] text-[#3FB950] border border-[#3FB950]/40 transition-colors cursor-pointer"
                title="Inspect translations with Google Gemini QA"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#3FB950]" />
                <span>Gemini AI Inspector</span>
              </button>

              <button
                onClick={onOpenBatch}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-bold border transition-colors cursor-pointer ${
                  activeBatch?.status === 'running'
                    ? 'bg-[#E5534B] hover:bg-[#F85149] text-white border-[#E5534B] animate-pulse'
                    : 'bg-[#5865F2] hover:bg-[#4C6EF5] text-white border-[#5865F2]'
                }`}
              >
                {activeBatch?.status === 'running' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      TRANSLATING... ({activeBatch.total > 0 ? Math.round((activeBatch.completed / activeBatch.total) * 100) : 0}%)
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Translate All</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Batch Floating Banner Alert */}
      {activeBatch && activeBatch.status === 'running' && (
        <div className="bg-[#10141D] border border-[#5865F2] p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Loader2 className="w-4 h-4 text-[#5865F2] animate-spin shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-[#5865F2]">
                  BATCH QUEUE RUNNING
                </span>
                <span className="font-mono text-[#E6EDF3]">
                  {activeBatch.completed} / {activeBatch.total} ({activeBatch.total > 0 ? Math.round((activeBatch.completed / activeBatch.total) * 100) : 0}%)
                </span>
              </div>
              {activeBatch.currentKey && (
                <p className="text-[10px] text-[#8B949E] font-mono truncate mt-0.5">
                  Translating: <span className="text-[#E6EDF3]">{activeBatch.currentKey}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onStopBatch}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#E5534B] hover:bg-[#F85149] text-white border border-[#E5534B] transition-colors"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>STOP BATCH</span>
            </button>
            <button
              type="button"
              onClick={onOpenBatch}
              className="px-2.5 py-1 text-xs font-bold bg-[#0D1117] text-[#E6EDF3] border border-[#30363D] hover:bg-[#30363D] transition-colors"
            >
              DETAILS
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
