import React, { useState } from 'react';
import { StructuredGameContext } from './types.ts';
import { ContextSerializer } from './contextSerializer.ts';
import { Terminal, Copy, Check, Cpu, Eye, Activity } from 'lucide-react';

interface ContextSynthesizerModuleProps {
  context: StructuredGameContext;
  gameName: string;
  baseLanguage: string;
}

export const ContextSynthesizerModule: React.FC<ContextSynthesizerModuleProps> = ({
  context,
  gameName,
  baseLanguage,
}) => {
  const [targetLang, setTargetLang] = useState('es-ES');
  const [copied, setCopied] = useState(false);
  const [activeSegment, setActiveSegment] = useState<'system' | 'pre_context' | 'all'>('all');

  const systemPrompt = ContextSerializer.synthesizeSystemPrompt(context, baseLanguage, targetLang);
  const preContext = ContextSerializer.synthesizeUserPreContext(context);

  const fullSynthesizedOutput = `${systemPrompt}\n\n${preContext ? `\n--- PRE-CONTEXT INJECTION ---\n${preContext}` : ''}`;
  const charCount = fullSynthesizedOutput.length;
  const estimatedTokens = Math.ceil(charCount / 4);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullSynthesizedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-none flex flex-col h-full text-[#E6EDF3]">
      {/* Synthesizer Header */}
      <div className="p-3 border-b border-[#30363D] flex flex-wrap items-center justify-between gap-2 bg-[#10141D]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#3FB950]" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#E6EDF3]">
            LLM Context Synthesizer & Pipeline Preview
          </span>
        </div>

        {/* Real-time Token Metrics Strip */}
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="bg-[#0D1117] border border-[#30363D] px-2 py-0.5 text-[#8B949E]">
            Chars: <strong className="text-[#E6EDF3]">{charCount}</strong>
          </span>
          <span className="bg-[#0D1117] border border-[#30363D] px-2 py-0.5 text-[#8B949E]">
            Est. Tokens: <strong className="text-[#3FB950]">~{estimatedTokens}</strong>
          </span>
          <span className="bg-[#5865F2]/20 border border-[#5865F2] px-2 py-0.5 text-[#5865F2] font-bold">
            LIVE SYNTHESIS
          </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="p-2 border-b border-[#30363D] bg-[#161B22] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#8B949E] uppercase">Target Language:</span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="bg-[#0D1117] border border-[#30363D] px-2 py-1 text-xs text-[#E6EDF3] font-mono outline-none focus:border-[#5865F2]"
          >
            <option value="es-ES">Spanish (es-ES)</option>
            <option value="ja-JP">Japanese (ja-JP)</option>
            <option value="de-DE">German (de-DE)</option>
            <option value="fr-FR">French (fr-FR)</option>
            <option value="zh-CN">Simplified Chinese (zh-CN)</option>
            <option value="ko-KR">Korean (ko-KR)</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center border border-[#30363D] bg-[#0D1117]">
            <button
              type="button"
              onClick={() => setActiveSegment('all')}
              className={`px-2 py-1 text-[10px] font-mono transition-colors ${
                activeSegment === 'all' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              ALL PIPELINE
            </button>
            <button
              type="button"
              onClick={() => setActiveSegment('system')}
              className={`px-2 py-1 text-[10px] font-mono transition-colors ${
                activeSegment === 'system' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              SYSTEM ONLY
            </button>
            <button
              type="button"
              onClick={() => setActiveSegment('pre_context')}
              className={`px-2 py-1 text-[10px] font-mono transition-colors ${
                activeSegment === 'pre_context' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              PRE-CONTEXT
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#0D1117] hover:bg-[#30363D] border border-[#30363D] text-[#E6EDF3] text-xs font-mono transition-colors"
            title="Copy Synthesized Prompt"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#3FB950]" /> : <Copy className="w-3.5 h-3.5 text-[#8B949E]" />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </button>
        </div>
      </div>

      {/* Live Pipeline Output Area */}
      <div className="flex-1 p-3 overflow-auto bg-[#0D1117] font-mono text-xs text-[#E6EDF3] leading-relaxed">
        {activeSegment === 'all' && (
          <pre className="whitespace-pre-wrap selection:bg-[#5865F2] selection:text-white font-mono text-[11px] text-[#E6EDF3]">
            {fullSynthesizedOutput}
          </pre>
        )}
        {activeSegment === 'system' && (
          <pre className="whitespace-pre-wrap selection:bg-[#5865F2] selection:text-white font-mono text-[11px] text-[#E6EDF3]">
            {systemPrompt}
          </pre>
        )}
        {activeSegment === 'pre_context' && (
          <pre className="whitespace-pre-wrap selection:bg-[#5865F2] selection:text-white font-mono text-[11px] text-[#E6EDF3]">
            {preContext || '// No lore elements assigned to Pre-Context injection target.'}
          </pre>
        )}
      </div>

      {/* Footer Status */}
      <div className="p-2 border-t border-[#30363D] bg-[#10141D] flex items-center justify-between text-[10px] font-mono text-[#8B949E]">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-[#3FB950]" />
          <span>Pipeline Ready: Injects into all single-key & batch translation calls</span>
        </div>
        <span className="text-[#8B949E]">Architecture: Modular Multi-Pane Engine</span>
      </div>
    </div>
  );
};
