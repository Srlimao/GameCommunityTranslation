import React from 'react';
import { Globe2, Plus } from 'lucide-react';

interface EmptyLanguageStateProps {
  onOpenAddLang: () => void;
}

export const EmptyLanguageState: React.FC<EmptyLanguageStateProps> = ({ onOpenAddLang }) => {
  return (
    <div className="bg-[#161B22] border border-[#30363D] p-12 text-center font-mono">
      <Globe2 className="w-10 h-10 text-[#8B949E] mx-auto mb-3" />
      <h3 className="text-sm font-bold text-[#E6EDF3] mb-1">NO TARGET LOCALE SELECTED</h3>
      <p className="text-xs text-[#8B949E] mb-4">
        Add a target language (Spanish, Japanese, German, French) to begin.
      </p>
      <button
        onClick={onOpenAddLang}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>ADD TARGET LOCALE</span>
      </button>
    </div>
  );
};
