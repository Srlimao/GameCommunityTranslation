import React, { useState } from 'react';
import { GlossaryCandidate } from '../../types/client_types.ts';
import { Plus, Check, Tag } from 'lucide-react';

interface GlossaryCandidateCardProps {
  candidate: GlossaryCandidate;
  onAdd: (candidate: GlossaryCandidate) => Promise<void>;
}

export const GlossaryCandidateCard: React.FC<GlossaryCandidateCardProps> = ({ candidate, onAdd }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      await onAdd(candidate);
      setIsAdded(true);
    } catch (err: any) {
      alert(`Failed to add term: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-[#0D1117] border border-[#30363D] p-3 flex flex-col justify-between hover:border-[#5865F2] transition-colors font-mono">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-[#161B22] text-[#8B949E] border border-[#30363D]">
            <Tag className="w-2.5 h-2.5" />
            {candidate.category}
          </span>
          {isAdded && (
            <span className="text-[10px] font-bold text-[#3FB950] flex items-center gap-1">
              <Check className="w-3 h-3" /> ADDED
            </span>
          )}
        </div>

        <div className="space-y-1 mb-2.5 text-xs">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] text-[#8B949E] uppercase">SRC:</span>
            <span className="font-bold text-[#E6EDF3]">{candidate.source_term}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] text-[#8B949E] uppercase">SUGG:</span>
            <span className="font-bold text-[#3FB950]">{candidate.suggested_translation}</span>
          </div>
        </div>

        {candidate.explanation && (
          <p className="text-[11px] text-[#8B949E] mb-2.5 bg-[#161B22] p-2 border border-[#30363D]">
            {candidate.explanation}
          </p>
        )}

        {candidate.sample_context && (
          <div className="text-[10px] text-[#8B949E] italic truncate mb-2.5">
            Context: "{candidate.sample_context}"
          </div>
        )}
      </div>

      <button
        onClick={handleAdd}
        disabled={isAdding || isAdded}
        className={`w-full flex items-center justify-center gap-1 py-1.5 px-2 text-xs font-bold transition-colors border ${
          isAdded
            ? 'bg-[#3FB950]/10 text-[#3FB950] border-[#3FB950]/40 cursor-default'
            : 'bg-[#5865F2] hover:bg-[#4C6EF5] text-white border-[#5865F2] disabled:opacity-50'
        }`}
      >
        {isAdded ? (
          <>
            <Check className="w-3 h-3" />
            <span>IN GLOSSARY</span>
          </>
        ) : (
          <>
            <Plus className="w-3 h-3" />
            <span>{isAdding ? 'ADDING...' : 'ADD TO GLOSSARY'}</span>
          </>
        )}
      </button>
    </div>
  );
};
