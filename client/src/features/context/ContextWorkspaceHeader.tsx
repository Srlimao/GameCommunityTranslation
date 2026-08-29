import React from 'react';
import {
  Sparkles,
  Save,
  CheckCircle2,
  Sliders,
  UserCheck,
  Terminal,
  Grid,
  FileText,
  Layers,
  BookOpen,
} from 'lucide-react';

export type ContextPaneType = 'ecosystem' | 'multi' | 'hub' | 'characters' | 'style' | 'synthesizer' | 'glossary';

interface ContextWorkspaceHeaderProps {
  name: string;
  onNameChange: (name: string) => void;
  baseLanguage: string;
  onBaseLanguageChange: (lang: string) => void;
  activePane: ContextPaneType;
  onPaneChange: (pane: ContextPaneType) => void;
  loreCount: number;
  characterCount: number;
  showRawNotes: boolean;
  onToggleRawNotes: () => void;
  isSaving: boolean;
  savedSuccess: boolean;
  onSave: () => void;
}

export const ContextWorkspaceHeader: React.FC<ContextWorkspaceHeaderProps> = ({
  name,
  onNameChange,
  baseLanguage,
  onBaseLanguageChange,
  activePane,
  onPaneChange,
  loreCount,
  characterCount,
  showRawNotes,
  onToggleRawNotes,
  isSaving,
  savedSuccess,
  onSave,
}) => {
  return (
    <div className="bg-[#161B22] border border-[#30363D] p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
      <div className="flex items-center gap-3">
        <div className="bg-[#10141D] border border-[#30363D] px-2.5 py-1 flex items-center gap-2 text-[#E6EDF3]">
          <span className="text-[10px] text-[#8B949E] uppercase">PROJECT:</span>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#E6EDF3] outline-none border-b border-transparent focus:border-[#5865F2]"
          />
        </div>
        <div className="bg-[#10141D] border border-[#30363D] px-2.5 py-1 flex items-center gap-2 text-[#E6EDF3]">
          <span className="text-[10px] text-[#8B949E] uppercase">BASE LANG:</span>
          <input
            type="text"
            value={baseLanguage}
            onChange={(e) => onBaseLanguageChange(e.target.value)}
            className="bg-transparent text-xs text-[#56D364] font-bold w-16 outline-none border-b border-transparent focus:border-[#5865F2]"
          />
        </div>
      </div>

      {/* View Mode Switcher */}
      <div className="flex items-center border border-[#30363D] bg-[#0D1117] overflow-x-auto">
        <button
          type="button"
          onClick={() => onPaneChange('ecosystem')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
            activePane === 'ecosystem' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>ECOSYSTEM (4-COL)</span>
        </button>
        <button
          type="button"
          onClick={() => onPaneChange('multi')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
            activePane === 'multi' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>MULTI-PANE</span>
        </button>
        <button
          type="button"
          onClick={() => onPaneChange('hub')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
            activePane === 'hub' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>LORE ({loreCount})</span>
        </button>
        <button
          type="button"
          onClick={() => onPaneChange('characters')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
            activePane === 'characters' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>CHARACTERS ({characterCount})</span>
        </button>
        <button
          type="button"
          onClick={() => onPaneChange('glossary')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
            activePane === 'glossary' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>GLOSSARY</span>
        </button>
        <button
          type="button"
          onClick={() => onPaneChange('style')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
            activePane === 'style' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>STYLE GUIDE</span>
        </button>
        <button
          type="button"
          onClick={() => onPaneChange('synthesizer')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
            activePane === 'synthesizer' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>SYNTHESIZER</span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {savedSuccess && (
          <div className="flex items-center gap-1 text-[11px] text-[#3FB950] bg-[#3FB950]/10 border border-[#3FB950] px-2 py-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>SAVED</span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleRawNotes}
          className="p-1.5 border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3]"
          title="Toggle Raw Notes"
        >
          <FileText className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#5865F2] hover:bg-[#4C6EF5] text-white text-xs font-bold border border-[#5865F2] transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'SAVING...' : 'COMMIT CONTEXT'}</span>
        </button>
      </div>
    </div>
  );
};
