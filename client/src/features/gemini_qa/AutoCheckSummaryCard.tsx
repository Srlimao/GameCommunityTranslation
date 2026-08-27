import React from 'react';
import { CodeValidationSummary } from './code_validator.ts';
import { CheckCircle2, AlertTriangle, Terminal, Code2, Layers, Zap, Tag, Sparkles, Loader2 } from 'lucide-react';

interface AutoCheckSummaryCardProps {
  summary: CodeValidationSummary | null;
  isRunning: boolean;
  isAiFixing?: boolean;
  onRunCodeValidator: () => void;
  onBatchAiFix?: () => void;
  onApplyAllFixes?: () => void;
  hasFixableIssues: boolean;
  totalIssuesCount?: number;
  whitelistTagsCount?: number;
  onOpenWhitelistModal?: () => void;
}

export const AutoCheckSummaryCard: React.FC<AutoCheckSummaryCardProps> = ({
  summary,
  isRunning,
  isAiFixing = false,
  onRunCodeValidator,
  onBatchAiFix,
  onApplyAllFixes,
  hasFixableIssues,
  totalIssuesCount = 0,
  whitelistTagsCount = 0,
  onOpenWhitelistModal,
}) => {
  return (
    <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-4 font-mono">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363D] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#5865F2]/20 border border-[#5865F2] text-[#5865F2]">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#E6EDF3] uppercase tracking-wider flex items-center gap-2">
              <span>Code & Symbol Parity Validator</span>
              <span className="text-[10px] bg-[#238636]/20 text-[#3FB950] border border-[#238636] px-1.5 py-0.2">
                AUTO CHECK
              </span>
            </h3>
            <p className="text-[11px] text-[#8B949E]">
              Deterministic rule validator for tabs (\t), variables, brackets, and markup tags.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenWhitelistModal && (
            <button
              onClick={onOpenWhitelistModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-[#161B22] hover:bg-[#21262D] text-[#F778BA] border border-[#F778BA]/40 transition-colors cursor-pointer"
              title="Manage Game Tag Whitelist"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>TAGS ({whitelistTagsCount})</span>
            </button>
          )}

          <button
            onClick={onRunCodeValidator}
            disabled={isRunning || isAiFixing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#1F6FEB] hover:bg-[#388BFD] text-white border border-[#1F6FEB] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isRunning ? 'CHECKING...' : 'RUN VALIDATOR'}</span>
          </button>

          {totalIssuesCount > 0 && onBatchAiFix && (
            <button
              onClick={onBatchAiFix}
              disabled={isAiFixing || isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#A371F7] hover:bg-[#8957E5] text-white border border-[#A371F7] transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              title="Send detected errors, source, and translation to Gemini AI to generate high-precision fixes"
            >
              {isAiFixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isAiFixing ? 'AI FIXING...' : 'BATCH AI FIX'}</span>
            </button>
          )}

          {hasFixableIssues && onApplyAllFixes && (
            <button
              onClick={onApplyAllFixes}
              disabled={isAiFixing || isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#238636] hover:bg-[#2EA043] text-white border border-[#3FB950] transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>APPLY ALL</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Status Chips */}
      {summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-xs">
          {/* Total Checked */}
          <div className="bg-[#0D1117] border border-[#30363D] p-2.5">
            <div className="text-[9px] uppercase font-bold text-[#8B949E] flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#8B949E]" />
              <span>Keys Scanned</span>
            </div>
            <div className="text-lg font-bold text-[#E6EDF3] mt-1">{summary.totalChecked}</div>
          </div>

          {/* Clean / Passed */}
          <div className="bg-[#0D1117] border border-[#30363D] p-2.5">
            <div className="text-[9px] uppercase font-bold text-[#3FB950] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Clean Keys</span>
            </div>
            <div className="text-lg font-bold text-[#3FB950] mt-1">{summary.cleanCount}</div>
          </div>

          {/* Tag Parity */}
          <div className={`bg-[#0D1117] border p-2.5 ${summary.tagMismatches > 0 ? 'border-[#F778BA]' : 'border-[#30363D]'}`}>
            <div className="text-[9px] uppercase font-bold text-[#F778BA] flex items-center gap-1">
              <Code2 className="w-3 h-3" />
              <span>Tags &lt;&gt; &lt;/&gt;</span>
            </div>
            <div className={`text-lg font-bold mt-1 ${summary.tagMismatches > 0 ? 'text-[#F778BA]' : 'text-[#8B949E]'}`}>
              {summary.tagMismatches > 0 ? `${summary.tagMismatches} Errors` : '0 OK'}
            </div>
          </div>

          {/* Tab Mismatches */}
          <div className={`bg-[#0D1117] border p-2.5 ${summary.tabMismatches > 0 ? 'border-[#1F6FEB]' : 'border-[#30363D]'}`}>
            <div className="text-[9px] uppercase font-bold text-[#58A6FF] flex items-center gap-1">
              <Terminal className="w-3 h-3" />
              <span>Tab Parity (\t)</span>
            </div>
            <div className={`text-lg font-bold mt-1 ${summary.tabMismatches > 0 ? 'text-[#58A6FF]' : 'text-[#8B949E]'}`}>
              {summary.tabMismatches > 0 ? `${summary.tabMismatches} Errors` : '0 OK'}
            </div>
          </div>

          {/* Code Symbols / Variables */}
          <div className={`bg-[#0D1117] border p-2.5 ${summary.symbolMismatches > 0 ? 'border-[#A371F7]' : 'border-[#30363D]'}`}>
            <div className="text-[9px] uppercase font-bold text-[#BC8CFF] flex items-center gap-1">
              <Code2 className="w-3 h-3" />
              <span>Symbol & Vars</span>
            </div>
            <div className={`text-lg font-bold mt-1 ${summary.symbolMismatches > 0 ? 'text-[#BC8CFF]' : 'text-[#8B949E]'}`}>
              {summary.symbolMismatches > 0 ? `${summary.symbolMismatches} Errors` : '0 OK'}
            </div>
          </div>

          {/* Bracket Parity */}
          <div className={`bg-[#0D1117] border p-2.5 ${summary.bracketMismatches > 0 ? 'border-[#E5534B]' : 'border-[#30363D]'}`}>
            <div className="text-[9px] uppercase font-bold text-[#F85149] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Brackets &#123;&#125; []</span>
            </div>
            <div className={`text-lg font-bold mt-1 ${summary.bracketMismatches > 0 ? 'text-[#F85149]' : 'text-[#8B949E]'}`}>
              {summary.bracketMismatches > 0 ? `${summary.bracketMismatches} Errors` : '0 OK'}
            </div>
          </div>

          {/* Newlines */}
          <div className={`bg-[#0D1117] border p-2.5 ${summary.newlineMismatches > 0 ? 'border-[#D29922]' : 'border-[#30363D]'}`}>
            <div className="text-[9px] uppercase font-bold text-[#E3B341] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Newlines (\n)</span>
            </div>
            <div className={`text-lg font-bold mt-1 ${summary.newlineMismatches > 0 ? 'text-[#E3B341]' : 'text-[#8B949E]'}`}>
              {summary.newlineMismatches > 0 ? `${summary.newlineMismatches} Errors` : '0 OK'}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-[#8B949E] bg-[#0D1117] p-3 border border-[#30363D] flex items-center justify-between">
          <span>Click "RUN CODE VALIDATOR" to instantly check tab parity, variables, brackets, and code symbols.</span>
        </div>
      )}
    </div>
  );
};
