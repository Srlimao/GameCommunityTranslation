import React, { useState } from 'react';
import { StructuredGameContext } from '../context/types.ts';
import {
  Sparkles,
  Layers,
  UserCheck,
  Sliders,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';

interface AiInheritancePanelProps {
  contextData: StructuredGameContext;
  glossaryCount: number;
}

export const AiInheritancePanel: React.FC<AiInheritancePanelProps> = ({
  contextData,
  glossaryCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const loreCount = contextData.loreElements.length;
  const charCount = contextData.characters.length;

  return (
    <div className="bg-[#161B22] border border-[#30363D] font-mono text-xs select-none">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-2.5 flex items-center justify-between hover:bg-[#10141D] transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#E6EDF3] text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-[#5865F2]" />
            <span>AI Inheritance Pipeline</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.2 bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] text-[9px] font-bold">
              LORE: {loreCount} IN-SCOPE
            </span>
            <span className="px-1.5 py-0.2 bg-[#3FB950]/20 border border-[#3FB950]/40 text-[#56D364] text-[9px] font-bold">
              VOICES: {charCount} DOSSIERS
            </span>
            <span className="px-1.5 py-0.2 bg-[#E5534B]/20 border border-[#E5534B]/40 text-[#F85149] text-[9px] font-bold">
              GLOSSARY: {glossaryCount} TERMS
            </span>
            <span className="px-1.5 py-0.2 bg-[#30363D] border border-[#30363D] text-[#E6EDF3] text-[9px] font-bold">
              STYLE: MATRICES ACTIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#8B949E] text-[10px]">
          <span>{isExpanded ? 'Collapse' : 'Inspect Directives'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-[#30363D] bg-[#0D1117] space-y-2.5 text-[11px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Lore Directives */}
            <div className="bg-[#161B22] p-2 border border-[#30363D] space-y-1">
              <div className="flex items-center gap-1 font-bold text-[#5865F2] text-[10px] uppercase">
                <Layers className="w-3 h-3" />
                <span>Inherited Lore ({loreCount})</span>
              </div>
              <p className="text-[#8B949E] text-[10px] line-clamp-3">
                {contextData.loreElements.map((l) => l.concept).join(', ') || 'No custom lore registered.'}
              </p>
            </div>

            {/* Character Voices */}
            <div className="bg-[#161B22] p-2 border border-[#30363D] space-y-1">
              <div className="flex items-center gap-1 font-bold text-[#56D364] text-[10px] uppercase">
                <UserCheck className="w-3 h-3" />
                <span>Character Voices ({charCount})</span>
              </div>
              <p className="text-[#8B949E] text-[10px] line-clamp-3">
                {contextData.characters.map((c) => `${c.name} (${c.register})`).join(', ') || 'No voice dossiers.'}
              </p>
            </div>

            {/* Glossary Reference */}
            <div className="bg-[#161B22] p-2 border border-[#30363D] space-y-1">
              <div className="flex items-center gap-1 font-bold text-[#F85149] text-[10px] uppercase">
                <BookOpen className="w-3 h-3" />
                <span>Glossary Directives</span>
              </div>
              <p className="text-[#8B949E] text-[10px]">
                {glossaryCount} validated terminology mappings automatically injected into LLM prompt payload.
              </p>
            </div>

            {/* Style Matrices */}
            <div className="bg-[#161B22] p-2 border border-[#30363D] space-y-1">
              <div className="flex items-center gap-1 font-bold text-[#E6EDF3] text-[10px] uppercase">
                <Sliders className="w-3 h-3" />
                <span>Style Matrices</span>
              </div>
              <p className="text-[#8B949E] text-[10px]">
                Gender: {contextData.styleGuide.grammaticalGender} | Punctuation: {contextData.styleGuide.punctuationConvention}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
