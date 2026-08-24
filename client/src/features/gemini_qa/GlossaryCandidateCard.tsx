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
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/50 transition-colors shadow-md">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60">
            <Tag className="w-3 h-3" />
            {candidate.category}
          </span>
          {isAdded && (
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Added to Glossary
            </span>
          )}
        </div>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-400">Source:</span>
            <span className="text-sm font-bold text-slate-100">{candidate.source_term}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-400">Suggested:</span>
            <span className="text-sm font-bold text-indigo-400">{candidate.suggested_translation}</span>
          </div>
        </div>

        {candidate.explanation && (
          <p className="text-xs text-slate-400 mb-3 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            💡 {candidate.explanation}
          </p>
        )}

        {candidate.sample_context && (
          <div className="text-[11px] text-slate-500 italic truncate mb-3">
            Context: "{candidate.sample_context}"
          </div>
        )}
      </div>

      <button
        onClick={handleAdd}
        disabled={isAdding || isAdded}
        className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
          isAdded
            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 cursor-default'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50'
        }`}
      >
        {isAdded ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>In Glossary</span>
          </>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Adding...' : 'Add to Glossary'}</span>
          </>
        )}
      </button>
    </div>
  );
};
